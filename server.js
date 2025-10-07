// server.js

const express = require('express');
const path = require('path');
const db = require('./models/db'); // Модуль подключения к БД
require('dotenv').config(); 

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Настройка Middleware
app.use(express.json()); // Для парсинга JSON-запросов (из app.js)
app.use(express.urlencoded({ extended: true })); // Для парсинга форм

// 2. Настройка PUG (View Engine)
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// 3. Обслуживание статических файлов
// Файлы из папки 'public' доступны по корневому пути ('/')
app.use(express.static(path.join(__dirname, 'public')));


// -----------------------------------------------------------------
// 4. МАРШРУТЫ ДЛЯ СТРАНИЦ (Rendering Views)
// -----------------------------------------------------------------

// Главная страница
app.get(['/', '/index.html'], (req, res) => {
    // Рендерит views/index.pug
    res.render('index', { title: 'Главная' }); 
});

// Страница онлайн-записи
app.get('/booking.html', (req, res) => {
    // Рендерит views/booking.pug
    res.render('booking', { title: 'Онлайн-запись' });
});

// -----------------------------------------------------------------
// 5. API-МАРШРУТЫ (REST API endpoints)
// -----------------------------------------------------------------

// 5.1. GET /api/services - Получить список всех услуг
app.get('/api/services', async (req, res) => {
    try {
        const sql = 'SELECT id, name, price, duration_min FROM services';
        const [rows] = await db.query(sql);
        res.json(rows);
    } catch (error) {
        console.error('Ошибка получения услуг:', error);
        res.status(500).json({ message: 'Ошибка сервера при загрузке услуг.' });
    }
});

// 5.2. GET /api/masters/:serviceId - Получить мастеров по услуге
app.get('/api/masters/:serviceId', async (req, res) => {
    const { serviceId } = req.params;
    try {
        const sql = `
            SELECT m.id, m.name 
            FROM masters m
            JOIN master_service ms ON m.id = ms.master_id
            WHERE ms.service_id = ?
        `;
        const [rows] = await db.query(sql, [serviceId]);
        res.json(rows);
    } catch (error) {
        console.error('Ошибка получения мастеров:', error);
        res.status(500).json({ message: 'Ошибка сервера при загрузке мастеров.' });
    }
});

// 5.3. GET /api/slots/:masterId/:date - Получить свободные слоты
app.get('/api/slots/:masterId/:date', async (req, res) => {
    const { masterId, date } = req.params;
    
    // ВРЕМЯ РАБОТЫ (Для упрощения: каждый час с 10:00 до 17:00)
    const allSlots = ['10:00:00', '11:00:00', '12:00:00', '14:00:00', '15:00:00', '16:00:00', '17:00:00'];
    
    try {
        // 1. Получаем все занятые слоты на эту дату и для этого мастера
        const [occupiedSlots] = await db.query(
            'SELECT TIME_FORMAT(booking_time, "%H:%i:%s") as time FROM bookings WHERE master_id = ? AND booking_date = ?', 
            [masterId, date]
        );
        
        const occupiedTimeStrings = occupiedSlots.map(slot => slot.time);
        
        // 2. Фильтруем общее расписание
        const freeSlots = allSlots.filter(slot => !occupiedTimeStrings.includes(slot));
        
        // 3. Возвращаем слоты в формате 'ЧЧ:ММ'
        res.json(freeSlots.map(time => time.substring(0, 5))); 
    } catch (error) {
        console.error('Ошибка получения слотов:', error);
        res.status(500).json({ message: 'Ошибка сервера при загрузке слотов.' });
    }
});

// 5.4. POST /api/booking - Создание записи
app.post('/api/booking', async (req, res) => {
    const { serviceId, masterId, date, time, clientName, clientPhone } = req.body;

    if (!serviceId || !masterId || !date || !time || !clientName || !clientPhone) {
        return res.status(400).json({ message: 'Заполнены не все обязательные поля.' });
    }

    try {
        // Проверка: свободен ли слот (повторная проверка для безопасности)
        const [existingBooking] = await db.query(
            'SELECT id FROM bookings WHERE master_id = ? AND booking_date = ? AND booking_time = ?', 
            [masterId, date, time + ':00'] 
        );
        
        if (existingBooking.length > 0) {
            return res.status(409).json({ message: 'Выбранный слот только что был занят. Попробуйте обновить страницу.' });
        }

        // Вставка новой записи
        const sql = `
            INSERT INTO bookings (client_name, client_phone, booking_date, booking_time, service_id, master_id)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        const [result] = await db.query(sql, [clientName, clientPhone, date, time + ':00', serviceId, masterId]);
        
        res.json({ success: true, bookingId: result.insertId, message: 'Запись успешно создана!' });
        
    } catch (error) {
        console.error('Ошибка создания записи:', error);
        res.status(500).json({ message: 'Ошибка сервера при создании записи.' });
    }
});

// 6. Запуск сервера
app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
});