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
            return { token, user };
        } catch (error) {
            console.error('Error en autenticación:', error);
            throw error;
        }
    }
};