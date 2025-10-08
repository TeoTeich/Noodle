// public/js/schedule.js

/**
 * Загружает и отображает список записей для текущей страницы.
 * Эта функция является глобальной, чтобы ее можно было вызвать из admin.js для обновления.
 */
window.loadBookings = function() {
    const $bookingsList = $('#bookings-list');
    
    // Если этого контейнера нет на странице, выходим
    if ($bookingsList.length === 0) return; 

    $bookingsList.html('<p class="info-text">Загрузка данных...</p>');

    let apiEndpoint = '';
    let tableHeaders = [];
    
    // Определяем, какую страницу мы загружаем и какой API использовать
    if (window.location.pathname.includes('/my_bookings.html')) {
        apiEndpoint = '/api/my_bookings';
        tableHeaders = ['Дата', 'Время', 'Услуга', 'Мастер', 'Статус'];
    } else if (window.location.pathname.includes('/master_cabinet.html')) {
        apiEndpoint = '/api/master_bookings';
        tableHeaders = ['Дата', 'Время', 'Услуга', 'Клиент (логин)', 'Имя клиента', 'Статус'];
    } else if (window.location.pathname.includes('/admin.html')) {
        apiEndpoint = '/api/all_bookings';
        tableHeaders = ['Дата', 'Время', 'Услуга', 'Мастер', 'Клиент (логин)', 'Имя клиента', 'Статус'];
    } else {
        $bookingsList.html('<p class="error-message">Не удалось определить тип страницы для загрузки записей.</p>');
        return;
    }

    // --- Функция Рендеринга Таблицы ---
    function renderTable(data, headers) {
        if (data.length === 0) {
            $bookingsList.html('<p class="info-text">У вас пока нет предстоящих записей.</p>');
            return;
        }

        let html = '<table class="data-table"><thead><tr>';
        headers.forEach(header => {
            html += `<th>${header}</th>`;
        });
        html += '</tr></thead><tbody>';

        data.forEach(item => {
            const formattedDate = item.booking_date; // YYYY-MM-DD
            const formattedTime = item.booking_time ? item.booking_time.slice(0, 5) : 'N/A';
            
            // Предполагаем, что status всегда 'Запланировано' из-за серверного исправления
    const statusText = item.status || 'Запланировано';
    
    // Создаем класс: например, "Запланировано" -> "status-запланировано"
            let statusHtml = `<span class="status-badge status-${statusText.toLowerCase().replace(/[^a-z0-9а-яё]/g, '')}">${statusText}</span>`;

            html += '<tr>';
            html += `<td>${formattedDate}</td>`;
            html += `<td>${formattedTime}</td>`;
            html += `<td>${item.service_name}</td>`;
            
            
            // Отображение колонок в зависимости от заголовков
            if (headers.includes('Мастер')) {
                html += `<td>${item.master_name || 'N/A'}</td>`;
            }
            if (headers.includes('Клиент (логин)')) {
                html += `<td>${item.client_username || 'N/A'}</td>`;
            }
            if (headers.includes('Имя клиента')) {
                html += `<td>${item.client_name || 'N/A'}</td>`;
            }
            
            html += `<td>${statusHtml}</td>`; 
            html += '</tr>';
        });

        html += '</tbody></table>';
        $bookingsList.html(html);
    }

    // --- Загрузка данных ---\
    $.ajax({
        url: apiEndpoint,
        type: 'GET',
        dataType: 'json'
    })
    .done(function(response) {
        if (response.success && response.data) {
            renderTable(response.data, tableHeaders);
        } else {
             const errorMessage = response.message || 'Не удалось получить данные о записях.';
             $bookingsList.html(`<p class="error-message">Ошибка: ${errorMessage}</p>`);
        }
    })
    .fail(function(jqXHR) {
        const errorMessage = jqXHR.status === 401 ? 'Требуется авторизация. Войдите в систему.' : 
                             jqXHR.status === 403 ? 'Доступ запрещен. Недостаточно прав.' :
                             jqXHR.responseJSON ? jqXHR.responseJSON.message :
                             `Ошибка ${jqXHR.status}: Не удалось получить данные о записях.`;
        $bookingsList.html(`<p class="error-message">Ошибка: ${errorMessage}</p>`);
    });
};

// Запуск при загрузке страницы
$(document).ready(function() {
    loadBookings();
});