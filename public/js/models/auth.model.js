import { API_BASE_URL, setSession, clearSession, getStoredUser, getToken } from '../config.js';

export function resolveLocalAvatar(avatarStr, identifier) {
    if (avatarStr && typeof avatarStr === 'string' && avatarStr.trim().length > 0) {
        return avatarStr;
    }
    return '/assets/default-user.png';
}

export const AuthModel = {
    getCurrentUser() {
        return getStoredUser();
    },

    getAuthToken() {
        return getToken();
    },

    logout() {
        clearSession();
        localStorage.removeItem('eslabon_2fa_verified');
    },

    async login(usernameOrEmail, password) {
        try {
            const response = await fetch(`${API_BASE_URL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: usernameOrEmail.trim(),
                    password
                })
            });

            const data = await response.json();

            if (!response.ok) {
                const errorMessage = data && (data.error || data.message) ? (data.error || data.message) : 'Usuario o contraseña incorrectos.';
                throw new Error(errorMessage);
            }

            const token = data.token;
            const rawUser = data.user || data;

            const user = {
                id: rawUser.id || rawUser.id_empleado || 1,
                id_empleado: rawUser.id_empleado || rawUser.id || 1,
                id_usuario: rawUser.id_usuario || rawUser.id,
                no_empleado: rawUser.no_empleado || rawUser.id_empleado || rawUser.id,
                nombre: rawUser.nombre || '',
                name: rawUser.nombre || '',
                email: data.email || rawUser.email || rawUser.correo || rawUser.correo_personal || rawUser.username || usernameOrEmail,
                username: rawUser.username || usernameOrEmail,
                role: rawUser.rol || 'Colaborador',
                rol: rawUser.rol || 'Colaborador',
                puesto: rawUser.puesto || '',
                departamento: rawUser.departamento || '',
                id_empresa: rawUser.id_empresa || rawUser.empresa_id || data.id_empresa || null,
                empresa: rawUser.empresa || rawUser.nombre_empresa || data.empresa || '',
                nombre_empresa: rawUser.nombre_empresa || rawUser.empresa || data.nombre_empresa || '',
                avatar: resolveLocalAvatar(rawUser.avatar, rawUser.id)
            };

            const esPrimerAcceso = !!(data.primerAcceso || data.requiereCompletarRegistro || 
                rawUser.primerAcceso || rawUser.primer_acceso || rawUser.requiere_completar_registro ||
                rawUser.password_temporal);

            if (esPrimerAcceso) {
                sessionStorage.setItem('eslabon_temp_token', token || 'temp_token_' + Date.now());
                sessionStorage.setItem('eslabon_temp_user', JSON.stringify(user));
                localStorage.setItem('eslabon_temp_user', JSON.stringify(user));
                return {
                    primerAcceso: true,
                    requiereCompletarRegistro: true,
                    token,
                    user
                };
            }

            setSession(token, user);

            const codigo2FA = data.codigo2FA || data.code;
            if (codigo2FA) {
                console.log('%c════════════════════════════════════════════════════', 'color: #2563eb; font-weight: bold;');
                console.log('%c🔐 [SIMULACIÓN 2FA] CÓDIGO DE VERIFICACIÓN GENERADO', 'color: #2563eb; font-size: 15px; font-weight: bold;');
                console.log(`%c👉 CÓDIGO: %c ${codigo2FA} `, 'font-size: 14px; font-weight: bold; color: #475569;', 'background: #0f172a; color: #38bdf8; font-size: 20px; font-weight: 800; padding: 4px 12px; border-radius: 6px;');
                console.log('%c⏰ Válido por 5 minutos. Escríbelo en los 6 campos de la pantalla.', 'color: #64748b; font-size: 12px;');
                console.log('%c════════════════════════════════════════════════════', 'color: #2563eb; font-weight: bold;');
            }

            return { token, user, codigo2FA, email: user.email };
        } catch (error) {
            console.error('Error en autenticación:', error);
            throw error;
        }
    },

    async verify2FA(code) {
        try {
            const currentUser = getStoredUser();
            const response = await fetch(`${API_BASE_URL}/verify-2fa`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    code: code.trim(),
                    userId: currentUser?.id,
                    username: currentUser?.username,
                    email: currentUser?.email
                })
            });

            const data = await response.json();

            if (!response.ok) {
                const errorMessage = data && (data.error || data.message) ? (data.error || data.message) : 'Código de verificación incorrecto.';
                throw new Error(errorMessage);
            }

            const rawUser = data.user || currentUser || {};
            const normalizedUser = {
                ...currentUser,
                ...rawUser,
                id: rawUser.id || rawUser.id_empleado || currentUser?.id,
                id_empleado: rawUser.id_empleado || rawUser.id || currentUser?.id_empleado,
                id_usuario: rawUser.id_usuario || currentUser?.id_usuario || rawUser.id,
                no_empleado: rawUser.no_empleado || rawUser.id_empleado || currentUser?.no_empleado || rawUser.id,
                nombre: rawUser.nombre || currentUser?.nombre || '',
                name: rawUser.nombre || currentUser?.name || currentUser?.nombre || '',
                email: rawUser.email || currentUser?.email || '',
                username: rawUser.username || currentUser?.username || '',
                role: rawUser.rol || rawUser.role || currentUser?.role || currentUser?.rol || 'Colaborador',
                rol: rawUser.rol || rawUser.role || currentUser?.rol || currentUser?.role || 'Colaborador',
                puesto: rawUser.puesto || currentUser?.puesto || '',
                departamento: rawUser.departamento || currentUser?.departamento || '',
                id_empresa: rawUser.id_empresa || rawUser.empresa_id || currentUser?.id_empresa || data.id_empresa || null,
                empresa: rawUser.empresa || rawUser.nombre_empresa || currentUser?.empresa || data.empresa || '',
                nombre_empresa: rawUser.nombre_empresa || rawUser.empresa || currentUser?.nombre_empresa || data.nombre_empresa || '',
                avatar: resolveLocalAvatar(rawUser.avatar || currentUser?.avatar, rawUser.id || currentUser?.id)
            };

            if (data.token) {
                setSession(data.token, normalizedUser);
            }
            return data;
        } catch (error) {
            console.error('Error al verificar código 2FA:', error);
            throw error;
        }
    },

    async resend2FA() {
        try {
            const currentUser = getStoredUser();
            const response = await fetch(`${API_BASE_URL}/resend-2fa`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: currentUser?.id,
                    username: currentUser?.username,
                    email: currentUser?.email
                })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'No se pudo reenviar el código.');
            }

            const nuevoCodigo = data.codigo2FA || data.code;
            if (nuevoCodigo) {
                console.log('%c════════════════════════════════════════════════════', 'color: #2563eb; font-weight: bold;');
                console.log('%c🔄 [2FA REENVIADO] NUEVO CÓDIGO DE VERIFICACIÓN', 'color: #2563eb; font-size: 15px; font-weight: bold;');
                console.log(`%c👉 CÓDIGO: %c ${nuevoCodigo} `, 'font-size: 14px; font-weight: bold; color: #475569;', 'background: #0f172a; color: #38bdf8; font-size: 20px; font-weight: 800; padding: 4px 12px; border-radius: 6px;');
                console.log('%c⏰ Válido por 5 minutos.', 'color: #64748b; font-size: 12px;');
                console.log('%c════════════════════════════════════════════════════', 'color: #2563eb; font-weight: bold;');
            }

            return data;
        } catch (error) {
            console.error('Error al reenviar código 2FA:', error);
            throw error;
        }
    }
};