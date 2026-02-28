(function (w) {
  if (w.Launcher) return;
  const Launcher = ({ isOpen, onClose, onAppSelect, settings: externalSettings }) => {
    const registryIds = (w.AppRegistry && w.AppRegistry.list && w.AppRegistry.list()) || [];
    const seen = new Set();
    const apps = [];

    // Helper to prettify a fallback name
    const prettyName = (id) => {
      if (!id) return '';
      const s = String(id);
      if (s === s.toLowerCase()) return s.charAt(0).toUpperCase() + s.slice(1);
      return s;
    };

    registryIds.forEach(id => {
      try {
        const key = String(id);
        const lower = key.toLowerCase();
        if (seen.has(lower)) return;
        seen.add(lower);
        apps.push({ id: key, name: prettyName(key) });
      } catch (e) {}
    });

    try {
      Object.keys(window).forEach(k => {
        if (!k || typeof k !== 'string') return;
        if (!k.endsWith('App')) return;
        try {
          const comp = window[k];
          if (typeof comp !== 'function') return;
          const base = k.slice(0, -3); // remove 'App'
          const candidateId = String(base);
          const lower = candidateId.toLowerCase();
          if (seen.has(lower)) return;
          seen.add(lower);
          apps.push({ id: candidateId, name: prettyName(candidateId) });
        } catch (e) {}
      });
    } catch (e) {}

    const allowed = ['settings','notes','eaglar','calendar','clock','filemanager'];
    const finalApps = [];
    const byLower = {};
    apps.forEach(a => { try { byLower[String(a.id).toLowerCase()] = a; } catch(e){} });
    allowed.forEach(k => {
      if (byLower[k]) {
        finalApps.push(byLower[k]);
      } else {
        finalApps.push({ id: k, name: prettyName(k) });
      }
    });

    try {
      const sel = localStorage.getItem('glex-setup-defaultApps');
      if (sel) {
        const selected = JSON.parse(sel);
        const map = { 'Files': 'filemanager', 'Calendar': 'calendar', 'Notes': 'notes' };
        const allowed = new Set(selected.map(s => (map[s] || s).toString().toLowerCase()));
        const filtered = apps.filter(a => allowed.has((a.id || '').toString().toLowerCase()));
        if (filtered && filtered.length > 0) apps = filtered;
      }
    } catch (e) {}

    

    let settings = externalSettings || {};
    if (!settings || Object.keys(settings).length === 0) {
      try { settings = JSON.parse(localStorage.getItem('seq-pro-settings') || '{}') || {}; } catch (e) { settings = {}; }
    }
    // glassMorphism removed fuck that
    const reduceMotion = !!settings.reduceMotion;

    const overlayStyle = {
      position: 'fixed',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      pointerEvents: 'auto'
    };

    const containerStyle = {
      minWidth: '360px',
      maxWidth: 'min(92vw, 980px)',
      padding: '14px',
      borderRadius: '10px',
      color: 'var(--text-main, #fff)',
      boxShadow: '0 30px 80px rgba(0,0,0,0.6)'
    };

    containerStyle.background = 'var(--win-bg, rgba(18,18,18,0.95))';
    containerStyle.border = '1px solid var(--border, rgba(255,255,255,0.06))';
    containerStyle.animation = reduceMotion ? 'none' : 'glexSlideIn 220ms cubic-bezier(.2,.9,.3,1) both';

    try {
      const layout = localStorage.getItem('desktopLayout') || (externalSettings && externalSettings.desktopLayout) || null;
      if (layout === 'win11') {
        containerStyle.minWidth = '520px';
        containerStyle.maxWidth = 'min(92vw, 1100px)';
        containerStyle.padding = '18px';
        tileBase.borderRadius = 12;
        tileBase.background = 'linear-gradient(180deg, rgba(255,255,255,0.02), rgba(0,0,0,0.02))';
      }
    } catch (e) {}

    const gridStyle = {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
      gap: '12px',
    };

    const tileBase = {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '8px',
      padding: '10px',
      borderRadius: '10px',
      cursor: 'pointer',
      border: '1px solid var(--border, rgba(255,255,255,0.06))',
      background: 'var(--tile-bg, transparent)',
      transition: reduceMotion ? 'none' : 'transform 220ms cubic-bezier(.2,.9,.3,1), box-shadow 220ms ease',
    };

    const iconStyle = { width: 48, height: 48, borderRadius: 10, objectFit: 'cover', display: 'block' };

    const resolveIcon = (app) => {
      if (!app) return null;
      if (typeof app === 'string') {
        return `icons/${String(app).toLowerCase()}.png`;
      }
      if (app.icon && typeof app.icon === 'string') return app.icon;
      if (app.id) return `icons/${String(app.id).toLowerCase()}.png`;
      return null;
    };

    const portalId = 'glex-launcher-root';
    const mountPortal = (content) => {
      let root = document.getElementById(portalId);
      if (!root) {
        root = document.createElement('div');
        root.id = portalId;
        document.body.appendChild(root);
      }
      try { window.render(content, root); } catch (e) { console.warn('mountPortal render failed', e); }
    };

    const unmountPortal = () => {
      const root = document.getElementById(portalId);
      if (root) {
        try { window.render(null, root); } catch (e) {}
        try { root.parentNode && root.parentNode.removeChild(root); } catch (e) {}
      }
    };

    if (isOpen) {
      // attach a single Escape handler and store it on window so we can remove it reliably and so the system doesnt crash out
      if (!window.__glex_launcher_esc) {
        window.__glex_launcher_esc = (ev) => {
          if (ev.key === 'Escape') {
            try { console.log('glex: Escape pressed - dispatching glex-launcher-close'); } catch(e){}
            try { window.dispatchEvent(new CustomEvent('glex-launcher-close')); } catch(e){}
          }
        };
        document.addEventListener('keydown', window.__glex_launcher_esc);
      }

      mountPortal(html`
        <div style=${overlayStyle} onclick=${() => { try{ console.log('glex: overlay clicked'); }catch(e){} try{ onClose && onClose(); } catch(e){} try{ window.dispatchEvent(new CustomEvent('glex-launcher-close')); } catch(e){} }}>
          <div onclick=${(e)=>{ e.stopPropagation(); }} style=${Object.assign({}, containerStyle, { background: 'var(--win-bg, rgba(18,18,18,0.95))', border: '1px solid var(--border, rgba(255,255,255,0.06))', animation: reduceMotion ? 'none' : 'glexSlideIn 220ms cubic-bezier(.2,.9,.3,1) both' })} role="dialog" aria-label="Launcher">
            <style>${`
              @keyframes glexSlideIn { from { opacity: 0; transform: translateY(8px) scale(0.98); } to { opacity:1; transform: translateY(0) scale(1); } }
              @keyframes glexTilePop { from { transform: scale(0.96); opacity: 0; } to { transform: scale(1); opacity:1; } }
              .glex-launcher-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:10px }
              .glex-launcher-title { font-weight:700; font-size:16px }
              .glex-launcher-close { background:transparent; border:none; color:inherit; cursor:pointer }
              .glex-launcher-grid button:focus { outline: 2px solid rgba(0,0,0,0.12); }
            `}</style>

                <div class="glex-launcher-header">
                  <div class="glex-launcher-title">All Apps</div>
                  <div>
                    <button class="glex-launcher-close" onclick=${() => { try{ console.log('glex: close button clicked'); }catch(e){} try{ onClose && onClose(); } catch(e){} try{ window.dispatchEvent(new CustomEvent('glex-launcher-close')); } catch(e){} }}>✕</button>
                  </div>
                </div>

            <div class="glex-launcher-grid" style=${gridStyle}>
              ${apps.map((a, idx) => {
                const id = (typeof a === 'string') ? a : (a.id || a.name || '').toString();
                const label = (typeof a === 'string') ? a : (a.name || a.id || a);
                const emoji = (typeof a === 'object' && a.emoji) ? a.emoji : null;
                const icon = resolveIcon(a);
                return html`
                  <button
                    key=${id + '_' + idx}
                    onclick=${() => { try { onAppSelect && onAppSelect(id); } catch(e){ try{ onAppSelect && onAppSelect(a); }catch(e){} } finally { onClose && onClose(); } }}
                    onmouseover=${(e) => { if (!reduceMotion) e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)'; }}
                    onmouseout=${(e) => { if (!reduceMotion) e.currentTarget.style.transform = 'none'; }}
                    style=${Object.assign({}, tileBase, { animation: reduceMotion ? 'none' : `glexTilePop 260ms ease ${idx*22}ms both` })}>
                    ${icon ? html`<img src=${icon} alt=${label} style=${iconStyle} onerror=${(e)=>{ e.target.style.display='none'; }} />` : (emoji ? html`<div style=${{ fontSize:28, lineHeight:'48px' }}>${emoji}</div>` : html`<div style=${Object.assign({}, iconStyle, { display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(255,255,255,0.03)', fontSize:18 }) }>${label[0] || '?'}</div>`) }
                    <div style=${{ fontSize:13, opacity:0.95, textAlign:'center', maxWidth:110, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>${label}</div>
                  </button>
                `;
              })}
            </div>
          </div>
        </div>
      `);
      return html``;
    }

    unmountPortal();
    try { if (window.__glex_launcher_esc) { document.removeEventListener('keydown', window.__glex_launcher_esc); delete window.__glex_launcher_esc; } } catch (e) {}
    return html``;
  };
  w.Launcher = Launcher;
})(window);
