/**
 * Sistema Multi-Empresa de Personalización y Marca Corporativa (Multi-Tenant White-Label)
 * Cada empresa tiene su propio Administrador que solo puede personalizar su propia empresa.
 * Al iniciar sesión un usuario, el portal se adapta automáticamente a los colores y logotipo central de su empresa.
 */

import { API_BASE_URL, fetchWithAuth, getStoredUser } from '../config.js';

export const BRANDING_STORAGE_KEY = 'eslabon_custom_branding';

export const DEFAULT_COMPANIES_BRANDING = {
    1: {
        empresaId: 1,
        companyName: 'ATLAS SOLUTIONS S.A. DE C.V.',
        shortName: 'Atlas Solutions',
        logoUrl: '/assets/favicon/favicon.svg',
        primaryDark: '#1A365D',
        primaryLight: '#2B6CB0',
        accentColor: '#00B894',
        accentLight: '#E6F8F5',
        presetName: 'atlas'
    },
    2: {
        empresaId: 2,
        companyName: 'COCA-COLA FEMSA S.A.B. DE C.V.',
        shortName: 'Coca-Cola FEMSA',
        logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/c/ce/Coca-Cola_logo_2007.svg',
        primaryDark: '#BA0C2F',
        primaryLight: '#E61D2B',
        accentColor: '#BA0C2F',
        accentLight: '#FEE2E2',
        presetName: 'coca-cola'
    },
    3: {
        empresaId: 3,
        companyName: 'TECNOLÓGICO DE MONTERREY',
        shortName: 'Tec de Monterrey',
        logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/e0/Tecnologico_de_Monterrey_logo.svg',
        primaryDark: '#002E5D',
        primaryLight: '#005A9C',
        accentColor: '#00A3E0',
        accentLight: '#E0F2FE',
        presetName: 'tec'
    },
    4: {
        empresaId: 4,
        companyName: 'STARBUCKS COFFEE MÉXICO',
        shortName: 'Starbucks Coffee',
        logoUrl: 'https://upload.wikimedia.org/wikipedia/en/d/d3/Starbucks_Corporation_Logo_2011.svg',
        primaryDark: '#1E3932',
        primaryLight: '#00754A',
        accentColor: '#006241',
        accentLight: '#D4E9E2',
        presetName: 'starbucks'
    },
    5: {
        empresaId: 5,
        companyName: 'BANCO SANTANDER MÉXICO S.A.',
        shortName: 'Santander México',
        logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/b8/Banco_Santander_Logotipo.svg',
        primaryDark: '#991B1B',
        primaryLight: '#DC2626',
        accentColor: '#B91C1C',
        accentLight: '#FEF2F2',
        presetName: 'santander'
    }
};

export const DEFAULT_BRANDING = DEFAULT_COMPANIES_BRANDING[1];

export const PRESET_THEMES = {
    'coca-cola': {
        name: 'Coca-Cola FEMSA',
        companyName: 'COCA-COLA FEMSA S.A.B. DE C.V.',
        shortName: 'Coca-Cola FEMSA',
        logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/c/ce/Coca-Cola_logo_2007.svg',
        primaryDark: '#BA0C2F',
        primaryLight: '#E61D2B',
        accentColor: '#BA0C2F',
        accentLight: '#FEE2E2',
        presetName: 'coca-cola'
    },
    'atlas': {
        name: 'Atlas Clásico',
        companyName: 'ATLAS SOLUTIONS S.A. DE C.V.',
        shortName: 'Atlas Solutions',
        logoUrl: '/assets/favicon/favicon.svg',
        primaryDark: '#1A365D',
        primaryLight: '#2B6CB0',
        accentColor: '#00B894',
        accentLight: '#E6F8F5',
        presetName: 'atlas'
    },
    'tec': {
        name: 'Tec de Monterrey',
        companyName: 'TECNOLÓGICO DE MONTERREY',
        shortName: 'Tec de Monterrey',
        logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/e0/Tecnologico_de_Monterrey_logo.svg',
        primaryDark: '#002E5D',
        primaryLight: '#005A9C',
        accentColor: '#00A3E0',
        accentLight: '#E0F2FE',
        presetName: 'tec'
    },
    'starbucks': {
        name: 'Starbucks Coffee',
        companyName: 'STARBUCKS COFFEE MÉXICO',
        shortName: 'Starbucks Coffee',
        logoUrl: 'https://upload.wikimedia.org/wikipedia/en/d/d3/Starbucks_Corporation_Logo_2011.svg',
        primaryDark: '#1E3932',
        primaryLight: '#00754A',
        accentColor: '#006241',
        accentLight: '#D4E9E2',
        presetName: 'starbucks'
    },
    'santander': {
        name: 'Santander / Banorte',
        companyName: 'BANCO SANTANDER MÉXICO S.A.',
        shortName: 'Santander México',
        logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/b8/Banco_Santander_Logotipo.svg',
        primaryDark: '#991B1B',
        primaryLight: '#DC2626',
        accentColor: '#B91C1C',
        accentLight: '#FEF2F2',
        presetName: 'santander'
    },
    'purple-tech': {
        name: 'PeopleTech Púrpura',
        companyName: 'PEOPLETECH GLOBAL S.A.',
        shortName: 'PeopleTech Global',
        logoUrl: 'https://api.iconify.design/lucide:sparkles.svg?color=%237e22ce',
        primaryDark: '#581C87',
        primaryLight: '#7E22CE',
        accentColor: '#9333EA',
        accentLight: '#FAF5FF',
        presetName: 'purple-tech'
    }
};

