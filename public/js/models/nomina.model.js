import { fetchWithAuth, getStoredUser } from '../config.js';

function formatReciboItem(raw) {
    if (!raw) return null;

    const sueldoDiario = raw.sueldo_diario !== undefined ? Number(raw.sueldo_diario) : 0;
    const rawConceptos = raw.conceptos || {};

    const percepciones = Array.isArray(rawConceptos.percepciones)
        ? rawConceptos.percepciones.map(p => ({
            id: p.id,
            concepto: p.concepto || p.descripcion || 'Percepción',
            importe: Number(p.importe || 0)
        }))
        : (Array.isArray(raw.percepciones) ? raw.percepciones : []);

    const deducciones = Array.isArray(rawConceptos.deducciones)
        ? rawConceptos.deducciones.map(d => ({
            id: d.id,
            concepto: d.concepto || d.descripcion || 'Deducción',
            importe: Number(d.importe || 0)
        }))
        : (Array.isArray(raw.deducciones) ? raw.deducciones : []);

    const saldosInformativos = Array.isArray(rawConceptos.informativos)
        ? rawConceptos.informativos.map(i => ({
            id: i.id,
            concepto: i.concepto || i.descripcion || 'Informativo',
            importe: typeof i.importe === 'number' ? i.importe : (i.importe || i.valor || '-')
        }))
        : (Array.isArray(raw.saldosInformativos) ? raw.saldosInformativos : []);

    const totalPercepciones = raw.total_percepciones !== undefined
        ? Number(raw.total_percepciones)
        : (raw.totalPercepciones !== undefined ? Number(raw.totalPercepciones) : 0);

    const totalDeducciones = raw.total_deducciones !== undefined
        ? Number(raw.total_deducciones)
        : (raw.totalDeducciones !== undefined ? Number(raw.totalDeducciones) : 0);

    const netoPagado = raw.neto_pagado !== undefined
        ? Number(raw.neto_pagado)
        : (raw.sueldo_neto !== undefined ? Number(raw.sueldo_neto) : totalPercepciones - totalDeducciones);

    const empresa = raw.empresa ? {
        nombre: raw.empresa.nombre || raw.empresa.razon_social || raw.empresa_nombre || '',
        rfc: raw.empresa.rfc || '',
        registroPatronal: raw.empresa.registro_patronal || raw.empresa.registroPatronal || ''
    } : (raw.empresa_nombre ? { nombre: raw.empresa_nombre, rfc: '', registroPatronal: '' } : null);

    const empleado = raw.empleado ? {
        nombre: raw.empleado.nombre || '',
        noEmpleado: raw.empleado.no_empleado || raw.empleado.noEmpleado || '',
        rfc: raw.empleado.rfc || '',
        curp: raw.empleado.curp || '',
        imss: raw.empleado.imss || '',
        departamento: raw.empleado.departamento || '',
        puesto: raw.empleado.puesto || '',
        fechaIngreso: raw.empleado.fecha_ingreso || raw.empleado.fechaIngreso || '',
        reportaA: raw.empleado.reporta_a || raw.empleado.reportaA || '',
        abonoCuenta: raw.empleado.abono_cuenta || raw.empleado.abonoCuenta || ''
    } : null;

    return {
        id: raw.id || raw.id_recibo,
        folio: raw.folio || `REC-${raw.id}`,
        periodoNombre: raw.periodo_nombre || raw.periodo || 'Nómina',
        sueldoDiario,
        diasTrabajados: raw.dias_trabajados !== undefined ? Number(raw.dias_trabajados) : 15,
        horasTrabajadas: raw.horas_trabajadas !== undefined ? Number(raw.horas_trabajadas) : 120,
        periodoPago: raw.periodo_pago || raw.periodo || '',
        fechaPago: raw.fecha_pago || '',
        turno: raw.turno || 'Matutino',
        jornada: raw.jornada || 'Diurna (8 hrs)',
        quincenaSemana: raw.quincena_semana || raw.periodo || '',
        anio: raw.anio ? Number(raw.anio) : new Date().getFullYear(),
        mes: raw.mes ? Number(raw.mes) : new Date().getMonth() + 1,
        estatus: raw.estatus || 'Pagado',
        empresa,
        empleado,
        percepciones,
        deducciones,
        saldosInformativos,
        totalPercepciones,
        totalDeducciones,
        netoPagado
    };
}

export const NominaModel = {
    async getRecibos(anioFilter = 'all', mesFilter = 'all') {
        const queryParams = new URLSearchParams();
        const user = getStoredUser();
        if (user && user.id) queryParams.append('empleado_id', user.id);
        if (anioFilter !== 'all') queryParams.append('anio', anioFilter);
        if (mesFilter !== 'all') queryParams.append('mes', mesFilter);

        const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';

        try {
            const response = await fetchWithAuth(`/nominas${queryString}`);
            if (response.ok) {
                const data = await response.json();
                const list = Array.isArray(data) ? data : (data.recibos || []);
                return list.map(formatReciboItem);
            }
        } catch (error) {
            console.error('Error cargando recibos de nómina desde la API backend:', error);
        }

        return [];
    },

    async getReciboById(id) {
        try {
            const response = await fetchWithAuth(`/nominas/${id}`);
            if (response.ok) {
                const raw = await response.json();
                return formatReciboItem(raw);
            }
        } catch (error) {
            console.error(`Error cargando detalle de nómina ID ${id} desde la API:`, error);
        }
        return null;
    },

    getEmpleadoDatos(user) {
        if (!user) return {};
        return {
            nombre: user.nombre || user.name || '',
            noEmpleado: user.no_empleado || user.id || '',
            rfc: user.rfc || '',
            curp: user.curp || '',
            imss: user.imss || '',
            departamento: user.departamento || '',
            puesto: user.puesto || '',
            fechaIngreso: user.fecha_ingreso || '',
            reportaA: user.reporta_a || '',
            abonoCuenta: user.abono_cuenta || ''
        };
    },

    async getResumenStats() {
        const recibos = await this.getRecibos();
        if (!recibos || recibos.length === 0) {
            return {
                ultimoPagoNeto: 0,
                fechaUltimoPago: '-',
                percepcionesAcumuladas: 0,
                deduccionesAcumuladas: 0,
                totalRecibos: 0
            };
        }

        const ultimoRecibo = recibos[0];
        const percepcionesAcumuladas = recibos.reduce((acc, r) => acc + (r.totalPercepciones || 0), 0);
        const deduccionesAcumuladas = recibos.reduce((acc, r) => acc + (r.totalDeducciones || 0), 0);

        return {
            ultimoPagoNeto: ultimoRecibo.netoPagado || 0,
            fechaUltimoPago: ultimoRecibo.fechaPago || '-',
            percepcionesAcumuladas,
            deduccionesAcumuladas,
            totalRecibos: recibos.length
        };
    }
};
