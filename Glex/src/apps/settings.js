// Settings App - trimmed and polished for release trust

const SettingsApp = ({ settings, setSettings }) => {
    const update = (k, v) => setSettings({ ...settings, [k]: v });

    useEffect(() => {
        if (settings.fontSize) document.documentElement.style.fontSize = settings.fontSize + 'px';
        document.documentElement.style.setProperty('--win-padding', settings.density === 'compact' ? '8px' : '20px');
    }, [settings.fontSize, settings.density]);

    useEffect(() => {
        const handler = (e) => {
            const a = e.detail && e.detail.action;
            if (!a) return;
            if (a === 'toggle-dark') update('dark', !settings.dark);
            if (a === 'toggle-accent' && e.detail.payload) update('accent', e.detail.payload);
        };
        window.addEventListener('settings-action', handler);
        return () => window.removeEventListener('settings-action', handler);
    }, [settings]);

    return html`
        <div class="app-container">
            <div class="editor-view" style="padding:28px; max-width:980px; margin:0 auto;">
                <h1 style="margin-bottom:6px">Settings</h1>

                <div class="card" style="margin-bottom:14px;">
                    <div style="font-weight:700;margin-bottom:8px;">General</div>
                    <div class="control-row"><label>Font Size</label><input type="range" min="12" max="20" value=${settings.fontSize || 14} onInput=${e => update('fontSize', Number(e.target.value))} /></div>
                    <div class="control-row"><label>Display Density</label><select value=${settings.density || 'comfortable'} onChange=${e => update('density', e.target.value)}><option value="comfortable">Comfortable</option><option value="compact">Compact</option></select></div>
                    <div class="control-row"><label>Reduce Motion</label><input type="checkbox" checked=${settings.reduceMotion || false} onChange=${e => update('reduceMotion', e.target.checked)} /></div>
                    <div class="control-row" style="align-items:flex-start;gap:12px;"><label>Optimization Mode</label>
                        <div style="display:flex;flex-direction:column;gap:6px;">
                            <label style="font-weight:600;"><input type="radio" name="optimization" checked=${(settings.optimization || 'high') === 'low'} onChange=${() => { update('optimization', 'low'); window.dispatchEvent(new CustomEvent('settings-action', { detail: { action: 'optimization-changed', payload: 'low' } })); }} /> Super Low (save CPU / throttle)</label>
                            <label style="font-weight:600;"><input type="radio" name="optimization" checked=${(settings.optimization || 'high') === 'medium'} onChange=${() => { update('optimization', 'medium'); window.dispatchEvent(new CustomEvent('settings-action', { detail: { action: 'optimization-changed', payload: 'medium' } })); }} /> Medium (balanced)</label>
                            <label style="font-weight:600;"><input type="radio" name="optimization" checked=${(settings.optimization || 'high') === 'high'} onChange=${() => { update('optimization', 'high'); window.dispatchEvent(new CustomEvent('settings-action', { detail: { action: 'optimization-changed', payload: 'high' } })); }} /> High (full features)</label>
                        </div>
                    </div>
                </div>

                <div class="card" style="margin-bottom:14px;">
                    <div style="font-weight:700;margin-bottom:8px;">Appearance</div>
                    <div class="control-row"><label>Accent Color</label><input type="color" value=${settings.accent} onChange=${e => { update('accent', e.target.value); window.dispatchEvent(new CustomEvent('settings-action', { detail: { action: 'set-accent', payload: e.target.value } })); }} /></div>
                    <div class="control-row"><label>Animations</label><select value=${settings.animations === false ? 'off' : 'on'} onChange=${e => update('animations', e.target.value === 'on')}><option value="on">On</option><option value="off">Off</option></select></div>
                </div>

                <div class="card" style="margin-bottom:14px;">
                    <div style="font-weight:700;margin-bottom:8px;">Desktop Layout</div>
                    <div style="display:flex;flex-direction:column;gap:10px;">
                        <label style="display:flex;gap:12px;align-items:flex-start;">
                            <input type="radio" name="desktopLayout" checked=${settings.desktopLayout === 'win11'} onChange=${()=>{ update('desktopLayout','win11'); localStorage.setItem('desktopLayout','win11'); window.dispatchEvent(new CustomEvent('desktop-layout-changed',{detail:{layout:'win11'}})); }} />
                            <div>
                                <div style="font-weight:700;">Windows-style</div>
                                <div style="opacity:0.8;font-size:13px;">Center-aligned launcher, prominent titlebars, and modern window chrome.</div>
                            </div>
                        </label>

                        <label style="display:flex;gap:12px;align-items:flex-start;">
                            <input type="radio" name="desktopLayout" checked=${settings.desktopLayout === 'macdock'} onChange=${()=>{ update('desktopLayout','macdock'); localStorage.setItem('desktopLayout','macdock'); window.dispatchEvent(new CustomEvent('desktop-layout-changed',{detail:{layout:'macdock'}})); }} />
                            <div>
                                <div style="font-weight:700;">macOS Dock-style</div>
                                <div style="opacity:0.8;font-size:13px;">Persistent dock, minimal titlebars, focus on dock-driven app launching.</div>
                            </div>
                        </label>
                    </div>
                </div>

                <div class="card">
                    <div style="font-weight:700;margin-bottom:8px;">About</div>
                    <div style="display:grid;grid-template-columns:120px 1fr;gap:8px 12px;margin-top:6px;align-items:start;font-size:13px;color:#cfcfcf;">
                        <div style="opacity:0.7">OS</div><div>Sequoia OS</div>
                        <div style="opacity:0.7">Host</div><div>127.0.0.1</div>
                        <div style="opacity:0.7">Kernel / UA</div><div style="color:#bfbfbf;font-size:12px;word-break:break-word;white-space:normal;max-width:720px;">${navigator.userAgent}</div>
                        <div style="opacity:0.7">Uptime</div><div>${(() => { const s = localStorage.getItem('seq-session-time'); const ms = s ? (Date.now() - Number(s)) : Math.floor(performance.now()); const sec = Math.floor(ms/1000); const d=Math.floor(sec/86400); const h=Math.floor((sec%86400)/3600); const m=Math.floor((sec%3600)/60); return (d?d+'d ':'') + (h?h+'h ':'') + (m?m+'m':'0m'); })()}</div>
                        <div style="opacity:0.7">Packages</div><div>${(window.getAllApps && typeof window.getAllApps === 'function') ? window.getAllApps().length : (window._glex_apps ? window._glex_apps.length : 'N/A')}</div>
                        <div style="opacity:0.7">Resolution</div><div>${window.screen ? (window.screen.width+'×'+window.screen.height) : 'N/A'}</div>
                        <div style="opacity:0.7">CPU</div><div>${navigator.hardwareConcurrency || 'N/A'}</div>
                        <div style="opacity:0.7">Memory</div><div>${navigator.deviceMemory ? navigator.deviceMemory + ' GB' : 'N/A'}</div>
                        <div style="opacity:0.7">GPU</div><div>${(() => { try{ const c = document.createElement('canvas'); const gl = c.getContext('webgl') || c.getContext('experimental-webgl'); if (!gl) return 'Unknown'; const dbg = gl.getExtension('WEBGL_debug_renderer_info'); return dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'WebGL'; }catch(e){return 'Unknown'; } })()}</div>
                        <div style="opacity:0.7">User</div><div>${localStorage.getItem('seq-session-user') || 'admin'}</div>
                    </div>
                </div>
            </div>
        </div>
    `;
};

AppRegistry.register('settings', SettingsApp);
window.SettingsApp = SettingsApp;

SettingsApp.titlebarButtons = ({ appId } = {}) => html`<div style="display:flex;gap:8px;align-items:center;">
    <button title="Export settings" onclick=${() => window.dispatchEvent(new CustomEvent('settings-action', { detail: { action: 'export' } }))} style="background:transparent;border:1px solid var(--border);color:var(--text-main);padding:6px 8px;border-radius:8px;">Export</button>
    <button title="Reset settings" onclick=${() => window.dispatchEvent(new CustomEvent('settings-action', { detail: { action: 'reset' } }))} style="background:transparent;border:1px solid var(--border);color:var(--text-main);padding:6px 8px;border-radius:8px;">Reset</button>
    <button title="Toggle dark" onclick=${() => window.dispatchEvent(new CustomEvent('settings-action', { detail: { action: 'toggle-dark' } }))} style="background:transparent;border:1px solid var(--border);color:var(--text-main);padding:6px 8px;border-radius:8px;">Dark</button>
</div>`;
