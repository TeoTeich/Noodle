// Файл: routes/admin.routes.js
const express = require('express');
const router = express.Router();
const { requireRole } = require('../middleware/auth.middleware');

router.use(requireRole('admin'));

router.get('/dashboard', (req, res) => {
    res.render('admin/dashboard', { 
        title: 'Админ Панель', 
        user: req.user 
    });
});

module.exports = router;