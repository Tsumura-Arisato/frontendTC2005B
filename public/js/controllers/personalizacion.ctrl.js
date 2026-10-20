import { initLayout } from './layout.ctrl.js';
import {
    getEmpresaBranding,
    getStoredBranding,
    applyBranding,
    saveEmpresaBranding,
    resetEmpresaBranding,
    resolveUserEmpresaId,
    generatePaletteFromPrimary,
    PRESET_THEMES,
    DEFAULT_COMPANIES_BRANDING
} from '../utils/branding.js';
import { showSuccess, showError, showWarning, showConfirm } from '../utils/alert.js';

let currentWorkingBranding = null;
let currentAdminEmpresaId = 1;

document.addEventListener('DOMContentLoaded', async () => {
    const sessionUser = initLayout('personalizacion');
    if (!sessionUser) return;

    const userRole = (sessionUser.rol || sessionUser.role || '').toLowerCase();
    const isAdmin = userRole.includes('administrador') || userRole.includes('admin');

    if (!isAdmin) {
        await showWarning(
            'Acceso Restringido',
            'Esta sección de configuración y marca corporativa está reservada exclusivamente para el Administrador de la empresa.'
        );
        window.location.replace('/pages/main.html');
        return;
    }

    currentAdminEmpresaId = resolveUserEmpresaId(sessionUser);
    currentWorkingBranding = { ...getEmpresaBranding(currentAdminEmpresaId) };

    // Renderizar cabecera con la información aislada de la empresa
    renderEmpresaHeader(currentAdminEmpresaId, currentWorkingBranding, sessionUser);

    // Inicializar presets, formulario, eventos y sandbox
    renderPresetCards(currentAdminEmpresaId);
    initFormValues(currentWorkingBranding);
    setupEventListeners(currentAdminEmpresaId);
    updateLivePreview(currentWorkingBranding);
});

function renderEmpresaHeader(empresaId, branding, user) {
    const nombreEl = document.getElementById('admin-empresa-nombre');
    const resumenEl = document.getElementById('admin-empresa-nombre-resumen');
    const badgeEl = document.getElementById('admin-empresa-id-badge');
    const logoBadge = document.getElementById('admin-empresa-logo-badge');

    const companyName = branding.companyName || user.empresa || user.nombre_empresa || `Empresa #${empresaId}`;
    const shortName = branding.shortName || companyName;

    if (nombreEl) nombreEl.textContent = companyName;
    if (resumenEl) resumenEl.textContent = shortName;
    if (badgeEl) badgeEl.textContent = `Empresa ID #${empresaId}`;
    if (logoBadge) {
        if (branding.logoUrl) {
            logoBadge.src = branding.logoUrl;
            logoBadge.style.display = 'block';
        } else {
            logoBadge.src = '/assets/favicon/favicon.svg';
        }
    }
}

