// public/js/app.js
// Требует загрузки public/js/api.js (он должен быть загружен первым)

$(document).ready(function() {

    // --- Константы и селекторы ---
    const $form = $('#booking-form');
    // Выход, если мы не на странице записи
    if ($form.length === 0) return;

    const $serviceSelect = $('#service-select');
    const $masterSelect = $('#master-select');
    const $dateInput = $('#booking-date');
    const $timeSlotsContainer = $('#time-slots');
    const $submitButton = $('#submit-booking');
    const $statusMessage = $('#status-message');

    let selectedTime = null; // Выбранное время в формате ЧЧ:ММ:СС

    // -----------------------------------------------------------------
    // A. Инициализация и обработчики
    // -----------------------------------------------------------------
    
    function initBookingForm() {
        // Устанавливаем минимальную дату
        const today = new Date().toISOString().split('T')[0];
        $dateInput.attr('min', today);
        
        // Загрузка услуг
        // loadServices теперь глобальная в api.js
        loadServices($serviceSelect, $masterSelect, $timeSlotsContainer, $dateInput); 
    }
    
    // Обработка выбора Услуги
    $serviceSelect.on('change', function() {
        const serviceId = $(this).val();
        if (serviceId) {
            loadMasters(serviceId, $masterSelect, $dateInput); // loadMasters теперь глобальная
        } else {
            resetSelect($masterSelect, 'Сначала выберите услугу'); 
            $dateInput.prop('disabled', true).val('');
            $timeSlotsContainer.html('<p class="info-text">Выберите дату, чтобы увидеть свободное время.</p>');
            $submitButton.prop('disabled', true);
        }
        selectedTime = null;
    });
    
    // Обработка выбора Мастера
    $masterSelect.on('change', function() {
        const masterId = $(this).val();
        if (masterId) {
            $dateInput.prop('disabled', false); 
            $dateInput.val(''); 
            $timeSlotsContainer.html('<p class="info-text">Выберите дату, чтобы увидеть свободное время.</p>');
        } else {
            $dateInput.prop('disabled', true).val('');
            $timeSlotsContainer.html('<p class="info-text">Выберите мастера, чтобы выбрать дату.</p>');
        }
        $submitButton.prop('disabled', true);
        selectedTime = null;
    });

    // Обработка выбора Даты
    $dateInput.on('change', function() {
        const date = $(this).val();
        const masterId = $masterSelect.val();
        const serviceId = $serviceSelect.val();

        if (date && masterId && serviceId) {
            // Вызываем глобальную loadSchedule и передаем $submitButton
            loadSchedule(date, masterId, serviceId, $timeSlotsContainer, $submitButton); 
        } else {
            $timeSlotsContainer.html('<p class="error-message">Выберите мастера и дату.</p>');
            $submitButton.prop('disabled', true);
        }
        selectedTime = null;
    });

    // Обработка выбора Времени (Кнопки)
    $timeSlotsContainer.on('click', '.slot-button', function() {
        $('.slot-button').removeClass('selected');
        $(this).addClass('selected');
        selectedTime = $(this).data('time'); 
        $submitButton.prop('disabled', false);
    });
    
    // Обработка формы: отправка записи
    $form.on('submit', function(e) {
        e.preventDefault();
        
        const serviceId = $serviceSelect.val();
        const masterId = $masterSelect.val();
        const date = $dateInput.val();

        if (!serviceId || !masterId || !date || !selectedTime) {
            // displayMessage теперь глобальная
            displayMessage($statusMessage, 'Пожалуйста, выберите все поля, включая время.', false);
            return;
        }

        $submitButton.prop('disabled', true).text('Запись...');
        $statusMessage.addClass('hidden');

        const bookingData = {
            serviceId: serviceId,
            masterId: masterId,
            date: date,
            time: selectedTime,
        };

        $.ajax({
            url: '/api/booking',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(bookingData),
        })
        .done(function(response) {
            displayMessage($statusMessage, `✅ Запись успешно создана! Вы будете перенаправлены в личный кабинет.`, true);
            $form.hide();
            setTimeout(() => {
                window.location.href = '/my_bookings.html';
            }, 3000);
        })
        .fail(function(jqXHR) {
            const errorMsg = jqXHR.responseJSON && jqXHR.responseJSON.message
                             ? jqXHR.responseJSON.message
                             : '❌ Произошла ошибка при записи.';

            displayMessage($statusMessage, errorMsg, false);
            $submitButton.prop('disabled', false).text('Записаться');
        });
    });

    // Запуск инициализации
    initBookingForm();
});