// System Notficatin Thingy
const NotificationManager = (() => {
    const notifications = [];
    const listeners = new Map(); // event -> Set of handlers
    const MAX_VISIBLE = 6;

    let notificationContainer = null;
    let _pendingRender = [];
    function _injectStyles() {
        if (document.getElementById('glex-notification-styles')) return;
        const s = document.createElement('style');
        s.id = 'glex-notification-styles';
        s.textContent = `
            :root { --notif-bg: var(--win-bg, rgba(18,18,22,0.9)); --notif-border: var(--border, rgba(255,255,255,0.06)); --notif-accent: var(--accent, #007aff); }
            #notification-container { position: fixed; right: 12px; top: 12px; display:flex; flex-direction:column; gap:12px; z-index:12000; pointer-events: none; }
            #notification-container .notification { pointer-events: auto; min-width:300px; max-width:420px; background: var(--notif-bg); color: var(--text-main, #fff); border: 1px solid var(--notif-border); padding:12px; border-radius:12px; box-shadow: 0 12px 40px rgba(0,0,0,0.6); display:flex; gap:12px; align-items:flex-start; transform-origin:100% 0%; animation: notifIn 260ms cubic-bezier(.2,.9,.3,1); }
            @keyframes notifIn { from { opacity:0; transform: translateY(-8px) scale(0.99); } to { opacity:1; transform: translateY(0) scale(1); } }
            #notification-container .notification.header-compact { padding:10px; }
            #notification-container .notification .notification-icon { width:44px; height:44px; flex:0 0 44px; border-radius:10px; overflow:hidden; background:linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01)); display:flex; align-items:center; justify-content:center; }
            #notification-container .notification .notification-icon img { width:100%; height:100%; object-fit:cover; }
            #notification-container .notification .notification-main { flex:1; display:flex; flex-direction:column; gap:6px; }
            #notification-container .notification .notification-header { display:flex; align-items:center; gap:8px; justify-content:space-between; }
            #notification-container .notification .notification-title { font-weight:700; font-size:13px; color:var(--text-main, #eef); }
            #notification-container .notification .notification-meta { font-size:11px; color:rgba(255,255,255,0.6); }
            #notification-container .notification .notification-body { font-size:13px; color:var(--text-main, #fff); line-height:1.3; }
            #notification-container .notification .notification-actions { display:flex; gap:8px; margin-top:6px; }
            #notification-container .notification .notification-actions button { background:transparent; border:1px solid rgba(255,255,255,0.06); color:inherit; padding:6px 10px; border-radius:8px; cursor:pointer; font-size:13px; }
            #notification-container .notification .notification-close { background:transparent; border:none; color:rgba(255,255,255,0.6); font-size:16px; cursor:pointer; margin-left:8px; }
            #notification-container .notification .notif-progress { width:100%; height:6px; background:rgba(255,255,255,0.03); border-radius:6px; overflow:hidden; margin-top:8px; }
            #notification-container .notification .notif-progress > i { display:block; height:100%; width:0%; background: linear-gradient(90deg, var(--notif-accent), rgba(255,255,255,0.12)); transition: width 300ms linear; }
            #notification-container .notification[data-level="error"] { border-color: rgba(255,80,80,0.9); }
            #notification-container .notification[data-level="success"] { border-color: rgba(80,255,160,0.9); }
            #notification-container .notification:focus { outline: 2px solid rgba(0,0,0,0.12); }
        `;
        try { document.head.appendChild(s); } catch (e) { /* ignore */ }
    }

    function _initContainer() {
        if (notificationContainer) return;
        _injectStyles();
        notificationContainer = document.getElementById('notification-container');
        if (!notificationContainer) {
            try {
                notificationContainer = document.createElement('div');
                notificationContainer.id = 'notification-container';
                if (document.body) document.body.appendChild(notificationContainer);
                else document.documentElement.appendChild(notificationContainer);
            } catch (e) {
                notificationContainer = document.createElement('div');
                notificationContainer.id = 'notification-container';
            }
        }
        if (_pendingRender && _pendingRender.length) {
            _pendingRender.forEach(item => {
                try { notificationContainer.appendChild(_createElement(item)); } catch (e) {}
            });
            _pendingRender = [];
        }
    }

    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', _initContainer, { once: true });
    } else {
        _initContainer();
    }

    function _emit(event, detail) {
        const set = listeners.get(event);
        if (set) set.forEach(fn => { try { fn(detail); } catch (e) { console.warn('notification listener error', e); } });
    }

    function on(event, handler) {
        if (!listeners.has(event)) listeners.set(event, new Set());
        listeners.get(event).add(handler);
        return () => off(event, handler);
    }

    function off(event, handler) {
        const set = listeners.get(event);
        if (!set) return;
        set.delete(handler);
    }

    function _persist() {
        try { localStorage.setItem('glex.notifications', JSON.stringify(notifications.map(n => ({ id: n.id, title: n.title, message: n.message, appId: n.appId, category: n.category, timestamp: n.timestamp })))) } catch (e) {}
    }

    function _createElement(item) {
        const { id, title, message, icon, actions = [], category, appId, timestamp, level } = item;
        const time = timestamp ? new Date(timestamp) : new Date();
        const timeLabel = time.toLocaleTimeString();
        const el = document.createElement('div');
        el.className = `notification ${category || ''}`.trim();
        const iconHtml = icon ? `<img src="${icon}" alt="${title||'icon'}">` : (appId ? `<img src="icons/${appId}.png" alt="${title||'icon'}" onerror="this.style.display='none';this.parentNode.style.background='linear-gradient(180deg,var(--notif-accent),rgba(0,0,0,0.06))'">` : `<div style="width:100%;height:100%;background:linear-gradient(180deg,var(--notif-accent),rgba(0,0,0,0.06));"></div>`);
        el.innerHTML = `
            <div class="notification-icon">${iconHtml}</div>
            <div class="notification-main">
                <div class="notification-header">
                    <div style="display:flex;gap:8px;align-items:center;">
                        <div class="notification-title">${title || ''}</div>
                        <div class="notification-meta">${appId ? String(appId) : ''}</div>
                    </div>
                    <div style="display:flex;align-items:center;gap:8px;"><div class="notification-meta">${timeLabel}</div><button class="notification-close" aria-label="Dismiss notification">&times;</button></div>
                </div>
                <div class="notification-body">${message || ''}</div>
                ${actions && actions.length ? `<div class="notification-actions">${actions.map((a,i)=>`<button data-action-index="${i}">${a.label}</button>`).join('')}</div>` : ''}
                <div class="notif-progress" aria-hidden="true"><i style="width:0%"></i></div>
            </div>
        `;

        el.dataset.id = id;
        el.dataset.appId = appId || '';

        el.addEventListener('click', (e) => {
            // ignore clicks on action buttons or close that crashed
            const idx = e.target && e.target.getAttribute && e.target.getAttribute('data-action-index');
            if (idx !== null) return; // handled separately
            if (e.target.classList.contains('notification-close')) return;
            _emit('click', { id, appId: item.appId, item });
        });

        const closeBtn = el.querySelector('.notification-close');
        if (closeBtn) closeBtn.addEventListener('click', (ev) => { ev.stopPropagation(); dismiss(id); _emit('dismiss', { id, appId: item.appId }); });

        actions.forEach((action, i) => {
            const btn = el.querySelector(`[data-action-index="${i}"]`);
            if (!btn) return;
            btn.addEventListener('click', (ev) => {
                ev.stopPropagation();
                _emit('action', { id, appId: item.appId, action: action, index: i });
                try { if (typeof action.callback === 'function') action.callback({ id, appId: item.appId }); } catch (e) { console.warn('notification action callback', e); }
            });
        });

        return el;
    }

    function getNotifications() { return notifications.slice(); }

    function notify({ title, message, icon, timeout = 5000, actions = [], category = 'general', appId = null, persistent = false }) {
        const notificationId = Date.now() + Math.floor(Math.random() * 1000);
        const item = { id: notificationId, title, message, icon, actions, category, appId, timestamp: Date.now(), persistent: !!persistent };

        // keep array please
        notifications.push(item);
        _persist();

        // ensure container exists; if not, buffer for later, cuz fuck u
        _initContainer();
        if (!notificationContainer) {
            try { console.warn('NotificationCenter: container not ready, buffering notification', item); } catch (e) {}
            _pendingRender.push(item);
        } else {
            // render
            const el = _createElement(item);
            try { notificationContainer.appendChild(el); } catch (e) { console.warn('NotificationCenter: append failed', e); }
        }

        // limit visible notifications it laggy fr
        try {
            while (notificationContainer && notificationContainer.children.length > MAX_VISIBLE) {
                const first = notificationContainer.children[0];
                if (first) { const id = Number(first.dataset.id); dismiss(id); }
                else break;
            }
        } catch (e) { /* ignore */ }

        // auto-dismiss
        if (timeout && !item.persistent) {
            setTimeout(() => dismiss(notificationId), timeout);
        }

        _emit('show', { id: notificationId, appId, item });
        return notificationId;
    }

    function dismiss(notificationId) {
        const idx = notifications.findIndex(n => n.id === notificationId);
        if (idx === -1) return false;
        const n = notifications[idx];
        // remove element mhm
        const el = notificationContainer.querySelector(`[data-id="${notificationId}"]`);
        if (el) el.remove();
        notifications.splice(idx, 1);
        _persist();
        _emit('dismiss', { id: notificationId, appId: n.appId });
        return true;
    }

    function dismissByApp(appId) {
        const ids = notifications.filter(n => n.appId === appId).map(n => n.id);
        ids.forEach(id => dismiss(id));
    }

    function update(notificationId, patch) {
        const idx = notifications.findIndex(n => n.id === notificationId);
        if (idx === -1) return false;
        const n = notifications[idx];
        Object.assign(n, patch);
        const el = notificationContainer && notificationContainer.querySelector ? notificationContainer.querySelector(`[data-id="${notificationId}"]`) : null;
        if (!el) return true;
        if (patch.title) { const t = el.querySelector('.notification-title'); if (t) t.textContent = patch.title; }
        if (patch.message) { const b = el.querySelector('.notification-body'); if (b) b.innerHTML = patch.message; }
        if (typeof patch.progress === 'number') { const bar = el.querySelector('.notif-progress > i'); if (bar) bar.style.width = Math.max(0, Math.min(100, patch.progress)) + '%'; }
        if (patch.icon) { const ic = el.querySelector('.notification-icon'); if (ic) ic.innerHTML = `<img src="${patch.icon}" alt="icon">`; }
        return true;
    }

    function clear() { getNotifications().forEach(n => dismiss(n.id)); }

    function requestPermission() {
        // internal system — always granted; keep API for apps so if we want to add real permissions later we can, also some apps might call this to check if permission is granted so good to return a consistent value
        return Promise.resolve('granted');
    }

    // restore persistent notifications (do not auto-show if outdated)
    (function _restore() {
        try {
            const raw = localStorage.getItem('glex.notifications');
            if (!raw) return;
            const arr = JSON.parse(raw);
            if (!Array.isArray(arr)) return;
            arr.forEach(a => {
                const item = { id: a.id || Date.now(), title: a.title, message: a.message, appId: a.appId, category: a.category, timestamp: a.timestamp || Date.now(), persistent: true };
                notifications.push(item);
                // if container ready append, else buffer for later
                if (notificationContainer) {
                    try { notificationContainer.appendChild(_createElement(item)); } catch (e) {}
                } else {
                    _pendingRender.push(item);
                }
            });
        } catch (e) { /* ignore */ }
    })();

    // expose a lightweight badge counter
    function getCount() { return notifications.length; }

    // attach to window for apps that don't import modules
    const api = { notify, dismiss, dismissByApp, clear, getNotifications, requestPermission, on, off, getCount };
    try { window.NotificationCenter = api; } catch (e) {}

    return api;
})();