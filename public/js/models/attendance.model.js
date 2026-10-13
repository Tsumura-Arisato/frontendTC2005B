import { fetchWithAuth, getStoredUser } from '../config.js';

export const AttendanceModel = {
    async getAllRecordsFromAPI(year, month) {
        try {
            const user = getStoredUser();
            const empleadoId = user ? user.id : 1;
            const y = year || new Date().getFullYear();
            const m = month || (new Date().getMonth() + 1);
            
            const response = await fetchWithAuth(`/asistencia?empleado_id=${empleadoId}&anio=${y}&mes=${m}`);
            if (response.ok) {
                const data = await response.json();
                return this.formatAttendanceMap(data);
            }
        } catch (e) {
            console.error('Error cargando registros de asistencia desde la API:', e);
        }

        const { bitacora } = await this.getBitacoraData();
        return this.formatAttendanceMap(bitacora);
    },

    formatAttendanceMap(data) {
        const map = {};
        if (!data) return map;

        let list = null;

        if (Array.isArray(data)) {
            list = data;
        } else if (typeof data === 'object') {
            if (Array.isArray(data.records)) list = data.records;
            else if (Array.isArray(data.calendarRecords)) list = data.calendarRecords;
            else if (Array.isArray(data.bitacora)) list = data.bitacora;
            else {
                Object.keys(data).forEach(key => {
                    if (key !== 'kpis' && key !== 'bitacora' && key !== 'records') {
                        const val = String(data[key]).toLowerCase();
                        if (val.includes('falt') || val.includes('miss') || val.includes('ausent') || val === 'false') {
                            map[key] = 'missed';
                        } else {
                            map[key] = 'attended';
                        }
                    }
                });
                return map;
            }
        }

        if (Array.isArray(list)) {
            list.forEach(item => {
                const rawDate = item.fecha || item.date || item.fecha_registro;
                if (!rawDate) return;
                const dateStr = String(rawDate).split('T')[0];
                const estado = String(item.estado || item.estatus || item.status || '').toLowerCase();
                
                if (estado.includes('falt') || estado.includes('miss') || estado.includes('ausent')) {
                    map[dateStr] = 'missed';
                } else {
                    map[dateStr] = 'attended';
                }
            });
        }

        return map;
    },

    async getBitacoraData() {
        try {
            const user = getStoredUser();
            const empleadoId = user ? user.id : 1;
            const response = await fetchWithAuth(`/asistencia/bitacora?empleado_id=${empleadoId}`);
            if (response.ok) {
                const data = await response.json();
                const kpis = data.kpis || {};
                const rawBitacora = Array.isArray(data) ? data : (data.bitacora || []);

                const bitacora = rawBitacora.map(item => {
                    const ord = Number(item.horas_ordinarias || item.ordinarias || 8);
                    const ext = Number(item.horas_extra || item.extra || 0);
                    const dateStr = item.fecha || '';
                    let diaNombre = item.dia || '';
                    if (!diaNombre && dateStr) {
                        const parts = dateStr.split('-');
                        if (parts.length === 3) {
                            const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
                            const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
                            diaNombre = dias[dateObj.getDay()];
                        }
                    }

                    return {
                        id: item.id,
                        fecha: dateStr,
                        dia: diaNombre,
                        entrada: item.hora_entrada || item.entrada || '--:--',
                        salida: item.hora_salida || item.salida || '--:--',
                        ordinarias: ord,
                        extra: ext,
                        total: Number(item.total || (ord + ext)),
                        metodo: item.metodo || 'Lector Biométrico',
                        estado: item.estado || 'Puntual'
                    };
                });

                return {
                    kpis,
                    bitacora
                };
            }
        } catch (e) {
            console.error('Error cargando bitácora de asistencia desde la API:', e);
        }

        return {
            kpis: {},
            bitacora: []
        };
    }
};