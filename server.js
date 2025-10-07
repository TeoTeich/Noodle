// server.js

// ---------------------------------------------------------------------
// 1. КОНФИГУРАЦИЯ И ЗАВИСИМОСТИ
// ---------------------------------------------------------------------
const express = require('express');
const path = require('path');
const db = require('./models/db'); // Модуль для подключения к MySQL
require('dotenv').config(); // Загрузка переменных окружения
const bcrypt = require('bcrypt');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 3000;

// ---------------------------------------------------------------------
// 2. MIDDLEWARE И НАСТРОЙКА СЕССИЙ
// ---------------------------------------------------------------------
app.use(express.json()); // Для обработки JSON-запросов (API)
app.use(express.urlencoded({ extended: true })); // Для обработки данных из HTML-форм

// Настройка PUG
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// Настройка статических файлов (CSS, JS, изображения)
app.use(express.static(path.join(__dirname, 'public')));

// Настройка сессий
app.use(session({
    secret: 'YOUR_VERY_STRONG_SECRET_KEY', // !!! Замените на длинный случайный ключ
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 } // 24 часа
}));

// ---------------------------------------------------------------------
// 3. MIDDLEWARE АВТОРИЗАЦИИ (REQUIRE ROLE)
// ---------------------------------------------------------------------

/**
 * Middleware для проверки, что пользователь авторизован и имеет нужную роль
 * @param {string} requiredRole - Требуемая роль ('master', 'admin', 'client')
 */
function requireRole(requiredRole) {
    return (req, res, next) => {
        // 1. Проверка авторизации
        if (!req.session.userId) {
            console.log(`[AUTH] Доступ запрещен. Требуется ${requiredRole}. Перенаправление на login.`);
            return res.redirect('/login.html');
        }

        // 2. Проверка роли
        // Приводим роль из сессии к нижнему регистру для надежности
        const userRole = req.session.roleName ? req.session.roleName.toLowerCase() : '';

        if (userRole !== requiredRole) {
            console.log(`[AUTH] Доступ запрещен. Пользователь: ${req.session.username}, Роль: ${userRole}.`);
            // Если авторизован, но роль не совпадает -> ошибка доступа
            return res.status(403).render('error', { 
                title: 'Доступ запрещен', 
                message: 'У вас нет прав для просмотра этой страницы.' 
            });
        }
        
        // 3. Доступ разрешен
        next();
    };
}

// ---------------------------------------------------------------------
// 4. МАРШРУТЫ РЕНДЕРИНГА PUG
// ---------------------------------------------------------------------

// Главная страница
app.get('/', (req, res) => {
    res.render('index', { username: req.session.username });
});
app.get('/index.html', (req, res) => {
    res.render('index', { username: req.session.username });
});

// Страница записи (доступна всем)
app.get('/booking.html', (req, res) => {
    res.render('booking', { username: req.session.username });
});

// Страницы аутентификации
app.get('/login.html', (req, res) => {
    res.render('login', { title: 'Вход в систему', error: null });
});

app.get('/register.html', (req, res) => {
    res.render('register', { title: 'Регистрация', error: null });
});

// Защищенные маршруты
app.get('/master_cabinet.html', requireRole('master'), (req, res) => {
    res.render('master_cabinet', { 
        title: 'Кабинет Мастера',
        username: req.session.username 
    });
});

app.get('/admin.html', requireRole('admin'), (req, res) => {
    res.render('admin_panel', { 
        title: 'Панель Администратора',
        username: req.session.username 
    });
});


// ---------------------------------------------------------------------
// 5. API-МАРШРУТЫ
// ---------------------------------------------------------------------

