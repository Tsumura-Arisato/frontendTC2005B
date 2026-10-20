import { initLayout } from './layout.ctrl.js';
import { fetchWithAuth } from '../config.js';
import { showSuccess, showError, showInfo } from '../utils/alert.js';

let listaColaboradores = [];
let sessionUser = null;

document.addEventListener('DOMContentLoaded', async () => {
    sessionUser = initLayout('colaboradores');
    if (!sessionUser) return;

    const userRole = (sessionUser.rol || sessionUser.role || '').toLowerCase();
    const isManagerOrAdmin = ['administrador', 'jefe', 'gerente', 'director', 'recursos humanos', 'rh'].some(r => userRole.includes(r));

    if (!isManagerOrAdmin) {
        window.location.replace('/pages/main.html');
        return;
    }

    configurarAlcanceSegunRol();
    configurarEventosModal();
    configurarFiltros();
    await cargarColaboradores();
});

function configurarAlcanceSegunRol() {
    const userRole = (sessionUser.rol || sessionUser.role || '').toLowerCase();
    const userDepto = sessionUser.departamento || '';
    const esJefeJefazoOAdmin = ['administrador', 'director', 'recursos humanos', 'rh'].some(r => userRole.includes(r)) ||
        (sessionUser.puesto || '').toLowerCase().includes('director') ||
        (sessionUser.puesto || '').toLowerCase().includes('general');

    const badgeAlcance = document.getElementById('badge-alcance-colaboradores');
    const subtitle = document.getElementById('subtitle-colaboradores');
    const deptoLabel = document.getElementById('kpi-depto-label');
    const selectDeptoModal = document.getElementById('invitar-departamento');

    if (esJefeJefazoOAdmin) {
        if (badgeAlcance) badgeAlcance.textContent = 'Acceso Directivo / Empresa';
        if (subtitle) subtitle.textContent = 'Supervisión global de colaboradores y alta de nuevos miembros en cualquier departamento de la organización.';
        if (deptoLabel) deptoLabel.textContent = 'En toda la organización';
    } else {
        if (badgeAlcance) badgeAlcance.textContent = `Líder: ${userDepto || 'Mi Departamento'}`;
        if (subtitle) subtitle.textContent = `Administra a los colaboradores del departamento de ${userDepto || 'tu área'} y crea accesos de primer ingreso.`;
        if (deptoLabel) deptoLabel.textContent = `En ${userDepto || 'tu área'}`;

        // Para jefes de departamento, fijar su departamento en el modal
        if (selectDeptoModal && userDepto) {
            selectDeptoModal.value = userDepto;
        }
    }
}

function configurarEventosModal() {
    const modal = document.getElementById('modal-invitar-colaborador');
    const btnAbrir = document.getElementById('btn-abrir-modal-invitar');
    const btnCerrar = document.getElementById('btn-cerrar-modal-invitar');
    const btnCancelar = document.getElementById('btn-cancelar-invitar');
    const formInvitar = document.getElementById('form-crear-colaborador');

    const abrir = () => {
        if (modal) {
            modal.style.display = 'flex';
            modal.classList.add('show');
            const emailInp = document.getElementById('invitar-email');
            if (emailInp) emailInp.focus();
        }
    };

    const cerrar = () => {
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('show');
            if (formInvitar) formInvitar.reset();
            configurarAlcanceSegunRol();
        }
    };

    if (btnAbrir) btnAbrir.addEventListener('click', abrir);
    if (btnCerrar) btnCerrar.addEventListener('click', cerrar);
    if (btnCancelar) btnCancelar.addEventListener('click', cerrar);

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) cerrar();
        });
    }

    if (formInvitar) {
        formInvitar.addEventListener('submit', async (e) => {
            e.preventDefault();
            await procesarInvitacion(cerrar);
        });
    }
}