/**
 * Resuelve el ID de empresa para un usuario
 */
export function resolveUserEmpresaId(user) {
    if (!user) return 1;
    if (user.id_empresa) return Number(user.id_empresa);
    if (user.empresa_id) return Number(user.empresa_id);

    const empStr = String(user.empresa || user.nombre_empresa || user.email || user.username || '').toLowerCase();
    if (empStr.includes('coca') || empStr.includes('femsa')) return 2;
    if (empStr.includes('tec') || empStr.includes('monterrey') || empStr.includes('itesm')) return 3;
    if (empStr.includes('starbucks')) return 4;
    if (empStr.includes('santander') || empStr.includes('banorte')) return 5;
    return 1;
}

/**
 * Obtiene el branding guardado para una empresa específica
 */
export function getEmpresaBranding(empresaId = 1) {
    const id = Number(empresaId) || 1;
    const defaultData = DEFAULT_COMPANIES_BRANDING[id] || DEFAULT_BRANDING;

    try {
        const stored = localStorage.getItem(`eslabon_branding_empresa_${id}`);
        if (stored) {
            return { ...defaultData, ...JSON.parse(stored) };
        }
    } catch (e) {
        console.warn('Error leyendo branding de empresa:', e);
    }

    return { ...defaultData };
}

/**
 * Obtiene la configuración de marca activa del usuario actual
 */
export function getStoredBranding() {
    const user = getStoredUser();
    const empresaId = resolveUserEmpresaId(user);
    return getEmpresaBranding(empresaId);
}

/**
 * Aplica los estilos y logo de la empresa correspondiente al usuario activo
 */
export function applyBranding(branding) {
    const config = branding || getStoredBranding();
    const root = document.documentElement;

    if (config.primaryDark) root.style.setProperty('--primary-dark', config.primaryDark);
    if (config.primaryLight) root.style.setProperty('--primary-light', config.primaryLight);
    if (config.accentColor) root.style.setProperty('--accent-color', config.accentColor);
    if (config.accentLight) root.style.setProperty('--accent-light', config.accentLight);

    injectBrandingStyles(config);
    updateNavbarCenterLogo(config);
}

function injectBrandingStyles(config) {
    let styleTag = document.getElementById('dynamic-branding-overrides');
    if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = 'dynamic-branding-overrides';
        document.head.appendChild(styleTag);
    }

    styleTag.textContent = `
        .btn-primary {
            background-color: var(--primary-dark) !important;
            border-color: var(--primary-dark) !important;
            color: #FFFFFF !important;
        }
        .btn-primary:hover {
            background-color: var(--primary-light) !important;
            border-color: var(--primary-light) !important;
        }
        .btn-accent {
            background-color: var(--accent-color) !important;
            border-color: var(--accent-color) !important;
            color: #FFFFFF !important;
        }
        .badge-accent {
            background-color: var(--accent-color) !important;
            color: #FFFFFF !important;
        }
        .sidebar-link.active {
            background-color: var(--accent-light) !important;
            color: var(--primary-dark) !important;
        }
        .sidebar-link.active svg {
            stroke: var(--primary-dark) !important;
        }
        body.dark-mode .sidebar-link.active {
            background-color: rgba(255, 255, 255, 0.08) !important;
            color: #FFFFFF !important;
        }
    `;
}

export function updateNavbarCenterLogo(config) {
    const brandCenterContainer = document.getElementById('navbar-brand-center');
    if (!brandCenterContainer) return;

    const displayName = config.shortName || config.companyName || 'Portal Corporativo';

    if (config.logoUrl) {
        brandCenterContainer.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; gap: 10px; height: 100%;">
                <img src="${config.logoUrl}" alt="${displayName}" 
                     style="max-height: 38px; max-width: 160px; object-fit: contain; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.06));"
                     onerror="this.style.display='none'; const el = document.getElementById('navbar-center-company-name'); if(el) el.style.display='inline-block';">
                <span id="navbar-center-company-name" style="font-weight: 800; font-size: 1.05rem; letter-spacing: 0.5px; color: var(--primary-dark); text-transform: uppercase;">
                    ${displayName}
                </span>
            </div>
        `;
    } else {
        brandCenterContainer.innerHTML = `
            <span id="navbar-center-company-name" style="font-weight: 800; font-size: 1.15rem; letter-spacing: 0.5px; color: var(--primary-dark); text-transform: uppercase;">
                ${displayName}
            </span>
        `;
    }
}

/**
 * Guarda la configuración de la empresa en localStorage y en el backend
 */
export async function saveEmpresaBranding(empresaId, brandingData) {
    const id = Number(empresaId) || 1;
    const baseDefault = DEFAULT_COMPANIES_BRANDING[id] || DEFAULT_BRANDING;
    const merged = { ...baseDefault, ...brandingData, empresaId: id };

    // Guardar para esta empresa en particular
    localStorage.setItem(`eslabon_branding_empresa_${id}`, JSON.stringify(merged));
    localStorage.setItem(BRANDING_STORAGE_KEY, JSON.stringify(merged));

    applyBranding(merged);

    try {
        await fetchWithAuth(`/empresa/branding?empresa_id=${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(merged)
        });
    } catch (e) {
        console.warn('No se pudo guardar la marca en el backend (se mantiene localmente):', e);
    }

    return merged;
}

