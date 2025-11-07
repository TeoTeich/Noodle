// models/master.booking.model.js
const db = require('../config/db');

/**
 * Получает предстоящие записи для мастера с опциональной сортировкой и фильтрацией.
 * @param {number} masterId ID мастера.
 * @param {string} sortBy Поле для сортировки ('date_asc', 'date_desc', 'client_asc').
 * @param {string | null} filterDate Фильтр по дате (YYYY-MM-DD).
 * @param {string | null} filterClientName Фильтр по части имени клиента.
 */
async function getMasterBookings(masterId, sortBy = 'date_asc', filterDate = null, filterClientName = null) {
    let orderByClause = '';
    let whereClauses = [`b.master_id = ?`, `b.status IN ('Запланировано', 'Подтверждено')`];
    let params = [masterId];

    // --- 1. ДОБАВЛЕНИЕ ФИЛЬТРОВ WHERE ---
    
    if (filterDate) {
        whereClauses.push(`b.booking_date = ?`);
        params.push(filterDate);
    }

    if (filterClientName) {
        // Добавляем LIKE для поиска по части имени
        whereClauses.push(`b.client_name LIKE ?`);
        params.push(`%${filterClientName}%`);
    }

    // --- 2. ОПРЕДЕЛЕНИЕ СОРТИРОВКИ ---

    switch (sortBy) {
        case 'date_desc':
            orderByClause = 'ORDER BY b.booking_date DESC, b.booking_time DESC';
            break;
        case 'client_asc':
            orderByClause = 'ORDER BY b.client_name ASC';
            break;
        case 'date_asc':
        default:
            orderByClause = 'ORDER BY b.booking_date ASC, b.booking_time ASC';
            break;
    }
    
    // --- 3. СБОРКА ЗАПРОСА ---

    const query = `
        SELECT 
            b.id AS booking_id,
            b.client_name,
            b.client_phone,
            b.booking_date,
            b.booking_time,
            b.status,
            s.name AS service_name,
            s.duration_min
        FROM bookings b
        JOIN services s ON b.service_id = s.id
        WHERE ${whereClauses.join(' AND ')}
        ${orderByClause};
    `;
    
    // Выполнение запроса с динамическими параметрами
    const [rows] = await db.execute(query, params);
    return rows;
}

/**
 * Обновляет статус конкретной записи. (Без изменений)
 */
async function updateBookingStatus(bookingId, newStatus) {
    const validStatuses = ['Запланировано', 'Подтверждено', 'Завершено', 'Отменено'];
    if (!validStatuses.includes(newStatus)) {
        throw new Error('Недопустимый статус записи.');
    }
    
    const query = 'UPDATE bookings SET status = ? WHERE id = ?';
    await db.execute(query, [newStatus, bookingId]);
    return true;
}

module.exports = {
    getMasterBookings,
    updateBookingStatus
};