// Файл: routes/master.routes.js
const express = require('express');
const router = express.Router();
const { requireRole } = require('../middleware/auth.middleware');

router.use(requireRole('master'));

router.get('/dashboard', (req, res) => {
    res.render('master/dashboard', { 
        title: 'Панель Мастера', 
        user: req.user 
    });
});

module.exports = router;