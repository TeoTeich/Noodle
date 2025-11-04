// Файл: models/master.model.js
console.log("MASTER MODEL IS RUNNING THE TEST VERSION V4.2.1");
const db = require('../config/db');

// ------------------------------------
// READ: Служебные функции
// ------------------------------------

// Получение ID роли 'master'
async function getMasterRoleId() {
    const [rows] = await db.execute('SELECT id FROM roles WHERE name = ?', ['master']);
    return rows.length > 0 ? rows[0].id : null;
}

// Получение всех мастеров с информацией о пользователе (Для админ-панели)
async function getAllMastersWithUserDetails() {
    const query = `
        SELECT 
            m.id AS master_id, 
            m.specialization, 
            u.id AS user_id, 
            u.username, 
            u.name,
            u.phone
        FROM masters m
        JOIN users u ON m.user_id = u.id
        ORDER BY u.name;
    `;
    const [rows] = await db.execute(query);
    return rows;
}

// ------------------------------------
// CRUD МАСТЕРОВ
// ------------------------------------

// C (Create) - Добавление нового мастера
async function createMaster(username, specialization) {
    const masterRoleId = await getMasterRoleId();
    if (!masterRoleId) {
        throw new Error("Роль 'master' не найдена в базе данных.");
    }

    // 1. Находим существующего пользователя по username
    // Обязательно запрашиваем поле name, чтобы вставить его в masters
    const [userRows] = await db.execute('SELECT id, role_id, name FROM users WHERE username = ?', [username]);
    
    if (userRows.length === 0) {
        throw new Error(`Пользователь с логином "${username}" не найден.`);
    }
    
    const userId = userRows[0].id;
    const currentRoleId = userRows[0].role_id;
    const currentName = userRows[0].name; 

    // 2. Проверяем, не является ли пользователь уже мастером
    const [existingMaster] = await db.execute('SELECT id FROM masters WHERE user_id = ?', [userId]);
    if (existingMaster.length > 0) {
        throw new Error(`Пользователь "${username}" уже является мастером.`);
    }

    // 3. ОБНОВЛЯЕМ имя и роль пользователя (на случай, если name было NULL)
    // Мы принудительно устанавливаем имя как username, если оно отсутствует.
    const nameToUpdate = currentName || username; 
    
    const updateQuery = 'UPDATE users SET role_id = ?, name = ? WHERE id = ?';
    await db.execute(updateQuery, [masterRoleId, nameToUpdate, userId]);
    
    // 4. Добавляем запись в таблицу masters. 
    // ВНИМАНИЕ: ДОБАВЛЯЕМ 'name' в запрос, чтобы удовлетворить ограничение NOT NULL в таблице masters.
    const insertMasterQuery = 'INSERT INTO masters (user_id, name, specialization) VALUES (?, ?, ?)';
    const [masterResult] = await db.execute(insertMasterQuery, [userId, nameToUpdate, specialization]); // Передаем nameToUpdate
    
    return masterResult.insertId;
}

// U (Update) - Обновление данных мастера
async function updateMaster(masterId, name, phone, specialization) {
    // 1. Обновляем информацию в таблице users
    const [masterDetails] = await db.execute('SELECT user_id FROM masters WHERE id = ?', [masterId]);
    if (masterDetails.length === 0) {
        throw new Error('Мастер не найден.');
    }
    const userId = masterDetails[0].user_id;

    await db.execute('UPDATE users SET name = ?, phone = ? WHERE id = ?', [name, phone, userId]);

    // 2. Обновляем информацию в таблице masters
    await db.execute('UPDATE masters SET specialization = ? WHERE id = ?', [specialization, masterId]);
}

// D (Delete) - Удаление мастера
async function deleteMaster(masterId) {
    // 1. Находим user_id
    const [masterDetails] = await db.execute('SELECT user_id FROM masters WHERE id = ?', [masterId]);
    if (masterDetails.length === 0) {
        return; 
    }
    const userId = masterDetails[0].user_id;
    
    // 2. Удаляем связи мастера с услугами
    await db.execute('DELETE FROM master_service WHERE master_id = ?', [masterId]);
    
    // 3. Удаляем мастера из таблицы masters
    await db.execute('DELETE FROM masters WHERE id = ?', [masterId]);

    // 4. Понижаем роль пользователя обратно до клиента
    const clientRoleId = (await db.execute('SELECT id FROM roles WHERE name = ?', ['client']))[0][0].id;
    await db.execute('UPDATE users SET role_id = ? WHERE id = ?', [clientRoleId, userId]);
}

module.exports = {
    getAllMastersWithUserDetails,
    createMaster,
    updateMaster,
    deleteMaster,
};