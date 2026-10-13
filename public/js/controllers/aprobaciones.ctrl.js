import { initLayout } from './layout.ctrl.js';
import { SolicitudesModel } from '../models/solicitudes.model.js';
import { showSuccess, showError, showWarning, showConfirm } from '../utils/alert.js';

let solicitudesCache = [];
let solicitudSeleccionada = null;

document.addEventListener('DOMContentLoaded', async () => {
    const sessionUser = initLayout('aprobaciones');
    if (!sessionUser) return;

    const userRole = (sessionUser.rol || localStorage.getItem('eslabon_user_role') || '').toLowerCase();
    const isManagerOrAdmin = ['administrador', 'jefe', 'gerente', 'director', 'recursos humanos', 'rh'].some(r => userRole.includes(r));

    if (!isManagerOrAdmin) {
        await showWarning('Acceso Restringido', 'Esta sección está reservada para líderes de equipo, gerentes y personal de Recursos Humanos.');
        window.location.replace('/pages/main.html');
        return;
    }

    const currentUserId = sessionUser.id || sessionUser.id_empleado || 1;

    // Listeners de filtros
    const searchInput = document.getElementById('input-search-equipo');
    const selectEstatus = document.getElementById('select-filter-estatus');
    const selectTipo = document.getElementById('select-filter-tipo');

    if (searchInput) searchInput.addEventListener('input', () => applyFilters());
    if (selectEstatus) selectEstatus.addEventListener('change', () => applyFilters());
    if (selectTipo) selectTipo.addEventListener('change', () => applyFilters());

    // Listeners del modal de detalle
    setupModalListeners(currentUserId);

    // Cargar datos
    await loadSolicitudesEquipo(currentUserId);
});

async function loadSolicitudesEquipo(managerId) {
    const tbody = document.getElementById('aprobaciones-table-body');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center" style="padding: 2.5rem; color: var(--text-muted);">
                    <div style="display: inline-block; width: 24px; height: 24px; border: 3px solid #E2E8F0; border-top-color: var(--accent-color); border-radius: 50%; animation: spin 0.8s linear infinite; margin-bottom: 8px;"></div>
                    <div>Consultando solicitudes de tu equipo en SQL Server...</div>
                    <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
                </td>
            </tr>
        `;
    }

    try {
        solicitudesCache = await SolicitudesModel.getSolicitudesEquipo(managerId);
        updateKPIs(solicitudesCache);
        applyFilters();
    } catch (err) {
        console.error('Error cargando solicitudes de equipo:', err);
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center" style="padding: 2.5rem; color: #EF4444;">
                        No se pudieron cargar las solicitudes de equipo. Error de conexión.
                    </td>
                </tr>
            `;
        }
    }
}

function updateKPIs(list) {
    const kpiPendientes = document.getElementById('kpi-pendientes');
    const kpiVacaciones = document.getElementById('kpi-vacaciones');
    const kpiPrestamos = document.getElementById('kpi-prestamos');
    const kpiTotal = document.getElementById('kpi-total');

    if (!Array.isArray(list)) return;

    const pendientesCount = list.filter(s => (s.estatus || '').toLowerCase() === 'pendiente').length;
    const vacacionesAprobadas = list.filter(s => (s.estatus || '').toLowerCase() === 'aprobada' && s.tipo === 'vacaciones').length;
    const prestamosCount = list.filter(s => s.tipo === 'prestamos').length;

    if (kpiPendientes) kpiPendientes.textContent = pendientesCount;
    if (kpiVacaciones) kpiVacaciones.textContent = vacacionesAprobadas;
    if (kpiPrestamos) kpiPrestamos.textContent = prestamosCount;
    if (kpiTotal) kpiTotal.textContent = list.length;
}

