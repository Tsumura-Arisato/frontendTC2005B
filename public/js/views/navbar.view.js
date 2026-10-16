function resolveLocalAvatar(avatarStr, identifier) {
    if (avatarStr && typeof avatarStr === 'string') {
        if (avatarStr.includes('default-user')) {
            return '/assets/default-user.png';
        }
        if (avatarStr.includes('user-profile')) {
            return '/assets/user-profile.jpg';
        }
    }
    const str = String(identifier || '').toLowerCase();
    if (str.includes('4092') || str.includes('maria') || str.includes('maría')) {
        return '/assets/default-user.png';
    }
    if (str.includes('4091') || str.includes('juan')) {
        return '/assets/user-profile.jpg';
    }
    return '/assets/default-user.png';
}

export function renderNavbar(user) {
    let avatarSrc = '/assets/default-user.png';
    let userName = 'Colaborador';
    let userRole = 'Portal de Colaborador';

    if (user) {
        avatarSrc = resolveLocalAvatar(user.avatar || user.foto, user.id || user.nombre || user.name || user.email);
        userName = user.nombre || user.name || user.username || 'Colaborador';
        const numNomina = user.no_empleado || user.id_empleado || user.id || '';
        const rolTexto = user.puesto || user.rol || user.role || 'Colaborador';
        userRole = numNomina ? `Nómina: #${numNomina} • ${rolTexto}` : rolTexto;
    }

    return `
    <nav class="top-navbar">
      <div style="display: flex; align-items: center; gap: 1rem;">
        <button class="btn-menu-mobile" id="btn-menu" type="button" aria-label="Abrir menú">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
        </button>
        <div class="mobile-logo">
          <h2 style="color: var(--primary-dark); font-size: 1.1rem; display: flex; align-items: center; gap: 8px; margin-bottom: 0;">
            <span style="background: var(--primary-dark); color: white; padding: 4px; border-radius: 6px; display: flex;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.5 19c2.5 0 4.5-2 4.5-4.5a4.5 4.5 0 0 0-4-4.47A7 7 0 0 0 4 12.5c0 3.6 2.9 6.5 6.5 6.5h7z"></path></svg>
            </span>
            ESLABÓN
          </h2>
        </div>
      </div>

      <div class="header-actions">
        
        <button class="btn-icon" id="btn-theme-toggle" type="button" aria-label="Cambiar tema modo oscuro" title="Cambiar tema (Modo Oscuro / Claro)" style="display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 50%; transition: background-color 0.2s;">
          <svg id="theme-toggle-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--primary-dark)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
          </svg>
        </button>

        <div class="dropdown">
          <button class="btn-icon" id="btn-notifications" type="button" aria-label="Notificaciones">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary-dark)" stroke-width="2" stroke-linecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
            <span class="badge-dot"></span>
          </button>
          <div class="dropdown-menu" id="dropdown-notifications">
            <div class="dropdown-header">Notificaciones (2)</div>
            <a href="/pages/solicitudes.html" class="dropdown-item">
              <span class="notif-title"> Solicitud de vacaciones aprobada</span>
              <span class="notif-time">Hoy, 09:30 AM</span>
            </a>
            <a href="/pages/nomina.html" class="dropdown-item">
              <span class="notif-title"> Nuevo recibo de nómina (Q2 Ago) </span>
              <span class="notif-time">Ayer, 03:15 PM</span>
            </a>
          </div>
        </div>

        <div class="user-profile">
          <div class="user-info">
            <span class="user-name" id="user-display-name" style="font-size: 1.1rem; font-weight: 700;">${userName}</span>
            <span class="user-role" id="user-display-role" style="font-size: 0.8rem;">${userRole}</span>
          </div>
          <img id="user-display-avatar" src="${avatarSrc}" onerror="this.onerror=null; this.src='/assets/default-user.png';" alt="Foto de perfil de ${userName}" class="avatar">
        </div>
      </div>
    </nav>
  `;
}