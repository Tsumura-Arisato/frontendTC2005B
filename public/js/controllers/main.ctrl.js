import { initLayout } from './layout.ctrl.js';
import { fetchWithAuth } from '../config.js';
import { SolicitudesModel } from '../models/solicitudes.model.js';
import { NominaModel } from '../models/nomina.model.js';

document.addEventListener('DOMContentLoaded', async () => {
    const sessionUser = initLayout('inicio');
    if (!sessionUser) return;

    let profileData = sessionUser;
    try {
        const response = await fetchWithAuth(`/perfil?empleado_id=${sessionUser.id || sessionUser.id_empleado}`);
        if (response.ok) {
            profileData = await response.json();
        }
    } catch (e) {
        console.error('Error cargando perfil en dashboard main:', e);
    }

    const nombreEl = document.getElementById('bienvenida-text');
    if (nombreEl) {
        const displayName = profileData.nombre || sessionUser.nombre || sessionUser.name || 'Colaborador';
        nombreEl.textContent = `¡Bienvenido de vuelta, ${displayName}!`;
    }

    const btnSolicitar = document.getElementById('solicitar-dia');
    if (btnSolicitar) {
        btnSolicitar.addEventListener('click', () => {
            window.location.href = '/pages/solicitudes.html?tab=vacaciones';
        });
    }

    const cardMap = {
        'card-action-solicitudes': '/pages/solicitudes.html',
        'card-action-nomina': '/pages/nomina.html',
        'card-action-kardex': '/pages/kardex.html',
        'card-action-noticias': '/pages/noticias.html',
        'card-action-gamificacion': '/pages/gamificacion.html',
        'card-action-perfil': '/pages/perfil.html'
    };

    Object.entries(cardMap).forEach(([id, href]) => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('click', () => {
                window.location.href = href;
            });
        }
    });

    const solicitudes = await SolicitudesModel.getAllSolicitudes();
    const count = Array.isArray(solicitudes) ? solicitudes.length : 0;
    const numSolEl = document.getElementById('num-sol');

    if (numSolEl) {
        numSolEl.textContent = `${count} solicitud${count !== 1 ? 'es' : ''}`;
    }

    try {
        const recibos = await NominaModel.getRecibos();
        if (recibos && recibos.length > 0) {
            const ultimo = recibos[0];
            const statReciboVal = document.querySelector('.card.stat-card:nth-child(3) .stat-value');
            if (statReciboVal) {
                statReciboVal.textContent = ultimo.periodoNombre || `Q${ultimo.mes} ${ultimo.anio}`;
            }
        }
    } catch (e) {
        console.error('Error cargando último recibo en main dashboard:', e);
    }
});