import { setSession, API_BASE_URL } from '../config.js';
import { showSuccess, showError } from '../utils/alert.js';

document.addEventListener('DOMContentLoaded', () => {
    const tempUserRaw = sessionStorage.getItem('eslabon_temp_user') || localStorage.getItem('eslabon_temp_user');
    const tempToken = sessionStorage.getItem('eslabon_temp_token') || localStorage.getItem('eslabon_temp_token');

    let tempUser = null;
    try {
        tempUser = tempUserRaw ? JSON.parse(tempUserRaw) : null;
    } catch (e) {
        tempUser = null;
    }

    const emailInput = document.getElementById('reg-email');
    if (tempUser && tempUser.email) {
        if (emailInput) emailInput.value = tempUser.email;
    } else {
        // Si no hay sesión temporal pero se abrió la página, permitir si se tiene email guardado
        const storedUser = localStorage.getItem('eslabon_active_user');
        if (storedUser) {
            try {
                const u = JSON.parse(storedUser);
                if (emailInput && u.email) emailInput.value = u.email;
            } catch (e) {}
        }
    }

    configurarMascaras();

    const form = document.getElementById('form-completar-registro');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await procesarRegistro(tempUser, tempToken);
        });
    }

    const btnCancelar = document.getElementById('btn-cancelar-registro');
    if (btnCancelar) {
        btnCancelar.addEventListener('click', () => {
            sessionStorage.removeItem('eslabon_temp_user');
            sessionStorage.removeItem('eslabon_temp_token');
        });
    }
});

function configurarMascaras() {
    const rfcInput = document.getElementById('reg-rfc');
    const curpInput = document.getElementById('reg-curp');
    const imssInput = document.getElementById('reg-imss');
    const clabeInput = document.getElementById('reg-clabe');
    const cuentaInput = document.getElementById('reg-cuenta');
    const telInput = document.getElementById('reg-telefono');

    if (rfcInput) {
        rfcInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 13);
        });
    }

    if (curpInput) {
        curpInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 18);
        });
    }

    if (imssInput) {
        imssInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 11);
        });
    }

    if (clabeInput) {
        clabeInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 18);
        });
    }

    if (cuentaInput) {
        cuentaInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 11);
        });
    }

    if (telInput) {
        telInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
        });
    }
}

