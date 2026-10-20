export const API_BASE_URL = 'http://localhost:3000/api';

/**
 * Personalización Multi-Empresa (White-Label):
 * Si vendes o despliegas este frontend para un cliente específico, especifica aquí el identificador
 * de la empresa (ej: 'coca-cola', 'atlas', 'tec', 'starbucks', 'santander').
 * Si se deja vacío (''), cargará automáticamente la empresa activa configurada en la base de datos SQL Server.
 */
export const DEFAULT_TENANT_COMPANY = 'atlas';

const TOKEN_KEY = 'eslabon_jwt_token';
const USER_KEY = 'eslabon_active_user';

export function getToken() {
    return localStorage.getItem(TOKEN_KEY) || null;
}

export function getStoredUser() {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch (e) {
        return null;
    }
}

export function setSession(token, user) {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem('eslabon_active_session');
}

export async function fetchWithAuth(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
    const token = getToken();

    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {})
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
        ...options,
        headers
    };

    try {
        const response = await fetch(url, config);

        if (response.status === 401) {
            clearSession();
            if (window.location.pathname !== '/' && !window.location.pathname.endsWith('index.html')) {
                window.location.replace('/');
            }
            throw new Error('Sesión expirada o no autorizada');
        }

        return response;
    } catch (error) {
        console.error(`Error en petición API [${endpoint}]:`, error);
        throw error;
    }
}