// server.js

// ---------------------------------------------------------------------
// 1. КОНФИГУРАЦИЯ И ЗАВИСИМОСТИ
// ---------------------------------------------------------------------
const express = require('express');
const path = require('path');
const db = require('./models/db'); // Модуль подключения к БД
require('dotenv').config();
const bcrypt = require('bcrypt');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 3000;
const SALT_ROUNDS = 10; // Для bcrypt

// ---------------------------------------------------------------------
// 2. MIDDLEWARE И НАСТРОЙКА СЕССИЙ
// ---------------------------------------------------------------------
app.use(express.json()); // Для парсинга application/json
app.use(express.urlencoded({ extended: true })); // Для парсинга application/x-www-form-urlencoded

// Настройка PUG
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// Настройка статических файлов (CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// Настройка сессий
app.use(session({
    secret: process.env.SESSION_SECRET || 'YOUR_VERY_STRONG_DEFAULT_KEY',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 } // 24 hours
}));

// MIDDLEWARE: Передача данных сессии в шаблоны PUG
app.use(async (req, res, next) => {
    const isLoggedIn = !!req.session.userId;
    res.locals.isLoggedIn = isLoggedIn;
    res.locals.username = req.session.username || '';
    res.locals.role = req.session.role || '';
    next();
});

// ---------------------------------------------------------------------
// 3. MIDDLEWARE АВТОРИЗАЦИИ
// ---------------------------------------------------------------------

/**
 * Middleware для проверки роли.
 * @param {string} roleName - Требуемое имя роли ('client', 'master', 'admin').
 */
function requireRole(roleName) {
    return (req, res, next) => {
        if (!req.session.isLoggedIn) {
            // Если не авторизован, отправляем 401 для API или перенаправляем для страниц
            if (req.path.startsWith('/api')) {
                return res.status(401).json({ success: false, message: 'Требуется авторизация.' });
            }
            return res.redirect('/login.html');
        }

        // Проверка: Имя роли хранится в сессии после успешного входа
        if (req.session.role === roleName) {
            next();
        } else {
            // Доступ запрещен
            if (req.path.startsWith('/api')) {
                return res.status(403).json({ success: false, message: 'Доступ запрещен. Недостаточно прав.' });
            }
            res.status(403).render('error', { title: '403', message: 'Доступ запрещен. У вас нет прав для просмотра этой страницы.' });
        }
    };
}

// Проверка, что пользователь авторизован (для страниц записи)
function requireLogin(req, res, next) {
    if (!req.session.isLoggedIn) {
        return res.redirect('/login.html');
    }
    next();
}


// ---------------------------------------------------------------------
// 4. API: АУТЕНТИФИКАЦИЯ
// ---------------------------------------------------------------------

// 4.1. Регистрация клиента
app.post('/api/register', async (req, res) => {
    const { username, password, name, phone } = req.body;
    if (!username || !password || !name || !phone) {
        return res.status(400).json({ success: false, message: 'Пожалуйста, заполните все поля.' });
    }

    try {
        const [existingUser] = await db.query('SELECT id FROM users WHERE username = ?', [username]);
        if (existingUser.length > 0) {
            return res.status(409).json({ success: false, message: 'Пользователь с таким логином уже существует.' });
        }

        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
        
        // Находим ID роли 'client'
        const [roleResult] = await db.query("SELECT id FROM roles WHERE name = 'client'");
        if (roleResult.length === 0) {
             console.error("Ошибка: Роль 'client' не найдена в таблице roles.");
             return res.status(500).json({ success: false, message: 'Ошибка сервера: Роль клиента не определена.' });
        }
        const clientRoleId = roleResult[0].id;

        const [result] = await db.query(
            'INSERT INTO users (username, password_hash, name, phone, role_id) VALUES (?, ?, ?, ?, ?)',
            [username, passwordHash, name, phone, clientRoleId]
        );

        // Автоматический вход после регистрации
        req.session.isLoggedIn = true;
        req.session.userId = result.insertId;
        req.session.username = username;
        req.session.role = 'client'; 

        res.json({ success: true, message: 'Регистрация прошла успешно.', redirect: '/booking.html' });

    } catch (error) {
        console.error('Ошибка регистрации:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера при регистрации.' });
    }
});

