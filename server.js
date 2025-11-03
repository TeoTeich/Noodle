// Файл: server.js
const express = require('express');
const session = require('express-session');
const path = require('path');
const db = require('./config/db'); 
const { isAuthenticated } = require('./middleware/auth.middleware');

require('dotenv').config(); 
const app = express();
const PORT = process.env.PORT || 3000;

// 1. НАСТРОЙКА MIDDLEWARE
// ===================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Настройка сессий
app.use(session({
    secret: process.env.SESSION_SECRET || 'fallback_secret', 
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 } // 24 часа
}));

// Мидлвар, который загружает req.user перед обработкой всех маршрутов
app.use(isAuthenticated); 

// Настройка шаблонизатора Pug
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// Настройка статических файлов
app.use(express.static(path.join(__dirname, 'public')));


// 2. ПОДКЛЮЧЕНИЕ МАРШРУТОВ
// ===================================
const indexRoutes = require('./routes/index.routes');
const clientRoutes = require('./routes/client.routes');
const masterRoutes = require('./routes/master.routes');
const adminRoutes = require('./routes/admin.routes');

app.use('/', indexRoutes);       
app.use('/client', clientRoutes); 
app.use('/master', masterRoutes); 
app.use('/admin', adminRoutes);   


// 3. ЗАПУСК СЕРВЕРА
// ===================================
app.use((req, res) => {
    res.status(404).render('error', { title: '404', user: req.user, message: 'Страница не найдена.' });
});

(async () => {
    try {
        const connection = await db.getConnection(); 
        connection.release(); 
        
        console.log('✅ Успешное подключение к MySQL!');
        
        app.listen(PORT, () => {
            console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('❌ ОШИБКА ЗАПУСКА: Не удалось подключиться к БД. Проверьте .env.', error.message);
        process.exit(1);
    }
})();