// public/js/api.js

const API_URL = '/api'; 

/** Очищает и отключает селектор. */
window.resetSelect = function($select, defaultText) {
    $select.html(`<option value="">${defaultText}</option>`);
    $select.prop('disabled', true);
}

/** Выводит сообщение (успех/ошибка). */
window.displayMessage = function($messageArea, message, isSuccess = true) {
    $messageArea.removeClass('alert-success alert-danger').addClass(isSuccess ? 'alert-success' : 'alert-danger');
    $messageArea.text(message).fadeIn().delay(5000).fadeOut();
}

/** Отрисовка слотов в виде кнопок (для клиента, не для админа). */
window.displayTimeSlots = function(slots, $container, $submitButton) {
    $container.empty();
    $submitButton.prop('disabled', true); 
    
    if (slots.length === 0) {
        $container.html('<p class="info-text">На эту дату нет свободных слотов. Выберите другую дату.</p>');
        return;
    }

    let html = '<div class="slot-buttons">';
    slots.forEach(time => {
        const formattedTime = time.slice(0, 5); 
        html += `<button type="button" class="slot-button" data-time="${time}">${formattedTime}</button>`;
    });
    html += '</div>';

    $container.html(html);
}


/** 1. ЗАГРУЗКА УСЛУГ (Инициализация формы) */
window.loadServices = function($serviceSelect, $masterSelect, $timeTarget, $dateInput) {
    // Начальный сброс всех зависимых полей
    window.resetSelect($masterSelect, 'Сначала выберите услугу');
    $dateInput.prop('disabled', true).val('');
    
    if ($timeTarget.is('select')) {
        window.resetSelect($timeTarget, 'Сначала выберите мастера и дату');
    } else {
        $timeTarget.html('<p class="info-text">Выберите дату, чтобы увидеть свободное время.</p>');
    }
    
    $serviceSelect.prop('disabled', true).empty().append('<option value="">Загрузка услуг...</option>');

    $.get(API_URL + '/services')
        .done(function(response) {
            $serviceSelect.html('<option value="">-- Выберите услугу --</option>');
            if (response.success && response.data.length > 0) {
                response.data.forEach(service => {
                    $serviceSelect.append(`<option value="${service.id}" data-duration="${service.duration_min}">${service.name} (${service.price} руб., ${service.duration_min} мин.)</option>`);
                });
                $serviceSelect.prop('disabled', false); 
            } else {
                $serviceSelect.append('<option value="">Нет доступных услуг</option>');
            }
        })
        .fail(function() {
            $serviceSelect.html('<option value="">Ошибка загрузки услуг (Проверьте API)</option>');
        });
}

/** 2. ЗАГРУЗКА МАСТЕРОВ */
window.loadMasters = function(serviceId, $masterSelect, $dateInput) {
    window.resetSelect($masterSelect, 'Загрузка мастеров...');
    $dateInput.prop('disabled', true).val('');

    $.get(API_URL + '/masters', { serviceId: serviceId })
        .done(function(response) {
            $masterSelect.html('<option value="">-- Выберите мастера --</option>');
            if (response.success && response.data.length > 0) {
                let mastersCount = 0;
                response.data.forEach(master => {
                    // !!! КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Гарантируем, что ID является числом и не равно 0 !!!
                    const masterId = parseInt(master.id); 
                    if (!isNaN(masterId) && masterId > 0) {
                        $masterSelect.append(`<option value="${masterId}">${master.name}</option>`);
                        mastersCount++;
                    }
                });
                
                if (mastersCount > 0) {
                    $masterSelect.prop('disabled', false); 
                } else {
                    $masterSelect.html('<option value="">Для этой услуги нет доступных мастеров</option>');
                }

            } else {
                $masterSelect.html('<option value="">Для этой услуги нет доступных мастеров</option>');
            }
        })
        .fail(function() {
            $masterSelect.html('<option value="">Ошибка загрузки мастеров (Проверьте API)</option>');
        });
}


/** 3. ЗАГРУЗКА РАСПИСАНИЯ */
window.loadSchedule = function(date, masterId, serviceId, $targetElement, $submitButton = null) {
    const isSelect = $targetElement.is('select');
    
    if (isSelect) {
        window.resetSelect($targetElement, 'Загрузка расписания...');
    } else {
        $targetElement.html('<p class="info-text">Загрузка расписания...</p>');
    }

    $.get(API_URL + '/schedule', { date: date, masterId: masterId, serviceId: serviceId })
        .done(function(response) {
            if (response.success && response.data) {
                if (isSelect) {
                    // Логика для SELECT (Панель Админа)
                    $targetElement.empty();
                    if (response.data.length > 0) {
                        $targetElement.append('<option value="">-- Выберите время --</option>');
                        response.data.forEach(time => {
                            $targetElement.append(`<option value="${time}">${time.slice(0, 5)}</option>`);
                        });
                        $targetElement.prop('disabled', false);
                    } else {
                        $targetElement.append('<option value="">Нет свободных слотов</option>');
                        $targetElement.prop('disabled', true);
                    }
                } else {
                    // Логика для КНОПОК (Страница Клиента)
                    if ($submitButton) {
                         window.displayTimeSlots(response.data, $targetElement, $submitButton); 
                    }
                }
            } else {
                $targetElement.html(isSelect 
                    ? `<option value="">${response.message || 'Ошибка загрузки.'}</option>`
                    : `<p class="error-message">${response.message || 'Ошибка загрузки расписания.'}</p>`);
            }
        })
        .fail(function(jqXHR) {
            const message = jqXHR.responseJSON ? jqXHR.responseJSON.message : 'Ошибка 404/500: Не удалось получить расписание.';
            $targetElement.html(isSelect 
                ? `<option value="">${message}</option>`
                : `<p class="error-message">${message}</p>`);
        });
}