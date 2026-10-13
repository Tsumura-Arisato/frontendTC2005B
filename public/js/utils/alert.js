/**
 * SweetAlert2 Personalizado para Portal RH / Atlas
 * Proporciona modales atractivos y coherentes con la paleta y modo oscuro del sistema.
 */

// Asegurar carga de la librería local
let swalReadyPromise = null;

export function initSweetAlert() {
    if (window.Swal) {
        setupGlobalAlertOverride();
        return Promise.resolve(window.Swal);
    }

    if (!swalReadyPromise) {
        swalReadyPromise = new Promise((resolve, reject) => {
            const existingScript = document.querySelector('script[src*="sweetalert2"]');
            if (existingScript && window.Swal) {
                setupGlobalAlertOverride();
                return resolve(window.Swal);
            }

            const script = document.createElement('script');
            script.src = '/vendor/sweetalert2.all.min.js';
            script.onload = () => {
                setupGlobalAlertOverride();
                resolve(window.Swal);
            };
            script.onerror = () => {
                console.warn('No se pudo cargar SweetAlert2 local, intentando CDN...');
                const cdnScript = document.createElement('script');
                cdnScript.src = 'https://cdn.jsdelivr.net/npm/sweetalert2@11';
                cdnScript.onload = () => {
                    setupGlobalAlertOverride();
                    resolve(window.Swal);
                };
                cdnScript.onerror = (e) => reject(e);
                document.head.appendChild(cdnScript);
            };
            document.head.appendChild(script);
        });
    }

    return swalReadyPromise;
}

// Configuración predeterminada de Atlas
function getAtlasSwal() {
    if (!window.Swal) return null;
    return window.Swal.mixin({
        customClass: {
            popup: 'atlas-swal-popup',
            title: 'atlas-swal-title',
            htmlContainer: 'atlas-swal-html',
            confirmButton: 'atlas-swal-confirm-btn',
            cancelButton: 'atlas-swal-cancel-btn',
            denyButton: 'atlas-swal-cancel-btn'
        },
        buttonsStyling: false,
        reverseButtons: true,
        showClass: {
            popup: 'swal2-show'
        },
        hideClass: {
            popup: 'swal2-hide'
        }
    });
}

/**
 * Muestra una alerta de éxito
 */
export async function showSuccess(title, text = '', options = {}) {
    await initSweetAlert();
    const swal = getAtlasSwal();
    if (!swal) return window.alert(text ? `${title}: ${text}` : title);

    return swal.fire({
        icon: 'success',
        title: title || '¡Operación Exitosa!',
        html: text || undefined,
        confirmButtonText: options.confirmButtonText || 'Entendido',
        timer: options.timer || (options.autoClose ? 3000 : undefined),
        timerProgressBar: !!options.timer || !!options.autoClose,
        ...options
    });
}

/**
 * Muestra una alerta de error
 */
export async function showError(title, text = '', options = {}) {
    await initSweetAlert();
    const swal = getAtlasSwal();
    if (!swal) return window.alert(text ? `${title}: ${text}` : title);

    return swal.fire({
        icon: 'error',
        title: title || 'Ha Ocurrido un Error',
        html: text || undefined,
        confirmButtonText: options.confirmButtonText || 'Aceptar',
        ...options
    });
}

/**
 * Muestra una alerta de advertencia / precaución
 */
export async function showWarning(title, text = '', options = {}) {
    await initSweetAlert();
    const swal = getAtlasSwal();
    if (!swal) return window.alert(text ? `${title}: ${text}` : title);

    return swal.fire({
        icon: 'warning',
        title: title || 'Atención',
        html: text || undefined,
        confirmButtonText: options.confirmButtonText || 'Entendido',
        ...options
    });
}

/**
 * Muestra una alerta informativa
 */
export async function showInfo(title, text = '', options = {}) {
    await initSweetAlert();
    const swal = getAtlasSwal();
    if (!swal) return window.alert(text ? `${title}: ${text}` : title);

    return swal.fire({
        icon: 'info',
        title: title || 'Información',
        html: text || undefined,
        confirmButtonText: options.confirmButtonText || 'De acuerdo',
        ...options
    });
}

/**
 * Muestra un diálogo de confirmación interactivo
 * @returns {Promise<boolean>} true si el usuario confirmó, false si canceló
 */
export async function showConfirm(title, text = '', options = {}) {
    await initSweetAlert();
    const swal = getAtlasSwal();
    if (!swal) return window.confirm(text ? `${title}\n${text}` : title);

    const result = await swal.fire({
        icon: options.icon || 'question',
        title: title || '¿Estás seguro?',
        html: text || undefined,
        showCancelButton: true,
        confirmButtonText: options.confirmButtonText || 'Sí, continuar',
        cancelButtonText: options.cancelButtonText || 'Cancelar',
        ...options
    });

    return result.isConfirmed;
}

/**
 * Sobrescribe window.alert automáticamente para que cualquier llamada
 * en cualquier parte del portal use SweetAlert2 con los estilos de Atlas.
 */
let isOverridden = false;
export function setupGlobalAlertOverride() {
    if (isOverridden) return;
    isOverridden = true;

    const originalAlert = window.alert;

    window.alert = function (message, customTitle = null) {
        if (!window.Swal) {
            return originalAlert(message);
        }

        const msgStr = String(message || '');
        const lower = msgStr.toLowerCase();

        let icon = 'info';
        let defaultTitle = 'Información';

        if (lower.includes('éxito') || lower.includes('exito') || lower.includes('guardada') || lower.includes('enviada') || lower.includes('🎉') || lower.includes('reclamados')) {
            icon = 'success';
            defaultTitle = '¡Operación Exitosa!';
        } else if (lower.includes('error') || lower.includes('falló') || lower.includes('fallo') || lower.includes('incorrecto') || lower.includes('inconveniente')) {
            icon = 'error';
            defaultTitle = 'Atención';
        } else if (lower.includes('ya has') || lower.includes('completado') || lower.includes('advertencia') || lower.includes('atención') || lower.includes('aviso')) {
            icon = 'warning';
            defaultTitle = 'Aviso';
        }

        const swal = getAtlasSwal();
        return swal.fire({
            icon: icon,
            title: customTitle || defaultTitle,
            html: msgStr,
            confirmButtonText: 'Entendido'
        });
    };
}

// Iniciar automáticamente al importar el módulo
initSweetAlert();
