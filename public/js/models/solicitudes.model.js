import { fetchWithAuth, getStoredUser } from '../config.js';

function formatSolicitud(raw) {
    if (!raw) return null;

    const tipoKey = raw.tipo_clave || raw.tipo || '';

    const tipoMap = {
        'VAC': 'vacaciones',
        'PRES': 'prestamos',
        'DAT': 'actualizacion_datos',
        'vacaciones': 'vacaciones',
        'prestamos': 'prestamos',
        'actualizacion_datos': 'actualizacion_datos'
    };

    const tipoNorm = tipoMap[tipoKey] || tipoKey || 'vacaciones';
    const etiquetaMap = {
        'vacaciones': 'Vacaciones',
        'prestamos': 'Préstamo',
        'actualizacion_datos': 'Actualización de Datos'
    };

    let detallesObj = {};

    const jsonToParse = raw.cambios_json || raw.datos || raw.detalles;
    if (typeof jsonToParse === 'string') {
        try { detallesObj = JSON.parse(jsonToParse); } catch (e) {}
    } else if (jsonToParse && typeof jsonToParse === 'object') {
        detallesObj = { ...jsonToParse };
    }

    if (typeof raw.datos === 'object') detallesObj = { ...detallesObj, ...raw.datos };
    if (typeof raw.detalles === 'object') detallesObj = { ...detallesObj, ...raw.detalles };

    const mergedDetails = {
        ...raw,
        ...detallesObj
    };

    const fechaInicio = mergedDetails.vacaciones_fecha_inicio || mergedDetails.fecha_inicio || mergedDetails.fechaInicio || '';
    const fechaFin = mergedDetails.vacaciones_fecha_fin || mergedDetails.fecha_fin || mergedDetails.fechaFin || '';
    const fechaRegreso = mergedDetails.vacaciones_fecha_regreso || mergedDetails.fecha_regreso || mergedDetails.fechaRegreso || '';
    const diasSolicitados = mergedDetails.vacaciones_dias || mergedDetails.dias_solicitados || mergedDetails.dias || '';

    const monto = mergedDetails.prestamo_monto || mergedDetails.monto || '';
    const plazoQuincenas = mergedDetails.prestamo_plazos || mergedDetails.plazo_quincenas || mergedDetails.plazoQuincenas || '';

    const campo = mergedDetails.campo || mergedDetails.campo_modificar || '';
    const valorNuevo = mergedDetails.valor_nuevo || mergedDetails.valorNuevo || mergedDetails.nuevo_valor || '';

    const motivoStr = mergedDetails.motivo || raw.motivo || raw.observaciones || '';

    let resumen = raw.resumen || raw.tipo_descripcion || mergedDetails.resumen || '';

    if (!resumen || resumen === 'Solicitud de Vacaciones') {
        if (tipoNorm === 'vacaciones' && fechaInicio && fechaFin) {
            resumen = `Del ${fechaInicio} al ${fechaFin}${diasSolicitados ? ` (${diasSolicitados} días)` : ''}`;
        } else if (tipoNorm === 'prestamos' && monto) {
            resumen = `$${Number(monto).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN${plazoQuincenas ? ` a ${plazoQuincenas} quincenas` : ''}`;
        } else if (tipoNorm === 'actualizacion_datos' && campo) {
            resumen = `Modificación de ${campo}`;
        }
    }

    const empId = raw.empleado_id || raw.id_empleado_solicitante;
    const infoDir = directorioColaboradores[empId] || {};

    const nombreEmpleado = raw.empleado_nombre || raw.nombre_empleado || raw.nombre_completo || raw.empleado || raw.nombre || raw.solicitante || infoDir.nombre || (empId ? `Colaborador #${empId}` : 'Colaborador');
    const departamento = raw.departamento || raw.nombre_departamento || infoDir.depto || '';
    const puesto = raw.puesto || raw.nombre_puesto || infoDir.puesto || '';
    const motivoRechazo = raw.motivo_rechazo || mergedDetails.motivo_rechazo || '';
    const autorizador = raw.nombre_autorizador || raw.autorizador || raw.id_empleado_autorizador || null;

    return {
        id: raw.id || raw.folio || 'SOL-000',
        folio: raw.folio || `SOL-${raw.id}`,
        empleado_id: empId,
        empleadoId: empId,
        tipo: tipoNorm,
        tipoEtiqueta: raw.tipo_descripcion || raw.tipo_etiqueta || raw.tipoEtiqueta || etiquetaMap[tipoNorm] || 'Solicitud',
        fechaSolicitud: raw.fecha_solicitud || raw.fechaSolicitud || raw.created_at || new Date().toLocaleDateString('es-MX'),
        resumen: resumen || (motivoStr ? `Solicitud: ${motivoStr}` : 'Solicitud tramitada'),
        nombreEmpleado,
        departamento,
        puesto,
        motivoRechazo,
        autorizador,
        detalles: {
            ...mergedDetails,
            nombreEmpleado,
            departamento,
            puesto,
            motivoRechazo,
            fechaInicio,
            fechaFin,
            fechaRegreso,
            diasSolicitados,
            monto,
            plazoQuincenas,
            campo,
            valorNuevo,
            motivo: motivoStr
        },
        estatus: raw.estatus || 'Pendiente'
    };
}