function renderPresetCards(empresaId) {
    const container = document.getElementById('presets-container');
    if (!container) return;

    // Generar opciones de plantillas rápidas
    const defaultThisEmpresa = DEFAULT_COMPANIES_BRANDING[empresaId] || DEFAULT_COMPANIES_BRANDING[1];

    const presetsList = [
        {
            key: 'oficial',
            name: `Oficial (${defaultThisEmpresa.shortName || 'Empresa'})`,
            description: 'Identidad y colores estándar registrados',
            primaryDark: defaultThisEmpresa.primaryDark,
            primaryLight: defaultThisEmpresa.primaryLight,
            accentColor: defaultThisEmpresa.accentColor,
            accentLight: defaultThisEmpresa.accentLight,
            logoUrl: defaultThisEmpresa.logoUrl
        },
        {
            key: 'coca-cola',
            name: 'Rojo Corporativo Fuerte',
            description: 'Paleta roja intensa y moderna',
            primaryDark: '#BA0C2F',
            primaryLight: '#E61D2B',
            accentColor: '#BA0C2F',
            accentLight: '#FEE2E2'
        },
        {
            key: 'atlas',
            name: 'Azul Marino & Verde Menta',
            description: 'Equilibrio sobrio y tecnológico',
            primaryDark: '#1A365D',
            primaryLight: '#2B6CB0',
            accentColor: '#00B894',
            accentLight: '#E6F8F5'
        },
        {
            key: 'tec',
            name: 'Azul Real & Celeste',
            description: 'Tono universitario e institucional',
            primaryDark: '#002E5D',
            primaryLight: '#005A9C',
            accentColor: '#00A3E0',
            accentLight: '#E0F2FE'
        },
        {
            key: 'starbucks',
            name: 'Verde Bosque & Esmeralda',
            description: 'Estilo ecológico y sustentable',
            primaryDark: '#1E3932',
            primaryLight: '#00754A',
            accentColor: '#006241',
            accentLight: '#D4E9E2'
        },
        {
            key: 'purple-tech',
            name: 'Púrpura Innovación',
            description: 'Enfoque moderno para empresas tech',
            primaryDark: '#581C87',
            primaryLight: '#7E22CE',
            accentColor: '#9333EA',
            accentLight: '#FAF5FF'
        }
    ];

    container.innerHTML = presetsList.map(preset => {
        const isActive = currentWorkingBranding.presetName === preset.key;
        return `
            <div class="preset-card ${isActive ? 'active-preset' : ''}" data-preset="${preset.key}">
                <div>
                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 0.4rem;">
                        <strong style="font-size: 0.88rem; color: var(--text-main);">${preset.name}</strong>
                    </div>
                    <div style="font-size: 0.74rem; color: var(--text-muted); margin-bottom: 0.6rem;">
                        ${preset.description}
                    </div>
                </div>

                <div>
                    <div class="palette-preview-bar">
                        <div style="flex: 2; background-color: ${preset.primaryDark};" title="Primario Oscuro"></div>
                        <div style="flex: 2; background-color: ${preset.primaryLight};" title="Primario Claro"></div>
                        <div style="flex: 1.5; background-color: ${preset.accentColor};" title="Acento"></div>
                    </div>
                    <button type="button" class="btn btn-secondary btn-sm btn-select-preset" data-preset="${preset.key}" style="width: 100%; margin-top: 0.8rem; font-size: 0.78rem;">
                        ${isActive ? '✓ Seleccionado' : 'Probar Paleta'}
                    </button>
                </div>
            </div>
        `;
    }).join('');

    container.querySelectorAll('.btn-select-preset, .preset-card').forEach(el => {
        el.addEventListener('click', (e) => {
            const key = el.getAttribute('data-preset');
            const found = presetsList.find(p => p.key === key);
            if (found) {
                e.stopPropagation();
                aplicarPreset(found, empresaId);
            }
        });
    });
}

function aplicarPreset(presetObj, empresaId) {
    currentWorkingBranding = {
        ...currentWorkingBranding,
        primaryDark: presetObj.primaryDark,
        primaryLight: presetObj.primaryLight,
        accentColor: presetObj.accentColor,
        accentLight: presetObj.accentLight,
        presetName: presetObj.key
    };

    if (presetObj.key === 'oficial') {
        const defaultData = DEFAULT_COMPANIES_BRANDING[empresaId] || DEFAULT_COMPANIES_BRANDING[1];
        if (defaultData.logoUrl) {
            currentWorkingBranding.logoUrl = defaultData.logoUrl;
        }
    }

    initFormValues(currentWorkingBranding);
    updateLivePreview(currentWorkingBranding);

    // Actualizar estados visuales de las tarjetas
    document.querySelectorAll('.preset-card').forEach(card => {
        if (card.getAttribute('data-preset') === presetObj.key) {
            card.classList.add('active-preset');
            const btn = card.querySelector('.btn-select-preset');
            if (btn) btn.textContent = '✓ Seleccionado';
        } else {
            card.classList.remove('active-preset');
            const btn = card.querySelector('.btn-select-preset');
            if (btn) btn.textContent = 'Probar Paleta';
        }
    });
}

function initFormValues(branding) {
    const nameInput = document.getElementById('brand-company-name');
    const shortNameInput = document.getElementById('brand-short-name');
    const logoInput = document.getElementById('brand-logo-url');

    const pickerMain = document.getElementById('picker-primary-main');
    const textMain = document.getElementById('text-primary-main');

    const pickerDark = document.getElementById('picker-primary-dark');
    const textDark = document.getElementById('text-primary-dark');

    const pickerAccent = document.getElementById('picker-accent-color');
    const textAccent = document.getElementById('text-accent-color');

    if (nameInput) nameInput.value = branding.companyName || '';
    if (shortNameInput) shortNameInput.value = branding.shortName || '';
    if (logoInput) logoInput.value = branding.logoUrl || '';

    if (pickerMain) pickerMain.value = branding.primaryDark || '#1A365D';
    if (textMain) textMain.value = branding.primaryDark || '#1A365D';

    if (pickerDark) pickerDark.value = branding.primaryDark || '#1A365D';
    if (textDark) textDark.value = branding.primaryDark || '#1A365D';

    if (pickerAccent) pickerAccent.value = branding.accentColor || '#00B894';
    if (textAccent) textAccent.value = branding.accentColor || '#00B894';
}