// 4.2. Вход
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Введите логин и пароль.' });
    }

    try {
        // Получаем пользователя и имя его роли
        const [users] = await db.query(
            `SELECT u.id, u.password_hash, r.name AS role_name
             FROM users u
             JOIN roles r ON u.role_id = r.id
             WHERE u.username = ?`,
            [username]
        );

        if (users.length === 0) {
            return res.status(401).json({ success: false, message: 'Неверный логин или пароль.' });
        }

        const user = users[0];
        const match = await bcrypt.compare(password, user.password_hash);

        if (match) {
            // Установка сессии
            req.session.isLoggedIn = true;
            req.session.userId = user.id;
            req.session.username = username;
            req.session.role = user.role_name; 

            // Перенаправление в зависимости от роли
            let redirectUrl;
            switch (user.role_name) {
                case 'admin':
                    redirectUrl = '/admin.html';
                    break;
                case 'master':
                    redirectUrl = '/master_cabinet.html';
                    break;
                default:
                    redirectUrl = '/booking.html';
                    break;
            }

            res.json({ success: true, message: 'Вход успешен.', redirect: redirectUrl });
        } else {
            res.status(401).json({ success: false, message: 'Неверный логин или пароль.' });
        }
    } catch (error) {
        console.error('Ошибка входа:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера при входе.' });
    }
});

// 4.3. Выход
app.get('/api/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Ошибка выхода:', err);
            return res.status(500).render('error', { title: 'Ошибка', message: 'Не удалось завершить сессию.' });
        }
        res.redirect('/index.html');
    });
});


// ---------------------------------------------------------------------
// 5. API: ЗАГРУЗКА ДАННЫХ (УСЛУГИ, МАСТЕРА, КЛИЕНТЫ)
// ---------------------------------------------------------------------

// 5.1. Загрузка всех услуг
app.get('/api/services', async (req, res) => {
    try {
        // Используем duration_min
        const [rows] = await db.query('SELECT id, name, price, duration_min FROM services ORDER BY name');
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Ошибка /api/services:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера при загрузке услуг.' });
    }
});

// 5.2. Загрузка мастеров по Service ID
// ИСПРАВЛЕН: Принимает serviceId из req.query (т.к. клиентский код отправляет его так)
app.get('/api/masters', async (req, res) => {
    const { serviceId } = req.query; // Принимаем из query-параметра
    
    if (!serviceId) {
        return res.status(400).json({ success: false, message: 'Не указан ID услуги.' });
    }
    
    try {
        const sql = `
            SELECT 
                m.id AS id,    
                m.name 
            FROM masters m
            -- Соединяемся с master_service, используя ID из таблицы masters
            JOIN master_service ms ON m.id = ms.master_id
            WHERE ms.service_id = ?
            ORDER BY m.name
        `;
        // Возвращаем m.user_id как id (это users.id мастера), который используется в bookings.master_id
        const [rows] = await db.query(sql, [serviceId]);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Ошибка /api/masters:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера при загрузке мастеров.' });
    }
});

// 5.3. Загрузка всех клиентов (ТОЛЬКО ДЛЯ АДМИНА)
app.get('/api/clients', requireRole('admin'), async (req, res) => {
    try {
        const sql = `
            SELECT u.id, u.username, u.name
            FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE r.name = 'client'
            ORDER BY u.username
        `;
        const [rows] = await db.query(sql);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Ошибка /api/clients:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера при загрузке списка клиентов.' });
    }
});


// ---------------------------------------------------------------------
// 6. API: ЗАГРУЗКА СВОБОДНЫХ СЛОТОВ
// ---------------------------------------------------------------------