/**
 * Restablece la empresa a su configuración predeterminada
 */
export async function resetEmpresaBranding(empresaId) {
    const id = Number(empresaId) || 1;
    const defaultData = DEFAULT_COMPANIES_BRANDING[id] || DEFAULT_BRANDING;
    return await saveEmpresaBranding(id, defaultData);
}

/**
 * Funciones de conveniencia para la empresa activa del usuario actual
 */
export async function saveBranding(brandingData) {
    const user = getStoredUser();
    const empresaId = resolveUserEmpresaId(user);
    return await saveEmpresaBranding(empresaId, brandingData);
}

export async function resetBranding(empresaId = null) {
    const user = getStoredUser();
    const id = empresaId || resolveUserEmpresaId(user);
    return await resetEmpresaBranding(id);
}

/**
 * Sincroniza desde el backend la marca corporativa de la empresa del usuario
 */
export async function syncBrandingFromDB() {
    const user = getStoredUser();
    const empresaId = resolveUserEmpresaId(user);

    try {
        const response = await fetch(`${API_BASE_URL}/empresa/branding?empresa_id=${empresaId}`);
        if (response.ok) {
            const data = await response.json();
            if (data && (data.primaryDark || data.color_primario_dark)) {
                const normalized = {
                    empresaId: empresaId,
                    companyName: data.companyName || data.nombre_empresa || DEFAULT_COMPANIES_BRANDING[empresaId]?.companyName,
                    shortName: data.shortName || data.nombre_corto || data.companyName,
                    logoUrl: data.logoUrl || data.logo_url || DEFAULT_COMPANIES_BRANDING[empresaId]?.logoUrl,
                    primaryDark: data.primaryDark || data.color_primario_dark,
                    primaryLight: data.primaryLight || data.color_primario_light,
                    accentColor: data.accentColor || data.color_acento,
                    accentLight: data.accentLight || data.color_acento_light,
                    presetName: data.presetName || data.preset_nombre || 'custom'
                };
                localStorage.setItem(`eslabon_branding_empresa_${empresaId}`, JSON.stringify(normalized));
                localStorage.setItem(BRANDING_STORAGE_KEY, JSON.stringify(normalized));
                applyBranding(normalized);
                return normalized;
            }
        }
    } catch (e) {
        // En caso de que el backend esté offline, mantiene datos locales
    }

    const current = getEmpresaBranding(empresaId);
    applyBranding(current);
    return current;
}

/**
 * Generador automático de paleta armónica segura:
 * Garantiza contraste WCAG para que NINGÚN color destroce la web.
 */
export function generatePaletteFromPrimary(primaryHex) {
    const cleanHex = primaryHex.replace('#', '').trim();
    if (cleanHex.length !== 6) return null;

    const r = parseInt(cleanHex.substr(0, 2), 16);
    const g = parseInt(cleanHex.substr(2, 2), 16);
    const b = parseInt(cleanHex.substr(4, 2), 16);

    const darkR = Math.max(0, Math.floor(r * 0.7));
    const darkG = Math.max(0, Math.floor(g * 0.7));
    const darkB = Math.max(0, Math.floor(b * 0.7));
    const primaryDark = `#${toHex(darkR)}${toHex(darkG)}${toHex(darkB)}`;

    const lightR = Math.min(255, Math.floor(r + (255 - r) * 0.25));
    const lightG = Math.min(255, Math.floor(g + (255 - g) * 0.25));
    const lightB = Math.min(255, Math.floor(b + (255 - b) * 0.25));
    const primaryLight = `#${toHex(lightR)}${toHex(lightG)}${toHex(lightB)}`;

    const pastelR = Math.min(255, Math.floor(r + (255 - r) * 0.90));
    const pastelG = Math.min(255, Math.floor(g + (255 - g) * 0.90));
    const pastelB = Math.min(255, Math.floor(b + (255 - b) * 0.90));
    const accentLight = `#${toHex(pastelR)}${toHex(pastelG)}${toHex(pastelB)}`;

    return {
        primaryDark,
        primaryLight,
        accentColor: `#${cleanHex}`,
        accentLight
    };
}

function toHex(num) {
    const hex = num.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
}
