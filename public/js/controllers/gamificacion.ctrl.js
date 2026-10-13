import { initLayout } from './layout.ctrl.js';
import { fetchWithAuth, getStoredUser } from '../config.js';
import { showSuccess, showError, showWarning, showInfo } from '../utils/alert.js';

document.addEventListener('DOMContentLoaded', async () => {
    const sessionUser = initLayout('gamificacion');
    if (!sessionUser) return;

    const currentUserId = sessionUser.id || sessionUser.id_usuario || sessionUser.id_empleado || 1;

    await updateGamificacionStats(currentUserId);
    await loadLeaderboard();

    setupUnityControls();
    setupJuegoTerminadoListener(currentUserId);
    setupReclamarRecompensa(currentUserId);
});

async function updateGamificacionStats(userId) {
    try {
        let balance = 0;
        let rolUsuario = 'Colaborador';
        let scoreHoy = 0;
        let yaJugo = false;
        let rachaDias = 5;
        let diasParaBono = 2;
        let reclamadoHoy = false;
        let resumenNivel = null;

        // Intentar consultar endpoint consolidado de resumen si el backend lo tiene implementado
        let resumenObtenido = false;
        try {
            const resResumen = await fetchWithAuth(`/gamificacion/resumen?userId=${userId}`);
            if (resResumen && resResumen.ok) {
                const resumen = await resResumen.json();
                if (resumen && (resumen.puntos_balance !== undefined || resumen.balance !== undefined)) {
                    balance = Number(resumen.puntos_balance ?? resumen.balance ?? 0);
                    rolUsuario = resumen.rol || rolUsuario;
                    scoreHoy = Number(resumen.aporte_hoy ?? resumen.puntuacion_hoy ?? 0);
                    yaJugo = resumen.ya_jugo_hoy ?? resumen.yaJugoHoy ?? (scoreHoy > 0);
                    rachaDias = Number(resumen.racha_dias ?? resumen.racha ?? 5);
                    diasParaBono = Number(resumen.proximo_bono_dias ?? (7 - (rachaDias % 7)));
                    resumenNivel = resumen.nivel?.nombre || (typeof resumen.nivel === 'string' ? resumen.nivel : null);
                    if (resumen.puede_reclamar_diario === false) {
                        reclamadoHoy = true;
                    }
                    if (yaJugo) {
                        renderGameFinishedView(scoreHoy);
                    }
                    resumenObtenido = true;
                }
            }
        } catch (ignored) {}

        if (!resumenObtenido) {
            // 1. Cargar perfil oficial del usuario desde SQL Server
            const resPerfil = await fetchWithAuth(`/perfil?empleado_id=${userId}`);
            if (resPerfil.ok) {
                const profile = await resPerfil.json();
                if (profile.puntos_balance !== undefined) {
                    balance = Number(profile.puntos_balance);
                }
                if (profile.rol) {
                    rolUsuario = profile.rol;
                }
            }

            // 2. Cargar estado de la partida diaria y verificar si ya jugó hoy
            const resEstado = await fetchWithAuth(`/gamificacion/partida/estado?userId=${userId}&minigameId=1`);
            if (resEstado.ok) {
                const estado = await resEstado.json();
                if (estado.puntos_balance !== undefined && estado.puntos_balance > balance) {
                    balance = Number(estado.puntos_balance);
                }
                if (estado.yaJugoHoy || estado.puedeJugar === false) {
                    yaJugo = true;
                    scoreHoy = Number(estado.partidaHoy?.puntuacion_obtenida ?? 0);
                    renderGameFinishedView(scoreHoy);
                }
            }

            // 3. Cargar y calcular Racha de Entrada / Asistencia consecutiva
            try {
                const resAsistencia = await fetchWithAuth(`/asistencia?empleadoId=${userId}`);
                if (resAsistencia.ok) {
                    const registros = await resAsistencia.json();
                    if (Array.isArray(registros) && registros.length > 0) {
                        const asistenciasValidas = registros.filter(r => r.estado === 'Puntual' || r.estado === 'Retardo');
                        rachaDias = Math.max(1, asistenciasValidas.length);
                    }
                }
                diasParaBono = 7 - (rachaDias % 7);
            } catch (rachaErr) {
                console.warn('No se pudo calcular la racha desde asistencia:', rachaErr);
            }

            const fechaHoy = new Date().toISOString().split('T')[0];
            if (localStorage.getItem(`recompensa_diaria_${userId}_${fechaHoy}`)) {
                reclamadoHoy = true;
            }
        }

        // 4. Actualizar elemento Puntos Individuales Acumulados
        const ptsEl = document.getElementById('pts-individuales');
        if (ptsEl) {
            ptsEl.textContent = `${balance.toLocaleString()} Pts`;
        }

        // 5. Actualizar Nivel de Usuario
        const nivelEl = document.getElementById('pts-nivel');
        if (nivelEl) {
            let nivelNombre = resumenNivel || null;
            if (!nivelNombre) {
                if (balance >= 15000) nivelNombre = 'Nivel Diamante ⭐';
                else if (balance >= 5000) nivelNombre = 'Nivel Oro 🥇';
                else if (balance >= 1000) nivelNombre = 'Nivel Plata 🥈';
                else nivelNombre = 'Nivel Bronce 🥉';
            }
            nivelEl.textContent = `${nivelNombre} (${rolUsuario})`;
        }

        // 6. Actualizar Aporte al Departamento Hoy
        const aporteEl = document.getElementById('pts-aporte-hoy');
        const badgeAporteEl = document.getElementById('pts-aporte-badge');
        if (aporteEl) {
            aporteEl.textContent = scoreHoy > 0 ? `+${scoreHoy.toLocaleString()} Pts Hoy` : '0 Pts Hoy';
        }
        if (badgeAporteEl) {
            if (yaJugo) {
                badgeAporteEl.className = 'badge badge-success';
                badgeAporteEl.textContent = `Aporte Registrado`;
            } else {
                badgeAporteEl.className = 'badge badge-warning';
                badgeAporteEl.textContent = `Partida Pendiente`;
            }
        }

        // 7. Actualizar Racha Diaria en el DOM
        const rachaEl = document.getElementById('pts-racha-dias');
        const rachaBonoEl = document.getElementById('pts-racha-bono');
        if (rachaEl) {
            rachaEl.textContent = `${rachaDias} Días Seguidos`;
        }
        if (rachaBonoEl) {
            if (diasParaBono === 7 || diasParaBono === 0) {
                rachaBonoEl.textContent = '¡Bono especial de 7 días desbloqueado!';
            } else {
                rachaBonoEl.textContent = `Próximo bono especial en ${diasParaBono} día${diasParaBono !== 1 ? 's' : ''}`;
            }
        }

        // 8. Verificar estado del botón de reclamación diaria
        const btnReclamar = document.getElementById('btn-reclamar-recompensa');
        if (btnReclamar && reclamadoHoy) {
            btnReclamar.disabled = true;
            btnReclamar.textContent = '✓ Recompensa de Hoy Reclamada (+50 Pts)';
            btnReclamar.className = 'btn btn-outline';
            btnReclamar.style.color = '#059669';
            btnReclamar.style.borderColor = '#059669';
        }

    } catch (e) {
        console.error('Error actualizando estadísticas de gamificación:', e);
    }
}