const directorioColaboradores = {
    1: { nombre: 'Carlos Mendoza Sánchez', puesto: 'Gerente de TI', depto: 'Tecnología e Innovación' },
    2: { nombre: 'Laura Patricia Guzmán', puesto: 'Directora de Talento Humano', depto: 'Recursos Humanos' },
    3: { nombre: 'Rodrigo Castillejos', puesto: 'Gerente de Contabilidad', depto: 'Finanzas y Contabilidad' },
    4: { nombre: 'Mariana Valenzuela', puesto: 'Gerente de Operaciones', depto: 'Operaciones y Logística' },
    5: { nombre: 'Juan Pérez González', puesto: 'Desarrollador Full Stack', depto: 'Tecnología e Innovación' },
    6: { nombre: 'María López Carrasco', puesto: 'Especialista en Nóminas', depto: 'Recursos Humanos' },
    7: { nombre: 'Fernando Morales Alonso', puesto: 'Líder Técnico Frontend', depto: 'Tecnología e Innovación' },
    8: { nombre: 'Diana Navarro Reyes', puesto: 'Diseñadora UI/UX', depto: 'Tecnología e Innovación' },
    9: { nombre: 'Roberto Soto Prieto', puesto: 'Ingeniero DevOps', depto: 'Tecnología e Innovación' },
    10: { nombre: 'Alejandro Vargas Ramos', puesto: 'Reclutador Sr.', depto: 'Recursos Humanos' },
    11: { nombre: 'Claudia Méndez Vázquez', puesto: 'Analista Contable', depto: 'Finanzas y Contabilidad' },
    12: { nombre: 'Gabriel Herrera Lara', puesto: 'Analista Fiscal', depto: 'Finanzas y Contabilidad' },
    13: { nombre: 'Javier Ortiz Ramos', puesto: 'Coordinador de Logística', depto: 'Operaciones y Logística' }
};