function setupEventListeners(empresaId) {
    const nameInput = document.getElementById('brand-company-name');
    const shortNameInput = document.getElementById('brand-short-name');
    const logoInput = document.getElementById('brand-logo-url');
    const fileLogoInput = document.getElementById('input-file-logo');

    const pickerMain = document.getElementById('picker-primary-main');
    const textMain = document.getElementById('text-primary-main');

    const pickerDark = document.getElementById('picker-primary-dark');
    const textDark = document.getElementById('text-primary-dark');

    const pickerAccent = document.getElementById('picker-accent-color');
    const textAccent = document.getElementById('text-accent-color');

    const btnAutoGenerar = document.getElementById('btn-generar-paleta');
    const btnGuardar = document.getElementById('btn-guardar-branding');
    const btnRestablecer = document.getElementById('btn-restablecer-branding');

    // Sincronizar inputs de texto
    if (nameInput) {
        nameInput.addEventListener('input', () => {
            currentWorkingBranding.companyName = nameInput.value.trim();
            updateLivePreview(currentWorkingBranding);
        });
    }

    if (shortNameInput) {
        shortNameInput.addEventListener('input', () => {
            currentWorkingBranding.shortName = shortNameInput.value.trim();
            updateLivePreview(currentWorkingBranding);
        });
    }

    if (logoInput) {
        logoInput.addEventListener('input', () => {
            currentWorkingBranding.logoUrl = logoInput.value.trim();
            updateLivePreview(currentWorkingBranding);
        });
    }

    // Subir logo desde archivo local
    if (fileLogoInput) {
        fileLogoInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            if (file.size > 2 * 1024 * 1024) {
                showError('Archivo muy grande', 'El archivo de imagen no debe superar los 2MB.');
                return;
            }

            const reader = new FileReader();
            reader.onload = (event) => {
                const dataUrl = event.target.result;
                currentWorkingBranding.logoUrl = dataUrl;
                if (logoInput) logoInput.value = dataUrl;
                updateLivePreview(currentWorkingBranding);
            };
            reader.readAsDataURL(file);
        });
    }

    // Sincronizar picker con texto para Color Base
    if (pickerMain && textMain) {
        pickerMain.addEventListener('input', () => {
            textMain.value = pickerMain.value;
            autoCalcularDesdePrimario(pickerMain.value);
        });
        textMain.addEventListener('input', () => {
            if (/^#[0-9A-Fa-f]{6}$/.test(textMain.value)) {
                pickerMain.value = textMain.value;
                autoCalcularDesdePrimario(textMain.value);
            }
        });
    }

    // Sincronizar picker con texto para Primario Oscuro
    if (pickerDark && textDark) {
        pickerDark.addEventListener('input', () => {
            textDark.value = pickerDark.value;
            currentWorkingBranding.primaryDark = pickerDark.value;
            updateLivePreview(currentWorkingBranding);
        });
        textDark.addEventListener('input', () => {
            if (/^#[0-9A-Fa-f]{6}$/.test(textDark.value)) {
                pickerDark.value = textDark.value;
                currentWorkingBranding.primaryDark = textDark.value;
                updateLivePreview(currentWorkingBranding);
            }
        });
    }

    // Sincronizar picker con texto para Acento
    if (pickerAccent && textAccent) {
        pickerAccent.addEventListener('input', () => {
            textAccent.value = pickerAccent.value;
            currentWorkingBranding.accentColor = pickerAccent.value;
            updateLivePreview(currentWorkingBranding);
        });
        textAccent.addEventListener('input', () => {
            if (/^#[0-9A-Fa-f]{6}$/.test(textAccent.value)) {
                pickerAccent.value = textAccent.value;
                currentWorkingBranding.accentColor = textAccent.value;
                updateLivePreview(currentWorkingBranding);
            }
        });
    }

    // Botón auto-generar paleta segura
    if (btnAutoGenerar && pickerMain) {
        btnAutoGenerar.addEventListener('click', () => {
            autoCalcularDesdePrimario(pickerMain.value);
            showSuccess(
                'Paleta Armónica Generada',
                'Se calcularon automáticamente tonalidades con contraste accesible WCAG para que ningún color afecte la legibilidad.',
                { autoClose: true }
            );
        });
    }

    // Guardar para esta empresa
    if (btnGuardar) {
        btnGuardar.addEventListener('click', async () => {
            btnGuardar.disabled = true;
            btnGuardar.textContent = 'Guardando...';
            try {
                const saved = await saveEmpresaBranding(empresaId, currentWorkingBranding);
                currentWorkingBranding = { ...saved };
                renderEmpresaHeader(empresaId, currentWorkingBranding, { id_empresa: empresaId });

                await showSuccess(
                    '¡Configuración Guardada!',
                    `La identidad visual de <b>${currentWorkingBranding.companyName || 'tu empresa'}</b> ha sido guardada exitosamente. Todos los colaboradores de tu empresa verán estos colores y el logotipo centrado.`
                );
            } catch (err) {
                showError('Error al Guardar', err.message || 'No fue posible guardar la configuración.');
            } finally {
                btnGuardar.disabled = false;
                btnGuardar.textContent = 'Guardar y Aplicar';
            }
        });
    }

    // Restablecer a original de ESTA empresa
    if (btnRestablecer) {
        btnRestablecer.addEventListener('click', async () => {
            const nombreEmpresa = currentWorkingBranding.companyName || 'tu empresa';
            const confirmado = await showConfirm(
                '¿Restablecer Colores?',
                `¿Deseas restaurar la identidad visual y colores oficiales predeterminados para <b>${nombreEmpresa}</b>?`,
                { confirmButtonText: 'Sí, Restablecer', cancelButtonText: 'Cancelar' }
            );

            if (confirmado) {
                const restored = await resetEmpresaBranding(empresaId);
                currentWorkingBranding = { ...restored };
                initFormValues(currentWorkingBranding);
                updateLivePreview(currentWorkingBranding);
                renderEmpresaHeader(empresaId, currentWorkingBranding, { id_empresa: empresaId });
                renderPresetCards(empresaId);
                await showSuccess('Colores Restaurados', `El portal volvió a la paleta predeterminada de ${nombreEmpresa}.`);
            }
        });
    }
}