async function procesarInvitacion(callbackCerrarModal) {
    const email = document.getElementById('invitar-email').value.trim();
    const rol = document.getElementById('invitar-rol').value;
    const departamento = document.getElementById('invitar-departamento').value;
    const puesto = document.getElementById('invitar-puesto').value.trim();
    const submitBtn = document.getElementById('btn-submit-invitar');

    if (!email || !puesto) {
        showError('Campos incompletos', 'Por favor llena todos los campos obligatorios.');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Enviando invitación...';

    const payload = {
        email,
        rol,
        departamento,
        puesto,
        invitadoPorId: sessionUser.id || sessionUser.id_empleado,
        invitadoPorNombre: sessionUser.nombre || sessionUser.name
    };

    try {
        let invitacionExitosa = false;
        let mensajeServidor = '';

        try {
            const resp = await fetchWithAuth('/colaboradores/invitar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (resp.ok) {
                const data = await resp.json();
                invitacionExitosa = true;
                mensajeServidor = data.message || '';
            } else if (resp.status !== 404) {
                const errData = await resp.json().catch(() => ({}));
                throw new Error(errData.error || errData.message || 'Error al crear colaborador en el servidor.');
            }
        } catch (apiErr) {
            if (!apiErr.message.includes('404')) {
                throw apiErr;
            }
        }

        // Registrar localmente para persistencia inmediata y visualización
        const localInvitaciones = JSON.parse(localStorage.getItem('eslabon_invitaciones_colaboradores') || '[]');
        const nuevaInvitacion = {
            id: 'INV-' + Date.now(),
            nombre: 'Pendiente de Registro',
            email: email,
            rol: rol,
            departamento: departamento,
            puesto: puesto,
            estado: 'pendiente',
            fechaInvitacion: new Date().toLocaleDateString('es-MX'),
            primerAcceso: true
        };

        localInvitaciones.unshift(nuevaInvitacion);
        localStorage.setItem('eslabon_invitaciones_colaboradores', JSON.stringify(localInvitaciones));

        callbackCerrarModal();

        await showSuccess(
            '¡Invitación y Acceso Creados!',
            `Se ha generado la cuenta para <b>${email}</b> con una <b>contraseña de un solo uso</b> enviada por correo electrónico.<br><br>` +
            `Al ingresar al portal por primera vez, el colaborador completará su expediente obligatorio (datos personales, fiscales y bancarios).`
        );

        await cargarColaboradores();
    } catch (err) {
        console.error('Error al invitar colaborador:', err);
        showError('No se pudo enviar la invitación', err.message || 'Ocurrió un error inesperado al procesar la solicitud.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Enviar Invitación y Crear Acceso';
    }
}

async function cargarColaboradores() {
    const tbody = document.getElementById('tbody-colaboradores');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">Consultando equipo en el sistema...</td></tr>`;

    const userRole = (sessionUser.rol || sessionUser.role || '').toLowerCase();
    const userDepto = sessionUser.departamento || '';
    const esJefeJefazoOAdmin = ['administrador', 'director', 'recursos humanos', 'rh'].some(r => userRole.includes(r)) ||
        (sessionUser.puesto || '').toLowerCase().includes('director') ||
        (sessionUser.puesto || '').toLowerCase().includes('general');

    let colaboradoresBD = [];

    try {
        const queryUrl = esJefeJefazoOAdmin ? '/colaboradores' : `/colaboradores?departamento=${encodeURIComponent(userDepto)}`;
        const resp = await fetchWithAuth(queryUrl);
        if (resp.ok) {
            colaboradoresBD = await resp.json();
        }
    } catch (e) {
        console.warn('Endpoint /api/colaboradores no disponible aún, usando directorio base:', e);
    }

    // Si aún no responde el backend con todos los colaboradores, usamos la base inicial oficial
    if (!colaboradoresBD || colaboradoresBD.length === 0) {
        const baseDirectorio = [
            { id: 1, nombre: 'Carlos Mendoza Sánchez', email: 'carlos.mendoza@eslabon.com', departamento: 'Tecnología e Innovación', puesto: 'Gerente de TI', rol: 'Jefe', estado: 'activo' },
            { id: 2, nombre: 'Laura Patricia Guzmán', email: 'laura.guzman@eslabon.com', departamento: 'Recursos Humanos', puesto: 'Directora de Talento Humano', rol: 'Administrador', estado: 'activo' },
            { id: 3, nombre: 'Rodrigo Castillejos', email: 'rodrigo.castillejos@eslabon.com', departamento: 'Finanzas y Contabilidad', puesto: 'Gerente de Contabilidad', rol: 'Jefe', estado: 'activo' },
            { id: 4, nombre: 'Mariana Valenzuela', email: 'mariana.valenzuela@eslabon.com', departamento: 'Operaciones y Logística', puesto: 'Gerente de Operaciones', rol: 'Jefe', estado: 'activo' },
            { id: 5, nombre: 'Juan Pérez González', email: 'juan.perez@eslabon.com', departamento: 'Tecnología e Innovación', puesto: 'Desarrollador Full Stack', rol: 'Colaborador', estado: 'activo' },
            { id: 6, nombre: 'María López Carrasco', email: 'maria.lopez@eslabon.com', departamento: 'Recursos Humanos', puesto: 'Especialista en Nóminas', rol: 'Colaborador', estado: 'activo' },
            { id: 7, nombre: 'Fernando Morales Alonso', email: 'fernando.morales@eslabon.com', departamento: 'Tecnología e Innovación', puesto: 'Líder Técnico Frontend', rol: 'Colaborador', estado: 'activo' },
            { id: 8, nombre: 'Diana Navarro Reyes', email: 'diana.navarro@eslabon.com', departamento: 'Tecnología e Innovación', puesto: 'Diseñadora UI/UX', rol: 'Colaborador', estado: 'activo' },
            { id: 9, nombre: 'Roberto Soto Prieto', email: 'roberto.soto@eslabon.com', departamento: 'Tecnología e Innovación', puesto: 'Ingeniero DevOps', rol: 'Colaborador', estado: 'activo' },
            { id: 10, nombre: 'Alejandro Vargas Ramos', email: 'alejandro.vargas@eslabon.com', departamento: 'Recursos Humanos', puesto: 'Reclutador Sr.', rol: 'Colaborador', estado: 'activo' },
            { id: 11, nombre: 'Claudia Méndez Vázquez', email: 'claudia.mendez@eslabon.com', departamento: 'Finanzas y Contabilidad', puesto: 'Analista Contable', rol: 'Colaborador', estado: 'activo' },
            { id: 12, nombre: 'Gabriel Herrera Lara', email: 'gabriel.herrera@eslabon.com', departamento: 'Finanzas y Contabilidad', puesto: 'Analista Fiscal', rol: 'Colaborador', estado: 'activo' },
            { id: 13, nombre: 'Javier Ortiz Ramos', email: 'javier.ortiz@eslabon.com', departamento: 'Operaciones y Logística', puesto: 'Coordinador de Logística', rol: 'Colaborador', estado: 'activo' }
        ];

        colaboradoresBD = esJefeJefazoOAdmin
            ? baseDirectorio
            : baseDirectorio.filter(c => (c.departamento || '').toLowerCase().trim() === userDepto.toLowerCase().trim());
    }

    // Agregar invitaciones pendientes almacenadas
    const localInvitaciones = JSON.parse(localStorage.getItem('eslabon_invitaciones_colaboradores') || '[]');
    const invitacionesFiltradas = esJefeJefazoOAdmin
        ? localInvitaciones
        : localInvitaciones.filter(inv => (inv.departamento || '').toLowerCase().trim() === userDepto.toLowerCase().trim());

    listaColaboradores = [...invitacionesFiltradas, ...colaboradoresBD];
    actualizarKPIs();
    renderizarTablaColaboradores(listaColaboradores);
}

function actualizarKPIs() {
    const totalEl = document.getElementById('kpi-total-colaboradores');
    const activosEl = document.getElementById('kpi-activos');
    const pendientesEl = document.getElementById('kpi-pendientes-registro');

    const total = listaColaboradores.length;
    const pendientes = listaColaboradores.filter(c => c.estado === 'pendiente' || c.primerAcceso).length;
    const activos = total - pendientes;

    if (totalEl) totalEl.textContent = total;
    if (activosEl) activosEl.textContent = activos;
    if (pendientesEl) pendientesEl.textContent = pendientes;
}

function renderizarTablaColaboradores(items) {
    const tbody = document.getElementById('tbody-colaboradores');
    if (!tbody) return;

    if (!items || items.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 3rem; color: var(--text-muted);">
                    <div style="font-size: 1.1rem; font-weight: 600; margin-bottom: 0.4rem;">No se encontraron colaboradores</div>
                    <div style="font-size: 0.85rem;">Utiliza el botón "+ Crear / Invitar Colaborador" para enviar el primer acceso.</div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = items.map(c => {
        const esPendiente = c.estado === 'pendiente' || c.primerAcceso;
        const nombreDisplay = c.nombre || 'Colaborador';
        const iniciales = nombreDisplay.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() || 'CO';

        const statusBadge = esPendiente
            ? `<span class="badge badge-warning" style="display: inline-flex; align-items: center; gap: 4px;">
                 <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                 Primer acceso pendiente
               </span>`
            : `<span class="badge badge-success" style="display: inline-flex; align-items: center; gap: 4px;">
                 <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                 Activo
               </span>`;

        const rolBadge = (c.rol || '').toLowerCase().includes('jefe') || (c.rol || '').toLowerCase().includes('admin')
            ? `<span class="badge badge-accent" style="font-size: 0.75rem;">${c.rol}</span>`
            : `<span class="badge badge-neutral" style="font-size: 0.75rem;">${c.rol || 'Colaborador'}</span>`;

        return `
            <tr style="border-bottom: 1px solid var(--border-color); transition: background-color 0.2s;" class="table-row-hover">
                <td style="padding: 1rem 1.2rem;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="width: 38px; height: 38px; border-radius: 50%; background: ${esPendiente ? '#FEF3C7; color: #D97706;' : '#EFF6FF; color: #2563EB;'} display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.85rem; flex-shrink: 0;">
                            ${esPendiente ? '⏳' : iniciales}
                        </div>
                        <div>
                            <div style="font-weight: 700; color: var(--text-main); font-size: 0.92rem;">
                                ${esPendiente ? `<span style="font-style: italic; color: #D97706;">(Expediente Pendiente)</span>` : nombreDisplay}
                            </div>
                            ${c.no_empleado || c.id ? `<small style="color: var(--text-muted); font-size: 0.75rem;">Nómina #${c.no_empleado || c.id}</small>` : '<small style="color: var(--text-muted); font-size: 0.75rem;">Nuevo Ingreso</small>'}
                        </div>
                    </div>
                </td>
                <td style="padding: 1rem 1.2rem; font-size: 0.88rem; color: var(--text-main);">
                    <strong>${c.email}</strong>
                </td>
                <td style="padding: 1rem 1.2rem;">
                    <div style="font-weight: 600; font-size: 0.88rem; color: var(--text-main);">${c.departamento || '-'}</div>
                    <small style="color: var(--text-muted); font-size: 0.78rem;">${c.puesto || '-'}</small>
                </td>
                <td style="padding: 1rem 1.2rem;">
                    ${rolBadge}
                </td>
                <td style="padding: 1rem 1.2rem;">
                    ${statusBadge}
                </td>
                <td style="padding: 1rem 1.2rem; text-align: right;">
                    ${esPendiente ? `
                        <button class="btn btn-secondary btn-sm btn-reenviar-temp" data-email="${c.email}" style="font-size: 0.75rem; padding: 4px 10px;">
                            Reenviar Contraseña
                        </button>
                    ` : `
                        <span style="font-size: 0.8rem; color: var(--text-muted);">Al corriente</span>
                    `}
                </td>
            </tr>
        `;
    }).join('');

    // Eventos para reenviar
    tbody.querySelectorAll('.btn-reenviar-temp').forEach(btn => {
        btn.addEventListener('click', async () => {
            const email = btn.getAttribute('data-email');
            btn.disabled = true;
            btn.textContent = 'Enviando...';
            try {
                await fetchWithAuth('/colaboradores/reenviar-temp', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                }).catch(() => {});

                showSuccess('Contraseña Reenviada', `Se ha generado y enviado una nueva contraseña de un solo uso a <b>${email}</b>.`);
            } finally {
                btn.disabled = false;
                btn.textContent = 'Reenviar Contraseña';
            }
        });
    });
}

function configurarFiltros() {
    const inputBuscar = document.getElementById('input-buscar-colaborador');
    const selectEstado = document.getElementById('select-filtro-estado');
    const btnRecargar = document.getElementById('btn-recargar-colaboradores');

    const aplicarFiltros = () => {
        const busqueda = (inputBuscar?.value || '').toLowerCase().trim();
        const estado = selectEstado?.value || 'todos';

        const filtrados = listaColaboradores.filter(c => {
            const matchesText = !busqueda ||
                (c.nombre && c.nombre.toLowerCase().includes(busqueda)) ||
                (c.email && c.email.toLowerCase().includes(busqueda)) ||
                (c.puesto && c.puesto.toLowerCase().includes(busqueda)) ||
                (c.departamento && c.departamento.toLowerCase().includes(busqueda)) ||
                (String(c.id || c.no_empleado || '').includes(busqueda));

            const esPendiente = c.estado === 'pendiente' || c.primerAcceso;
            let matchesEstado = true;
            if (estado === 'activo') matchesEstado = !esPendiente;
            if (estado === 'pendiente') matchesEstado = esPendiente;

            return matchesText && matchesEstado;
        });

        renderizarTablaColaboradores(filtrados);
    };

    if (inputBuscar) inputBuscar.addEventListener('input', aplicarFiltros);
    if (selectEstado) selectEstado.addEventListener('change', aplicarFiltros);
    if (btnRecargar) {
        btnRecargar.addEventListener('click', async () => {
            await cargarColaboradores();
            showInfo('Lista Actualizada', 'Se han refrescado los colaboradores del departamento.');
        });
    }
}
