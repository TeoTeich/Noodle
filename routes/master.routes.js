// Файл: routes/master.routes.js
const express = require('express');
const router = express.Router();
const { requireRole } = require('../middleware/auth.middleware');
const masterBookingModel = require('../models/master.booking.model'); // Новый импорт
const masterModel = require('../models/master.model'); // Для получения master_id

// Применяем мидлвар для всех маршрутов мастера
router.use(requireRole('master'));

// -----------------------------------------
// 1. ДАШБОРД МАСТЕРА (Отображение записей)
// -----------------------------------------
router.get('/dashboard', async (req, res) => {
    try {
        // 1. Находим MasterId по UserID (нужно для фильтрации записей)
        const masterDetails = await masterModel.getMasterDetailsByUserId(req.user.id);
        const masterId = masterDetails ? masterDetails.id : null;

        if (!masterId) {
             return res.render('error', { message: 'Профиль мастера не найден.', user: req.user });
        }

        // 2. Получаем предстоящие записи
        const bookings = await masterBookingModel.getUpcomingBookings(masterId);
        
        res.render('master/dashboard', { 
            title: 'Кабинет Мастера', 
            user: req.user,
            bookings: bookings,
            masterId: masterId,
            message: req.query.message,
            error: req.query.error
        });
        
    } catch (error) {
        console.error('Ошибка загрузки дашборда мастера:', error);
        res.render('error', { message: 'Ошибка сервера при загрузке расписания.', user: req.user });
    }
});

// -----------------------------------------
// 2. ОБНОВЛЕНИЕ СТАТУСА ЗАПИСИ (Action)
// -----------------------------------------
router.post('/booking/status/:id', async (req, res) => {
    const bookingId = parseInt(req.params.id);
    const { newStatus } = req.body; 

    if (isNaN(bookingId) || !newStatus) {
        return res.redirect('/master/dashboard?error=Некорректные данные для обновления статуса.');
    }

    try {
        await masterBookingModel.updateBookingStatus(bookingId, newStatus);
        res.redirect('/master/dashboard?message=Статус записи успешно обновлен.');
    } catch (error) {
        console.error('Ошибка обновления статуса записи:', error);
        res.redirect(`/master/dashboard?error=Ошибка: ${error.message}`);
    }
});


module.exports = router;