function autoCalcularDesdePrimario(hexColor) {
    const palette = generatePaletteFromPrimary(hexColor);
    if (!palette) return;

    currentWorkingBranding = {
        ...currentWorkingBranding,
        primaryDark: palette.primaryDark,
        primaryLight: palette.primaryLight,
        accentColor: palette.accentColor,
        accentLight: palette.accentLight,
        presetName: 'custom'
    };

    const pickerDark = document.getElementById('picker-primary-dark');
    const textDark = document.getElementById('text-primary-dark');
    const pickerAccent = document.getElementById('picker-accent-color');
    const textAccent = document.getElementById('text-accent-color');

    if (pickerDark) pickerDark.value = palette.primaryDark;
    if (textDark) textDark.value = palette.primaryDark;
    if (pickerAccent) pickerAccent.value = palette.accentColor;
    if (textAccent) textAccent.value = palette.accentColor;

    updateLivePreview(currentWorkingBranding);
}

function updateLivePreview(config) {
    // 1. Vista previa del sandbox en pantalla
    const previewTitle = document.getElementById('preview-title');
    const previewBtnPrimary = document.getElementById('preview-btn-primary');
    const previewBtnAccent = document.getElementById('preview-btn-accent');
    const previewBadge = document.getElementById('preview-badge');
    const previewLogoImg = document.getElementById('preview-logo-img');
    const previewCompanyName = document.getElementById('preview-company-name-text');

    if (previewTitle && config.primaryDark) previewTitle.style.color = config.primaryDark;
    if (previewBtnPrimary && config.primaryDark) {
        previewBtnPrimary.style.backgroundColor = config.primaryDark;
    }
    if (previewBtnAccent && config.accentColor) {
        previewBtnAccent.style.backgroundColor = config.accentColor;
    }
    if (previewBadge) {
        previewBadge.style.backgroundColor = config.accentLight || '#E6F8F5';
        previewBadge.style.color = config.accentColor || '#00B894';
    }

    const displayName = config.shortName || config.companyName || 'Empresa';

    if (previewCompanyName) {
        previewCompanyName.textContent = displayName;
        previewCompanyName.style.color = config.primaryDark || '#1A365D';
    }

    if (previewLogoImg) {
        if (config.logoUrl) {
            previewLogoImg.src = config.logoUrl;
            previewLogoImg.style.display = 'inline-block';
        } else {
            previewLogoImg.style.display = 'none';
        }
    }

    // 2. Aplicar también en vivo al navbar real del portal para feedback visual instantáneo
    applyBranding(config);
}
