// Файл: models/master.booking.model.js
const db = require('../config/db');

/**
 * Получает все предстоящие записи для данного мастера.
 * Предстоящие записи - это те, которые еще не завершены и не отменены.
 */
async function getUpcomingBookings(masterId) {
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
        WHERE b.master_id = ?
        AND b.status IN ('Запланировано', 'Подтверждено')
        ORDER BY b.booking_date ASC, b.booking_time ASC;
    `;
    const [rows] = await db.execute(query, [masterId]);
    return rows;
}

/**
 * Обновляет статус конкретной записи.
 */
async function updateBookingStatus(bookingId, newStatus) {
    // Простая проверка, чтобы избежать SQL-инъекций и некорректных статусов
    const validStatuses = ['Запланировано', 'Подтверждено', 'Завершено', 'Отменено'];
    if (!validStatuses.includes(newStatus)) {
        throw new Error('Недопустимый статус записи.');
    }
    
    const query = 'UPDATE bookings SET status = ? WHERE id = ?';
    await db.execute(query, [newStatus, bookingId]);
    return true;
}

module.exports = {
    getUpcomingBookings,
    updateBookingStatus
};