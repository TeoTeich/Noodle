$(document).ready(function() {
    
    // --- Константы и селекторы ---
    const API_URL = '/api'; // Относительный путь к API Express-сервера

    const $form = $('#booking-form');
    // Выход, если мы не на странице записи
    if ($form.length === 0) return; 
    
    const $serviceSelect = $('#service-select');
    const $masterSelect = $('#master-select');
    const $dateInput = $('#booking-date');
    const $timeSlotsContainer = $('#time-slots');
    const $submitButton = $('#submit-booking');
    const $statusMessage = $('#status-message');

    let selectedTime = null; 

    // -----------------------------------------------------------------
    // A. Инициализация: Загрузка стартовых данных (Услуг)
    // -----------------------------------------------------------------
    function loadInitialData() {
        const today = new Date().toISOString().split('T')[0];
        $dateInput.attr('min', today);

        // Блокировка всех полей, пока не загрузим услуги
        $serviceSelect.prop('disabled', true).empty().append('<option value="">-- Загрузка услуг... --</option>');
        $masterSelect.prop('disabled', true);
        $dateInput.prop('disabled', true);
        $submitButton.prop('disabled', true);

        // РЕАЛЬНЫЙ AJAX-запрос на получение услуг
        $.getJSON(API_URL + '/services')
            .done(function(services) {
                $serviceSelect.empty().append('<option value="">-- Выберите услугу --</option>');
                services.forEach(service => {
                    $serviceSelect.append(`<option value="${service.id}">${service.name} (${service.price} руб.)</option>`);
                });
                $serviceSelect.prop('disabled', false);
            })
            .fail(function() {
                $serviceSelect.empty().append('<option value="">-- Ошибка загрузки услуг --</option>');
            });
    }

    loadInitialData();

    // -----------------------------------------------------------------
    // B. Обработка выбора услуги: Загрузка мастеров
    // -----------------------------------------------------------------
    $serviceSelect.on('change', function() {
        const serviceId = $(this).val();

        // Сброс и блокировка
        $masterSelect.prop('disabled', true).empty().append('<option value="">-- Выберите мастера --</option>');
        $dateInput.prop('disabled', true).val('');
        $timeSlotsContainer.html('<p class="info-text">Выберите мастера и дату.</p>');
        $submitButton.prop('disabled', true);
        selectedTime = null;

        if (serviceId) {
            // РЕАЛЬНЫЙ AJAX-запрос на получение мастеров
            $masterSelect.empty().append('<option value="">-- Загрузка мастеров... --</option>');

            $.getJSON(API_URL + '/masters/' + serviceId)
                .done(function(masters) {
                    $masterSelect.empty().append('<option value="">-- Выберите мастера --</option>');
                    masters.forEach(master => {
                        $masterSelect.append(`<option value="${master.id}">${master.name}</option>`);
                    });
                    $masterSelect.prop('disabled', false);
                })
                .fail(function() {
                    $masterSelect.empty().append('<option value="">-- Ошибка загрузки мастеров --</option>');
                });
        }
    });

    // -----------------------------------------------------------------
    // C и D. Обработка выбора мастера/даты: Загрузка свободных слотов
    // -----------------------------------------------------------------
    // При изменении мастера ИЛИ даты
    $masterSelect.on('change', updateTimeSlots);
    $dateInput.on('change', updateTimeSlots);
    
    function updateTimeSlots() {
        const masterId = $masterSelect.val();
        const date = $dateInput.val();

        $submitButton.prop('disabled', true);
        selectedTime = null;

        if (masterId && date) {
            $timeSlotsContainer.html('<p class="info-text">Поиск свободного времени...</p>');

            // РЕАЛЬНЫЙ AJAX-запрос на получение расписания
            $.getJSON(API_URL + '/slots/' + masterId + '/' + date)
                .done(function(slots) {
                    renderTimeSlots(slots);
                })
                .fail(function() {
                    $timeSlotsContainer.html('<p class="info-text">Не удалось загрузить слоты. Попробуйте другую дату.</p>');
                });

        } else if (masterId) {
            // Если выбран мастер, но не дата
            $dateInput.prop('disabled', false);
            $timeSlotsContainer.html('<p class="info-text">Выберите дату, чтобы увидеть свободное время.</p>');
        }
    }


    // -----------------------------------------------------------------
    // E. Рендеринг и выбор слотов
    // -----------------------------------------------------------------
    function renderTimeSlots(slots) {
        $timeSlotsContainer.empty();

        if (slots.length === 0) {
            $timeSlotsContainer.append('<p class="info-text">На эту дату нет свободных слотов.</p>');
            return;
        }

        $timeSlotsContainer.off('click', '.time-slot-btn'); 
        
        slots.forEach(time => {
            const $button = $('<button>', {
                type: 'button',
                class: 'time-slot-btn',
                'data-time': time,
                text: time
            });
            $timeSlotsContainer.append($button);
        });

        // Обработчик выбора слота
        $timeSlotsContainer.on('click', '.time-slot-btn', function() {
            $('.time-slot-btn').removeClass('selected');
            $(this).addClass('selected');
            selectedTime = $(this).data('time');
            $submitButton.prop('disabled', false);
        });
    }

    // -----------------------------------------------------------------
    // F. Отправка формы (Финальный AJAX-запрос POST)
    // -----------------------------------------------------------------
    $form.on('submit', function(e) {
        e.preventDefault();

        if (!selectedTime) {
            $statusMessage.removeClass('hidden').text('Пожалуйста, выберите время записи.').css({background: '#fff2f2', color: '#cc0000'});
            return;
        }

        $submitButton.prop('disabled', true).text('Запись...');
        $statusMessage.addClass('hidden'); 

        const bookingData = {
            serviceId: $serviceSelect.val(),
            masterId: $masterSelect.val(),
            date: $dateInput.val(),
            time: selectedTime,
            clientName: $('#client-name').val(),
            clientPhone: $('#client-phone').val()
        };

        // РЕАЛЬНЫЙ AJAX-запрос POST
        $.ajax({
            url: API_URL + '/booking',
            type: 'POST',
            contentType: 'application/json', 
            data: JSON.stringify(bookingData),
        })
        .done(function(response) {
            $statusMessage.removeClass('hidden').text(`✅ Запись успешно создана! Номер: ${response.bookingId || '...'} `).css({background: '#e6ffe6', color: '#333'});
            $form.hide();
        })
        .fail(function(jqXHR) {
            const errorMsg = jqXHR.responseJSON && jqXHR.responseJSON.message 
                             ? jqXHR.responseJSON.message 
                             : '❌ Произошла ошибка при записи.';
            
            $statusMessage.removeClass('hidden').text(errorMsg).css({background: '#fff2f2', color: '#cc0000'});
            $submitButton.prop('disabled', false).text('Записаться');
        });
    });
});