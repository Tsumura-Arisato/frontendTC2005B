import { initLayout } from './layout.ctrl.js';
import { SolicitudesModel } from '../models/solicitudes.model.js';
import { showSuccess, showError } from '../utils/alert.js';

document.addEventListener('DOMContentLoaded', async () => {
    const user = initLayout('solicitudes');
    if (!user) return;

    let filterTipo = 'all';
    let filterEstatus = 'all';

    const tableBody = document.getElementById('solicitudes-table-body');
    const counterEl = document.getElementById('solicitudes-counter');
    const selectTipo = document.getElementById('select-filter-tipo');
    const selectEstatus = document.getElementById('select-filter-estatus');

    const createModal = document.getElementById('modal-nueva-solicitud-backdrop');
    const btnCloseCreate = document.getElementById('btn-close-create-modal');

    const detailModal = document.getElementById('modal-detalle-solicitud-backdrop');
    const btnCloseDetail = document.getElementById('btn-close-detail-modal');
    const btnCancelDetail = document.getElementById('btn-cancel-detail-modal');

    const cardVacaciones = document.getElementById('card-new-vacaciones');
    const cardPrestamo = document.getElementById('card-new-prestamo');
    const cardDatos = document.getElementById('card-new-datos');

    const tabBtns = document.querySelectorAll('.btn-tab-solicitud');
    const formPanes = document.querySelectorAll('.form-solicitud-pane');

    const formVac = document.getElementById('form-solicitud-vacaciones');
    const formPres = document.getElementById('form-solicitud-prestamo');
    const formDatos = document.getElementById('form-solicitud-datos');

    const vacInicio = document.getElementById('vac-fecha-inicio');
    const vacFin = document.getElementById('vac-fecha-fin');
    const vacCalc = document.getElementById('vac-dias-calculados');

    await renderTable();

    const urlParams = new URLSearchParams(window.location.search);
    const requestedTab = urlParams.get('tab');
    if (requestedTab && ['vacaciones', 'prestamos', 'actualizacion_datos'].includes(requestedTab)) {
        openCreateModal(requestedTab);
    }

    if (selectTipo) {
        selectTipo.addEventListener('change', async (e) => {
            filterTipo = e.target.value;
            await renderTable();
        });
    }

    if (selectEstatus) {
        selectEstatus.addEventListener('change', async (e) => {
            filterEstatus = e.target.value;
            await renderTable();
        });
    }

    if (cardVacaciones) cardVacaciones.addEventListener('click', () => openCreateModal('vacaciones'));
    if (cardPrestamo) cardPrestamo.addEventListener('click', () => openCreateModal('prestamos'));
    if (cardDatos) cardDatos.addEventListener('click', () => openCreateModal('actualizacion_datos'));

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');
            switchTab(targetTab);
        });
    });

    if (btnCloseCreate) btnCloseCreate.addEventListener('click', () => closeCreateModal());
    if (createModal) {
        createModal.addEventListener('click', (e) => {
            if (e.target === createModal) closeCreateModal();
        });
    }

    if (btnCloseDetail) btnCloseDetail.addEventListener('click', () => closeDetailModal());
    if (btnCancelDetail) btnCancelDetail.addEventListener('click', () => closeDetailModal());
    if (detailModal) {
        detailModal.addEventListener('click', (e) => {
            if (e.target === detailModal) closeDetailModal();
        });
    }

    if (vacInicio && vacFin) {
        const updateDias = () => {
            if (vacInicio.value && vacFin.value) {
                const start = new Date(vacInicio.value);
                const end = new Date(vacFin.value);
                if (end >= start) {
                    const diffTime = Math.abs(end - start);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                    vacCalc.value = `${diffDays} días`;
                } else {
                    vacCalc.value = 'Fecha inválida';
                }
            }
        };
        vacInicio.addEventListener('change', updateDias);
        vacFin.addEventListener('change', updateDias);
    }

    if (formVac) {
        formVac.addEventListener('submit', async (e) => {
            e.preventDefault();
            const start = vacInicio.value;
            const end = vacFin.value;
            const motivo = document.getElementById('vac-motivo').value || 'Sin observaciones';
            const diasText = vacCalc.value;

            if (!start || !end) return;

            let fechaRegreso = '';
            if (end) {
                const endDateObj = new Date(end);
                endDateObj.setDate(endDateObj.getDate() + 1);
                fechaRegreso = endDateObj.toISOString().split('T')[0];
            }
            const diasNum = parseInt(diasText) || 1;

            try {
                await SolicitudesModel.crearSolicitud('vacaciones', {
                    fecha_inicio: start,
                    fechaInicio: start,
                    fecha_fin: end,
                    fechaFin: end,
                    fecha_regreso: fechaRegreso,
                    fechaRegreso: fechaRegreso,
                    dias_solicitados: diasNum,
                    dias: diasNum,
                    motivo: motivo
                });

                closeCreateModal();
                await renderTable();
                await showSuccess('¡Solicitud Enviada con Éxito!', 'Tu solicitud de vacaciones ha sido registrada en el sistema y se encuentra pendiente de aprobación.');
            } catch (err) {
                await showError('Error al Enviar Solicitud', err.message || 'No fue posible registrar tu solicitud de vacaciones.');
            }
        });
    }

    if (formPres) {
        formPres.addEventListener('submit', async (e) => {
            e.preventDefault();
            const monto = parseFloat(document.getElementById('pres-monto').value);
            const plazoQuincenas = parseInt(document.getElementById('pres-plazo').value);
            const motivo = document.getElementById('pres-motivo').value;

            if (!monto || !motivo) return;

            try {
                await SolicitudesModel.crearSolicitud('prestamos', {
                    monto: monto,
                    plazo_quincenas: plazoQuincenas,
                    plazoQuincenas: plazoQuincenas,
                    motivo: motivo
                });

                closeCreateModal();
                await renderTable();
                await showSuccess('¡Solicitud Enviada con Éxito!', 'Tu solicitud de préstamo personal ha sido enviada para su análisis financiero.');
            } catch (err) {
                await showError('Error al Enviar Solicitud', err.message || 'No fue posible registrar tu solicitud de préstamo.');
            }
        });
    }

    if (formDatos) {
        formDatos.addEventListener('submit', async (e) => {
            e.preventDefault();
            const campo = document.getElementById('datos-campo').value;
            const valorNuevo = document.getElementById('datos-valor-nuevo').value;
            const motivo = document.getElementById('datos-motivo').value;

            if (!valorNuevo || !motivo) return;

            try {
                await SolicitudesModel.crearSolicitud('actualizacion_datos', {
                    campo: campo,
                    valor_nuevo: valorNuevo,
                    valorNuevo: valorNuevo,
                    motivo: motivo
                });

                closeCreateModal();
                await renderTable();
                await showSuccess('¡Solicitud Enviada con Éxito!', 'Tu solicitud de actualización de datos personales ha sido enviada al área de RH.');
            } catch (err) {
                await showError('Error al Enviar Solicitud', err.message || 'No fue posible registrar tu solicitud de actualización.');
            }
        });
    }

    async function renderTable() {
        let solicitudes = await SolicitudesModel.getAllSolicitudes();

        if (filterTipo !== 'all') {
            solicitudes = solicitudes.filter(s => s.tipo === filterTipo);
        }

        if (filterEstatus !== 'all') {
            solicitudes = solicitudes.filter(s => s.estatus === filterEstatus);
        }

        if (counterEl) {
            counterEl.textContent = `${solicitudes.length} solicitudes encontradas`;
        }

        if (!tableBody) return;

        if (solicitudes.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center" style="padding: 2.5rem; color: var(--text-muted);">
                        No hay solicitudes registradas para los filtros seleccionados.
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = solicitudes.map(sol => {
            let badgeClass = 'badge-warning';
            if (sol.estatus === 'Aprobada') badgeClass = 'badge-success';
            if (sol.estatus === 'Rechazada') badgeClass = 'badge-danger';

            return `
                <tr>
                    <td>
                        <div style="font-weight: 700; color: var(--primary-dark);">${sol.tipoEtiqueta}</div>
                        <div class="font-mono" style="font-size: 0.78rem; color: var(--text-muted);">${sol.id}</div>
                    </td>
                    <td style="white-space: nowrap;">${sol.fechaSolicitud}</td>
                    <td>${sol.resumen}</td>
                    <td class="text-center">
                        <span class="badge ${badgeClass}">${sol.estatus}</span>
                    </td>
                    <td class="text-right">
                        <button class="btn-table-action btn-view-detail" data-id="${sol.id}">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                            Ver Detalle
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        document.querySelectorAll('.btn-view-detail').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                const sol = await SolicitudesModel.getSolicitudById(id);
                if (sol) openDetailModal(sol);
            });
        });
    }

    function openCreateModal(defaultTab = 'vacaciones') {
        switchTab(defaultTab);
        if (createModal) createModal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    function closeCreateModal() {
        if (createModal) createModal.classList.remove('show');
        document.body.style.overflow = '';
    }

    function switchTab(tabName) {
        tabBtns.forEach(btn => {
            if (btn.getAttribute('data-tab') === tabName) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        formPanes.forEach(pane => {
            if (pane.id === `form-solicitud-${tabName === 'prestamos' ? 'prestamo' : (tabName === 'actualizacion_datos' ? 'datos' : 'vacaciones')}`) {
                pane.style.display = 'block';
            } else {
                pane.style.display = 'none';
            }
        });
    }

    function openDetailModal(sol) {
        const bodyContent = document.getElementById('detalle-body-content');
        const titleEl = document.getElementById('detalle-title');
        if (!bodyContent || !titleEl) return;

        titleEl.textContent = `Detalle de ${sol.tipoEtiqueta} (${sol.id})`;

        let badgeClass = 'badge-warning';
        if (sol.estatus === 'Aprobada') badgeClass = 'badge-success';
        if (sol.estatus === 'Rechazada') badgeClass = 'badge-danger';

        const d = sol.detalles || {};

        let specificFieldsHTML = '';

        if (sol.tipo === 'vacaciones') {
            let fStart = d.fechaInicio || d.vacaciones_fecha_inicio || d.fecha_inicio || '';
            let fEnd = d.fechaFin || d.vacaciones_fecha_fin || d.fecha_fin || '';
            let dCount = d.diasSolicitados || d.vacaciones_dias || d.dias_solicitados || d.dias || '';
            let fRegreso = d.fechaRegreso || d.vacaciones_fecha_regreso || d.fecha_regreso || '';

            if ((!fStart || !fEnd) && sol.resumen) {
                const datesFound = sol.resumen.match(/\b(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4})\b/g);
                if (datesFound && datesFound.length >= 1) fStart = fStart || datesFound[0];
                if (datesFound && datesFound.length >= 2) fEnd = fEnd || datesFound[1];
            }

            if (!dCount && sol.resumen) {
                const daysFound = sol.resumen.match(/\b(\d+)\s*días?\b/i);
                if (daysFound) dCount = daysFound[1];
            }

            if (fStart && fEnd && !dCount) {
                const sDate = new Date(fStart);
                const eDate = new Date(fEnd);
                if (!isNaN(sDate) && !isNaN(eDate) && eDate >= sDate) {
                    const diffTime = Math.abs(eDate - sDate);
                    dCount = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                }
            }

            if (fEnd && !fRegreso) {
                const eDate = new Date(fEnd);
                if (!isNaN(eDate)) {
                    eDate.setDate(eDate.getDate() + 1);
                    fRegreso = eDate.toISOString().split('T')[0];
                }
            }

            const periodoStr = (fStart && fEnd) ? `Del ${fStart} al ${fEnd}` : (fStart || fEnd || 'No especificado');

            specificFieldsHTML = `
                <div class="cfdi-detail-row" style="margin-bottom: 0.5rem;">
                    <span class="cfdi-detail-label">Tipo de Trámite:</span>
                    <span class="cfdi-detail-value" style="font-weight: 600;">Vacaciones</span>
                </div>
                <div class="cfdi-detail-row" style="margin-bottom: 0.5rem; background-color: rgba(5, 150, 105, 0.08); padding: 0.6rem 0.8rem; border-radius: 6px; border: 1px solid rgba(5, 150, 105, 0.2);">
                    <span class="cfdi-detail-label" style="color: #059669; font-weight: 700;">Período Solicitado:</span>
                    <span class="cfdi-detail-value" style="color: #047857; font-weight: 700; font-size: 0.95rem;">${periodoStr}</span>
                </div>
                <div class="cfdi-detail-row" style="margin-bottom: 0.5rem;">
                    <span class="cfdi-detail-label">Fecha de Inicio:</span>
                    <span class="cfdi-detail-value" style="font-weight: 600;">${fStart || 'No especificada'}</span>
                </div>
                <div class="cfdi-detail-row" style="margin-bottom: 0.5rem;">
                    <span class="cfdi-detail-label">Fecha de Término:</span>
                    <span class="cfdi-detail-value" style="font-weight: 600;">${fEnd || 'No especificada'}</span>
                </div>
                <div class="cfdi-detail-row" style="margin-bottom: 0.5rem;">
                    <span class="cfdi-detail-label">Días Solicitados:</span>
                    <span class="cfdi-detail-value" style="font-weight: 700; color: #059669; font-size: 0.95rem;">${dCount ? `${dCount} días` : 'No especificado'}</span>
                </div>
                ${fRegreso ? `
                <div class="cfdi-detail-row" style="margin-bottom: 0.5rem;">
                    <span class="cfdi-detail-label">Fecha de Reincorporación:</span>
                    <span class="cfdi-detail-value" style="font-weight: 600;">${fRegreso}</span>
                </div>` : ''}
            `;
        } else if (sol.tipo === 'prestamos') {
            const montoFormatted = d.monto ? `$${Number(d.monto).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN` : '';
            specificFieldsHTML = `
                <div class="cfdi-detail-row" style="margin-bottom: 0.4rem;">
                    <span class="cfdi-detail-label">Tipo de Trámite:</span>
                    <span class="cfdi-detail-value" style="font-weight: 600;">Préstamo por Nómina</span>
                </div>
                ${montoFormatted ? `
                <div class="cfdi-detail-row" style="margin-bottom: 0.4rem;">
                    <span class="cfdi-detail-label">Monto Solicitado:</span>
                    <span class="cfdi-detail-value" style="font-weight: 700; color: #2563EB;">${montoFormatted}</span>
                </div>` : ''}
                ${d.plazoQuincenas ? `
                <div class="cfdi-detail-row" style="margin-bottom: 0.4rem;">
                    <span class="cfdi-detail-label">Plazo a Pagar:</span>
                    <span class="cfdi-detail-value">${d.plazoQuincenas} quincenas</span>
                </div>` : ''}
            `;
        } else if (sol.tipo === 'actualizacion_datos') {
            specificFieldsHTML = `
                <div class="cfdi-detail-row" style="margin-bottom: 0.4rem;">
                    <span class="cfdi-detail-label">Tipo de Trámite:</span>
                    <span class="cfdi-detail-value" style="font-weight: 600;">Actualización de Datos</span>
                </div>
                ${d.campo ? `
                <div class="cfdi-detail-row" style="margin-bottom: 0.4rem;">
                    <span class="cfdi-detail-label">Campo a Modificar:</span>
                    <span class="cfdi-detail-value">${d.campo}</span>
                </div>` : ''}
                ${d.valorNuevo ? `
                <div class="cfdi-detail-row" style="margin-bottom: 0.4rem;">
                    <span class="cfdi-detail-label">Nuevo Valor Propuesto:</span>
                    <span class="cfdi-detail-value" style="font-weight: 600; color: #0D9488;">${d.valorNuevo}</span>
                </div>` : ''}
            `;
        } else {
            specificFieldsHTML = `
                <div class="cfdi-detail-row" style="margin-bottom: 0.4rem;">
                    <span class="cfdi-detail-label">Tipo de Trámite:</span>
                    <span class="cfdi-detail-value" style="font-weight: 600;">${sol.tipoEtiqueta}</span>
                </div>
            `;
        }

        bodyContent.innerHTML = `
            <div style="background-color: var(--bg-card); padding: 1rem; border-radius: 8px; border: 1px solid var(--border-color); margin-bottom: 1.2rem;">
                <div class="cfdi-detail-row" style="margin-bottom: 0.4rem;">
                    <span class="cfdi-detail-label">Folio de Solicitud:</span>
                    <span class="cfdi-detail-value font-mono" style="font-weight: 700;">${sol.id}</span>
                </div>
                <div class="cfdi-detail-row" style="margin-bottom: 0.4rem;">
                    <span class="cfdi-detail-label">Fecha de Solicitud:</span>
                    <span class="cfdi-detail-value">${sol.fechaSolicitud}</span>
                </div>
                <div class="cfdi-detail-row">
                    <span class="cfdi-detail-label">Estatus Actual:</span>
                    <span class="badge ${badgeClass}">${sol.estatus}</span>
                </div>
            </div>

            <h4 style="font-size: 0.85rem; color: var(--primary-dark); font-weight: 700; text-transform: uppercase; margin-bottom: 0.8rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.4rem;">
                DETALLES COMPLETOS DE LA SOLICITUD
            </h4>

            <div style="background-color: var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px; padding: 1rem; margin-bottom: 1rem;">
                ${specificFieldsHTML}
                <div class="cfdi-detail-row" style="margin-top: 0.4rem; margin-bottom: 0.4rem;">
                    <span class="cfdi-detail-label">Resumen:</span>
                    <span class="cfdi-detail-value">${sol.resumen}</span>
                </div>
                ${d.motivo ? `
                <div style="margin-top: 0.8rem; padding-top: 0.8rem; border-top: 1px dashed var(--border-color);">
                    <div style="font-weight: 600; font-size: 0.82rem; color: var(--text-muted); margin-bottom: 0.3rem;">Motivo / Justificación:</div>
                    <div style="font-size: 0.9rem; color: var(--text-main); background-color: rgba(0,0,0,0.02); padding: 0.75rem; border-radius: 6px; border: 1px solid var(--border-color); white-space: pre-wrap;">${d.motivo}</div>
                </div>` : ''}
            </div>
        `;

        if (detailModal) detailModal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    function closeDetailModal() {
        if (detailModal) detailModal.classList.remove('show');
        document.body.style.overflow = '';
    }
});
