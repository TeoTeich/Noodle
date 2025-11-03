// Файл: routes/client.routes.js
const express = require('express');
const router = express.Router();
const { requireRole } = require('../middleware/auth.middleware');

router.use(requireRole('client'));

router.get('/dashboard', (req, res) => {
    res.render('client/dashboard', { 
        title: 'Личный кабинет', 
        user: req.user 
    });
});

module.exports = router;
