import { AuthModel } from '../models/auth.model.js';
import { showInfo } from '../utils/alert.js';

document.addEventListener('DOMContentLoaded', () => {
    const activeUser = AuthModel.getCurrentUser();
    const is2FAVerified = localStorage.getItem('eslabon_2fa_verified') === 'true';

    if (activeUser && is2FAVerified) {
        window.location.replace('/pages/main.html');
        return;
    }

    const loginForm = document.getElementById('login-form');
    const form2FA = document.getElementById('form-2fa');
    const subtitleEl = document.getElementById('login-subtitle');
    const errorAlert = document.getElementById('login-error');
    const submitLoginBtn = document.getElementById('btn-submit-login');
    const submit2FABtn = document.getElementById('btn-submit-2fa');
    const backBtn = document.getElementById('btn-back-step1');
    const forgotBtn = document.getElementById('link-forgot-password');
    const otpInputs = document.querySelectorAll('.otp-input');

    if (forgotBtn) {
        forgotBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showInfo('Recuperación de Contraseña', 'Por favor contacta al administrador de Recursos Humanos de tu empresa para restablecer tu contraseña institucional.');
        });
    }

    if (activeUser && !is2FAVerified) {
        showStep2FA();
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async(e) => {
            e.preventDefault();

            const email = document.getElementById('input-email').value;
            const password = document.getElementById('input-password').value;

            if (errorAlert) errorAlert.style.display = 'none';
            submitLoginBtn.disabled = true;
            submitLoginBtn.textContent = 'Iniciando sesión...';

            try {
                await AuthModel.login(email, password);
                localStorage.removeItem('eslabon_2fa_verified');
                showStep2FA();
            } catch (err) {
                if (errorAlert) {
                    errorAlert.textContent = err.message;
                    errorAlert.style.display = 'block';
                }
            } finally {
                submitLoginBtn.disabled = false;
                submitLoginBtn.textContent = 'Iniciar Sesión';
            }
        });
    }

    otpInputs.forEach((input, index) => {
        input.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
            if (e.target.value && index < otpInputs.length - 1) {
                otpInputs[index + 1].focus();
            }
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !input.value && index > 0) {
                otpInputs[index - 1].focus();
            }
        });

        input.addEventListener('paste', (e) => {
            e.preventDefault();
            const pasteData = (e.clipboardData || window.clipboardData).getData('text').trim();
            const digits = pasteData.replace(/[^0-9]/g, '').slice(0, 6);

            digits.split('').forEach((char, i) => {
                if (otpInputs[i]) otpInputs[i].value = char;
            });

            if (digits.length > 0) {
                const lastIdx = Math.min(digits.length - 1, otpInputs.length - 1);
                otpInputs[lastIdx].focus();
            }
        });
    });

    if (form2FA) {
        form2FA.addEventListener('submit', (e) => {
            e.preventDefault();

            let code = '';
            otpInputs.forEach(inp => code += inp.value.trim());

            if (errorAlert) errorAlert.style.display = 'none';

            if (code.length < 6) {
                showError('Por favor ingresa los 6 dígitos del código de verificación. ');
                return;
            }

            submit2FABtn.disabled = true;
            submit2FABtn.textContent = 'Verificando...';

            setTimeout(() => {
                if (code === '454545') {
                    localStorage.setItem('eslabon_2fa_verified', 'true');
                    window.location.href = '/pages/main.html';
                } else {
                    showError('Código de verificación incorrecto. Inténtalo de nuevo.');
                    otpInputs.forEach(inp => inp.value = '');
                    if (otpInputs[0]) otpInputs[0].focus();
                    submit2FABtn.disabled = false;
                    submit2FABtn.textContent = 'Verificar Código';
                }
            }, 400);
        });
    }

    if (backBtn) {
        backBtn.addEventListener('click', () => {
            AuthModel.logout();
            showStepCredentials();
        });
    }

    function showStep2FA() {
        if (loginForm) loginForm.style.display = 'none';
        if (form2FA) form2FA.style.display = 'block';
        if (subtitleEl) subtitleEl.textContent = 'Autenticación de Doble Factor (2FA)';
        if (errorAlert) errorAlert.style.display = 'none';
        if (otpInputs[0]) otpInputs[0].focus();
    }

    function showStepCredentials() {
        if (form2FA) form2FA.style.display = 'none';
        if (loginForm) loginForm.style.display = 'block';
        if (subtitleEl) subtitleEl.textContent = 'Portal de Autoservicio Kiosco • Ingresa tu información para iniciar sesión.';
        if (errorAlert) errorAlert.style.display = 'none';
    }

    function showError(msg) {
        if (errorAlert) {
            errorAlert.textContent = msg;
            errorAlert.style.display = 'block';
        }
    }
});