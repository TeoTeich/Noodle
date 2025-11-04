// Файл: routes/admin.routes.js
const express = require('express');
const router = express.Router();
const { requireRole } = require('../middleware/auth.middleware');
const serviceModel = require('../models/service.model'); 
const masterModel = require('../models/master.model');
// Применяем мидлвар для всех маршрутов в этом файле
router.use(requireRole('admin'));

// -----------------------------------------
// 1. АДМИН ДАШБОРД (Dashboard)
// -----------------------------------------
router.get('/dashboard', (req, res) => {
    res.render('admin/dashboard', { 
        title: 'Админ Панель', 
        user: req.user 
    });
});

// -----------------------------------------
// 2. CRUD УСЛУГ (/admin/services)
// -----------------------------------------

// R (Read) - Список услуг
router.get('/services', async (req, res) => {
    try {
        const services = await serviceModel.getAllServices();
        // ВНИМАНИЕ: На этом этапе таблица masters может быть пустой, но это нормально.
        const masters = await serviceModel.getAllMasters(); 
        
        // Для каждой услуги нужно получить список ID связанных мастеров
        const servicesWithMasters = await Promise.all(services.map(async (service) => {
            const masterIds = await serviceModel.getMasterIdsByService(service.id);
            return {
                ...service,
                masterIds: masterIds 
            };
        }));
        
        res.render('admin/services', { 
            title: 'Управление Услугами', 
            services: servicesWithMasters,
            masters: masters,
            message: req.query.message,
            error: req.query.error
        });
    } catch (error) {
        console.error('Ошибка загрузки услуг:', error);
        res.render('error', { message: 'Не удалось загрузить данные услуг.', user: req.user });
    }
});

// C (Create) - Добавление новой услуги
router.post('/services/add', async (req, res) => {
    const { name, price, duration_min, master_ids } = req.body;
    
    // master_ids может быть строкой, массивом или undefined. Приводим к массиву чисел.
    const masterIdsArray = Array.isArray(master_ids) 
        ? master_ids.map(Number) 
        : (master_ids ? [Number(master_ids)] : []);

    try {
        const serviceId = await serviceModel.createService(name, price, duration_min);
        await serviceModel.updateServiceMasters(serviceId, masterIdsArray);
        
        res.redirect('/admin/services?message=Услуга успешно добавлена!');
    } catch (error) {
        console.error('Ошибка добавления услуги:', error);
        res.redirect('/admin/services?error=Ошибка при добавлении услуги.');
    }
});

// U (Update) - Обновление услуги
router.post('/services/edit/:id', async (req, res) => {
    const serviceId = req.params.id;
    const { name, price, duration_min, master_ids } = req.body;
    
    const masterIdsArray = Array.isArray(master_ids) 
        ? master_ids.map(Number) 
        : (master_ids ? [Number(master_ids)] : []);

    try {
        await serviceModel.updateService(serviceId, name, price, duration_min);
        await serviceModel.updateServiceMasters(serviceId, masterIdsArray);
        
        res.redirect('/admin/services?message=Услуга успешно обновлена!');
    } catch (error) {
        console.error('Ошибка обновления услуги:', error);
        res.redirect('/admin/services?error=Ошибка при обновлении услуги.');
    }
});

// D (Delete) - Удаление услуги
router.post('/services/delete/:id', async (req, res) => {
    const serviceId = req.params.id;
    try {
        await serviceModel.deleteService(serviceId);
        res.redirect('/admin/services?message=Услуга успешно удалена.');
    } catch (error) {
        console.error('Ошибка удаления услуги:', error);
        res.redirect('/admin/services?error=Ошибка при удалении услуги. Возможно, на нее есть записи.');
    }
});

// -----------------------------------------
// 3. CRUD МАСТЕРОВ (/admin/masters)
// -----------------------------------------

// R (Read) - Список мастеров
router.get('/masters', async (req, res) => {
    try {
        const masters = await masterModel.getAllMastersWithUserDetails();
        res.render('admin/masters', { 
            title: 'Управление Мастерами', 
            masters: masters,
            user: req.user,
            message: req.query.message,
            error: req.query.error
        });
    } catch (error) {
        console.error('Ошибка загрузки мастеров:', error);
        res.render('error', { message: 'Не удалось загрузить данные мастеров.', user: req.user });
    }
});

// C (Create) - Добавление нового мастера
router.post('/masters/add', async (req, res) => {
    const { username, specialization } = req.body;
    
    try {
        // ИСПРАВЛЕНО: Передаем только 2 аргумента: username и specialization
        await masterModel.createMaster(username, specialization); 
        
        res.redirect('/admin/masters?message=Мастер успешно добавлен!');
    } catch (error) {
        console.error('Ошибка добавления мастера:', error.message);
        res.redirect(`/admin/masters?error=Ошибка при добавлении мастера: ${error.message}`);
    }
});

// U (Update) - Обновление мастера
router.post('/masters/edit/:id', async (req, res) => {
    const masterId = req.params.id;
    const { name, phone, specialization } = req.body;

    try {
        await masterModel.updateMaster(masterId, name, phone, specialization);
        res.redirect('/admin/masters?message=Данные мастера успешно обновлены!');
    } catch (error) {
        console.error('Ошибка обновления мастера:', error);
        res.redirect('/admin/masters?error=Ошибка при обновлении мастера.');
    }
});

// D (Delete) - Удаление мастера
router.post('/masters/delete/:id', async (req, res) => {
    const masterId = req.params.id;
    try {
        await masterModel.deleteMaster(masterId);
        res.redirect('/admin/masters?message=Мастер успешно удален и переведен в клиенты.');
    } catch (error) {
        console.error('Ошибка удаления мастера:', error);
        res.redirect('/admin/masters?error=Ошибка при удалении мастера.');
    }
});

module.exports = router;