app.get('/api/schedule', async (req, res) => {
    const { date, masterId, serviceId } = req.query;

    if (!date || !masterId || !serviceId) {
        return res.status(400).json({ success: false, message: 'Необходимо указать дату, мастера и услугу.' });
    }

    try {
        // 1. Получаем длительность услуги
        const [serviceResult] = await db.query('SELECT duration_min FROM services WHERE id = ?', [serviceId]);
        if (serviceResult.length === 0) {
            return res.status(404).json({ success: false, message: 'Услуга не найдена.' });
        }
        const serviceDuration = serviceResult[0].duration_min;
        
        // 2. Получаем занятые слоты мастера на этот день
        const [bookings] = await db.query(
            'SELECT booking_time, service_id FROM bookings WHERE master_id = ? AND booking_date = ?',
            [masterId, date]
        );
        
        // 3. ЛОГИКА ГЕНЕРАЦИИ СВОБОДНЫХ СЛОТОВ
        const startTime = 9 * 60; // Начало рабочего дня: 9:00
        const endTime = 18 * 60; // Конец рабочего дня: 18:00
        const interval = 30; // Интервал начала записи
        const slots = [];
        
        for (let currentTime = startTime; currentTime < endTime; currentTime += interval) {
            const slotStart = new Date(0, 0, 0, 0, currentTime, 0);
            const slotEnd = new Date(0, 0, 0, 0, currentTime + serviceDuration, 0);
            
            // Если окончание слота выходит за пределы рабочего дня, пропускаем
            if (slotEnd.getHours() * 60 + slotEnd.getMinutes() > endTime) {
                continue; 
            }
            
            const slotTimeString = [slotStart.getHours(), slotStart.getMinutes()]
                .map(n => n.toString().padStart(2, '0')).join(':') + ':00';

            // Проверяем на пересечение с существующими записями
            let isBooked = false;
            for (const booking of bookings) {
                // Получаем длительность уже забронированной услуги (используем ID из bookings, чтобы быть точными)
                const [bookedServiceResult] = await db.query('SELECT duration_min FROM services WHERE id = ?', [booking.service_id]);
                const bookedServiceDuration = bookedServiceResult.length > 0 ? bookedServiceResult[0].duration_min : serviceDuration;

                // Преобразуем время бронирования (HH:MM:SS) в минуты
                const [h, m] = booking.booking_time.split(':').map(Number);
                const bookedStart = h * 60 + m;
                const bookedEnd = bookedStart + bookedServiceDuration; 
                
                // Проверка: Текущий слот пересекается с забронированным?
                // Слот А (currentTime, currentTime + serviceDuration)
                // Слот Б (bookedStart, bookedEnd)
                if (currentTime < bookedEnd && currentTime + serviceDuration > bookedStart) {
                    isBooked = true;
                    break;
                }
            }

            if (!isBooked) {
                slots.push(slotTimeString);
            }
        }
        
        res.json({ success: true, data: slots });
    } catch (error) {
        console.error('Ошибка /api/schedule:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера при загрузке расписания.' });
    }
});

// ---------------------------------------------------------------------
// 7. API: СОЗДАНИЕ И УПРАВЛЕНИЕ ЗАПИСЬЮ (BOOKING)
// ---------------------------------------------------------------------