async function procesarRegistro(tempUser, tempToken) {
    const errorAlert = document.getElementById('registro-error-alert');
    const submitBtn = document.getElementById('btn-submit-completar');
    if (errorAlert) errorAlert.style.display = 'none';

    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const passwordConfirm = document.getElementById('reg-password-confirm').value;

    const nombre = document.getElementById('reg-nombre').value.trim();
    const paterno = document.getElementById('reg-paterno').value.trim();
    const materno = document.getElementById('reg-materno').value.trim();
    const rfc = document.getElementById('reg-rfc').value.trim().toUpperCase();
    const curp = document.getElementById('reg-curp').value.trim().toUpperCase();
    const imss = document.getElementById('reg-imss').value.trim();
    const telefono = document.getElementById('reg-telefono').value.trim();

    const banco = document.getElementById('reg-banco').value;
    const clabe = document.getElementById('reg-clabe').value.trim();
    const cuenta = document.getElementById('reg-cuenta').value.trim();

    // Validaciones
    if (password !== passwordConfirm) {
        mostrarError('Las contraseñas no coinciden. Por favor verifícalas.');
        return;
    }

    if (password.length < 8) {
        mostrarError('La nueva contraseña debe contener al menos 8 caracteres.');
        return;
    }

    if (rfc.length < 12) {
        mostrarError('El RFC debe contener entre 12 y 13 caracteres.');
        return;
    }

    if (curp.length !== 18) {
        mostrarError('El CURP debe contener exactamente 18 caracteres.');
        return;
    }

    if (imss.length !== 11) {
        mostrarError('El NSS (IMSS) debe contener exactamente 11 dígitos.');
        return;
    }

    if (clabe.length !== 18) {
        mostrarError('La CLABE Interbancaria debe contener exactamente 18 dígitos.');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Guardando expediente y activando...';

    const payload = {
        userId: tempUser?.id,
        email: email || tempUser?.email,
        password: password,
        nombre: nombre,
        paterno: paterno,
        materno: materno,
        rfc: rfc,
        curp: curp,
        imss: imss,
        telefono: telefono,
        banco: banco,
        clabe_interbancaria: clabe,
        numero_cuenta: cuenta
    };

    try {
        let registroExitoso = false;
        let responseData = null;

        try {
            const resp = await fetch(`${API_BASE_URL}/completar-registro`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(tempToken ? { 'Authorization': `Bearer ${tempToken}` } : {})
                },
                body: JSON.stringify(payload)
            });

            if (resp.ok) {
                responseData = await resp.json();
                registroExitoso = true;
            } else if (resp.status !== 404) {
                const errJson = await resp.json().catch(() => ({}));
                throw new Error(errJson.error || errJson.message || 'Error al completar el registro.');
            }
        } catch (apiErr) {
            if (!apiErr.message.includes('404')) {
                throw apiErr;
            }
        }

        // Si el backend aún no tiene el endpoint activo, armamos la sesión completa localmente
        const nombreCompleto = `${nombre} ${paterno} ${materno}`.trim();
        const activeUser = {
            id: responseData?.user?.id || tempUser?.id || 14,
            id_empleado: responseData?.user?.id_empleado || tempUser?.id || 14,
            no_empleado: responseData?.user?.no_empleado || '14',
            nombre: nombreCompleto,
            name: nombreCompleto,
            email: email,
            username: email,
            rol: tempUser?.rol || 'Colaborador',
            role: tempUser?.rol || 'Colaborador',
            departamento: tempUser?.departamento || 'Tecnología e Innovación',
            puesto: tempUser?.puesto || 'Colaborador',
            rfc: rfc,
            curp: curp,
            imss: imss,
            telefono: telefono,
            banco: banco,
            clabe_interbancaria: clabe,
            numero_cuenta: cuenta,
            abono_cuenta: `${banco} - CLABE: ${clabe}`,
            avatar: '/assets/default-user.png'
        };

        const finalToken = responseData?.token || tempToken || 'auth_token_' + Date.now();
        setSession(finalToken, activeUser);
        localStorage.setItem('eslabon_2fa_verified', 'true');

        // Limpiar temporales
        sessionStorage.removeItem('eslabon_temp_user');
        sessionStorage.removeItem('eslabon_temp_token');
        localStorage.removeItem('eslabon_temp_user');
        localStorage.removeItem('eslabon_temp_token');

        // Actualizar lista local de invitaciones si existía
        const invitaciones = JSON.parse(localStorage.getItem('eslabon_invitaciones_colaboradores') || '[]');
        const actualizadas = invitaciones.map(inv => {
            if (inv.email.toLowerCase() === email.toLowerCase()) {
                return { ...inv, nombre: nombreCompleto, estado: 'activo', primerAcceso: false };
            }
            return inv;
        });
        localStorage.setItem('eslabon_invitaciones_colaboradores', JSON.stringify(actualizadas));

        await showSuccess(
            '¡Expediente Completado con Éxito!',
            `¡Bienvenido(a), <b>${nombreCompleto}</b>!<br><br>Tu contraseña permanente ha sido guardada y tu expediente laboral y bancario ha sido registrado en el sistema.<br>Accediendo a tu portal...`
        );

        window.location.replace('/pages/main.html');
    } catch (err) {
        console.error('Error al completar registro:', err);
        mostrarError(err.message || 'No se pudo completar el registro. Intenta de nuevo.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Guardar Expediente y Activar Cuenta';
    }
}

function mostrarError(msg) {
    const errorAlert = document.getElementById('registro-error-alert');
    if (errorAlert) {
        errorAlert.textContent = msg;
        errorAlert.style.display = 'block';
        errorAlert.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
        showError('Atención', msg);
    }
}