// 5.1. POST /api/register - Обработка регистрации клиента
app.post('/api/register', async (req, res) => {
    const { username, password, name, phone } = req.body;
    
    // ... (проверка полей)

    try {
        // Проверка, существует ли пользователь
        const [existingUsers] = await db.query('SELECT id FROM users WHERE username = ?', [username]);
        if (existingUsers.length > 0) {
            return res.status(409).json({ message: 'Пользователь с таким логином уже существует.' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const roleId = 1; // Роль по умолчанию: Клиент

        const insertUserSql = `INSERT INTO users (username, password_hash, role_id) VALUES (?, ?, ?)`;
        const [userResult] = await db.query(insertUserSql, [username, passwordHash, roleId]);
        
        // Автоматический вход
        req.session.userId = userResult.insertId;
        req.session.username = username;
        req.session.roleId = roleId;
        req.session.roleName = 'client';

        // !!! ИСПРАВЛЕНО: Используем return
        return res.json({ success: true, message: 'Регистрация прошла успешно', redirect: '/booking.html' });

    } catch (error) {
        console.error('Ошибка регистрации:', error);
        // !!! ИСПРАВЛЕНО: Используем return
        return res.status(500).json({ message: 'Внутренняя ошибка сервера при регистрации.' });
    }
});


// 5.2. POST /api/login - Обработка входа
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        // 1. Найти пользователя по имени, получить имя роли
        const [users] = await db.query('SELECT u.id, u.username, u.password_hash, u.role_id, r.name AS role_name FROM users u JOIN roles r ON u.role_id = r.id WHERE u.username = ?', [username]);

        if (users.length === 0) {
            return res.status(401).json({ message: 'Неверное имя пользователя или пароль.' });
        }
        
        const user = users[0];

        // 2. Сравнить пароль с хешем
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            return res.status(401).json({ message: 'Неверное имя пользователя или пароль.' });
        }

        // 3. Создать сессию
        req.session.userId = user.id;
        req.session.username = user.username;
        req.session.roleId = user.role_id;
        // Приводим роль к нижнему регистру для надежной проверки
        const roleNameLower = user.role_name.toLowerCase(); 
        req.session.roleName = roleNameLower; 

        // [LOGIN DEBUG] Пользователь ${user.username} вошел. Роль из БД: ${user.role_name}

        // 4. Определяем, куда перенаправить
        let redirectUrl = '/booking.html'; // По умолчанию для Client
        
        if (roleNameLower === 'admin') {
            redirectUrl = '/admin.html';
        } else if (roleNameLower === 'master') {
            redirectUrl = '/master_cabinet.html';
        }
        
        // !!! ИСПРАВЛЕНО: Добавляем return
        return res.json({ success: true, message: 'Вход успешен', redirect: redirectUrl });

    } catch (error) {
        console.error('Ошибка входа:', error);
        // !!! ИСПРАВЛЕНО: Добавляем return
        return res.status(500).json({ message: 'Внутренняя ошибка сервера.' });
    }
});


// 5.3. GET /api/logout - Выход
app.get('/api/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Ошибка выхода:', err);
        }
        res.redirect('/');
    });
});

// 5.4. GET /api/services - Загрузка услуг
app.get('/api/services', async (req, res) => {
    try {
        const [services] = await db.query('SELECT id, name, price, duration_min FROM services');
        res.json({ success: true, data: services });
    } catch (error) {
        console.error('Ошибка загрузки услуг:', error);
        res.status(500).json({ success: false, message: 'Не удалось загрузить услуги.' });
    }
});

// 5.5. GET /api/masters - Загрузка мастеров по услуге
app.get('/api/masters', async (req, res) => {
    const serviceId = req.query.serviceId;
    // ... (Логика запроса к masters, master_service и users)
    // Сейчас заглушка
    res.json({ success: true, data: [{ id: 1, name: 'Анна' }, { id: 2, name: 'Дмитрий' }] }); 
});

// 5.6. GET /api/time_slots - Загрузка свободного времени
app.get('/api/time_slots', async (req, res) => {
    const { masterId, date } = req.query;
    // ... (Сложная логика расчета свободного времени)
    // Сейчас заглушка
    res.json({ success: true, data: ['10:00', '11:00', '12:00', '14:00', '15:00'] }); 
});

// 5.7. POST /api/booking - Финальное бронирование
app.post('/api/booking', async (req, res) => {
    const { serviceId, masterId, date, time, clientName, clientPhone } = req.body;
    // ... (Логика вставки в таблицу bookings)
    // Сейчас заглушка
    res.json({ success: true, message: 'Запись успешно создана!' });
});


// ---------------------------------------------------------------------
// 6. ЗАПУСК СЕРВЕРА И ПОДКЛЮЧЕНИЕ К БД
// ---------------------------------------------------------------------

// Используем асинхронную IIFE (Immediately Invoked Function Expression)
// для корректного использования await при проверке подключения к пулу.
(async () => {
    let connection;
    try {
        // Проверяем, что пул работает, получая и сразу освобождая соединение
        connection = await db.getConnection(); 
        connection.release(); 
        
        console.log('✅ Успешное подключение к MySQL!');
        
        // Запускаем сервер только после успешного подключения к БД
        app.listen(PORT, () => {
            console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
        });
    } catch (err) {
        console.error('❌ Ошибка подключения к MySQL:', err.message);
        console.error('Проверьте ваш файл .env и настройки MySQL!');
        process.exit(1);
    }
})();