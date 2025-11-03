// Файл: config/db.js
const mysql = require('mysql2/promise');
require('dotenv').config();

// Создание пула подключений к базе данных
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    // Даты и время будут возвращаться как строки ('YYYY-MM-DD', 'HH:MM:SS')
    dateStrings: true 
});

module.exports = pool;