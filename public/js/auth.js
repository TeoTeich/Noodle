// public/js/auth.js (Обновленный код)

$(document).ready(function() {
    
    // --- Логика для входа (login-form) ---
    const $loginForm = $('#login-form');
    if ($loginForm.length) {
        handleLoginForm($loginForm);
    }
    
    // --- Логика для регистрации (register-form) ---
    const $registerForm = $('#register-form');
    if ($registerForm.length) {
        handleRegisterForm($registerForm);
    }

    // --- ФУНКЦИЯ ОБРАБОТКИ ВХОДА ---
    function handleLoginForm($form) {
        const $statusMessage = $('#status-message');
        
        $form.on('submit', function(e) {
            e.preventDefault();
            
            $statusMessage.addClass('hidden').text('');
            const $submitButton = $form.find('button[type="submit"]');
            $submitButton.prop('disabled', true).text('Проверка...');

            const loginData = {
                username: $('#username').val(),
                password: $('#password').val()
            };

            $.ajax({
                url: '/api/login',
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(loginData),
            })
            .done(function(response) {
                // Вход успешен, перенаправляем
                window.location.href = response.redirect;
            })
            .fail(function(jqXHR) {
                const errorMsg = jqXHR.responseJSON && jqXHR.responseJSON.message 
                                 ? jqXHR.responseJSON.message 
                                 : 'Неизвестная ошибка входа.';
                
                $statusMessage.removeClass('hidden').text(errorMsg).css({background: '#fff2f2', color: '#cc0000'});
                $submitButton.prop('disabled', false).text('Войти');
            });
        });
    }

    // --- ФУНКЦИЯ ОБРАБОТКИ РЕГИСТРАЦИИ ---
    function handleRegisterForm($form) {
        const $statusMessage = $('#status-message');
        
        $form.on('submit', function(e) {
            e.preventDefault();
            
            $statusMessage.addClass('hidden').text('');
            const $submitButton = $form.find('button[type="submit"]');
            $submitButton.prop('disabled', true).text('Регистрация...');

            const registerData = {
                username: $('#reg-username').val(),
                password: $('#reg-password').val(),
                name: $('#reg-name').val(),
                phone: $('#reg-phone').val()
            };

            $.ajax({
                url: '/api/register',
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(registerData),
            })
            .done(function(response) {
                // Регистрация успешна, перенаправляем на страницу записи
                window.location.href = response.redirect; 
            })
            .fail(function(jqXHR) {
                const errorMsg = jqXHR.responseJSON && jqXHR.responseJSON.message 
                                 ? jqXHR.responseJSON.message 
                                 : 'Неизвестная ошибка регистрации.';
                
                $statusMessage.removeClass('hidden').text(errorMsg).css({background: '#fff2f2', color: '#cc0000'});
                $submitButton.prop('disabled', false).text('Зарегистрироваться');
            });
        });
    }
});