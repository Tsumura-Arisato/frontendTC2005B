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
                id: rawUser.id || rawUser.id_empleado,
                nombre: rawUser.nombre || '',
                name: rawUser.nombre || '',
                email: rawUser.email || rawUser.username || usernameOrEmail,
                username: rawUser.username || usernameOrEmail,
                role: rawUser.rol || 'Colaborador',
                rol: rawUser.rol || 'Colaborador',
                avatar: resolveLocalAvatar(rawUser.avatar, rawUser.id)
            };

            setSession(token, user);

            const codigo2FA = data.codigo2FA || data.code;
            if (codigo2FA) {
                console.log('%c════════════════════════════════════════════════════', 'color: #2563eb; font-weight: bold;');
                console.log('%c🔐 [SIMULACIÓN 2FA] CÓDIGO DE VERIFICACIÓN GENERADO', 'color: #2563eb; font-size: 15px; font-weight: bold;');
                console.log(`%c👉 CÓDIGO: %c ${codigo2FA} `, 'font-size: 14px; font-weight: bold; color: #475569;', 'background: #0f172a; color: #38bdf8; font-size: 20px; font-weight: 800; padding: 4px 12px; border-radius: 6px;');
                console.log('%c⏰ Válido por 5 minutos. Escríbelo en los 6 campos de la pantalla.', 'color: #64748b; font-size: 12px;');
                console.log('%c════════════════════════════════════════════════════', 'color: #2563eb; font-weight: bold;');
            }

            return { token, user, codigo2FA };
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

            if (data.token) {
                setSession(data.token, data.user || currentUser);
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