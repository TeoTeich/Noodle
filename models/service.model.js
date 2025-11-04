// Файл: models/service.model.js
const db = require('../config/db'); 

// ------------------------------------
// READ: Получение услуг и мастеров
// ------------------------------------

// Получение всех услуг для главной страницы и списка админа
async function getAllServices() {
    try {
        const query = 'SELECT id, name, price, duration_min FROM services ORDER BY name';
        const [rows] = await db.execute(query);
        return rows;
    } catch (error) {
        console.warn("Ошибка при получении услуг, возвращен пустой массив:", error.message);
        return []; 
    }
}

// Получение мастера по его user_id (для внутренней логики)
async function getMasterIdByUserId(userId) {
    const [rows] = await db.execute('SELECT id, specialization FROM masters WHERE user_id = ?', [userId]);
    return rows.length > 0 ? rows[0] : null;
}

// Получение всех мастеров с их user_id (для списка выбора в админке)
async function getAllMasters() {
    const query = `
        SELECT m.id, u.name, m.specialization, u.username
        FROM masters m
        JOIN users u ON m.user_id = u.id
    `;
    const [rows] = await db.execute(query);
    return rows;
}

// Получение ID мастеров, которые выполняют данную услугу
async function getMasterIdsByService(serviceId) {
    const query = `
        SELECT master_id
        FROM master_service
        WHERE service_id = ?;
    `;
    const [rows] = await db.execute(query, [serviceId]);
    return rows.map(row => row.master_id);
}

// ------------------------------------
// CRUD УСЛУГ (для Администратора)
// ------------------------------------

// C (Create) - Добавление новой услуги
async function createService(name, price, durationMin) {
    const query = 'INSERT INTO services (name, price, duration_min) VALUES (?, ?, ?)';
    const [result] = await db.execute(query, [name, price, durationMin]);
    return result.insertId;
}

// U (Update) - Обновление услуги
async function updateService(id, name, price, durationMin) {
    const query = 'UPDATE services SET name = ?, price = ?, duration_min = ? WHERE id = ?';
    const [result] = await db.execute(query, [name, price, durationMin, id]);
    return result.affectedRows;
}

// D (Delete) - Удаление услуги
async function deleteService(id) {
    // 1. Сначала удаляем все связи с мастерами
    await db.execute('DELETE FROM master_service WHERE service_id = ?', [id]);
    // 2. Удаляем саму услугу
    const query = 'DELETE FROM services WHERE id = ?';
    const [result] = await db.execute(query, [id]);
    return result.affectedRows;
}

// ------------------------------------
// CRUD СВЯЗЕЙ (master_service)
// ------------------------------------

// Обновление списка мастеров для услуги
async function updateServiceMasters(serviceId, masterIds) {
    // 1. Удаляем все старые связи для этой услуги
    await db.execute('DELETE FROM master_service WHERE service_id = ?', [serviceId]);
    
    // 2. Добавляем новые связи, если masterIds не пуст
    if (masterIds && masterIds.length > 0) {
        // Создаем массив [master_id, service_id] для массовой вставки
        const values = masterIds.map(masterId => [masterId, serviceId]);
        const query = 'INSERT INTO master_service (master_id, service_id) VALUES ?';
        // Используем db.query для массовой вставки (mysql2/promise принимает массив массивов)
        await db.query(query, [values]); 
    }
}

module.exports = {
    getAllServices,
    getMasterIdByUserId,
    getAllMasters,
    getMasterIdsByService,
    createService,
    updateService,
    deleteService,
    updateServiceMasters
};