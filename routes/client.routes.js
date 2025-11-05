// Файл: routes/client.routes.js
const express = require('express');
const router = express.Router();
const { requireRole } = require('../middleware/auth.middleware');
const serviceModel = require('../models/service.model'); 
const bookingModel = require('../models/booking.model'); 

router.use(requireRole('client'));

// -----------------------------------------
// 1. КАБИНЕТ КЛИЕНТА
// -----------------------------------------
router.get('/dashboard', async (req, res) => {
    try {
        // Получаем все записи для текущего пользователя (req.user.id)
        const bookings = await bookingModel.getClientBookings(req.user.id);

        res.render('client/dashboard', { 
            title: 'Личный кабинет', 
            user: req.user,
            bookings: bookings, // Передаем записи в шаблон
            message: req.query.message,
            error: req.query.error
        });
    } catch (error) {
        console.error('Ошибка загрузки дашборда клиента:', error);
        res.render('client/dashboard', { // Fallback, чтобы не обрушить страницу
            title: 'Личный кабинет', 
            user: req.user,
            bookings: [],
            message: req.query.message,
            error: 'Ошибка при загрузке ваших записей.'
        });
    }
});

// -----------------------------------------
// 2. ФОРМА ЗАПИСИ (Шаг 1: Выбор мастера)
// -----------------------------------------
router.get('/book', async (req, res) => {
    const serviceId = parseInt(req.query.serviceId);
    if (isNaN(serviceId)) {
        return res.redirect('/?error=Некорректный ID услуги. Выберите услугу с главной страницы.');
    }
    
    let masters = [];
    let serviceName = 'Выбор мастера';
    let serviceDuration = 0;

    try {
        const serviceMastersIds = await serviceModel.getMasterIdsByService(serviceId);
        const allMasters = await serviceModel.getAllMasters(); 
        
        // ИСПРАВЛЕНИЕ: Преобразование объекта для корректной передачи master_id в Pug
        masters = allMasters
            .filter(m => serviceMastersIds.includes(m.id))
            .map(m => ({
                master_id: m.id, // <-- КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ!
                name: m.name,
                specialization: m.specialization 
            }));
        
        const allServices = await serviceModel.getAllServices();
        const service = allServices.find(s => s.id == serviceId);
        
        if (service) {
            serviceName = service.name;
            serviceDuration = service.duration_min;
        }

    } catch (error) {
        console.error('Ошибка при загрузке мастеров для записи:', error);
        return res.redirect(`/client/dashboard?error=Ошибка при загрузке данных для записи: ${error.message}`);
    }

    res.render('client/book_master_time', {
        title: `Запись: ${serviceName}`,
        user: req.user,
        serviceId: serviceId,
        serviceName: serviceName,
        serviceDuration: serviceDuration,
        masters: masters,
        selectedMaster: null, 
        selectedDate: null, 
        availableSlots: null 
    });
});

// -----------------------------------------
// 3. ОБРАБОТКА ФОРМЫ (Шаг 2: Выбор времени)
// -----------------------------------------
router.post('/book/slots', async (req, res) => {
    const masterId = parseInt(req.body.masterId);
    const serviceId = parseInt(req.body.serviceId);
    const date = req.body.date;
    
    if (isNaN(masterId) || isNaN(serviceId) || !date) {
        return res.redirect(`/client/book?serviceId=${serviceId || ''}&error=Необходимо выбрать мастера и дату.`);
    }

    try {
        const { master, service } = await bookingModel.getMasterServiceDetails(masterId, serviceId);
        
        const availableSlots = await bookingModel.getAvailableSlots(masterId, serviceId, date);
        
        res.render('client/book_master_time', {
            title: `Запись: ${service.name}`,
            user: req.user,
            serviceId: serviceId,
            serviceName: service.name,
            serviceDuration: service.duration_min,
            masters: [], 
            selectedMaster: master,
            selectedDate: date,
            availableSlots: availableSlots,
        });
        
    } catch (error) {
        console.error('Ошибка поиска слотов:', error);
        res.redirect(`/client/dashboard?error=Ошибка при поиске слотов: ${error.message}`);
    }
});


// -----------------------------------------
// 4. ПОДТВЕРЖДЕНИЕ ЗАПИСИ (Шаг 3: Сохранение)
// -----------------------------------------
router.post('/book/confirm', async (req, res) => {
    const masterId = parseInt(req.body.masterId);
    const serviceId = parseInt(req.body.serviceId);
    const { startTime } = req.body; 
    const clientId = req.user.id; 
    
    if (isNaN(masterId) || isNaN(serviceId) || !startTime) {
        return res.redirect(`/client/dashboard?error=Ошибка при подтверждении записи: некорректные данные.`);
    }

    try {
        await bookingModel.createBooking(clientId, masterId, serviceId, startTime); 
        
        res.redirect('/client/dashboard?message=Вы успешно записаны!');
    } catch (error) {
        console.error('Ошибка сохранения записи:', error);
        res.redirect(`/client/dashboard?error=Ошибка при создании записи.`);
    }
});

module.exports = router;