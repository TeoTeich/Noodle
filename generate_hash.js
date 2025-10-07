// generate_hash.js

const bcrypt = require('bcrypt');

// ==========================================================
// 1. ИЗМЕНИТЕ ЭТОТ ПАРОЛЬ! 
// Введите пароль, который вы хотите установить для Мастера/Админа
// ==========================================================
const passwordToHash = 'admin1234'; // <-- СЮДА ВПИШИТЕ ВАШ ПАРОЛЬ

// 2. Количество раундов соления (должно совпадать с логикой в server.js)
const saltRounds = 10; 

console.log(`Генерация хеша для пароля: "${passwordToHash}"...`);

bcrypt.hash(passwordToHash, saltRounds, function(err, hash) {
    if (err) {
        console.error('Ошибка при хешировании:', err);
        return;
    }
    
    console.log('==================================================');
    console.log(`Пароль для входа: ${passwordToHash}`);
    console.log(`✅ ГОТОВЫЙ ХЕШ (КОПИРОВАТЬ НИЖЕ):`);
    console.log(hash); 
    console.log('==================================================');
    console.log('Используйте этот хеш для обновления таблицы users в MySQL.');
});