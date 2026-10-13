import { initLayout } from './layout.ctrl.js';
import { fetchWithAuth } from '../config.js';

document.addEventListener('DOMContentLoaded', async () => {
    const sessionUser = initLayout('chatbot');
    if (!sessionUser) return;

    const adminSection = document.getElementById('admin-section');
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const btnSend = document.getElementById('btn-send');
    const btnUpload = document.getElementById('btn-upload');
    const btnReindex = document.getElementById('btn-reindex');
    const pdfUpload = document.getElementById('pdf-upload');
    const docsList = document.getElementById('docs-list');

    // ========== Opción B: comprobar si es de Recursos Humanos ==========
    let esRRHH = false;

    try {
        const response = await fetchWithAuth(`/perfil?empleado_id=${sessionUser.id}`);
        if (response.ok) {
            const profile = await response.json();
            const depto = (profile.departamento || '').toLowerCase().trim();
            esRRHH = depto === 'recursos humanos';
            console.log('Departamento del usuario:', profile.departamento, '→ esRRHH:', esRRHH);
        }
    } catch (err) {
        console.warn('No se pudo obtener el perfil para verificar departamento:', err);
    }

    // Mostrar u ocultar panel de administración
    if (esRRHH && adminSection) {
        adminSection.style.display = 'block';
        cargarListaDocumentos();
    }

    // ========== Chat ==========
    function agregarMensaje(texto, tipo) {
        const div = document.createElement('div');
        div.className = `message ${tipo}`;
        div.textContent = texto;
        chatMessages.appendChild(div);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    async function enviarPregunta() {
        const pregunta = chatInput.value.trim();
        if (!pregunta) return;

        agregarMensaje(pregunta, 'user');
        chatInput.value = '';
        btnSend.disabled = true;

        const loading = document.createElement('div');
        loading.className = 'message bot';
        loading.textContent = 'Buscando en los documentos...';
        chatMessages.appendChild(loading);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        try {
            // TODO: cambiar por la URL real de tu backend RAG
            const res = await fetch('http://localhost:8000/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: pregunta })
            });

            const data = await res.json();
            loading.remove();
            agregarMensaje(data.answer || data.respuesta || 'No se pudo obtener respuesta.', 'bot');
        } catch (err) {
            loading.remove();
            agregarMensaje('Error al contactar con el asistente. Inténtalo de nuevo más tarde.', 'bot');
            console.error(err);
        } finally {
            btnSend.disabled = false;
            chatInput.focus();
        }
    }

    btnSend.addEventListener('click', enviarPregunta);
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') enviarPregunta();
    });

    // ========== Administración (solo RRHH) ==========
    async function cargarListaDocumentos() {
        // TODO: endpoint real que liste los PDFs
        // Por ahora dejamos un placeholder
        if (docsList) {
            docsList.innerHTML = '<em>Los documentos cargados aparecerán aquí.</em>';
        }
    }

    if (btnUpload) {
        btnUpload.addEventListener('click', async () => {
            if (!pdfUpload.files.length) {
                alert('Selecciona al menos un PDF');
                return;
            }

            const formData = new FormData();
            for (const file of pdfUpload.files) {
                formData.append('files', file);
            }

            try {
                btnUpload.disabled = true;
                btnUpload.textContent = 'Subiendo...';

                // TODO: endpoint real de subida
                const res = await fetch('http://localhost:8000/upload', {
                    method: 'POST',
                    body: formData
                });

                if (res.ok) {
                    alert('Documentos subidos correctamente');
                    pdfUpload.value = '';
                    cargarListaDocumentos();
                } else {
                    alert('Error al subir los documentos');
                }
            } catch (err) {
                console.error(err);
                alert('Error de conexión al subir documentos');
            } finally {
                btnUpload.disabled = false;
                btnUpload.textContent = 'Subir documentos';
            }
        });
    }

    if (btnReindex) {
        btnReindex.addEventListener('click', async () => {
            try {
                btnReindex.disabled = true;
                btnReindex.textContent = 'Actualizando...';

                const res = await fetch('http://localhost:8000/reindex', { method: 'POST' });
                if (res.ok) {
                    alert('Base de conocimiento actualizada correctamente');
                } else {
                    alert('Error al actualizar la base de conocimiento');
                }
            } catch (err) {
                console.error(err);
                alert('Error de conexión');
            } finally {
                btnReindex.disabled = false;
                btnReindex.textContent = 'Actualizar base de conocimiento';
            }
        });
    }
});