function applyFilters() {
    const searchVal = (document.getElementById('input-search-equipo')?.value || '').toLowerCase().trim();
    const estatusVal = document.getElementById('select-filter-estatus')?.value || 'all';
    const tipoVal = document.getElementById('select-filter-tipo')?.value || 'all';

    let filtradas = solicitudesCache;

    if (estatusVal !== 'all') {
        filtradas = filtradas.filter(s => (s.estatus || '').toLowerCase() === estatusVal.toLowerCase());
    }

    if (tipoVal !== 'all') {
        filtradas = filtradas.filter(s => (s.tipo || '').toLowerCase() === tipoVal.toLowerCase());
    }

    if (searchVal) {
        filtradas = filtradas.filter(s => {
            const emp = (s.nombreEmpleado || '').toLowerCase();
            const fol = (s.folio || '').toLowerCase();
            const res = (s.resumen || '').toLowerCase();
            const mot = (s.detalles?.motivo || '').toLowerCase();
            return emp.includes(searchVal) || fol.includes(searchVal) || res.includes(searchVal) || mot.includes(searchVal);
        });
    }

    renderTable(filtradas);
}

function renderTable(list) {
    const tbody = document.getElementById('aprobaciones-table-body');
    const counter = document.getElementById('solicitudes-counter');
    if (!tbody) return;

    if (counter) {
        counter.textContent = `${list.length} solicitud${list.length !== 1 ? 'es' : ''} encontrada${list.length !== 1 ? 's' : ''}`;
    }

    if (list.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center" style="padding: 3rem; color: var(--text-muted);">
                    <div style="font-size: 2rem; margin-bottom: 0.5rem;">📁</div>
                    <div style="font-weight: 700; color: var(--primary-dark); margin-bottom: 0.2rem;">No hay solicitudes que coincidan con los filtros</div>
                    <div style="font-size: 0.85rem;">Prueba seleccionando otro estatus o borrando el término de búsqueda.</div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = list.map(item => {
        const estatus = item.estatus || 'Pendiente';
        let badgeClass = 'badge-warning';
        if (estatus.toLowerCase() === 'aprobada') badgeClass = 'badge-success';
        if (estatus.toLowerCase() === 'rechazada') badgeClass = 'badge-danger';

        const tipoNorm = item.tipo || 'vacaciones';
        let tipoBadgeStyle = 'background-color: rgba(0, 184, 148, 0.12); color: #00B894;';
        let tipoIcon = '🌴';
        if (tipoNorm === 'prestamos') {
            tipoBadgeStyle = 'background-color: rgba(37, 99, 235, 0.12); color: #2563EB;';
            tipoIcon = '💰';
        } else if (tipoNorm === 'actualizacion_datos') {
            tipoBadgeStyle = 'background-color: rgba(147, 51, 234, 0.12); color: #9333EA;';
            tipoIcon = '📝';
        }

        const nombre = item.nombreEmpleado || 'Colaborador';
        const iniciales = nombre.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
        const puesto = item.puesto || item.departamento || 'Personal de Equipo';

        const isPendiente = estatus.toLowerCase() === 'pendiente';

        return `
            <tr>
                <td class="font-mono" style="font-weight: 700; color: var(--primary-dark); font-size: 0.9rem;">
                    ${item.folio}
                </td>
                <td>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="width: 34px; height: 34px; border-radius: 50%; background: linear-gradient(135deg, var(--primary-dark), #2563EB); color: white; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 800; flex-shrink: 0;">
                            ${iniciales}
                        </div>
                        <div>
                            <div style="font-weight: 700; color: var(--text-main); line-height: 1.2;">${nombre}</div>
                            <div style="font-size: 0.78rem; color: var(--text-muted);">${puesto}</div>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="badge" style="${tipoBadgeStyle} font-size: 0.8rem; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;">
                        <span>${tipoIcon}</span>
                        <span>${item.tipoEtiqueta || item.tipo}</span>
                    </span>
                </td>
                <td style="font-size: 0.88rem; max-width: 280px;">
                    <div style="font-weight: 600; color: var(--primary-dark);">${item.resumen}</div>
                    ${item.detalles?.motivo ? `<div style="font-size: 0.78rem; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 260px;" title="${item.detalles.motivo}">"${item.detalles.motivo}"</div>` : ''}
                </td>
                <td class="text-center font-mono" style="font-size: 0.85rem; color: var(--text-muted);">
                    ${item.fechaSolicitud}
                </td>
                <td class="text-center">
                    <span class="badge ${badgeClass}">${estatus}</span>
                </td>
                <td class="text-center">
                    <div style="display: inline-flex; gap: 6px; align-items: center;">
                        <button type="button" class="btn btn-outline btn-sm btn-action-ver" data-id="${item.id}" style="font-size: 0.8rem; padding: 0.35rem 0.7rem;">
                            Detalle
                        </button>
                        ${isPendiente ? `
                            <button type="button" class="btn btn-accent btn-sm btn-action-aprobar" data-id="${item.id}" style="font-size: 0.8rem; padding: 0.35rem 0.7rem; background-color: #059669;">
                                ✓ Aprobar
                            </button>
                            <button type="button" class="btn btn-outline btn-sm btn-action-rechazar" data-id="${item.id}" style="font-size: 0.8rem; padding: 0.35rem 0.7rem; color: #EF4444; border-color: #EF4444;">
                                ✗ Rechazar
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    bindActionButtons();
}

function bindActionButtons() {
    const sessionUser = JSON.parse(localStorage.getItem('eslabon_current_user') || '{}');
    const managerId = sessionUser.id || sessionUser.id_empleado || 1;

    document.querySelectorAll('.btn-action-ver').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id');
            const item = solicitudesCache.find(s => String(s.id) === String(id));
            if (item) abrirModalDetalle(item);
        });
    });

    document.querySelectorAll('.btn-action-aprobar').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-id');
            const item = solicitudesCache.find(s => String(s.id) === String(id));
            if (item) await ejecutarAprobacion(item, managerId);
        });
    });

    document.querySelectorAll('.btn-action-rechazar').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-id');
            const item = solicitudesCache.find(s => String(s.id) === String(id));
            if (item) await ejecutarRechazo(item, managerId);
        });
    });
}

