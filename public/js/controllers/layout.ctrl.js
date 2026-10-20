import { AuthModel } from '../models/auth.model.js';
import { renderSidebar } from '../views/sidebar.view.js';
import { renderNavbar } from '../views/navbar.view.js';
import { fetchWithAuth } from '../config.js';
import { initSweetAlert } from '../utils/alert.js';
import { applyBranding, syncBrandingFromDB } from '../utils/branding.js';

const THEME_KEY = 'eslabon_theme_preference';

export function initLayout(activeRoute = 'inicio') {
    initSweetAlert();
    const currentUser = AuthModel.getCurrentUser();
    if (!currentUser) {
        window.location.replace('/');
        return null;
    }

    const is2FA = localStorage.getItem('eslabon_2fa_verified') === 'true';
    if (!is2FA) {
        window.location.replace('/pages/2fa.html');
        return null;
    }

    const sidebarContainer = document.getElementById('sidebar-container');
    if (sidebarContainer) {
        sidebarContainer.innerHTML = renderSidebar(activeRoute, currentUser);
    }

    const navbarContainer = document.getElementById('navbar-container');
    if (navbarContainer) {
        if (navbarContainer.tagName === 'NAV') {
            navbarContainer.innerHTML = renderNavbar(currentUser);
        } else {
            const tempWrapper = document.createElement('div');
            tempWrapper.innerHTML = renderNavbar(currentUser).trim();
            navbarContainer.replaceWith(tempWrapper.firstElementChild);
        }
    }

    bindGlobalEvents(currentUser);
    applyBranding();
    syncBrandingFromDB();
    syncThemeFromDB(currentUser.id);

    return currentUser;
}

function bindGlobalEvents(currentUser) {
    applyThemePreference();

    const themeBtn = document.getElementById('btn-theme-toggle');
    if (themeBtn) {
        themeBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const isDarkNow = !document.documentElement.classList.contains('dark-mode');
            const newThemeStr = isDarkNow ? 'dark' : 'light';

            applyThemePreference(isDarkNow);
            localStorage.setItem(THEME_KEY, newThemeStr);

            if (currentUser && currentUser.id) {
                const prefObj = { theme: newThemeStr };
                try {
                    await fetchWithAuth('/preferencias', {
                        method: 'POST',
                        body: JSON.stringify({
                            empleado_id: currentUser.id,
                            usuario_id: currentUser.id,
                            preferencias_accesibilidad: prefObj,
                            tema: newThemeStr
                        })
                    });
                } catch (err) {
                    console.warn('Endpoint /preferencias no disponible en backend para guardar tema:', err);
                }
            }
        });
    }

    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            AuthModel.logout();
            window.location.replace('/');
        });
    }

    const bellBtn = document.getElementById('btn-notifications');
    const dropdownMenu = document.getElementById('dropdown-notifications');
    if (bellBtn && dropdownMenu) {
        bellBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdownMenu.classList.toggle('show');
        });

        document.addEventListener('click', (e) => {
            if (dropdownMenu.classList.contains('show') && !dropdownMenu.contains(e.target) && e.target !== bellBtn) {
                dropdownMenu.classList.remove('show');
            }
        });
    }

    const btnMenu = document.getElementById('btn-menu');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('menu-overlay');

    if (btnMenu && sidebar && overlay) {
        const toggleMenu = () => {
            sidebar.classList.toggle('open');
            overlay.classList.toggle('show');
        };
        btnMenu.addEventListener('click', toggleMenu);
        overlay.addEventListener('click', toggleMenu);
    }
}

export async function syncThemeFromDB(userId) {
    if (!userId) return;
    try {
        const response = await fetchWithAuth(`/perfil?empleado_id=${userId}`);
        if (response.ok) {
            const data = await response.json();

            // Refrescar inmediatamente el nombre y rol del navbar desde la base de datos
            const displayNameEl = document.getElementById('user-display-name');
            const displayRoleEl = document.getElementById('user-display-role');
            const nombre = data.nombre || data.name;
            const puesto = data.puesto || data.rol || 'Colaborador';
            const numNomina = data.no_empleado || data.id || userId;

            if (displayNameEl && nombre) {
                displayNameEl.textContent = nombre;
            }
            if (displayRoleEl) {
                displayRoleEl.textContent = `Nómina: #${numNomina} • ${puesto}`;
            }

            // Actualizar la sesión en localStorage para persistir los datos de la base de datos
            const storedUser = AuthModel.getCurrentUser() || {};
            const updatedUser = {
                ...storedUser,
                ...data,
                id: data.id || storedUser.id || userId,
                id_empleado: data.id || storedUser.id_empleado || userId,
                nombre: nombre || storedUser.nombre || '',
                name: nombre || storedUser.name || '',
                rol: data.rol || storedUser.rol || 'Colaborador',
                role: data.rol || storedUser.role || 'Colaborador',
                puesto: puesto,
                departamento: data.departamento || storedUser.departamento || ''
            };
            localStorage.setItem('eslabon_active_user', JSON.stringify(updatedUser));

            let rawPref = data.preferencias_accesibilidad;
            let themeVal = null;

            if (typeof rawPref === 'string') {
                try {
                    rawPref = JSON.parse(rawPref);
                } catch (e) {
                    
                }
            }

            if (rawPref && typeof rawPref === 'object') {
                themeVal = rawPref.theme || rawPref.tema;
            } else if (data.tema_preferencia || data.theme_preference || data.tema) {
                themeVal = data.tema_preferencia || data.theme_preference || data.tema;
            }

            if (themeVal && (themeVal === 'dark' || themeVal === 'light')) {
                const isDark = themeVal === 'dark';
                localStorage.setItem(THEME_KEY, themeVal);
                applyThemePreference(isDark);
            }
        }
    } catch (e) {
        console.warn('No se pudo sincronizar el perfil o tema desde la BD:', e);
    }
}

function applyThemePreference(forceState) {
    let isDark;
    if (typeof forceState === 'boolean') {
        isDark = forceState;
    } else {
        const savedTheme = localStorage.getItem(THEME_KEY);
        isDark = savedTheme === 'dark';
    }

    if (isDark) {
        document.documentElement.classList.add('dark-mode');
        document.body.classList.add('dark-mode');
    } else {
        document.documentElement.classList.remove('dark-mode');
        document.body.classList.remove('dark-mode');
    }
    updateThemeIcon(isDark);
}

function updateThemeIcon(isDark) {
    const iconEl = document.getElementById('theme-toggle-icon');
    if (!iconEl) return;
    if (isDark) {
        iconEl.innerHTML = `<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>`;
        iconEl.setAttribute('stroke', '#FBBF24');
    } else {
        iconEl.innerHTML = `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>`;
        iconEl.setAttribute('stroke', 'var(--primary-dark)');
    }
}