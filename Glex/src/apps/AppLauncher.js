
const { html, useState, useEffect } = window.htmPreact || window;
const Launcher = ({ isOpen=false, onClose=()=>{}, onAppSelect=()=>{} } = {}) => {
  const [opt, setOpt] = useState(() => (typeof window.PerformanceManager !== 'undefined' ? window.PerformanceManager.getLevel() : 'high'));

  useEffect(() => {
    if (typeof window.PerformanceManager === 'undefined') return;
    const unsubscribe = window.PerformanceManager.subscribe((level, config) => {
      setOpt(level);
    });
    return unsubscribe;
  }, []);

  if (!isOpen) return html``;

  if (opt === 'low') {
    return html`<div style="position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:12000;">
      <div style="background:rgba(18,18,20,0.98);padding:16px;border-radius:8px;color:white;min-width:320px;box-shadow:none;">
        <div style="font-weight:700;margin-bottom:8px;">Launcher — Power Saver</div>
        <div style="opacity:0.85;font-size:13px;margin-bottom:8px;">Optimized for low CPU / battery</div>
        <div style="display:flex;flex-direction:column;gap:6px;">
          <button onclick=${() => onAppSelect('settings')} style="padding:8px;border-radius:6px;background:transparent;border:1px solid rgba(255,255,255,0.04);color:white;text-align:left;">Settings</button>
          <button onclick=${() => onAppSelect('camera')} style="padding:8px;border-radius:6px;background:transparent;border:1px solid rgba(255,255,255,0.04);color:white;text-align:left;">Camera</button>
          <button onclick=${() => onAppSelect('gallery')} style="padding:8px;border-radius:6px;background:transparent;border:1px solid rgba(255,255,255,0.04);color:white;text-align:left;">Gallery</button>
        </div>
        <div style="margin-top:10px;font-size:12px;opacity:0.7;">Mode: Low</div>
      </div>
    </div>`;
  }

  return html`<div style="position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:12000;">
    <div style="backdrop-filter: blur(8px); background:linear-gradient(180deg, rgba(20,20,25,0.6), rgba(10,10,12,0.75)); padding:20px;border-radius:12px;color:white;min-width:420px;box-shadow:0 12px 40px rgba(0,0,0,0.6);">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px;">
        <div style="font-weight:800;font-size:16px;">Launcher</div>
        <div style="font-size:12px;opacity:0.8;padding:6px 8px;border-radius:8px;border:1px solid rgba(255,255,255,0.04);">Mode: ${opt === 'medium' ? 'Medium' : 'High'}</div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button onclick=${() => onAppSelect('settings')} style="padding:10px 12px;border-radius:10px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.03);">Settings</button>
        <button onclick=${() => onAppSelect('camera')} style="padding:10px 12px;border-radius:10px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.03);">Camera</button>
        <button onclick=${() => onAppSelect('gallery')} style="padding:10px 12px;border-radius:10px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.03);">Gallery</button>
      </div>
    </div>
  </div>`;
};
window.Launcher = Launcher;
AppRegistry.register('applauncher', Launcher);
