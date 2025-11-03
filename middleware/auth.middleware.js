// Файл: middleware/auth.middleware.js
const authModel = require('../models/auth.model');

/**
 * Мидлвар для проверки, авторизован ли пользователь, и загрузки его данных.
 */
async function isAuthenticated(req, res, next) {
    if (req.session.userId) {
        // Если ID пользователя есть в сессии, загружаем его полные данные
        const user = await authModel.getUserDetailsById(req.session.userId);
        if (user) {
            // Сохраняем пользователя в req.user для доступа в контроллерах и Pug
            req.user = user;
            return next();
        }
    }
    // Если пользователь не найден или не авторизован, req.user = undefined
    next(); // Продолжаем, но без req.user
}

/**
 * Мидлвар, требующий авторизации И определенной роли.
 * @param {string} roleName - Требуемое имя роли ('admin', 'master', 'client')
 */
function requireRole(roleName) {
    return (req, res, next) => {
        // Проверяем, авторизован ли пользователь и совпадает ли роль
        if (req.user && req.user.role === roleName) {
            return next();
        } 
        
        // Если не авторизован или роль не подходит, перенаправляем на вход
        if (!req.user) {
            return res.redirect('/login?returnTo=' + req.originalUrl);
        }

        // Если авторизован, но роль не та (403 Forbidden)
        res.status(403).render('error', { 
            title: '403 Запрещено', 
            user: req.user,
            message: `Доступ запрещен. Требуется роль: ${roleName}. Ваша роль: ${req.user.role}.` 
        });
    };
}

module.exports = {
    isAuthenticated,
    requireRole
};