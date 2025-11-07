// Файл: routes/index.routes.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const authModel = require('../models/auth.model');
const serviceModel = require('../models/service.model');

// =========================================================
// 1. ГЛАВНАЯ СТРАНИЦА
// =========================================================
router.get('/', async (req, res) => {
    try {
        const services = await serviceModel.getAllServices(); 
        res.render('index', { 
            title: 'Главная | Noodle Salon', 
            services: services,
            user: req.user 
        });
    } catch (error) {
        res.render('error', { message: 'Не удалось загрузить услуги.', user: req.user });
    }
});

// =========================================================
// 2. ВХОД
// =========================================================
router.get('/login', (req, res) => {
    if (req.user) {
        return res.redirect('/' + req.user.role + '/dashboard');
    }
    res.render('login', { title: 'Вход', returnTo: req.query.returnTo });
});

router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await authModel.findUserByUsername(username);
    
    if (user && await bcrypt.compare(password, user.password_hash)) {
        req.session.userId = user.id;
        
        // Перенаправление
        const redirectUrl = req.body.returnTo && req.body.returnTo !== 'undefined'
            ? req.body.returnTo
            : '/' + user.role + '/dashboard';

        return res.redirect(redirectUrl);
    } else {
        res.render('login', { 
            title: 'Вход',
            error: 'Неверное имя пользователя или пароль.'
        });
    }
});

// =========================================================
// 3. РЕГИСТРАЦИЯ
// =========================================================
router.get('/register', (req, res) => {
    res.render('register', { title: 'Регистрация' });
});

router.post('/register', async (req, res) => {
    const { username, password, name, phone } = req.body;
    
    try {
        if (await authModel.findUserByUsername(username)) {
            return res.render('register', { error: 'Пользователь с таким именем уже существует.' });
        }
        
        const newUserId = await authModel.registerClient(username, password, name, phone);
        
        req.session.userId = newUserId;
        
        res.redirect('/client/dashboard?message=Вы успешно зарегистрированы!');
        
    } catch (error) {
        console.error('Ошибка при регистрации:', error);
        res.render('register', { error: 'Ошибка сервера при регистрации.' });
    }
});

// =========================================================
// 4. ВЫХОД
// =========================================================
router.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).send('Ошибка выхода');
        }
        res.redirect('/');
    });
});

module.exports = router;