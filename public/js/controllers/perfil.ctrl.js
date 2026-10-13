import { initLayout } from './layout.ctrl.js';
import { fetchWithAuth } from '../config.js';

document.addEventListener('DOMContentLoaded', async () => {
    const sessionUser = initLayout('perfil');
    if (!sessionUser) return;

    const btnSolicitarCambio = document.getElementById('btn-solicitar-cambio-perfil');
    if (btnSolicitarCambio) {
        btnSolicitarCambio.addEventListener('click', () => {
            window.location.href = '/pages/solicitudes.html?tab=actualizacion_datos';
        });
    }

    try {
        const empleadoId = sessionUser.id || sessionUser.id_empleado;
        const response = await fetchWithAuth(`/perfil?empleado_id=${empleadoId}`);
        if (response.ok) {
            const profileData = await response.json();
            renderProfile(profileData);
        } else {
            renderProfile(sessionUser);
        }
    } catch (error) {
        console.error('Error al cargar perfil desde la BD SQL Server:', error);
        renderProfile(sessionUser);
    }
});

function renderProfile(data) {
    if (!data) return;

    const nameEl = document.getElementById('perfil-nombre');
    const subtitleEl = document.getElementById('perfil-puesto-dept');
    const avatarEl = document.getElementById('perfil-avatar-img');
    const idEl = document.getElementById('perf-id');
    const puestoEl = document.getElementById('perf-puesto');
    const deptEl = document.getElementById('perf-dept');
    const jefeEl = document.getElementById('perf-jefe');
    const ingresoEl = document.getElementById('perf-ingreso');
    const rfcEl = document.getElementById('perf-rfc');
    const curpEl = document.getElementById('perf-curp');
    const imssEl = document.getElementById('perf-imss');
    const emailEl = document.getElementById('perf-email');
    const rolEl = document.getElementById('perf-rol');
    const abonoEl = document.getElementById('perf-abono');

    const nombre = data.nombre || data.name || '';
    const puesto = data.puesto || '';
    const departamento = data.departamento || '';

    if (nameEl) nameEl.textContent = nombre;
    if (subtitleEl) subtitleEl.textContent = puesto && departamento ? `${puesto} • ${departamento}` : (puesto || departamento);
    if (avatarEl) {
        avatarEl.src = data.avatar || '/assets/default-user.png';
        avatarEl.onerror = () => { avatarEl.src = '/assets/default-user.png'; };
    }
    if (idEl) idEl.textContent = data.no_empleado || data.id || '';
    if (puestoEl) puestoEl.textContent = puesto;
    if (deptEl) deptEl.textContent = departamento;
    if (jefeEl) jefeEl.textContent = data.reporta_a || '-';
    if (ingresoEl) ingresoEl.textContent = data.fecha_ingreso || '-';
    if (rfcEl) rfcEl.textContent = data.rfc || '-';
    if (curpEl) curpEl.textContent = data.curp || '-';
    if (imssEl) imssEl.textContent = data.imss || '-';
    if (emailEl) emailEl.textContent = data.email || data.username || '-';
    if (rolEl) rolEl.textContent = data.rol || data.role || 'Colaborador';
    if (abonoEl) abonoEl.textContent = data.abono_cuenta || '-';
}
