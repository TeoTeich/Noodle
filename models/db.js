// models/db.js

const mysql = require('mysql2/promise');
require('dotenv').config(); // Для загрузки переменных из .env

// Создание пула подключений к базе данных
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Проверка подключения при запуске
pool.getConnection()
    .then(connection => {
        console.log('✅ Успешное подключение к MySQL!');
        connection.release();
    })
    .catch(err => {
        console.error('❌ Ошибка подключения к MySQL:', err.message);
        console.error('Проверьте ваш файл .env и настройки MySQL.');
    });

// Экспортируем пул для выполнения запросов в других модулях
module.exports = pool;