export const SolicitudesModel = {
    async getAllSolicitudes() {
        try {
            const user = getStoredUser();
            const empleadoId = user ? (user.id || user.id_empleado) : 1;
            const response = await fetchWithAuth(`/solicitudes?empleado_id=${empleadoId}`);
            if (response.ok) {
                const data = await response.json();
                const list = Array.isArray(data) ? data : (data.solicitudes || []);
                return list.map(formatSolicitud);
            }
        } catch (error) {
            console.error('Error cargando solicitudes desde la API:', error);
        }

        return [];
    },

    async getSolicitudesEquipo(managerId) {
        try {
            const response = await fetchWithAuth(`/solicitudes/equipo?jefe_id=${managerId}`);
            if (response.ok) {
                const data = await response.json();
                const list = Array.isArray(data) ? data : (data && Array.isArray(data.solicitudes) ? data.solicitudes : null);
                if (list !== null) {
                    return list.map(formatSolicitud);
                }
            }
        } catch (error) {
            console.error('Error al consultar solicitudes de equipo:', error);
        }

        return [];
    },

    async aprobarSolicitud(id, autorizadorId = 1) {
        const response = await fetchWithAuth(`/solicitudes/${id}/aprobar`, {
            method: 'PUT',
            body: JSON.stringify({ autorizador_id: autorizadorId })
        });

        if (response.ok) {
            return await response.json();
        } else {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || 'No se pudo aprobar la solicitud.');
        }
    },

    async rechazarSolicitud(id, autorizadorId = 1, motivoRechazo = '') {
        const response = await fetchWithAuth(`/solicitudes/${id}/rechazar`, {
            method: 'PUT',
            body: JSON.stringify({
                autorizador_id: autorizadorId,
                motivo_rechazo: motivoRechazo
            })
        });

        if (response.ok) {
            return await response.json();
        } else {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || 'No se pudo rechazar la solicitud.');
        }
    },

    async getSolicitudById(id) {
        try {
            const response = await fetchWithAuth(`/solicitudes/${id}`);
            if (response.ok) {
                const raw = await response.json();
                console.log(`Raw solicitud data for ID ${id}:`, raw);
                return formatSolicitud(raw);
            }
        } catch (error) {
            console.error(`Error cargando solicitud ID ${id} desde la API:`, error);
        }

        const all = await this.getAllSolicitudes();
        return all.find(s => String(s.id) === String(id) || String(s.folio) === String(id)) || null;
    },

    async crearSolicitud(tipoKey, dataPayload) {
        const user = getStoredUser();
        const empleadoId = user ? (user.id || user.id_empleado) : 1;

        const tipoBackendMap = {
            'vacaciones': 'VAC',
            'prestamos': 'PRES',
            'actualizacion_datos': 'DAT'
        };

        const tipoCode = tipoBackendMap[tipoKey] || tipoKey;

        let tipoEtiqueta = 'Solicitud';
        let resumen = '';

        const fStart = dataPayload.vacaciones_fecha_inicio || dataPayload.fecha_inicio || dataPayload.fechaInicio || '';
        const fEnd = dataPayload.vacaciones_fecha_fin || dataPayload.fecha_fin || dataPayload.fechaFin || '';
        const fRegreso = dataPayload.vacaciones_fecha_regreso || dataPayload.fecha_regreso || dataPayload.fechaRegreso || '';
        const dNum = dataPayload.vacaciones_dias || dataPayload.dias_solicitados || dataPayload.dias || 1;

        const mNum = dataPayload.prestamo_monto || dataPayload.monto || 0;
        const pNum = dataPayload.prestamo_plazos || dataPayload.plazo_quincenas || dataPayload.plazoQuincenas || 12;

        if (tipoCode === 'VAC' || tipoKey === 'vacaciones') {
            tipoEtiqueta = 'Vacaciones';
            resumen = `Del ${fStart} al ${fEnd} (${dNum} días)`;
        } else if (tipoCode === 'PRES' || tipoKey === 'prestamos') {
            tipoEtiqueta = 'Préstamo';
            resumen = `$${Number(mNum).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN a ${pNum} quincenas`;
        } else if (tipoCode === 'DAT' || tipoKey === 'actualizacion_datos') {
            tipoEtiqueta = 'Actualización de Datos';
            resumen = `Modificación de ${dataPayload.campo || 'datos'}`;
        }

        const payload = {
            empleado_id: empleadoId,
            id_empleado: empleadoId,
            tipo_clave: tipoCode,
            tipo: tipoCode,
            tipo_descripcion: tipoEtiqueta,
            tipo_etiqueta: tipoEtiqueta,
            tipoEtiqueta: tipoEtiqueta,
            resumen: resumen,
            
            vacaciones_fecha_inicio: fStart,
            vacaciones_fecha_fin: fEnd,
            vacaciones_fecha_regreso: fRegreso,
            vacaciones_dias: dNum,

            prestamo_monto: mNum,
            prestamo_plazos: pNum,

            cambios_json: JSON.stringify(dataPayload),

            datos: dataPayload,
            detalles: dataPayload,
            ...dataPayload
        };

        try {
            const response = await fetchWithAuth('/solicitudes', {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const result = await response.json();
                return formatSolicitud(result);
            } else {
                const errorData = await response.json().catch(() => ({}));
                const errMsg = errorData.error || errorData.message || 'Error al guardar la solicitud en el servidor.';
                throw new Error(errMsg);
            }
        } catch (error) {
            console.error('Error enviando solicitud a la API:', error);
            throw error;
        }
    }
};