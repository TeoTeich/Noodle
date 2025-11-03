// Файл: models/service.model.js
const db = require('../config/db'); 

// ------------------------------------
// READ: Получение услуг
// ------------------------------------

async function getAllServices() {
    try {
        // Мы используем существующие столбцы: id, name, price, duration_min
        const query = 'SELECT id, name, price, duration_min FROM services ORDER BY name';
        const [rows] = await db.execute(query);
        return rows;
    } catch (error) {
        // Если что-то пошло не так (например, ошибка SQL), мы это ловим.
        console.warn("Ошибка SQL в getAllServices:", error.message);
        // Возвращаем пустой массив, чтобы главная страница загрузилась
        return []; 
    }
}

// ------------------------------------
// Заглушки для Этапа 1/2
// ------------------------------------

async function getMastersByService() { return []; } 
async function getMasterIdByUserId() { return null; }
async function getAllMasters() { return []; } 

module.exports = {
    getAllServices,
    getMastersByService,
    getMasterIdByUserId,
    getAllMasters
};