function abrirModalDetalle(item) {
    solicitudSeleccionada = item;
    const modal = document.getElementById('modal-detalle-aprobacion');
    const modalTitle = document.getElementById('modal-det-title');
    const modalFolio = document.getElementById('modal-det-folio');
    const modalContent = document.getElementById('modal-det-content');
    const btnAprobar = document.getElementById('btn-modal-det-aprobar');
    const btnRechazar = document.getElementById('btn-modal-det-rechazar');

    if (!modal || !modalContent) return;

    modalTitle.textContent = `Solicitud de ${item.tipoEtiqueta}`;
    modalFolio.textContent = `Folio Oficial: ${item.folio} • Fecha: ${item.fechaSolicitud}`;

    const isPendiente = (item.estatus || '').toLowerCase() === 'pendiente';
    if (btnAprobar) btnAprobar.style.display = isPendiente ? 'inline-block' : 'none';
    if (btnRechazar) btnRechazar.style.display = isPendiente ? 'inline-block' : 'none';

    let extraHtml = '';
    const d = item.detalles || {};

    if (item.tipo === 'vacaciones') {
        extraHtml = `
            <div style="background-color: var(--bg-body); padding: 1.2rem; border-radius: 8px; border: 1px solid var(--border-color);">
                <div style="font-size: 0.82rem; font-weight: 700; text-transform: uppercase; color: var(--accent-color); margin-bottom: 0.8rem;">
                    Desglose del Periodo Vacacional Solicitado
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; font-size: 0.9rem;">
                    <div><strong>Fecha Inicio:</strong> ${d.fechaInicio || 'No especificada'}</div>
                    <div><strong>Fecha Fin:</strong> ${d.fechaFin || 'No especificada'}</div>
                    <div><strong>Fecha Reincorporación:</strong> ${d.fechaRegreso || 'Al día siguiente hábil'}</div>
                    <div><strong>Días Solicitados:</strong> <span class="badge badge-accent">${d.diasSolicitados || 1} Días</span></div>
                </div>
            </div>
        `;
    } else if (item.tipo === 'prestamos') {
        const montoNum = Number(d.monto || 0);
        const plazos = Number(d.plazoQuincenas || 12);
        const cuota = plazos > 0 ? (montoNum / plazos).toFixed(2) : '0.00';

        extraHtml = `
            <div style="background-color: var(--bg-body); padding: 1.2rem; border-radius: 8px; border: 1px solid var(--border-color);">
                <div style="font-size: 0.82rem; font-weight: 700; text-transform: uppercase; color: #2563EB; margin-bottom: 0.8rem;">
                    Condiciones del Préstamo Solicitado
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; font-size: 0.9rem;">
                    <div><strong>Monto Total:</strong> <span style="font-size: 1.1rem; color: #059669; font-weight: 800;">$${montoNum.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</span></div>
                    <div><strong>Plazo de Pago:</strong> ${plazos} Quincenas</div>
                    <div><strong>Descuento Estimado:</strong> $${Number(cuota).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN / quincena</div>
                </div>
            </div>
        `;
    } else if (item.tipo === 'actualizacion_datos') {
        extraHtml = `
            <div style="background-color: var(--bg-body); padding: 1.2rem; border-radius: 8px; border: 1px solid var(--border-color);">
                <div style="font-size: 0.82rem; font-weight: 700; text-transform: uppercase; color: #9333EA; margin-bottom: 0.8rem;">
                    Modificación de Información Personal
                </div>
                <div style="font-size: 0.9rem; display: flex; flex-direction: column; gap: 0.5rem;">
                    <div><strong>Campo a Modificar:</strong> <span class="badge badge-info">${d.campo || 'Datos generales'}</span></div>
                    <div><strong>Nuevo Valor Solicitado:</strong> <span style="font-weight: 700; color: var(--primary-dark); font-family: monospace;">${d.valorNuevo || '---'}</span></div>
                </div>
            </div>
        `;
    }

    modalContent.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px; padding-bottom: 0.8rem; border-bottom: 1px solid var(--border-color);">
            <div style="width: 44px; height: 44px; border-radius: 50%; background: linear-gradient(135deg, var(--primary-dark), #2563EB); color: white; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1rem;">
                ${(item.nombreEmpleado || 'C').split(' ').map(n => n[0]).slice(0, 2).join('')}
            </div>
            <div>
                <h4 style="margin: 0; color: var(--primary-dark); font-size: 1.1rem;">${item.nombreEmpleado}</h4>
                <div style="font-size: 0.82rem; color: var(--text-muted);">${item.puesto || item.departamento || 'Colaborador de Área'}</div>
            </div>
            <div style="margin-left: auto;">
                <span class="badge ${item.estatus === 'Aprobada' ? 'badge-success' : (item.estatus === 'Rechazada' ? 'badge-danger' : 'badge-warning')}">${item.estatus}</span>
            </div>
        </div>

        ${extraHtml}

        <div>
            <strong style="font-size: 0.85rem; color: var(--text-muted); text-transform: uppercase; display: block; margin-bottom: 4px;">Motivo / Justificación del Empleado:</strong>
            <p style="background: var(--bg-body); padding: 0.8rem 1rem; border-radius: 8px; border: 1px solid var(--border-color); font-size: 0.9rem; margin: 0; color: var(--text-main);">
                ${d.motivo || 'No se incluyeron comentarios u observaciones adicionales.'}
            </p>
        </div>

        ${item.motivoRechazo ? `
            <div style="background-color: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px; padding: 1rem;">
                <strong style="color: #EF4444; font-size: 0.85rem; text-transform: uppercase; display: block; margin-bottom: 4px;">Motivo de Rechazo Registrado:</strong>
                <p style="margin: 0; color: #B91C1C; font-size: 0.9rem;">"${item.motivoRechazo}"</p>
            </div>
        ` : ''}
    `;

    modal.classList.add('show');
}

function setupModalListeners(managerId) {
    const modal = document.getElementById('modal-detalle-aprobacion');
    const btnCerrarHeader = document.getElementById('btn-cerrar-modal-det');
    const btnCerrarFooter = document.getElementById('btn-modal-det-cerrar');
    const btnAprobarModal = document.getElementById('btn-modal-det-aprobar');
    const btnRechazarModal = document.getElementById('btn-modal-det-rechazar');

    const cerrarModal = () => {
        if (modal) modal.classList.remove('show');
        solicitudSeleccionada = null;
    };

    if (btnCerrarHeader) btnCerrarHeader.addEventListener('click', cerrarModal);
    if (btnCerrarFooter) btnCerrarFooter.addEventListener('click', cerrarModal);

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) cerrarModal();
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') cerrarModal();
    });

    if (btnAprobarModal) {
        btnAprobarModal.addEventListener('click', async () => {
            if (solicitudSeleccionada) {
                const item = solicitudSeleccionada;
                cerrarModal();
                await ejecutarAprobacion(item, managerId);
            }
        });
    }

    if (btnRechazarModal) {
        btnRechazarModal.addEventListener('click', async () => {
            if (solicitudSeleccionada) {
                const item = solicitudSeleccionada;
                cerrarModal();
                await ejecutarRechazo(item, managerId);
            }
        });
    }
}

async function ejecutarAprobacion(item, managerId) {
    const confirmado = await showConfirm(
        '¿Aprobar Solicitud?',
        `¿Deseas autorizar formalmente la solicitud <strong>${item.folio}</strong> de <strong>${item.nombreEmpleado}</strong>?`,
        { confirmButtonText: 'Sí, Autorizar', cancelButtonText: 'Regresar' }
    );

    if (!confirmado) return;

    try {
        await SolicitudesModel.aprobarSolicitud(item.id, managerId);
        item.estatus = 'Aprobada';

        await showSuccess(
            '¡Solicitud Autorizada!',
            `La solicitud <strong>${item.folio}</strong> ha sido aprobada con éxito y queda registrada en el sistema.`
        );

        updateKPIs(solicitudesCache);
        applyFilters();
    } catch (err) {
        console.error('Error al autorizar solicitud:', err);
        await showError('Error al Aprobar', err.message || 'No fue posible aprobar la solicitud.');
    }
}

async function ejecutarRechazo(item, managerId) {
    if (!window.Swal) {
        const motivo = prompt('Por favor ingresa el motivo del rechazo (obligatorio):');
        if (!motivo) return;
        return procesarRechazo(item, managerId, motivo);
    }

    const { value: motivo } = await window.Swal.fire({
        title: 'Rechazar Solicitud',
        html: `Por favor ingresa el motivo del rechazo para la solicitud <strong>${item.folio}</strong> de <strong>${item.nombreEmpleado}</strong>:`,
        input: 'textarea',
        inputPlaceholder: 'Escribe aquí la razón formal del rechazo para que el colaborador sea notificado...',
        inputAttributes: {
            'aria-label': 'Motivo del rechazo'
        },
        inputValidator: (value) => {
            if (!value || !value.trim()) {
                return '¡Debes ingresar una justificación para rechazar la solicitud!';
            }
        },
        showCancelButton: true,
        confirmButtonText: 'Confirmar Rechazo',
        cancelButtonText: 'Cancelar',
        buttonsStyling: false,
        customClass: {
            popup: 'atlas-swal-popup',
            title: 'atlas-swal-title',
            htmlContainer: 'atlas-swal-html',
            confirmButton: 'atlas-swal-cancel-btn',
            cancelButton: 'atlas-swal-confirm-btn'
        }
    });

    if (motivo) {
        await procesarRechazo(item, managerId, motivo.trim());
    }
}

async function procesarRechazo(item, managerId, motivo) {
    try {
        await SolicitudesModel.rechazarSolicitud(item.id, managerId, motivo);
        item.estatus = 'Rechazada';
        item.motivoRechazo = motivo;

        await showSuccess(
            'Solicitud Rechazada',
            `La solicitud <strong>${item.folio}</strong> ha sido marcada como rechazada y se notificó el motivo correspondiente.`
        );

        updateKPIs(solicitudesCache);
        applyFilters();
    } catch (err) {
        console.error('Error al rechazar solicitud:', err);
        await showError('Error al Rechazar', err.message || 'No fue posible rechazar la solicitud.');
    }
}
