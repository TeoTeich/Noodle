// public/js/admin.js

// Требует загрузки public/js/api.js, schedule.js
$(document).ready(function() {
    
    const $clientSelect = $('#client-user-id');
    const $serviceSelect = $('#service-select');
    const $masterSelect = $('#master-select');
    const $dateInput = $('#date-input');
    const $timeSelect = $('#time-select');
    const $bookingForm = $('#booking-form');
    const $messageArea = $('#message-area');
    const $submitButton = $bookingForm.find('button[type="submit"]');

    if ($clientSelect.length === 0) return;

    // Устанавливаем минимальную дату
    const today = new Date().toISOString().split('T')[0];
    $dateInput.attr('min', today);
    
    // ----------------------------------------------------------
    // 1. Загрузка списка клиентов
    // ----------------------------------------------------------
    $clientSelect.prop('disabled', true).empty().append('<option value="">Загрузка клиентов...</option>');
    $.get('/api/clients')
        .done(function(response) {
            $clientSelect.html('<option value="">-- Выберите клиента --</option>'); 
            if (response.success && response.data.length > 0) {
                 response.data.forEach(client => {
                    $clientSelect.append(`<option value="${client.id}">${client.name} (${client.username})</option>`);
                });
                $clientSelect.prop('disabled', false); 
            } else {
                $clientSelect.html('<option value="">Нет зарегистрированных клиентов</option>');
            }
        })
        .fail(function(jqXHR) { 
            const message = jqXHR.status === 403 ? 'Ошибка: Нет прав доступа (403).' :
                            jqXHR.status === 404 ? 'Ошибка: API-маршрут /api/clients не найден (404).' :
                            `Ошибка загрузки клиентов (${jqXHR.status || '500'}).`;
            $clientSelect.html(`<option value="">${message}</option>`);
        })
        .always(function() {
             // 2. В ЛЮБОМ СЛУЧАЕ ЗАПУСКАЕМ ИНИЦИАЛИЗАЦИЮ УСЛУГ
             window.loadServices($serviceSelect, $masterSelect, $timeSelect, $dateInput);
        });
        
    // ----------------------------------------------------------
    // 3. Обработчики формы
    // ----------------------------------------------------------
    
    $serviceSelect.on('change', function() {
        const serviceId = $(this).val();
        if (serviceId) {
            window.loadMasters(serviceId, $masterSelect, $dateInput); 
        } else {
            window.resetSelect($masterSelect, 'Сначала выберите услугу');
            window.resetSelect($timeSelect, 'Сначала выберите мастера и дату');
            $dateInput.prop('disabled', true).val('');
        }
    });

    $masterSelect.on('change', function() {
        const masterId = $(this).val();
        if (masterId) {
            $dateInput.prop('disabled', false); // Включаем поле Даты
            $dateInput.val(''); // Сбрасываем значение даты
            window.resetSelect($timeSelect, 'Выберите дату'); 
        } else {
            $dateInput.prop('disabled', true).val('');
            window.resetSelect($timeSelect, 'Сначала выберите мастера и дату');
        }
    });

    $dateInput.on('change', function() {
        const date = $(this).val();
        const masterId = $masterSelect.val();
        const serviceId = $serviceSelect.val();

        if (date && masterId && serviceId) {
            window.loadSchedule(date, masterId, serviceId, $timeSelect); 
        } else {
            window.resetSelect($timeSelect, 'Сначала выберите мастера и дату');
        }
    });
    
    // ----------------------------------------------------------
    // 4. Отправка формы (Submit)
    // ----------------------------------------------------------
    $bookingForm.on('submit', function(e) {
        e.preventDefault();
        
        const serviceId = $serviceSelect.val();
        const masterId = $masterSelect.val(); // Теперь это masters.id
        const date = $dateInput.val();
        const time = $timeSelect.val();
        const clientUserId = $clientSelect.val();

        if (!clientUserId || !serviceId || !masterId || !date || !time) {
            window.displayMessage($messageArea, 'Пожалуйста, заполните все поля.', false);
            return;
        }

        $submitButton.prop('disabled', true).text('Запись...');

        const bookingData = {
            clientUserId: clientUserId,
            serviceId: serviceId,
            masterId: masterId, // Отправляем корректный masters.id
            date: date,
            time: time
        };

        $.ajax({
            url: '/api/booking',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(bookingData)
        })
        .done(function(response) {
            if (response.success) {
                window.displayMessage($messageArea, response.message || 'Запись успешно создана!', true);
                
                // Очистка формы
                $bookingForm[0].reset();
                
                // Полный сброс и перезапуск инициализации формы
                window.loadServices($serviceSelect, $masterSelect, $timeSelect, $dateInput); 
                $clientSelect.prop('disabled', false);
                
                // Перезагрузка списка всех записей
                if (typeof window.loadBookings === 'function') {
                    window.loadBookings(); 
                }
            } else {
                window.displayMessage($messageArea, response.message || 'Ошибка создания записи.', false);
            }
        })
        .fail(function(jqXHR) {
            const message = jqXHR.responseJSON ? jqXHR.responseJSON.message : 'Произошла ошибка сети или сервера (500).';
            window.displayMessage($messageArea, message, false);
        })
        .always(function() {
             $submitButton.prop('disabled', false).text('Записать клиента');
        });
    });
});