// 7.1. Создание записи
app.post('/api/booking', async (req, res) => {
    const { clientUserId, serviceId, masterId, date, time } = req.body;
    
    // Если clientUserId не передан (обычный клиент), используем его ID из сессии
    const finalClientUserId = clientUserId || req.session.userId;
    const isAdminBooking = !!clientUserId; 

    if (!finalClientUserId || !serviceId || !masterId || !date || !time) {
        return res.status(400).json({ success: false, message: 'Необходимо заполнить все поля для записи.' });
    }

    if (!isAdminBooking && req.session.role !== 'client' && req.session.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Необходимо войти как клиент для самостоятельной записи.' });
    }

    try {
        // 1. Получаем имя и телефон клиента из users
        const [clientData] = await db.query(
            'SELECT name, phone FROM users WHERE id = ?',
            [finalClientUserId]
        );
        if (clientData.length === 0) {
            return res.status(404).json({ success: false, message: 'Данные клиента не найдены.' });
        }
        
        const { name: clientName, phone: clientPhone } = clientData[0];

        // 2. Проверяем, что слот свободен (анти-конкурентная запись)
        // Для упрощения пока проверяем только точное совпадение времени начала
        const [existingBooking] = await db.query(
            'SELECT id FROM bookings WHERE master_id = ? AND booking_date = ? AND booking_time = ?',
            [masterId, date, time]
        );

        if (existingBooking.length > 0) {
             return res.status(409).json({ success: false, message: 'Выбранный слот только что был занят. Выберите другое время.' });
        }

        // 3. Создаем запись
        // ПРИМЕЧАНИЕ: Если в таблице bookings отсутствует колонка 'status', это не вызовет ошибку, 
        // так как в INSERT она не используется.
        const [result] = await db.query(
            `INSERT INTO bookings 
             (client_user_id, client_name, client_phone, booking_date, booking_time, service_id, master_id)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [finalClientUserId, clientName, clientPhone, date, time, serviceId, masterId]
        );

        res.json({ success: true, message: 'Запись успешно создана!', bookingId: result.insertId });

    } catch (error) {
        console.error('Ошибка при создании записи:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера при создании записи.' });
    }
});


// 7.2. Получение записей клиента (Мои записи)
app.get('/api/my_bookings', requireRole('client'), async (req, res) => {
    try {
        const sql = `
            SELECT 
                b.booking_date, b.booking_time, 'Запланировано' AS status, 
                s.name AS service_name, 
                m.name AS master_name
            FROM bookings b
            JOIN services s ON b.service_id = s.id
            JOIN masters m ON b.master_id = m.id 
            WHERE b.client_user_id = ?
            ORDER BY b.booking_date, b.booking_time
        `;
        const [rows] = await db.query(sql, [req.session.userId]);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Ошибка /api/my_bookings:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера при загрузке ваших записей.' });
    }
});

// 7.3. Получение записей мастера (Кабинет мастера)
app.get('/api/master_bookings', requireRole('master'), async (req, res) => {
    try {
  const masterUserId = req.session.userId; // ID пользователя в сессии (2 для Анны, 5 для Дмитрия)
    
    const sql = `
        SELECT 
            b.booking_date,
            b.booking_time,
            s.name AS service_name,
            u.username AS client_username,
            u.name AS client_name,
            b.status
        FROM 
            bookings b
        JOIN 
            services s ON b.service_id = s.id
        JOIN 
            masters ms ON b.master_id = ms.id   -- <<< ИСПРАВЛЕНИЕ 1: ДОБАВЛЕНО СОЕДИНЕНИЕ С masters
        JOIN 
            users u ON b.client_user_id = u.id
        WHERE 
            ms.user_id = ?                     -- <<< ИСПРАВЛЕНИЕ 2: Теперь ms.user_id доступно!
        ORDER BY 
            b.booking_date, b.booking_time;
    `;
    
    const [rows] = await db.query(sql, [masterUserId]);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Ошибка /api/master_bookings:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера при загрузке расписания мастера.' });
    }
});

// 7.4. Получение всех записей (Панель Администратора)
app.get('/api/all_bookings', requireRole('admin'), async (req, res) => {
    try {
        // ИСПРАВЛЕН: Заменен b.status на 'Запланировано' AS status, чтобы избежать ошибки.
        const sql = `
            SELECT 
                b.booking_date, b.booking_time, 'Запланировано' AS status, 
                s.name AS service_name, 
                m.name AS master_name,
                uc.username AS client_username,
                uc.name AS client_name
            FROM bookings b
            JOIN services s ON b.service_id = s.id
            JOIN users uc ON b.client_user_id = uc.id 
            JOIN masters m ON b.master_id = m.id 
            ORDER BY b.booking_date, b.booking_time
        `;
        const [rows] = await db.query(sql);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Ошибка /api/all_bookings:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера при загрузке всех записей.' });
    }
});


// --------------------------------------------------------------------
// 8. МАРШРУТЫ ДЛЯ СТРАНИЦ (PUG RENDERING)
// --------------------------------------------------------------------

// Страницы, требующие авторизации
app.get('/booking.html', requireLogin, (req, res) => {
    res.render('booking');
});
app.get('/my_bookings.html', requireRole('client'), (req, res) => {
    res.render('client_bookings');
});
app.get('/master_cabinet.html', requireRole('master'), (req, res) => {
    res.render('master_cabinet');
});
app.get('/admin.html', requireRole('admin'), (req, res) => {
    res.render('admin_panel');
});

// Маршруты без авторизации
app.get('/', (req, res) => res.render('index', {}));
app.get('/index.html', (req, res) => res.render('index', {}));
app.get('/login.html', (req, res) => res.render('login', {}));
app.get('/register.html', (req, res) => res.render('register', {}));


// --------------------------------------------------------------------
// 9. ОБРАБОТКА 404
// --------------------------------------------------------------------

app.use((req, res) => {
    res.status(404).render('error', { title: '404', message: 'Страница не найдена.' });
});


// --------------------------------------------------------------------
// 10. ЗАПУСК СЕРВЕРА И ПОДКЛЮЧЕНИЕ К БД
// --------------------------------------------------------------------

(async () => {
    let connection;
    try {
        // Проверка подключения к БД
        connection = await db.getConnection(); 
        connection.release(); 
        
        console.log('✅ Успешное подключение к MySQL!');
        
        app.listen(PORT, () => {
            console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
        });

    } catch (err) {
        console.error('❌ Ошибка подключения к базе данных или запуска сервера:', err.message);
        console.error('Проверьте настройки в файле .env и статус MySQL-сервера.');
        // Выход из процесса, если БД недоступна
        process.exit(1); 
    }
})();