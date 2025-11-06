// Файл: models/booking.model.js
const db = require('../config/db');

// --- СЛУЖЕБНЫЕ ФУНКЦИИ ---

// Получение информации о мастере и услуге
async function getMasterServiceDetails(masterId, serviceId) {
    const [masterRows] = await db.execute(`
        SELECT 
            m.id AS master_id, 
            m.specialization, 
            u.id AS user_id, 
            u.name
        FROM masters m
        JOIN users u ON m.user_id = u.id
        WHERE m.id = ?
    `, [masterId]);
    
    if (masterRows.length === 0) {
        throw new Error(`Мастер с ID ${masterId} не найден.`);
    }

    const [serviceRows] = await db.execute('SELECT id, name, price, duration_min FROM services WHERE id = ?', [serviceId]);

    if (serviceRows.length === 0) {
        throw new Error(`Услуга с ID ${serviceId} не найдена.`);
    }

    return {
        master: masterRows[0],
        service: serviceRows[0]
    };
}

// Получение деталей клиента (имя и телефон)
async function getClientDetails(clientId) {
    const [userRows] = await db.execute('SELECT name, phone FROM users WHERE id = ?', [clientId]);
    if (userRows.length === 0) {
        throw new Error("Клиент не найден.");
    }
    return {
        name: userRows[0].name || "Имя Клиента",
        phone: userRows[0].phone || "Телефон не указан"
    };
}

// --- ОСНОВНАЯ ЛОГИКА ---

async function getAvailableSlots(masterId, serviceId, dateString) {
    // getMasterServiceDetails гарантирует, что мастер и услуга существуют
    const { service } = await getMasterServiceDetails(masterId, serviceId);
    const duration = service.duration_min; 

    const START_HOUR = 10;
    const END_HOUR = 18;
    
    let allSlots = [];
    
    for (let hour = START_HOUR; hour < END_HOUR; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
            const slotTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
            const startTimestamp = `${dateString} ${slotTime}`;
            
            const endTime = new Date(new Date(startTimestamp).getTime() + duration * 60000);

            if (endTime.getHours() > END_HOUR || (endTime.getHours() === END_HOUR && endTime.getMinutes() > 0)) {
                 continue; 
            }

            const endHour = String(endTime.getHours()).padStart(2, '0');
            const endMinute = String(endTime.getMinutes()).padStart(2, '0');
            const endSlotTimestamp = `${dateString} ${endHour}:${endMinute}:00`;

            allSlots.push({
                start_time: startTimestamp, 
                end_time: endSlotTimestamp
            });
        }
    }
    
    const [bookedRows] = await db.execute(`
        SELECT b.booking_date, b.booking_time, s.duration_min 
        FROM bookings b 
        JOIN services s ON b.service_id = s.id 
        WHERE b.master_id = ? AND b.booking_date = ?
    `, [masterId, dateString]);

    const availableSlots = allSlots.filter(slot => {
        const slotStart = new Date(slot.start_time).getTime();
        const slotEnd = new Date(slot.end_time).getTime();

        const isOverlapping = bookedRows.some(booked => {
            const bookedStart = new Date(`${booked.booking_date} ${booked.booking_time}`).getTime();
            const bookedEnd = new Date(bookedStart + booked.duration_min * 60000).getTime();
            
            return (slotStart < bookedEnd && slotEnd > bookedStart);
        });

        return !isOverlapping;
    }).map(slot => ({
        time: slot.start_time.substring(11, 16), 
        start_time: slot.start_time,
        end_time: slot.end_time
    }));

    const uniqueSlots = Array.from(new Set(availableSlots.map(s => s.time)))
        .map(time => availableSlots.find(s => s.time === time));

    return uniqueSlots;
}

async function createBooking(clientId, masterId, serviceId, start_time) {
    const clientDetails = await getClientDetails(clientId);
    const clientName = clientDetails.name;
    const clientPhone = clientDetails.phone;

    const [bookingDate, fullBookingTime] = start_time.split(' ');
    const bookingTime = fullBookingTime.substring(0, 5); 

    const query = `
        INSERT INTO bookings 
        (client_name, client_phone, booking_date, booking_time, service_id, master_id, client_user_id, status) 
        VALUES (?, ?, ?, ?, ?, ?, ?, 'Запланировано')
    `;
    const [result] = await db.execute(query, [
        clientName, 
        clientPhone, 
        bookingDate, 
        bookingTime, 
        serviceId, 
        masterId, 
        clientId
    ]);
    return result.insertId;
}

/**
 * Получает все записи (прошедшие и предстоящие) для данного клиента.
 */
async function getClientBookings(clientId) {
    const query = `
        SELECT 
            b.id AS booking_id,
            b.booking_date,
            b.booking_time,
            b.status,
            s.name AS service_name,
            s.duration_min,
            m.specialization,
            u.name AS master_name
        FROM bookings b
        JOIN services s ON b.service_id = s.id
        JOIN masters m ON b.master_id = m.id
        JOIN users u ON m.user_id = u.id
        WHERE b.client_user_id = ?
        ORDER BY b.booking_date ASC, b.booking_time ASC; 
    `;
    const [rows] = await db.execute(query, [clientId]);
    return rows;
}

/**
 * Отменяет запись, устанавливая статус 'Отменено'.
 */
async function cancelBooking(bookingId, clientId) {
    // Убеждаемся, что только владелец записи может ее отменить
    const query = `
        UPDATE bookings 
        SET status = 'Отменено' 
        WHERE id = ? AND client_user_id = ? 
        AND status IN ('Запланировано', 'Подтверждено')
    `;
    const [result] = await db.execute(query, [bookingId, clientId]);
    
    if (result.affectedRows === 0) {
        throw new Error("Запись не найдена, уже отменена, завершена, или у вас нет прав на ее отмену.");
    }
    return true;
}

/**
 * Переносит запись на новую дату и время.
 */
async function rescheduleBooking(bookingId, clientId, newDate, newTime) {
    // Убеждаемся, что только владелец записи может ее изменить
    const query = `
        UPDATE bookings 
        SET booking_date = ?, booking_time = ?, status = 'Запланировано' 
        WHERE id = ? AND client_user_id = ? 
        AND status IN ('Запланировано', 'Подтверждено')
    `;
    const [result] = await db.execute(query, [newDate, newTime, bookingId, clientId]);
    
    if (result.affectedRows === 0) {
        throw new Error("Запись не найдена, уже отменена, завершена, или у вас нет прав на ее перенос.");
    }
    return true;
}

module.exports = {
    getAvailableSlots,
    createBooking, 
    getMasterServiceDetails,
    getClientBookings,
    cancelBooking,
    rescheduleBooking
};