async function loadLeaderboard() {
    try {
        const resGam = await fetchWithAuth('/gamificacion/leaderboard');
        if (resGam.ok) {
            const leaderData = await resGam.json();
            renderLeaderboard(leaderData);
        }
    } catch (e) {
        console.error('Error cargando leaderboard de gamificación:', e);
    }
}

function setupUnityControls() {
    const iframeUnity = document.getElementById('unity-game-iframe');
    const btnFullscreen = document.getElementById('btn-fullscreen-unity');
    if (btnFullscreen && iframeUnity) {
        btnFullscreen.addEventListener('click', () => {
            if (iframeUnity.requestFullscreen) {
                iframeUnity.requestFullscreen();
            } else if (iframeUnity.webkitRequestFullscreen) {
                iframeUnity.webkitRequestFullscreen();
            } else if (iframeUnity.msRequestFullscreen) {
                iframeUnity.msRequestFullscreen();
            }
        });
    }

    const btnReload = document.getElementById('btn-reload-unity');
    if (btnReload && iframeUnity) {
        btnReload.addEventListener('click', () => {
            iframeUnity.src = '/games/candy_crush/index.html';
        });
    }
}

function setupJuegoTerminadoListener(userId) {
    let isProcessing = false;
    let ultimoScoreConocido = 0;

    console.log('%c[Frontend Gamificación] 🎧 Escuchadores de eventos de Unity inicializados para userId: ' + userId, 'color: #3B82F6; font-weight: bold;');

    const onGameEnded = async (origenEvento, score) => {
        if (isProcessing) {
            console.warn(`[Frontend Gamificación] ⚠️ Evento "${origenEvento}" ignorado porque ya se está guardando la partida.`);
            return;
        }
        isProcessing = true;

        console.log(`%c[Frontend Gamificación] 🏁 Fin de partida detectado desde "${origenEvento}". Score final: ${score}`, 'color: #10B981; font-weight: bold;');

        const iframe = document.getElementById('unity-game-iframe');
        if (iframe) {
            console.log('[Frontend Gamificación] 🛑 Desmontando y deteniendo iframe de Unity...');
            iframe.src = 'about:blank';
            iframe.remove();
        }

        const controls = document.getElementById('unity-controls-wrapper');
        if (controls) controls.style.display = 'none';

        const wrapper = document.getElementById('unity-game-wrapper');
        if (wrapper) {
            wrapper.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #94A3B8; font-size: 1.1rem; gap: 12px;">
                    <div style="width: 36px; height: 36px; border: 3px solid #334155; border-top-color: var(--accent-color); border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
                    <span>Guardando puntuación oficial en el servidor (${score} pts)...</span>
                </div>
                <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
            `;
        }

        let finalScore = score;
        const payload = {
            userId: userId,
            score: score,
            minigameId: 1,
            tiempoJugado: 60
        };

        console.log('[Frontend Gamificación] 📤 Enviando POST /api/gamificacion/partida con payload:', payload);

        try {
            const response = await fetchWithAuth('/gamificacion/partida', {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            console.log('[Frontend Gamificación] 📥 Código de respuesta HTTP:', response.status, response.statusText);

            if (response.ok) {
                const data = await response.json();
                console.log('[Frontend Gamificación] ✅ Puntuación registrada exitosamente en SQL Server:', data);
                finalScore = data.partida?.puntuacion_obtenida ?? score;
                await showSuccess('¡Partida Guardada con Éxito!', `Has obtenido <strong>${finalScore.toLocaleString()} Pts</strong> para el ranking de tu departamento.`);
            } else if (response.status === 409) {
                const errData = await response.json().catch(() => ({}));
                console.warn('[Frontend Gamificación] ⚠️ Partida ya jugada hoy (409):', errData);
                if (errData.partidaPrevia?.puntuacion_obtenida !== undefined) {
                    finalScore = errData.partidaPrevia.puntuacion_obtenida;
                }
                await showWarning('Intento Oficial Completado', 'Ya has completado tu partida diaria de hoy. Se mantendrá tu puntuación previa registrada en el ranking.');
            } else {
                const errData = await response.json().catch(() => ({}));
                console.error('[Frontend Gamificación] ❌ Error de API al guardar partida:', errData);
                await showError('Error al Guardar Puntuación', errData.error || 'Hubo un inconveniente al guardar la puntuación oficial.');
            }
        } catch (e) {
            console.error('[Frontend Gamificación] 💥 Error de red o excepción inesperada:', e);
            await showError('Error de Conexión', 'No se pudo conectar con el servidor para registrar la partida.');
        }

        renderGameFinishedView(finalScore);
        await updateGamificacionStats(userId);
        await loadLeaderboard();
    };

    // 1. Escuchar JuegoTerminado en window
    window.addEventListener('JuegoTerminado', (event) => {
        const score = Number(event.detail?.score ?? event.detail ?? event.score ?? 0);
        if (score > 0) ultimoScoreConocido = score;
        console.log('%c[Frontend Gamificación] 🎮 Evento "JuegoTerminado" capturado en window:', 'color: #10B981; font-weight: bold;', { score, detail: event.detail });
        onGameEnded('JuegoTerminado', score);
    });

    // 2. Escuchar JuegoSalir en window
    window.addEventListener('JuegoSalir', (event) => {
        const score = Number(event.detail?.score ?? event.detail ?? event.score ?? ultimoScoreConocido ?? 0);
        console.log('%c[Frontend Gamificación] 🚪 Evento "JuegoSalir" capturado en window:', 'color: #F59E0B; font-weight: bold;', { score, detail: event.detail, ultimoScoreConocido });
        onGameEnded('JuegoSalir', score);
    });

    // 3. Escuchar postMessage desde el iframe
    window.addEventListener('message', (event) => {
        if (event.data && (event.data.type === 'JuegoTerminado' || event.data.type === 'JuegoSalir')) {
            const rawScore = event.data.score ?? event.data.detail?.score ?? event.data.detail ?? ultimoScoreConocido ?? 0;
            const score = Number(rawScore);
            if (score > 0) ultimoScoreConocido = score;
            console.log(`%c[Frontend Gamificación] 📬 Mensaje postMessage "${event.data.type}" capturado:`, 'color: #8B5CF6; font-weight: bold;', { score, data: event.data });
            onGameEnded(event.data.type, score);
        }
    });

    // 4. Exponer funciones de puente globales por si Unity o scripts de depuración las llaman
    window.NotificarFinPartida = (puntos) => {
        console.log('[Frontend Gamificación] ⚡ window.NotificarFinPartida invocado con:', puntos);
        window.dispatchEvent(new CustomEvent('JuegoTerminado', { detail: { score: puntos } }));
    };

    window.SalirDelJuego = () => {
        console.log('[Frontend Gamificación] ⚡ window.SalirDelJuego invocado');
        window.dispatchEvent(new CustomEvent('JuegoSalir', { detail: { score: ultimoScoreConocido } }));
    };
}

function renderGameFinishedView(score) {
    const wrapper = document.getElementById('unity-game-wrapper');
    const controls = document.getElementById('unity-controls-wrapper');
    if (controls) controls.style.display = 'none';
    if (!wrapper) return;

    wrapper.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; width: 100%; padding: 3rem 1.5rem; text-align: center; background: radial-gradient(circle at center, #1E293B 0%, #0B1120 100%); border-radius: 12px;">
            <div style="width: 72px; height: 72px; border-radius: 50%; background-color: rgba(5, 150, 105, 0.15); border: 2px solid #059669; display: flex; align-items: center; justify-content: center; color: #10B981; margin-bottom: 1.2rem;">
                <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
            <span class="badge badge-success" style="font-size: 0.85rem; padding: 0.4rem 1rem; margin-bottom: 0.8rem;">
                Partida Diaria Completada
            </span>
            <h3 style="font-size: 1.8rem; font-weight: 800; color: #FFFFFF; margin-bottom: 0.4rem;">
                ¡Intento Oficial de Hoy Registrado!
            </h3>
            <p style="color: #94A3B8; font-size: 0.95rem; max-width: 520px; line-height: 1.5; margin-bottom: 1.5rem;">
                Tu puntuación ha sido guardada en la base de datos SQL Server y sumada a la tabla de clasificación de tu departamento. Solo se permite 1 partida oficial por día.
            </p>
            <div style="background-color: rgba(15, 23, 42, 0.8); border: 1px solid #334155; border-radius: 12px; padding: 1.2rem 2.5rem; margin-bottom: 1.5rem;">
                <span style="font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.5px; color: #94A3B8; font-weight: 600; display: block; margin-bottom: 0.2rem;">Puntuación Obtenida</span>
                <span style="font-size: 2.4rem; font-weight: 800; color: var(--accent-color); font-family: monospace;">${Number(score).toLocaleString()} Pts</span>
            </div>
            <div style="font-size: 0.85rem; color: #64748B;">
                ⏳ Tu próximo intento estará disponible mañana a las 00:00 hrs.
            </div>
        </div>
    `;
}

function setupReclamarRecompensa(userId) {
    const btnReclamar = document.getElementById('btn-reclamar-recompensa');
    if (!btnReclamar) return;

    btnReclamar.addEventListener('click', async () => {
        btnReclamar.disabled = true;
        btnReclamar.textContent = 'Procesando...';

        try {
            const response = await fetchWithAuth('/gamificacion/reclamar-diario', {
                method: 'POST',
                body: JSON.stringify({ usuario_id: userId, userId: userId })
            });

            if (response.ok) {
                const data = await response.json();
                const fechaHoy = new Date().toISOString().split('T')[0];
                localStorage.setItem(`recompensa_diaria_${userId}_${fechaHoy}`, 'true');

                btnReclamar.disabled = true;
                btnReclamar.textContent = '✓ Recompensa de Hoy Reclamada (+50 Pts)';
                btnReclamar.className = 'btn btn-outline';
                btnReclamar.style.color = '#059669';
                btnReclamar.style.borderColor = '#059669';

                await updateGamificacionStats(userId);
                await loadLeaderboard();

                await showSuccess('¡Recompensa Reclamada!', data.message || 'Has sumado <strong>+50 Puntos</strong> a tu balance individual por tu acceso de hoy.');
            } else if (response.status === 409) {
                const errData = await response.json().catch(() => ({}));
                const fechaHoy = new Date().toISOString().split('T')[0];
                localStorage.setItem(`recompensa_diaria_${userId}_${fechaHoy}`, 'true');

                btnReclamar.disabled = true;
                btnReclamar.textContent = '✓ Recompensa de Hoy Reclamada (+50 Pts)';
                btnReclamar.className = 'btn btn-outline';
                btnReclamar.style.color = '#059669';
                btnReclamar.style.borderColor = '#059669';

                await showWarning('Recompensa ya Canjeada', errData.error || 'Ya has reclamado tu recompensa diaria de hoy. Vuelve mañana para seguir sumando.');
            } else {
                btnReclamar.disabled = false;
                btnReclamar.textContent = 'Reclamar +50 Puntos Hoy';
                await showError('No Disponible', 'No se pudieron reclamar los puntos en este momento. Por favor intenta más tarde.');
            }
        } catch (e) {
            console.error('Error al reclamar puntos diarios:', e);
            btnReclamar.disabled = false;
            btnReclamar.textContent = 'Reclamar +50 Puntos Hoy';
            await showError('Error de Conexión', 'Hubo un problema de conexión al reclamar tu recompensa.');
        }
    });
}

function renderLeaderboard(list) {
    if (!Array.isArray(list) || list.length === 0) return;
    const tbody = document.getElementById('gamificacion-leaderboard-body');
    if (!tbody) return;

    tbody.innerHTML = list.map((item, index) => {
        const medal = index === 0 ? '🥇' : (index === 1 ? '🥈' : (index === 2 ? '🥉' : `${index + 1}°`));
        const pts = Number(item.puntos_totales || item.puntos || 0);
        const deptName = item.departamento || item.nombre_departamento || 'Departamento';
        const empCount = item.total_empleados !== undefined ? `${item.total_empleados} Colaboradores` : 'Activo';

        return `
            <tr ${index === 0 ? 'style="background-color: rgba(245, 158, 11, 0.04);"' : ''}>
                <td class="text-center"><span style="font-size: 1.2rem;">${medal}</span></td>
                <td>
                    <div style="font-weight: 700; color: var(--primary-dark);">${deptName}</div>
                    ${index === 0 ? '<span class="badge badge-warning" style="font-size: 0.7rem;">Líder de la Semana</span>' : ''}
                </td>
                <td class="text-center font-mono">${empCount}</td>
                <td class="text-right font-mono" style="font-weight: 700; color: var(--primary-dark); font-size: 1rem;">${pts.toLocaleString()} Pts</td>
                <td class="text-center" style="color: #059669; font-weight: 700; font-size: 0.85rem;">▲ Liderando</td>
            </tr>
        `;
    }).join('');
}
