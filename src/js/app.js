$(document).ready(function() {
    
    // --- Константы и селекторы ---
    // В реальном проекте здесь был бы адрес API, сейчас используем заглушку
    const API_URL = 'http://mock-api.noodle-salon.com/api'; 
    
    const $form = $('#booking-form');
    const $serviceSelect = $('#service-select');
    const $masterSelect = $('#master-select');
    const $dateInput = $('#booking-date');
    const $timeSlotsContainer = $('#time-slots');
    const $submitButton = $('#submit-booking');
    const $statusMessage = $('#status-message');

    let selectedTime = null; // Для хранения выбранного слота времени

    // Выход, если мы не на странице записи (для предотвращения ошибок на главной)
    if ($form.length === 0) return; 

    // -----------------------------------------------------------------
    // A. Инициализация: Загрузка стартовых данных (Услуг)
    // -----------------------------------------------------------------
    function loadInitialData() {
        // Установка минимальной даты (сегодня) для элемента input[type="date"]
        const today = new Date().toISOString().split('T')[0];
        $dateInput.attr('min', today);

        // Имитация загрузки услуг
        const mockServices = [
            { id: '1', name: 'Стрижка (женская)', price: '1500 руб.' },
            { id: '2', name: 'Окрашивание (сложное)', price: '5000 руб.' },
            { id: '3', name: 'Мужская стрижка', price: '1200 руб.' }
        ];

        $serviceSelect.empty().append('<option value="">-- Выберите услугу --</option>');
        mockServices.forEach(service => {
            $serviceSelect.append(`<option value="${service.id}">${service.name} (${service.price})</option>`);
        });

        // Разблокировка первого поля после "загрузки"
        $serviceSelect.prop('disabled', false);

        // Блокировка остальных полей
        $masterSelect.prop('disabled', true);
        $dateInput.prop('disabled', true);
        $submitButton.prop('disabled', true);
    }
    
    loadInitialData();


    // -----------------------------------------------------------------
    // B. Обработка выбора услуги: Загрузка мастеров
    // -----------------------------------------------------------------
    $serviceSelect.on('change', function() {
        const serviceId = $(this).val();
        
        // Сброс последующих полей
        $masterSelect.prop('disabled', true).empty().append('<option value="">-- Выберите мастера --</option>');
        $dateInput.prop('disabled', true).val('');
        $timeSlotsContainer.html('<p class="info-text">Выберите мастера и дату.</p>');
        $submitButton.prop('disabled', true);
        selectedTime = null;

        if (serviceId) {
            // Имитация загрузки мастеров, доступных для выбранной услуги
            const mockMasters = [
                { id: '101', name: 'Мастер Анна' },
                { id: '102', name: 'Мастер Борис' },
                { id: '103', name: 'Мастер Светлана' }
            ];

            mockMasters.forEach(master => {
                $masterSelect.append(`<option value="${master.id}">${master.name}</option>`);
            });
            $masterSelect.prop('disabled', false);
        }
    });

    // -----------------------------------------------------------------
    // C. Обработка выбора мастера: Активация даты
    // -----------------------------------------------------------------
    $masterSelect.on('change', function() {
        // Сброс времени
        $timeSlotsContainer.html('<p class="info-text">Выберите дату, чтобы увидеть свободное время.</p>');
        $dateInput.val('');
        $submitButton.prop('disabled', true);
        selectedTime = null;

        if ($(this).val()) {
            $dateInput.prop('disabled', false);
        } else {
            $dateInput.prop('disabled', true);
        }
    });


    // -----------------------------------------------------------------
    // D. Обработка выбора даты: Загрузка свободных слотов
    // -----------------------------------------------------------------
    $dateInput.on('change', function() {
        const masterId = $masterSelect.val();
        const date = $(this).val();

        $submitButton.prop('disabled', true);
        selectedTime = null;

        if (masterId && date) {
            $timeSlotsContainer.html('<p class="info-text">Поиск свободного времени...</p>');

            // Имитация AJAX-запроса на получение расписания
            setTimeout(() => {
                // Заглушка: Генерация свободного времени
                const mockSlots = ['10:00', '11:30', '14:00', '15:30', '17:00'];
                renderTimeSlots(mockSlots);
            }, 500);

        } else {
            $timeSlotsContainer.html('<p class="info-text">Выберите мастера и дату.</p>');
        }
    });

    // -----------------------------------------------------------------
    // E. Рендеринг и выбор слотов
    // -----------------------------------------------------------------
    function renderTimeSlots(slots) {
        $timeSlotsContainer.empty();
        
        if (slots.length === 0) {
            $timeSlotsContainer.append('<p class="info-text">На эту дату нет свободных слотов.</p>');
            return;
        }

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
        $('.time-slots').on('click', '.time-slot-btn', function() {
            $('.time-slot-btn').removeClass('selected');
            $(this).addClass('selected');
            selectedTime = $(this).data('time');
            $submitButton.prop('disabled', false);
        });
    }

    // -----------------------------------------------------------------
    // F. Отправка формы (Имитация финального AJAX-запроса)
    // -----------------------------------------------------------------
    $form.on('submit', function(e) {
        e.preventDefault(); 

        if (!selectedTime) {
            // Вместо alert() используем кастомное сообщение или модальное окно
            $statusMessage.removeClass('hidden').text('Пожалуйста, выберите время записи.').css({background: '#fff2f2', color: '#cc0000'});
            return;
        }

        $submitButton.prop('disabled', true).text('Запись...');

        const bookingData = {
            serviceId: $serviceSelect.val(),
            masterId: $masterSelect.val(),
            date: $dateInput.val(),
            time: selectedTime,
            clientName: $('#client-name').val(),
            clientPhone: $('#client-phone').val()
        };

        console.log('Отправляемые данные:', bookingData);

        // Имитация успешного ответа через 2 секунды
        setTimeout(() => {
            $statusMessage.removeClass('hidden').text('✅ Запись успешно создана! Ожидайте подтверждения.').css({background: '#e6ffe6', color: '#333'});
            $form.hide();
        }, 2000);
    });
});