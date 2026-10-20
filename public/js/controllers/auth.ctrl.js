import { AuthModel } from '../models/auth.model.js';
import { showInfo, showSuccess } from '../utils/alert.js';
import { applyBranding, syncBrandingFromDB } from '../utils/branding.js';

document.addEventListener('DOMContentLoaded', () => {
    applyBranding();
    syncBrandingFromDB();

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
        showStep2FA(activeUser.email);
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
                const loginResult = await AuthModel.login(email, password);

                if (loginResult?.primerAcceso || loginResult?.requiereCompletarRegistro) {
                    window.location.href = '/pages/completar-registro.html';
                    return;
                }

                localStorage.removeItem('eslabon_2fa_verified');
                const targetEmail = loginResult?.user?.email || loginResult?.email || email;
                showStep2FA(targetEmail);
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
        form2FA.addEventListener('submit', async (e) => {
            e.preventDefault();

            let code = '';
            otpInputs.forEach(inp => code += inp.value.trim());

            if (errorAlert) errorAlert.style.display = 'none';

            if (code.length < 6) {
                showError('Por favor ingresa los 6 dígitos del código de verificación.');
                return;
            }

            submit2FABtn.disabled = true;
            submit2FABtn.textContent = 'Verificando...';

            try {
                await AuthModel.verify2FA(code);
                localStorage.setItem('eslabon_2fa_verified', 'true');
                window.location.href = '/pages/main.html';
            } catch (err) {
                showError(err.message || 'Código de verificación incorrecto. Revisa la consola del servidor.');
                otpInputs.forEach(inp => inp.value = '');
                if (otpInputs[0]) otpInputs[0].focus();
            } finally {
                submit2FABtn.disabled = false;
                submit2FABtn.textContent = 'Verificar Código';
            }
        });
    }

    const resendBtn = document.getElementById('link-resend-2fa');
    if (resendBtn) {
        resendBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                resendBtn.textContent = 'Enviando correo con nuevo código...';
                resendBtn.style.pointerEvents = 'none';
                const result = await AuthModel.resend2FA();
                const targetEmail = result?.email || AuthModel.getCurrentUser()?.email || '';
                if (targetEmail) {
                    const emailTargetEl = document.getElementById('email-2fa-target');
                    if (emailTargetEl) emailTargetEl.textContent = targetEmail;
                }
                showSuccess('Código Reenviado', `Hemos enviado un nuevo código de verificación${targetEmail ? ` a tu correo <b>${targetEmail}</b>` : ''}. Por favor revisa tu bandeja de entrada o spam.`);
            } catch (err) {
                showError(err.message || 'No se pudo enviar el nuevo código.');
            } finally {
                resendBtn.textContent = '¿No recibiste el correo? Reenviar código';
                resendBtn.style.pointerEvents = 'auto';
            }
        });
    }

    if (backBtn) {
        backBtn.addEventListener('click', () => {
            AuthModel.logout();
            showStepCredentials();
        });
    }

    function showStep2FA(emailParam) {
        if (loginForm) loginForm.style.display = 'none';
        if (form2FA) form2FA.style.display = 'block';
        if (subtitleEl) subtitleEl.textContent = 'Autenticación de Doble Factor (2FA)';
        if (errorAlert) errorAlert.style.display = 'none';

        const emailTargetEl = document.getElementById('email-2fa-target');
        const resolvedEmail = emailParam || AuthModel.getCurrentUser()?.email || '';
        if (emailTargetEl && resolvedEmail) {
            emailTargetEl.textContent = resolvedEmail;
        }

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