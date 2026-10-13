import { initLayout } from './layout.ctrl.js';
import { fetchWithAuth } from '../config.js';
import { showSuccess, showError, showWarning, showConfirm } from '../utils/alert.js';

let noticiasCache = [];
let eventosCache = [];
let currentUserRole = '';
let isHRorAdmin = false;

document.addEventListener('DOMContentLoaded', async () => {
    const user = initLayout('noticias');
    if (!user) return;

    currentUserRole = (user.rol || localStorage.getItem('eslabon_user_role') || '').toLowerCase();
    isHRorAdmin = ['administrador', 'recursos humanos', 'rh'].some(r => currentUserRole.includes(r));

    const btnCrear = document.getElementById('btn-crear-noticia');
    if (btnCrear && isHRorAdmin) {
        btnCrear.style.display = 'inline-flex';
        btnCrear.addEventListener('click', () => abrirModalNoticia());
    }

    setupModalsListeners(user);

    await loadNoticiasYEventos();
});

async function loadNoticiasYEventos() {
    try {
        const response = await fetchWithAuth('/noticias');
        if (response.ok) {
            const data = await response.json();
            noticiasCache = data.noticias || (Array.isArray(data) ? data : (data ? [data] : []));
            eventosCache = data.eventos || [];

            // Soporte para publicaciones locales previas si el backend aún no persiste
            const localSaved = JSON.parse(localStorage.getItem('noticias_custom_cache') || '[]');
            if (Array.isArray(localSaved) && localSaved.length > 0) {
                // Combinar sin duplicados por ID
                const existingIds = new Set(noticiasCache.map(n => String(n.id_noticia || n.id)));
                localSaved.forEach(item => {
                    if (!existingIds.has(String(item.id_noticia || item.id))) {
                        noticiasCache.unshift(item);
                    }
                });
            }

            renderNoticiasYEventos(noticiasCache, eventosCache);
        } else {
            renderEmptyState('Aún no hay publicaciones o comunicados registrados en el servidor.');
        }
    } catch (e) {
        console.error('Error al solicitar GET /api/noticias:', e);
        renderEmptyState('No se pudieron obtener las noticias desde el servidor.');
    }
}

function renderEmptyState(message) {
    const bannerTitle = document.getElementById('noticia-destacada-titulo');
    const bannerResumen = document.getElementById('noticia-destacada-resumen');
    const bannerFecha = document.getElementById('noticia-destacada-fecha');
    const feedContainer = document.getElementById('noticias-feed-list');

    if (bannerTitle) bannerTitle.textContent = 'Noticias y Comunicados Institucionales';
    if (bannerResumen) bannerResumen.textContent = message;
    if (bannerFecha) bannerFecha.textContent = 'Estado: Sin publicaciones activas';

    if (feedContainer) {
        feedContainer.innerHTML = `
            <div class="card" style="padding: 2.5rem; text-align: center; color: var(--text-muted);">
                <p>${message}</p>
            </div>
        `;
    }
}

