import { initLayout } from './layout.ctrl.js';
import { AttendanceModel } from '../models/attendance.model.js';

let currentDate = new Date();

document.addEventListener('DOMContentLoaded', async () => {
    const user = initLayout('kardex');
    if (!user) return;

    startLiveClock();

    await renderKPIsAndBitacora();
    await renderCalendar(currentDate);

    const prevBtn = document.getElementById('cal-prev-month');
    const nextBtn = document.getElementById('cal-next-month');

    if (prevBtn) {
        prevBtn.addEventListener('click', async () => {
            currentDate.setMonth(currentDate.getMonth() - 1);
            await renderCalendar(currentDate);
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', async () => {
            currentDate.setMonth(currentDate.getMonth() + 1);
            await renderCalendar(currentDate);
        });
    }
});

function startLiveClock() {
    const clockTimeEl = document.getElementById('live-clock-time');
    const clockDateEl = document.getElementById('live-clock-date');

    const update = () => {
        const now = new Date();
        if (clockTimeEl) {
            clockTimeEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        }
        if (clockDateEl) {
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            clockDateEl.textContent = now.toLocaleDateString('es-MX', options);
        }
    };

    update();
    setInterval(update, 1000);
}

async function renderKPIsAndBitacora() {
    const { kpis, bitacora } = await AttendanceModel.getBitacoraData();

    const kpiHoras = document.getElementById('kpi-horas-laboradas');
    const kpiTasa = document.getElementById('kpi-tasa-asistencia');
    const kpiExtra = document.getElementById('kpi-horas-extra');
    const kpiPromedio = document.getElementById('kpi-promedio-entrada');
    const kpiAsistidosText = document.getElementById('kpi-asistidos-text');
    const badgeMeta = document.getElementById('badge-meta');

    const totalAsistencias = kpis.totalAsistencias !== undefined ? kpis.totalAsistencias : bitacora.filter(b => b.estado !== 'Falta').length;
    const totalRetardos = kpis.totalRetardos !== undefined ? kpis.totalRetardos : bitacora.filter(b => b.estado === 'Retardo').length;
    const totalFaltas = kpis.totalFaltas !== undefined ? kpis.totalFaltas : bitacora.filter(b => b.estado === 'Falta').length;
    const horasExtraTotales = kpis.horasExtraTotales !== undefined ? kpis.horasExtraTotales : bitacora.reduce((acc, b) => acc + (b.extra || 0), 0);

    const horasOrdinariasTotales = bitacora.reduce((acc, b) => acc + (b.ordinarias || 0), 0);
    const horasTotales = horasOrdinariasTotales + horasExtraTotales;

    const totalEvaluados = totalAsistencias + totalFaltas;
    const tasa = totalEvaluados > 0 ? ((totalAsistencias / totalEvaluados) * 100).toFixed(1) : '100.0';

    if (kpiHoras) kpiHoras.textContent = `${horasTotales.toFixed(1)} hrs`;
    if (kpiTasa) kpiTasa.textContent = `${tasa}%`;
    if (kpiExtra) kpiExtra.textContent = `${horasExtraTotales.toFixed(1)} hrs`;
    if (kpiPromedio) kpiPromedio.textContent = bitacora.length > 0 ? (bitacora[0].entrada || '09:00 AM') : '09:00 AM';
    if (kpiAsistidosText) kpiAsistidosText.textContent = `${totalAsistencias} Asistidos • ${totalRetardos} Retardo • ${totalFaltas} Faltas`;
    if (badgeMeta) {
        const pct = ((horasTotales / 160) * 100).toFixed(1);
        badgeMeta.textContent = `${pct}% Meta`;
    }

    const tableBody = document.getElementById('detailed-attendance-table-body');
    if (!tableBody) return;

    if (!bitacora || bitacora.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center" style="padding: 2.5rem; color: var(--text-muted);">
                    <p>No hay registros de asistencia auditados en la base de datos.</p>
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = bitacora.map(log => {
        let badgeClass = 'badge-success';
        if (log.estado === 'Retardo') badgeClass = 'badge-warning';
        if (log.estado === 'Falta') badgeClass = 'badge-danger';

        return `
            <tr>
                <td>
                    <div style="font-weight: 700; color: var(--primary-dark);">${log.dia ? log.dia + ' ' : ''}${log.fecha}</div>
                </td>
                <td class="text-center font-mono">${log.entrada}</td>
                <td class="text-center font-mono">${log.salida}</td>
                <td class="text-center font-mono">${log.ordinarias.toFixed(1)} hrs</td>
                <td class="text-center font-mono" style="color: #2563EB;">${log.extra.toFixed(1)} hrs</td>
                <td class="text-center font-mono" style="font-weight: 700;">${log.total.toFixed(1)} hrs</td>
                <td style="font-size: 0.85rem; color: var(--text-muted);">${log.metodo}</td>
                <td class="text-center">
                    <span class="badge ${badgeClass}">
                        ${log.estado}
                    </span>
                </td>
            </tr>
        `;
    }).join('');
}

async function renderCalendar(date) {
    const container = document.getElementById('cal-days-container');
    const title = document.getElementById('cal-month-title');
    if (!container || !title) return;

    const year = date.getFullYear();
    const month = date.getMonth();

    const records = await AttendanceModel.getAllRecordsFromAPI(year, month + 1) || {};

    const monthNames = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    title.textContent = `${monthNames[month]} ${year}`;

    container.innerHTML = '';

    const firstDayIndex = new Date(year, month, 1).getDay();
    const startingDay = (firstDayIndex === 0 ? 6 : firstDayIndex - 1);
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthTotalDays = new Date(year, month, 0).getDate();

    for (let i = startingDay - 1; i >= 0; i--) {
        const dayNum = prevMonthTotalDays - i;
        const prevDate = new Date(year, month - 1, dayNum);
        const key = formatDateKey(prevDate);
        const status = records[key];
        const statusClass = status ? status : 'default';
        container.appendChild(createDayCell(dayNum, `${statusClass} other-month`));
    }

    for (let day = 1; day <= totalDays; day++) {
        const thisDate = new Date(year, month, day);
        const key = formatDateKey(thisDate);
        const status = records[key];
        const statusClass = status ? status : 'default';
        container.appendChild(createDayCell(day, statusClass));
    }

    const totalRendered = startingDay + totalDays;
    const targetTotal = totalRendered > 35 ? 42 : 35;
    const remainingCells = targetTotal - totalRendered;

    for (let day = 1; day <= remainingCells; day++) {
        const nextDate = new Date(year, month + 1, day);
        const key = formatDateKey(nextDate);
        const status = records[key];
        const statusClass = status ? status : 'default';
        container.appendChild(createDayCell(day, `${statusClass} other-month`));
    }
}

function createDayCell(dayNumber, statusClass) {
    const cell = document.createElement('div');
    cell.className = `cal-day ${statusClass}`;
    cell.textContent = dayNumber;
    return cell;
}

function formatDateKey(dateObj) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}