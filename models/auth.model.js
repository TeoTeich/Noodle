// Файл: models/auth.model.js
const db = require('../config/db');
const bcrypt = require('bcryptjs');

// ------------------------------------------------------------------
// 1. Поиск пользователя для входа
// ------------------------------------------------------------------
async function findUserByUsername(username) {
    // Получаем user_id, hash пароля и имя роли
    const query = `
        SELECT u.id, u.username, u.password_hash, u.role_id, r.name AS role, u.name, u.phone
        FROM users u
        JOIN roles r ON u.role_id = r.id
        WHERE u.username = ?
    `;
    const [rows] = await db.execute(query, [username]);
    
    return rows.length > 0 ? rows[0] : null;
}

// ------------------------------------------------------------------
// 2. Регистрация нового клиента
// ------------------------------------------------------------------
async function registerClient(username, password, name, phone) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    
    // Получаем role_id для 'client'
    const [roleRows] = await db.execute('SELECT id FROM roles WHERE name = ?', ['client']);
    if (roleRows.length === 0) {
        throw new Error('Роль "client" не найдена в базе данных.');
    }
    const clientRoleId = roleRows[0].id;
    
    const query = `
        INSERT INTO users (username, password_hash, role_id, name, phone)
        VALUES (?, ?, ?, ?, ?)
    `;
    const [result] = await db.execute(query, [username, passwordHash, clientRoleId, name, phone]);
    return result.insertId;
}

// ------------------------------------------------------------------
// 3. Получение данных пользователя по ID (для сессии)
// ------------------------------------------------------------------
async function getUserDetailsById(userId) {
    const query = `
        SELECT u.id, u.username, u.role_id, r.name AS role, u.name, u.phone
        FROM users u
        JOIN roles r ON u.role_id = r.id
        WHERE u.id = ?
    `;
    const [rows] = await db.execute(query, [userId]);
    return rows.length > 0 ? rows[0] : null;
}

module.exports = {
    findUserByUsername,
    registerClient,
    getUserDetailsById
};