function renderNoticiasYEventos(noticias, eventos) {
    const noticiasArray = Array.isArray(noticias) ? noticias : (noticias ? [noticias] : []);

    if (noticiasArray.length > 0) {
        const destacado = noticiasArray.find(n => n.es_destacado || n.esDestacado) || noticiasArray[0];

        const bannerTitle = document.getElementById('noticia-destacada-titulo');
        const bannerResumen = document.getElementById('noticia-destacada-resumen');
        const bannerFecha = document.getElementById('noticia-destacada-fecha');
        const bannerAutor = document.getElementById('noticia-destacada-autor');
        const bannerCategory = document.getElementById('noticia-destacada-categoria');

        if (bannerTitle) bannerTitle.textContent = destacado.titulo || 'Comunicado Oficial';
        if (bannerResumen) bannerResumen.textContent = destacado.resumen || destacado.contenido || 'Consulta la información más reciente de Recursos Humanos.';
        if (bannerFecha) bannerFecha.textContent = `Publicado: ${destacado.fecha_publicacion || destacado.fecha || 'Reciente'}`;
        if (bannerAutor) bannerAutor.textContent = destacado.autor || 'Dirección de Talento Humano';
        if (bannerCategory) bannerCategory.textContent = destacado.categoria || 'COMUNICADO PRINCIPAL • RECURSOS HUMANOS';

        const btnLeerDestacada = document.getElementById('btn-leer-destacada');
        if (btnLeerDestacada) {
            btnLeerDestacada.onclick = () => abrirModalLectura(destacado);
        }

        const listToRender = noticiasArray.length > 1 ? noticiasArray.filter(n => n !== destacado) : noticiasArray;

        const feedContainer = document.getElementById('noticias-feed-list');
        if (feedContainer) {
            feedContainer.innerHTML = listToRender.map(item => {
                const id = item.id_noticia || item.id || `not-${Math.random()}`;
                return `
                    <article class="card" style="padding: 1.6rem;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.6rem; flex-wrap: wrap; gap: 8px;">
                            <span class="badge badge-info" style="font-size: 0.75rem;">${item.categoria || 'Comunicado'}</span>
                            <span style="font-size: 0.8rem; color: var(--text-muted); font-family: monospace;">${item.fecha_publicacion || item.fecha || 'Reciente'}</span>
                        </div>
                        <h3 style="font-size: 1.2rem; color: var(--primary-dark); font-weight: 700; margin-bottom: 0.5rem; line-height: 1.3;">
                            ${item.titulo || ''}
                        </h3>
                        <p style="font-size: 0.92rem; color: var(--text-main); line-height: 1.55; margin-bottom: 1.2rem;">
                            ${item.resumen || item.contenido || ''}
                        </p>
                        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.82rem; color: var(--text-muted); flex-wrap: wrap; gap: 10px;">
                            <span style="font-weight: 500;">Por: <strong style="color: var(--primary-dark);">${item.autor || 'Recursos Humanos'}</strong></span>
                            
                            <div style="display: inline-flex; gap: 8px; align-items: center;">
                                <button type="button" class="btn btn-outline btn-sm btn-leer-noticia" data-id="${id}" style="font-size: 0.82rem; padding: 0.35rem 0.9rem;">
                                    Leer Comunicado
                                </button>
                                ${isHRorAdmin ? `
                                    <button type="button" class="btn btn-outline btn-sm btn-editar-noticia" data-id="${id}" style="font-size: 0.82rem; padding: 0.35rem 0.75rem;">
                                        ✏️ Editar
                                    </button>
                                    <button type="button" class="btn btn-outline btn-sm btn-eliminar-noticia" data-id="${id}" style="font-size: 0.82rem; padding: 0.35rem 0.75rem; color: #EF4444; border-color: #EF4444;">
                                        🗑️
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    </article>
                `;
            }).join('');
        }
    } else {
        renderEmptyState('Aún no hay comunicados registrados en el servidor.');
    }

    const eventosArray = Array.isArray(eventos) ? eventos : (eventos ? [eventos] : []);
    const eventosContainer = document.getElementById('eventos-list-container');
    if (eventosContainer) {
        if (eventosArray.length > 0) {
            eventosContainer.innerHTML = eventosArray.map(ev => {
                const dateStr = ev.fecha_evento || ev.fecha || '';
                const dateParts = dateStr.split('-');
                const day = dateParts[2] || '15';
                const monthNum = dateParts[1] ? parseInt(dateParts[1]) : 10;
                const months = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
                const monthLabel = months[monthNum - 1] || 'OCT';

                return `
                    <li style="display: flex; gap: 0.8rem; align-items: center;">
                        <div style="background-color: var(--primary-dark); color: #FFFFFF; font-weight: 700; font-size: 0.8rem; padding: 0.4rem 0.6rem; border-radius: 6px; text-align: center; min-width: 44px;">
                            ${day}<br><small style="font-size: 0.65rem; font-weight: 400;">${monthLabel}</small>
                        </div>
                        <div>
                            <strong style="font-size: 0.88rem; color: var(--primary-dark); display: block;">${ev.titulo || 'Evento'}</strong>
                            <span style="font-size: 0.78rem; color: var(--text-muted);">${ev.subtitulo || ev.tipo || ''}</span>
                        </div>
                    </li>
                `;
            }).join('');
        } else {
            eventosContainer.innerHTML = `<li style="font-size: 0.85rem; color: var(--text-muted);">Sin eventos agendados</li>`;
        }
    }

    bindNewsButtons();
}

function bindNewsButtons() {
    document.querySelectorAll('.btn-leer-noticia').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id');
            const item = noticiasCache.find(n => String(n.id_noticia || n.id) === String(id));
            if (item) abrirModalLectura(item);
        });
    });

    if (isHRorAdmin) {
        document.querySelectorAll('.btn-editar-noticia').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                const item = noticiasCache.find(n => String(n.id_noticia || n.id) === String(id));
                if (item) abrirModalNoticia(item);
            });
        });

        document.querySelectorAll('.btn-eliminar-noticia').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                const item = noticiasCache.find(n => String(n.id_noticia || n.id) === String(id));
                if (item) await ejecutarEliminarNoticia(item);
            });
        });
    }
}

function abrirModalLectura(item) {
    const modal = document.getElementById('modal-lectura-noticia');
    if (!modal) return;

    const catEl = document.getElementById('leer-noticia-categoria');
    const titEl = document.getElementById('leer-noticia-titulo');
    const metaEl = document.getElementById('leer-noticia-meta');
    const resEl = document.getElementById('leer-noticia-resumen');
    const contEl = document.getElementById('leer-noticia-contenido');

    if (catEl) catEl.textContent = item.categoria || 'COMUNICADO INSTITUCIONAL';
    if (titEl) titEl.textContent = item.titulo || 'Comunicado';
    if (metaEl) metaEl.textContent = `Por ${item.autor || 'Recursos Humanos'} • Fecha: ${item.fecha_publicacion || item.fecha || 'Reciente'}`;
    if (resEl) resEl.textContent = item.resumen || '';
    if (contEl) contEl.textContent = item.contenido || item.resumen || 'Sin contenido adicional.';

    modal.classList.add('show');
}

function abrirModalNoticia(item = null) {
    const modal = document.getElementById('modal-noticia');
    const modalTitle = document.getElementById('modal-noticia-titulo');
    const form = document.getElementById('form-noticia');
    if (!modal || !form) return;

    if (item) {
        if (modalTitle) modalTitle.textContent = 'Editar Comunicado Institucional';
        document.getElementById('noticia-id').value = item.id_noticia || item.id || '';
        document.getElementById('noticia-input-titulo').value = item.titulo || '';
        document.getElementById('noticia-input-categoria').value = item.categoria || 'Recursos Humanos';
        document.getElementById('noticia-input-autor').value = item.autor || 'Dirección de Talento Humano';
        document.getElementById('noticia-input-resumen').value = item.resumen || '';
        document.getElementById('noticia-input-contenido').value = item.contenido || '';
        document.getElementById('noticia-input-destacado').checked = !!(item.es_destacado || item.esDestacado);
    } else {
        if (modalTitle) modalTitle.textContent = 'Publicar Nuevo Comunicado';
        form.reset();
        document.getElementById('noticia-id').value = '';
        document.getElementById('noticia-input-autor').value = 'Dirección de Talento Humano';
    }

    modal.classList.add('show');
}

function setupModalsListeners(user) {
    // Modal Lectura
    const modalLectura = document.getElementById('modal-lectura-noticia');
    const btnCerrarLectura = document.getElementById('btn-cerrar-leer-noticia');
    const btnCerrarLecturaFooter = document.getElementById('btn-cerrar-lectura-footer');

    const cerrarLectura = () => {
        if (modalLectura) modalLectura.classList.remove('show');
    };
    if (btnCerrarLectura) btnCerrarLectura.addEventListener('click', cerrarLectura);
    if (btnCerrarLecturaFooter) btnCerrarLecturaFooter.addEventListener('click', cerrarLectura);
    if (modalLectura) {
        modalLectura.addEventListener('click', (e) => {
            if (e.target === modalLectura) cerrarLectura();
        });
    }

    // Modal Crear / Editar
    const modalNoticia = document.getElementById('modal-noticia');
    const btnCerrarNoticia = document.getElementById('btn-cerrar-modal-noticia');
    const btnCancelarNoticia = document.getElementById('btn-cancelar-modal-noticia');
    const formNoticia = document.getElementById('form-noticia');

    const cerrarForm = () => {
        if (modalNoticia) modalNoticia.classList.remove('show');
    };
    if (btnCerrarNoticia) btnCerrarNoticia.addEventListener('click', cerrarForm);
    if (btnCancelarNoticia) btnCancelarNoticia.addEventListener('click', cerrarForm);
    if (modalNoticia) {
        modalNoticia.addEventListener('click', (e) => {
            if (e.target === modalNoticia) cerrarForm();
        });
    }

    // Cerrar con Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            cerrarLectura();
            cerrarForm();
        }
    });

    if (formNoticia) {
        formNoticia.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('noticia-id').value;
            const titulo = document.getElementById('noticia-input-titulo').value.trim();
            const categoria = document.getElementById('noticia-input-categoria').value;
            const autor = document.getElementById('noticia-input-autor').value.trim();
            const resumen = document.getElementById('noticia-input-resumen').value.trim();
            const contenido = document.getElementById('noticia-input-contenido').value.trim();
            const esDestacado = document.getElementById('noticia-input-destacado').checked;

            const btnSubmit = document.getElementById('btn-guardar-noticia');
            if (btnSubmit) {
                btnSubmit.disabled = true;
                btnSubmit.textContent = 'Guardando...';
            }

            const payload = {
                titulo,
                categoria,
                autor,
                resumen,
                contenido,
                es_destacado: esDestacado,
                fecha_publicacion: new Date().toISOString().split('T')[0]
            };

            try {
                let res;
                if (id) {
                    res = await fetchWithAuth(`/noticias/${id}`, {
                        method: 'PUT',
                        body: JSON.stringify(payload)
                    });
                } else {
                    res = await fetchWithAuth('/noticias', {
                        method: 'POST',
                        body: JSON.stringify(payload)
                    });
                }

                if (res && res.ok) {
                    const savedData = await res.json().catch(() => ({}));
                    const newId = savedData.id || id || `not-${Date.now()}`;
                    payload.id = newId;
                    payload.id_noticia = newId;
                } else {
                    // Fallback optimista si el backend aún no añadió las rutas POST/PUT
                    const newId = id || `not-${Date.now()}`;
                    payload.id = newId;
                    payload.id_noticia = newId;
                }

                // Actualizar cache local
                if (id) {
                    const idx = noticiasCache.findIndex(n => String(n.id_noticia || n.id) === String(id));
                    if (idx !== -1) noticiasCache[idx] = { ...noticiasCache[idx], ...payload };
                } else {
                    if (payload.es_destacado) {
                        noticiasCache.unshift(payload);
                    } else {
                        noticiasCache.push(payload);
                    }
                }

                // Guardar en cache local persistente
                localStorage.setItem('noticias_custom_cache', JSON.stringify(noticiasCache));

                cerrarForm();
                renderNoticiasYEventos(noticiasCache, eventosCache);

                await showSuccess(
                    id ? '¡Comunicado Actualizado!' : '¡Comunicado Publicado con Éxito!',
                    `La publicación <strong>"${titulo}"</strong> ha sido guardada en el portal corporativo.`
                );
            } catch (err) {
                console.error('Error al guardar noticia:', err);
                await showError('Error al Publicar', 'Hubo un error al intentar guardar el comunicado.');
            } finally {
                if (btnSubmit) {
                    btnSubmit.disabled = false;
                    btnSubmit.textContent = 'Guardar y Publicar';
                }
            }
        });
    }
}

async function ejecutarEliminarNoticia(item) {
    const id = item.id_noticia || item.id;
    const confirmado = await showConfirm(
        '¿Eliminar Comunicado?',
        `¿Estás seguro de que deseas eliminar permanentemente el comunicado <strong>"${item.titulo}"</strong>? Esta acción no se puede deshacer.`,
        { confirmButtonText: 'Sí, Eliminar', cancelButtonText: 'Cancelar' }
    );

    if (!confirmado) return;

    try {
        const res = await fetchWithAuth(`/noticias/${id}`, {
            method: 'DELETE'
        });

        // Eliminar del array
        noticiasCache = noticiasCache.filter(n => String(n.id_noticia || n.id) !== String(id));
        localStorage.setItem('noticias_custom_cache', JSON.stringify(noticiasCache));

        renderNoticiasYEventos(noticiasCache, eventosCache);

        await showSuccess(
            'Comunicado Eliminado',
            `El comunicado <strong>"${item.titulo}"</strong> ha sido eliminado del portal.`
        );
    } catch (err) {
        console.error('Error al eliminar noticia:', err);
        await showError('Error al Eliminar', 'No fue posible eliminar el comunicado en este momento.');
    }
}
