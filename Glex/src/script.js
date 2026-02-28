// No comments for this file way to long already
const BootScreen = ({ onAuthSuccess, showSetup, onShowSetup }) => {
    const [phase, setPhase] = useState('boot'); 
    const [username, setUsername] = useState(() => { try { return localStorage.getItem('seq-session-user') || 'admin'; } catch (e) { return 'admin'; } });
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [avatarData, setAvatarData] = useState(null);

    useEffect(() => {
        try {
            const stored = localStorage.getItem('seq-login-avatar');
            if (stored) setAvatarData(stored);
        } catch (err) {}
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            setPhase('login');
        }, 3500);
        return () => clearTimeout(timer);
    }, []);


    useEffect(() => {
        if (phase !== 'login') return;
        
        const updateClock = () => {
            const clockEl = document.getElementById('clock-display');
            if (!clockEl) return; // Element doesn't exist yet
            const now = new Date();
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const ampm = now.getHours() >= 12 ? 'PM' : 'AM';
            clockEl.textContent = `${hours}:${minutes} ${ampm}`;
        };
        
        updateClock();
        const interval = setInterval(updateClock, 1000);
        return () => clearInterval(interval);
    }, [phase]);

    const handleLogin = async (e) => {
        if (e && typeof e.preventDefault === 'function') e.preventDefault();
        setIsLoading(true);
        setError('');
        // oh look another comment remember when i said I wouldn't make comments, yeah this is messy


        
        // Accept any non-empty username (no password).
        await new Promise(r => setTimeout(r, 500));
        const name = (username || '').trim();
        if (name.length > 0) {
            // Store session
            localStorage.setItem('seq-session-user', name);
            localStorage.setItem('seq-session-time', Date.now());

            // Menubar removed — do not toggle any menubar class please, it was a nightmare to maintain and just isn't worth it for a static image

            // Start tour after a brief delay to let the OS settle. This is a bit stupid but it ensures the tour doesn't conflict with the fucking boot/login animations and feels more natural.
            setTimeout(() => {
                if (typeof gTour !== 'undefined' && !gTour.hasCompletedTour) {
                    try { document.getElementById('glex-tour-container').style.display = 'block'; } catch (e) {}
                    try { gTour.start(); } catch (e) {}
                }
            }, 600);

            onAuthSuccess();
        } else {
            setError('Please enter your name');
            setIsLoading(false);
        }
    };
    // end of login handler, etc, blah, blah nobody cares about this just let it be



    if (phase === 'boot') {
        return html`
            <div style=${{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center', 
                height: '100vh', 
                background: '#ffffff',
                color: '#000', 
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                overflow: 'hidden'
            }}>
                <style>${`
                    @keyframes bootFadeIn {
                        0% { opacity: 0; transform: scale(0.9); }
                        50% { opacity: 1; transform: scale(1); }
                        100% { opacity: 1; transform: scale(1); }
                    }
                    @keyframes loadBar {
                        0% { width: 0%; }
                        50% { width: 70%; }
                        85% { width: 90%; }
                        100% { width: 100%; }
                    }
                    .boot-logo {
                        animation: bootFadeIn 1s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                    }
                    .boot-loader-bar {
                        animation: loadBar 3.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
                    }
                `}</style>
                
                <div class="boot-logo" style=${{ textAlign: 'center' }}>
                    <img src="logo.png" alt="GLEX" style=${{ width: '200px', height: 'auto', marginBottom: '48px', objectFit: 'contain' }} />
                </div>

                <div style=${{ width: '240px', height: '4px', background: 'rgba(0,0,0,0.04)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div class="boot-loader-bar" style=${{ height: '100%', background: 'linear-gradient(90deg, #007aff 0%, #00c6ff 100%)' }}></div>
                </div>
            </div>
        `;
    }

    return html`
        <div style=${{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '100vh', 
            width: '100vw',
            padding: '20px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            position: 'relative',
            overflow: 'hidden'
        }}>
            <!-- Blurred Background Layer (Login) -->
            <div style=${{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundImage: 'url(Macos.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed', filter: 'blur(40px) brightness(0.9)', zIndex: 0 }}></div>
            
            <!-- Dark Overlay -->
            <div style=${{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.1)', zIndex: 1 }}></div>

            <style>${`
                @keyframes fadeInScale {
                    0% { opacity: 0; transform: scale(0.95); }
                    100% { opacity: 1; transform: scale(1); }
                }
                .macos-login-container {
                    animation: fadeInScale 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
                    position: relative;
                    z-index: 10;
                }
                .password-input {
                    background: rgba(255, 255, 255, 0.25);
                    backdrop-filter: blur(12px);
                    border: 0.5px solid rgba(255, 255, 255, 0.3);
                    color: white;
                    transition: all 0.3s ease;
                }
                .password-input::placeholder {
                    color: rgba(255, 255, 255, 0.6);
                }
                .password-input:focus {
                    outline: none;
                    background: rgba(255, 255, 255, 0.3);
                    box-shadow: 0 0 0 2px rgba(100, 150, 255, 0.4);
                }
                .control-button {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 8px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                }
                .control-button:hover {
                    opacity: 0.8;
                    transform: scale(1.1);
                }
                .control-icon {
                    width: 40px;
                    height: 40px;
                    border: 1px solid white;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 20px;
                    transition: background 0.3s ease;
                }
                .control-button:hover .control-icon {
                    background: rgba(255, 255, 255, 0.2);
                }
            `}</style>

            <!-- Status bar removed for simplified login -->

            <!-- Central Login Cluster -->
            <div class="macos-login-container" style=${{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                
                <!-- Avatar -->
                <div style=${{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <img id="login-avatar" src=${avatarData || 'logo.png'} alt="User Avatar" style=${{ width: '160px', height: '160px', borderRadius: '50%', objectFit: 'cover', boxShadow: '0 4px 20px rgba(0,0,0,0.3)', background: 'rgba(255,255,255,0.06)', padding: '4px' }} />
                </div>
                
                <!-- Username (editable) -->
                <input value=${username} oninput=${(e) => setUsername(e.target.value)} placeholder="Your name" style=${{ color: 'white', fontSize: '18px', fontWeight: 600, letterSpacing: '-0.5px', background: 'transparent', border: 'none', textAlign: 'center', outline: 'none' }} />
                
                <!-- Login Form: simple name input + Sign In -->
                <form onsubmit=${(e) => { e?.preventDefault(); handleLogin(e); }} style=${{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                    <!-- Sign In Button -->
                    <button 
                        type="submit"
                        disabled=${isLoading}
                        style=${{ width: '320px', padding: '10px', borderRadius: '6px', background: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.3)', color: 'white', fontSize: '14px', fontWeight: 600, cursor: isLoading ? 'wait' : 'pointer', transition: 'all 0.3s ease' }}
                        onmouseover=${(e) => !isLoading && (e.target.style.background = 'rgba(255,255,255,0.35)')}
                        onmouseout=${(e) => (e.target.style.background = 'rgba(255,255,255,0.25)')}
                    >
                        ${isLoading ? 'Signing in…' : 'Sign In'}
                    </button>
                    
                    ${error && html`<div style=${{ color: '#ff3b30', fontSize: '12px', marginTop: '8px' }}>${error}</div>`}
                </form>
            </div>

            <!-- Footer removed -->
        </div>
    `;
};

// Why do i do this to myself, im lazy and the screensaver manager was a nightmare to maintain.
const SequoiaOS = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [wins, setWins] = useState([]);
    const [topZ, setTopZ] = useState(100);
    const [islandActive, setIslandActive] = useState(false);
    const [islandState, setIslandState] = useState(() => (window.DynamicIsland && typeof window.DynamicIsland.getState === 'function') ? window.DynamicIsland.getState() : {});
    const [islandPulse, setIslandPulse] = useState(false);
    const [launcherOpen, setLauncherOpen] = useState(false);
    const [startOpen, setStartOpen] = useState(false);
    useEffect(() => {
        const closeHandler = () => setLauncherOpen(false);
        const wrapped = () => { try { console.log('glex: Received glex-launcher-close'); } catch(e){} closeHandler(); };
        window.addEventListener('glex-launcher-close', wrapped);
        return () => window.removeEventListener('glex-launcher-close', wrapped);
    }, []);
    // Uhh launch shit 
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape' && launcherOpen) setLauncherOpen(false); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [launcherOpen]);
    
    // This spotlight apple thing was a bad idea. 
    const [spotlightOpen, setSpotlightOpen] = useState(false);
    const [spotlightQuery, setSpotlightQuery] = useState('');
    const [spotlightResults, setSpotlightResults] = useState([]);
    const [spotlightIndex, setSpotlightIndex] = useState(0);
    
    const [settings, setSettings] = useState(() => {
        const saved = localStorage.getItem('seq-pro-settings');
            return saved ? JSON.parse(saved) : {
            dark: true,
            // no more glass
            accent: '#007aff',
            wallpaper: 'linear-gradient(135deg, #1e3c72, #2a5298)',
            fontSize: 14,
            density: 'comfortable',
            reduceMotion: false,
                desktopLayout: 'macdock',
            // These are useless now uhhh but might as well keep them around for future web-fetching features or something, idk
            proxyList: ['https://api.allorigins.win/get?url=', 'https://api.allorigins.win/raw?url='],
            useProxyByDefault: false,
            prefetchDebounce: 300,
            proxyConcurrency: 6,
            rebuildProxiedHtml: false
        };
    });

    // BackgroundManager: Never worked btw i swear to god my code sucks, but it was supposed to handle dynamic wallpapers.
    const BackgroundManager = (() => {
        let current = null; 
        let bgElem = null; 

        const ensureBgElem = () => {
            if (bgElem) return bgElem;
            try {
                const desktop = document.getElementById('desktop');
                if (!desktop) return null;
                bgElem = desktop.querySelector('.desktop-bg-container');
                if (!bgElem) {
                    bgElem = document.createElement('div');
                    bgElem.className = 'desktop-bg-container';
                    bgElem.style.position = 'absolute';
                    bgElem.style.inset = '0';
                    bgElem.style.zIndex = '-1';
                    bgElem.style.overflow = 'hidden';
                    bgElem.style.pointerEvents = 'none';
                    desktop.insertBefore(bgElem, desktop.firstChild);
                }
            } catch (e) { bgElem = null; }
            return bgElem;
        };

        const clear = () => {
            try {
                const desktop = document.getElementById('desktop');
                if (desktop) desktop.style.background = '';
                const c = ensureBgElem();
                if (!c) return;
                while (c.firstChild) c.removeChild(c.firstChild);
            } catch (e) {}
            current = null;
        };

        const apply = (spec) => {
            try {
                clear();
                const desktop = document.getElementById('desktop');
                if (!spec) { current = null; return; }
                if (typeof spec === 'string') {
                    if (desktop) desktop.style.background = spec;
                    current = { type: 'css', src: spec };
                    return;
                }
                const type = spec.type || 'image';
                if (type === 'image') {
                    if (desktop) {
                        desktop.style.background = `url(${spec.src})`;
                        desktop.style.backgroundSize = spec.options && spec.options.cover === false ? 'auto' : 'cover';
                        desktop.style.backgroundPosition = spec.options && spec.options.position ? spec.options.position : 'center';
                    }
                    current = { type: 'image', src: spec.src, options: spec.options || {} };
                    return;
                }
                if (type === 'video') {
                    const c = ensureBgElem();
                    if (!c) return;
                    const v = document.createElement('video');
                    v.src = spec.src;
                    v.autoplay = true;
                    v.loop = true;
                    v.muted = !!(spec.options && spec.options.muted !== false);
                    v.playsInline = true;
                    v.style.width = '100%';
                    v.style.height = '100%';
                    v.style.objectFit = spec.options && spec.options.cover === false ? 'contain' : 'cover';
                    v.style.position = 'absolute';
                    v.style.left = '50%';
                    v.style.top = '50%';
                    v.style.transform = 'translate(-50%, -50%)';
                    v.style.pointerEvents = 'none';
                    v.style.opacity = typeof spec.options?.opacity === 'number' ? String(spec.options.opacity) : '1';
                    c.appendChild(v);
                        // try to play if no work fuck it, and if performance manager says to disable, also don't play and just show the first frame as a static background
                        try {
                            const perfCfg = (window.PerformanceManager && window.PerformanceManager.getCurrentConfig && window.PerformanceManager.getCurrentConfig()) || {};
                            if (perfCfg.disableBackgroundVideo) {
                                // skip attaching video in low-power mode i hate low end laptops
                                // fall back to a simple CSS background if available if not fuck it
                                if (desktop) desktop.style.background = `url(${spec.options && spec.options.fallback || ''})` || '';
                                current = { type: 'video-muted', src: spec.src, options: spec.options || {} };
                            } else {
                                try { v.play().catch(()=>{}); } catch(e){}
                                current = { type: 'video', src: spec.src, options: spec.options || {} };
                            }
                        } catch(e) { try { v.play().catch(()=>{}); }catch(_){} current = { type: 'video', src: spec.src, options: spec.options || {} }; }
                    return;
                }
                if (type === 'canvas' && typeof spec.init === 'function') {
                    const c = ensureBgElem();
                    if (!c) return;
                    const canvas = document.createElement('canvas');
                    canvas.style.width = '100%';
                    canvas.style.height = '100%';
                    canvas.width = c.clientWidth || window.innerWidth;
                    canvas.height = c.clientHeight || window.innerHeight;
                    canvas.style.position = 'absolute';
                    canvas.style.left = '0';
                    canvas.style.top = '0';
                    canvas.style.pointerEvents = 'none';
                    c.appendChild(canvas);
                    try { spec.init(canvas); } catch (e) { console.error('Background program init failed', e); }
                    current = { type: 'canvas', src: null, options: spec.options || {}, program: spec.init };
                    return;
                }
            } catch (e) { console.warn('BackgroundManager.apply error', e); }
        };

        const getCurrent = () => current;

        // expose
        const api = { apply, clear, getCurrent };
        try { window.BackgroundManager = api; } catch (e) {}
        return api;
    })();

    // Wait what is this code for?
    try {
        if (window.PerformanceManager && typeof window.PerformanceManager.subscribe === 'function') {
            window.PerformanceManager.subscribe((lvl, cfg) => {
                try {
                    const c = (document.getElementById('desktop') && document.getElementById('desktop').querySelector('.desktop-bg-container')) || null;
                    if (!c) return;
                    const vids = c.querySelectorAll('video');
                    if (cfg && cfg.disableBackgroundVideo) {
                        vids.forEach(v => {
                            try { v.pause && v.pause(); v.remove && v.remove(); } catch (e) {}
                        });
                        while (c.firstChild) c.removeChild(c.firstChild);
                    } else {
                        try {
                            const cur = BackgroundManager.getCurrent && BackgroundManager.getCurrent();
                            if (cur && cur.type && cur.type.indexOf && cur.type.indexOf('video') !== -1 && cur.src) {
                                BackgroundManager.apply({ type: 'video', src: cur.src, options: cur.options || {} });
                            }
                        } catch (e) {}
                    }
                } catch (e) {}
            });
        }
    } catch (e) {}

    // Setup modal removed: always skip setup theres no setup anymore. REMOVE LATER
    const [showSetup, setShowSetup] = useState(false);

    useEffect(() => {
        document.body.className = settings.dark ? 'dark-mode' : '';
        document.documentElement.style.setProperty('--accent', settings.accent);
        const hexToRgb = (hex) => {
            if (!hex) return '0,122,255';
            let h = hex.replace('#','').trim();
            if (h.length === 3) h = h.split('').map(c => c + c).join('');
            const num = parseInt(h, 16);
            const r = (num >> 16) & 255;
            const g = (num >> 8) & 255;
            const b = num & 255;
            return `${r},${g},${b}`;
        };
        document.documentElement.style.setProperty('--accent-rgb', hexToRgb(settings.accent));
        try { document.documentElement.style.fontFamily = settings.fontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'; } catch (e) {}
        try { if (settings.reduceMotion) document.documentElement.setAttribute('data-reduce-motion', 'true'); else document.documentElement.removeAttribute('data-reduce-motion'); } catch (e) {}
        try {
            try { BackgroundManager.apply(settings.wallpaper); } catch (e) { console.warn('Background apply failed', e); }
        } catch (e) {}
        try {
            const opt = settings.optimization || 'high';
            if (typeof window.PerformanceManager !== 'undefined') {
                window.PerformanceManager.setLevel(opt);
            } else {
                window.OPTIMIZATION_LEVEL = opt;
                try { document.documentElement.setAttribute('data-optimization', opt); } catch (e) {}
            }
        } catch (e) {}

        localStorage.setItem('seq-pro-settings', JSON.stringify(settings));
    }, [settings]);

    useEffect(() => {
        if (!window.PerformanceManager || typeof window.PerformanceManager.subscribe !== 'function') return;
        let lastLevel = null;
        const applyUI = (level, cfg) => {
            try {
                if (level !== lastLevel) {
                    let ov = document.getElementById('perf-overlay');
                    if (!ov) {
                        ov = document.createElement('div');
                        ov.id = 'perf-overlay';
                        ov.style.position = 'fixed';
                        ov.style.inset = '0';
                        ov.style.zIndex = '99999';
                        ov.style.display = 'flex';
                        ov.style.alignItems = 'center';
                        ov.style.justifyContent = 'center';
                        ov.style.background = '#000';
                        ov.style.opacity = '1';
                        ov.style.pointerEvents = 'auto';

                        const card = document.createElement('div');
                        card.style.padding = '28px 36px';
                        card.style.borderRadius = '12px';
                        card.style.background = 'linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))';
                        card.style.border = '1px solid rgba(255,255,255,0.06)';
                        card.style.boxShadow = '0 20px 60px rgba(0,0,0,0.6)';
                        card.style.color = '#fff';
                        card.style.textAlign = 'center';
                        card.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

                        const title = document.createElement('div');
                        title.textContent = 'Driver Load';
                        title.style.fontWeight = '800';
                        title.style.fontSize = '20px';
                        title.style.marginBottom = '10px';

                        const sub = document.createElement('div');
                        sub.textContent = 'Initializing hardware interfaces...';
                        sub.style.opacity = '0.85';
                        sub.style.fontSize = '13px';
                        sub.style.marginBottom = '14px';

                        const dots = document.createElement('div');
                        dots.style.display = 'flex';
                        dots.style.gap = '8px';
                        dots.style.justifyContent = 'center';
                        for (let i = 0; i < 3; i++) {
                            const d = document.createElement('div');
                            d.style.width = '10px';
                            d.style.height = '10px';
                            d.style.borderRadius = '50%';
                            d.style.background = 'linear-gradient(180deg, #fff, #dcdcdc)';
                            d.style.opacity = '0.9';
                            d.style.transform = 'translateY(0)';
                            d.style.transition = 'transform 420ms cubic-bezier(.2,.9,.3,1)';
                            (function(elem, idx){
                                let up = true;
                                setInterval(() => {
                                    try { elem.style.transform = up ? 'translateY(-8px)' : 'translateY(0)'; up = !up; } catch (e) {}
                                }, 600 + idx * 120);
                            })(d, i);
                            dots.appendChild(d);
                        }

                        card.appendChild(title);
                        card.appendChild(sub);
                        card.appendChild(dots);
                        ov.appendChild(card);

                        document.body.appendChild(ov);
                    }
                    // Some devices are terrible at handling changes in ui performance, so we show an overlay during changes to prevent jank and flashing. This is especially important for driver changes which can cause severe jank on some machines.
                    const delay = 3000 + Math.floor(Math.random() * 2000); // 3000-4999ms i guess this is long but some machines are really bad at this stuff, and it prevents a lot of jank and flashing so whatever
                    setTimeout(() => { try { const o = document.getElementById('perf-overlay'); if (o && o.parentNode) o.parentNode.removeChild(o); } catch (e) {} }, delay);
                }
                lastLevel = level;
                document.body.classList.remove('perf-low','perf-medium','perf-high');
                document.body.classList.add(level === 'low' ? 'perf-low' : (level === 'medium' ? 'perf-medium' : 'perf-high'));
                if (level === 'low') {
                    document.documentElement.setAttribute('data-reduce-motion', 'true');
                } else {
                    document.documentElement.removeAttribute('data-reduce-motion');
                }
            } catch (e) {}
        };
        const unsub = window.PerformanceManager.subscribe((lvl, cfg) => applyUI(lvl, cfg));
        try { applyUI(window.PerformanceManager.getLevel(), window.PerformanceManager.getCurrentConfig()); } catch (e) {}
        return unsub;
    }, [isAuthenticated]);


    // Titlebar registration API: only expose this after user has authenticated or dont its open source anyway 
    useEffect(() => {
        if (!isAuthenticated) return;
        try {
            window.__appTitlebarButtons = window.__appTitlebarButtons || Object.create(null);
            window.registerAppTitlebar = (appId, renderFn) => { if (!appId) return; window.__appTitlebarButtons[appId] = renderFn; };
            window.unregisterAppTitlebar = (appId) => { if (!appId) return; try { delete window.__appTitlebarButtons[appId]; } catch (e) { window.__appTitlebarButtons[appId] = null; } };
        } catch (e) { /* ignore */ }
        return () => {
            try { delete window.registerAppTitlebar; delete window.unregisterAppTitlebar; delete window.__appTitlebarButtons; } catch (e) {}
        };
    }, [isAuthenticated]);

    useEffect(() => {
        const onMin = (e) => {
            const id = e && e.detail && e.detail.id;
            if (!id) return;
            setWins(ws => ws.map(w => w.id === id ? { ...w, minimized: true } : w));
        };
        const onMax = (e) => {
            const id = e && e.detail && e.detail.id;
            if (!id) return;
            setWins(ws => ws.map(w => {
                if (w.id !== id) return w;
                if (!w.maximized) {
                    return { ...w, prevRect: { x: w.x, y: w.y, w: w.w, h: w.h }, x: 8, y: 8, w: window.innerWidth - 16, h: window.innerHeight - 16, maximized: true };
                }
                const pr = w.prevRect || { x: Math.max(8, Math.round((window.innerWidth - w.w) / 2)), y: Math.max(8, Math.round((window.innerHeight - w.h) / 2)), w: w.w, h: w.h };
                return { ...w, x: pr.x, y: pr.y, w: pr.w, h: pr.h, maximized: false };
            }));
        };
        const onClose = (e) => {
            const id = e && e.detail && e.detail.id;
            if (!id) return;
            try { const ev = new CustomEvent('glex-before-close', { detail: { id }, cancelable: true }); const canceled = !window.dispatchEvent(ev); if (canceled) return; } catch (err) {}
            setWins(ws => ws.map(w => w.id === id ? { ...w, closing: true } : w));
        };
        window.addEventListener('glex-minimize', onMin);
        window.addEventListener('glex-maximize', onMax);
        window.addEventListener('glex-close', onClose);
        return () => { window.removeEventListener('glex-minimize', onMin); window.removeEventListener('glex-maximize', onMax); window.removeEventListener('glex-close', onClose); };
    }, [setWins]);

    const findRegistered = (id) => {
        if (!id) return null;
        try {
            if (window.AppRegistry && typeof AppRegistry.has === 'function' && AppRegistry.has(id)) return id;
            const low = String(id).toLowerCase();
            const list = (window.AppRegistry && typeof AppRegistry.list === 'function') ? AppRegistry.list() : [];
            for (let k of list) { if (String(k).toLowerCase() === low) return k; }
            const caps = String(id).charAt(0).toUpperCase() + String(id).slice(1);
            if (typeof window[`${caps}App`] === 'function') return caps;
            if (typeof window[`${id}App`] === 'function') return id;
        } catch (e) {}
        return id;
    };

    const launch = (id) => {
        console.log('launch requested for', id);
        setWins(prevWins => {
            const existingApp = prevWins.find(w => w.id === id);
            if (existingApp) {
                try { console.log('launch: focusing existing window', id); focusWin(id); } catch (err) { console.warn('focusWin failed', err); }
                return prevWins;
            }
            const sizeMap = { messages: { w: 820, h: 640 } };
            const defaultSize = sizeMap[id] || { w: 1000, h: 680 };
            const centeredX = Math.max(8, Math.round((window.innerWidth - defaultSize.w) / 2));
            const centeredY = Math.max(8, Math.round((window.innerHeight - defaultSize.h) / 2));
            const newWin = { id, title: id, x: centeredX, y: centeredY, w: defaultSize.w, h: defaultSize.h, z: (typeof topZ === 'number' ? topZ + 1 : 101) };
            console.log('launch: creating new window', newWin);
            return [...prevWins, newWin];
        });
        setTopZ(z => (typeof z === 'number' ? z + 1 : 101));
        setLauncherOpen(false);
        try { window.NotificationCenter && window.NotificationCenter.notify({ title: 'App opened', message: id, appId: id, timeout: 2200 }); } catch(e){}
    };

    useEffect(() => {
        const handler = (e) => {
            if (e && e.detail && e.detail.id) { console.log('glex-launch event', e.detail.id); launch(e.detail.id); }
        };
        window.addEventListener('glex-launch', handler);
        window.launch = (id) => { console.log('window.launch wrapper called', id); return window.dispatchEvent(new CustomEvent('glex-launch', { detail: { id } })); };
        return () => {
            window.removeEventListener('glex-launch', handler);
            try { delete window.launch; } catch (err) {}
        };
    }, []);

    // handle settings actions centrally so island controls work even when Settings window closed what a mess REMOVE ISLAND CONTROLS LATER
    useEffect(() => {
        const handler = (e) => {
            const a = e.detail && e.detail.action;
            if (!a) return;
            if (a === 'toggle-dark') setSettings(s => ({ ...s, dark: !s.dark }));
            if (a === 'set-accent' && e.detail.payload) setSettings(s => ({ ...s, accent: e.detail.payload }));
            if (a === 'bulk-update' && e.detail && typeof e.detail.payload === 'object') {
                setSettings(s => ({ ...s, ...(e.detail.payload || {}) }));
            }
        };
        window.addEventListener('settings-action', handler);
        return () => window.removeEventListener('settings-action', handler);
    }, []);

    useEffect(() => {
        const applyLayout = (layout) => {
            try {
                const root = document.documentElement;
                if (!layout || layout === 'classic') {
                    root.removeAttribute('data-layout');
                    document.body.classList.remove('layout-win11', 'layout-macdock');
                } else if (layout === 'win11') {
                    root.setAttribute('data-layout', 'win11');
                    document.body.classList.add('layout-win11');
                    document.body.classList.remove('layout-macdock');
                } else if (layout === 'macdock') {
                    root.setAttribute('data-layout', 'macdock');
                    document.body.classList.add('layout-macdock');
                    document.body.classList.remove('layout-win11');
                }
            } catch (e) { }
        };

        try {
            const saved = (settings && settings.desktopLayout) || localStorage.getItem('desktopLayout') || (window.__seqSettings && window.__seqSettings.desktopLayout) || null;
            if (saved) applyLayout(saved);
        } catch (e) {}

        const onChange = (e) => { if (e && e.detail && e.detail.layout) applyLayout(e.detail.layout); };
        window.addEventListener('desktop-layout-changed', onChange);
        return () => window.removeEventListener('desktop-layout-changed', onChange);
    }, []);

    const [desktopWidgets, setDesktopWidgets] = useState(() => Persistence.get('widgets.desktop', []));

    useEffect(() => {
        try { Persistence.set('widgets.desktop', desktopWidgets); } catch (err) {}
    }, [desktopWidgets]);



    // Drag/resize for desktop widgets widgets dont exist so uhh fuck remove this later
    const startWidgetDrag = (e, id) => {
        e.stopPropagation();
        const startX = e.clientX, startY = e.clientY;
        const w = desktopWidgets.find(x => x.id === id);
        if (!w) return;
        const orig = { x: w.x, y: w.y };
        // use PerformanceAdapter if available to throttle updates were on the file:// how can we fetch
        const move = (m) => {
            const dx = m.clientX - startX, dy = m.clientY - startY;
            if (window.PerformanceAdapter && typeof window.PerformanceAdapter.throttleLatest === 'function') {
                window.PerformanceAdapter.throttleLatest('widget-drag-' + id, (dx, dy) => {
                    setDesktopWidgets(ws => ws.map(it => it.id === id ? { ...it, x: Math.max(0, orig.x + dx), y: Math.max(0, orig.y + dy) } : it));
                }, [dx, dy]);
            } else {
                setDesktopWidgets(ws => ws.map(it => it.id === id ? { ...it, x: Math.max(0, orig.x + dx), y: Math.max(0, orig.y + dy) } : it));
            }
        };
        const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', up, { once: true });
    };

    const startWidgetResize = (e, id) => {
        e.stopPropagation();
        const startX = e.clientX, startY = e.clientY;
        const w = desktopWidgets.find(x => x.id === id);
        if (!w) return;
        const orig = { w: w.w, h: w.h };
        const move = (m) => {
            const dx = m.clientX - startX, dy = m.clientY - startY;
            if (window.PerformanceAdapter && typeof window.PerformanceAdapter.throttleLatest === 'function') {
                window.PerformanceAdapter.throttleLatest('widget-resize-' + id, (dx, dy) => {
                    setDesktopWidgets(ws => ws.map(it => it.id === id ? { ...it, w: Math.max(80, orig.w + dx), h: Math.max(60, orig.h + dy) } : it));
                }, [dx, dy]);
            } else {
                setDesktopWidgets(ws => ws.map(it => it.id === id ? { ...it, w: Math.max(80, orig.w + dx), h: Math.max(60, orig.h + dy) } : it));
            }
        };
        const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', up, { once: true });
    };

    const rotateDesktopWidget = (id, delta) => {
        setDesktopWidgets(ws => ws.map(it => it.id === id ? { ...it, rot: (it.rot + delta) % 360 } : it));
    };

    const removeDesktopWidget = (id) => {
        setDesktopWidgets(ws => ws.filter(it => it.id !== id));
    };



    // Spotlight / macOS-style search: Ctrl+Alt+Space to toggle (only if layout allows) OLD
    // App Menu: Ctrl+Alt+Space to toggle OLD
    useEffect(() => {
        const canOpenSpotlight = () => {
            try { const layout = localStorage.getItem('desktopLayout') || settings.desktopLayout || 'classic'; return (layout === 'classic' || layout === 'win11'); } catch (e) { return true; }
        };
        const onKey = (e) => {
            if (e.code === 'Space' && e.ctrlKey && e.altKey) {
                e.preventDefault();
                if (!canOpenSpotlight()) return;
                setSpotlightOpen(o => !o);
            }
            if (e.key === 'Escape' && spotlightOpen) {
                setSpotlightOpen(false);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [spotlightOpen]);

    const handleSpotlightKey = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSpotlightIndex(i => Math.min(i + 1, spotlightResults.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSpotlightIndex(i => Math.max(i - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const sel = spotlightResults[spotlightIndex];
            if (sel) {
                try { launch(sel.id); } catch (err) { window.launch && window.launch(sel.id); }
                setSpotlightOpen(false);
            }
        } else if (e.key === 'Escape') {
            setSpotlightOpen(false);
        }
    };

    // Update CSS variables when settings change (always solid/dark mode now) REMOVE THIS LATER IF WE EVER ADD THEMING BACK
    useEffect(() => {
        const root = document.documentElement;
        root.style.setProperty('--win-bg', 'rgba(30, 30, 32, 0.95)');
        root.style.setProperty('--text-main', '#ffffff');
        root.style.setProperty('--sidebar-bg', 'rgba(40, 40, 42, 0.95)');
        root.style.setProperty('--border', 'rgba(255,255,255,0.1)');
        document.body.classList.add('dark-mode');
    }, []);

    const sendAppAction = (appId, action, payload) => {
        const ev = new CustomEvent(appId.toLowerCase() + '-action', { detail: { action, payload } });
        window.dispatchEvent(ev);
    };

    const getAllApps = () => {
        try {
            const prettyName = (id) => {
                if (!id) return '';
                const s = String(id);
                if (s === s.toLowerCase()) return s.charAt(0).toUpperCase() + s.slice(1);
                return s;
            };
            const regs = (window.AppRegistry && typeof window.AppRegistry.list === 'function') ? window.AppRegistry.list() : [];
            const out = [];
            const seen = new Set();
            regs.forEach(id => { try { const key = String(id); const lower = key.toLowerCase(); if (seen.has(lower)) return; seen.add(lower); out.push({ id: key, name: prettyName(key), emoji: '' }); } catch(e){} });
            Object.keys(window).forEach(k => {
                try {
                    if (!k || typeof k !== 'string') return;
                    if (!k.endsWith('App')) return;
                    const base = k.slice(0, -3);
                    const lower = base.toLowerCase();
                    if (seen.has(lower)) return;
                    seen.add(lower);
                    out.push({ id: base, name: prettyName(base), emoji: '' });
                } catch (e) {}
            });
            return out;
        } catch (e) { return []; }
    };

    const focusedWin = wins.reduce((acc, w) => (acc == null || w.z > acc.z ? w : acc), null);
    const focusedApp = focusedWin ? focusedWin.id : null;

    useEffect(() => {
        if (window.DynamicIsland && typeof window.DynamicIsland.onUpdate === 'function') {
            const unsubscribe = window.DynamicIsland.onUpdate(({ state, pulse }) => {
                setIslandState(state);
                setIslandPulse(pulse);
            });
            return unsubscribe;
        }
        return;
    }, []);

    // Dynamic Island is initialized in core/dynamic-island.js not even needeed
    // window.dynamicIsland API is exposed globally there uhhh not existant set for removeal later

    useEffect(() => {
        const handleKeyDown = (e) => {
            const target = e.target || {};
            const tag = (target.tagName || '').toUpperCase();
            const isEditable = target.isContentEditable || tag === 'INPUT' || tag === 'TEXTAREA' || (tag === 'DIV' && target.getAttribute && target.getAttribute('role') === 'textbox');
            if (isEditable) return;

            if (e.key && e.key.toLowerCase() === 's' && e.ctrlKey && e.altKey) {
                e.preventDefault();
                try { const layout = localStorage.getItem('desktopLayout') || settings.desktopLayout || 'classic'; if (layout !== 'classic' && layout !== 'win11') return; } catch (err) {}
                setSpotlightOpen(o => !o);
                if (!spotlightOpen) {
                    setSpotlightQuery('');
                    setSpotlightResults([]);
                    setSpotlightIndex(0);
                }
                return;
            }
            if ((e.altKey || e.metaKey) && e.code === 'Space') {
                e.preventDefault();
                setLauncherOpen(!launcherOpen);
                return;
            }

            if ((e.ctrlKey && e.key === 'ArrowUp') || e.key === 'F3') {
                e.preventDefault();
                setSwitcherOpen(true);
                return;
            }

            const action = KeybindsManager.getAction(e);
            if (!action) return;
            
            e.preventDefault();
            
            if (action === 'launcher') {
                setLauncherOpen(true);
            }

            else if (action === 'open-settings') launch('Settings');
            else if (action === 'close-window' && focusedApp) closeWin(focusedApp);
            else if (action === 'hide-window' && focusedApp) {
                setWins(ws => ws.map(w => w.id === focusedApp ? { ...w, minimized: true } : w));
            }
            else if (action === 'toggle-devtools') DevTools.toggle();
            else if (action === 'command-palette') {
                try { const layout = localStorage.getItem('desktopLayout') || settings.desktopLayout || 'classic'; if (layout !== 'classic' && layout !== 'win11') return; } catch (err) {}
                setSpotlightOpen(o => !o);
                if (!spotlightOpen) {
                    setSpotlightQuery('');
                    setSpotlightResults([]);
                    setSpotlightIndex(0);
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [wins, focusedApp, launcherOpen]);

    const focusWin = (id) => {
        setWins(ws => ws.map(w => w.id === id ? { ...w, z: (typeof topZ === 'number' ? topZ + 1 : 101) } : w));
        setTopZ(z => (typeof z === 'number' ? z + 1 : 101));
    };

    const closeWin = (id) => {
        try {
            const ev = new CustomEvent('glex-before-close', { detail: { id }, cancelable: true });
                const canceled = !window.dispatchEvent(ev);
            if (canceled) {
                try { window.NotificationCenter && window.NotificationCenter.notify({ title: 'Close prevented', message: 'An app blocked closing (unsaved changes).', timeout: 4200, level: 'error' }); } catch(e){}
                return;
            }
        } catch (e) {}
        setWins(ws => ws.map(w => w.id === id ? { ...w, closing: true } : w));
    };

    const removeWin = (id) => {
        setWins(ws => ws.filter(w => w.id !== id));
        try { window.NotificationCenter && window.NotificationCenter.notify({ title: 'App closed', message: id, appId: id, timeout: 2200 }); } catch(e){}
    };

    // Show all apps (single desktop) becuase multitaskin 

    if (!isAuthenticated) {
        return html`
            <div style=${{ height: '100vh', width: '100vw' }}>
                <${BootScreen} onAuthSuccess=${() => setIsAuthenticated(true)} showSetup={false} onShowSetup={() => {}} />
            </div>
        `;
    }

    return html`
        <div id="desktop" style=${{ 
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            overflow: 'hidden',
            fontFamily: (settings && settings.fontFamily) ? settings.fontFamily : '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
        }} onclick=${() => { setIslandActive(false); setStartOpen(false); }}>
            <!-- Background Layer with Wallpaper (NO BLUR) -->
            <div style=${{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundImage: 'url(Macos.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed', zIndex: 0 }}></div>
            
            <!-- Dark Overlay Only (No Blur) -->
            <div style=${{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.05)', zIndex: 0 }}></div>
            
            <!-- Desktop-embedded widgets -->
            ${desktopWidgets.map(d => {
                // GlassWidgets removed yay its so much less no more widjets but leaving this code here in case we add them back later or something who knows
                let content = html`<div style=${{ color: 'white', padding: '8px' }}>Unavailable</div>`;
                try {
                    if (factory) {
                        const maybe = factory(d.props || {});
                        if (typeof maybe === 'function') {
                            const Comp = maybe;
                            content = html`<${Comp} ...${(d.props || {})} />`;
                        } else {
                            content = maybe;
                        }
                    }
                } catch (err) {
                    content = html`<div style=${{ color: 'white', padding: '8px' }}>Error</div>`;
                }

                return html`
                    <div
                        key=${d.id}
                        onmousedown=${(e) => startWidgetDrag(e, d.id)}
                        style=${{
                            position: 'absolute',
                            left: d.x + 'px',
                            top: d.y + 'px',
                            width: d.w + 'px',
                            height: d.h + 'px',
                            transform: `rotate(${d.rot}deg)`,
                            transformOrigin: 'center',
                            zIndex: 2000,
                            padding: '6px',
                            boxSizing: 'border-box',
                            cursor: 'grab'
                        }}
                    >
                        <div style=${{ width: '100%', height: '100%', borderRadius: '10px', overflow: 'hidden', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(8px) saturate(120%)' }} onclick=${(e) => e.stopPropagation()}>
                            
                            <div style=${{ position: 'absolute', right: '6px', top: '6px', display: 'flex', gap: '6px', zIndex: 2100 }}>
                                <button onclick=${(e) => { e.stopPropagation(); rotateDesktopWidget(d.id, -15); }} style=${{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}>⤺</button>
                                <button onclick=${(e) => { e.stopPropagation(); rotateDesktopWidget(d.id, 15); }} style=${{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}>⤻</button>
                                <button onclick=${(e) => { e.stopPropagation(); removeDesktopWidget(d.id); }} style=${{ background: 'transparent', border: 'none', color: '#ff6b6b', cursor: 'pointer' }}>✕</button>
                            </div>
                            <div style=${{ width: '100%', height: '100%', padding: '6px', boxSizing: 'border-box' }}>
                                ${content}
                            </div>
                            <div onmousedown=${(e) => startWidgetResize(e, d.id)} style=${{ position: 'absolute', right: '6px', bottom: '6px', width: '12px', height: '12px', cursor: 'nwse-resize', background: 'rgba(255,255,255,0.06)', borderRadius: '3px' }}></div>
                        </div>
                    </div>
                `;
            })}
            
            <style>${`
                #desktop {
                    background: transparent;
                }
                .menubar {
                    background: rgba(0, 0, 0, 0.5) !important;
                    backdrop-filter: none !important;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.15);
                    position: relative;
                    z-index: 100;
                }
                .window {
                    background: rgba(40, 40, 40, 0.95) !important;
                    backdrop-filter: none !important;
                    border: 1px solid rgba(255, 255, 255, 0.1) !important;
                    border-radius: 12px !important;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3) !important;
                }
                .window-titlebar {
                    background: rgba(50, 50, 50, 0.9) !important;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.15) !important;
                    color: white !important;
                }
                .titlebar { display:flex; align-items:center; gap:12px; padding:10px 12px; cursor:grab; }
                .titlebar .win-title { flex:1; font-weight:700; }
                .titlebar .win-actions { display:flex; gap:8px; align-items:center; justify-content:flex-end; }
                .titlebar .win-actions button { padding:6px 8px; border-radius:8px; font-size:13px; }
                .window-content {
                    color: white !important;
                }
                .dock-wrap {
                    background: rgba(0, 0, 0, 0.6) !important;
                    backdrop-filter: none !important;
                    border: 1px solid rgba(255, 255, 255, 0.15) !important;
                    border-radius: 20px !important;
                    position: relative;
                    z-index: 1000;
                }
                .dock {
                    background: transparent !important;
                }
                .dock-icon {
                    background: rgba(255, 255, 255, 0.05) !important;
                    transition: transform 220ms cubic-bezier(.2,.9,.3,1), box-shadow 220ms ease, background 160ms ease !important;
                }
                .dock-icon:hover {
                    background: rgba(255, 255, 255, 0.15) !important;
                    transform: translateY(-6px) scale(1.18) !important;
                    box-shadow: 0 10px 24px rgba(0,0,0,0.45) !important;
                }
                .island {
                    background: rgba(0, 0, 0, 0.6) !important;
                    backdrop-filter: none !important;
                    border: 1px solid rgba(255, 255, 255, 0.1) !important;
                }
                button, input, select {
                    background: rgba(255, 255, 255, 0.08) !important;
                    border: 1px solid rgba(255, 255, 255, 0.1) !important;
                    color: white !important;
                    backdrop-filter: none !important;
                }
                button:hover {
                    background: rgba(255, 255, 255, 0.15) !important;
                }
                input::placeholder {
                    color: rgba(255, 255, 255, 0.6) !important;
                }
            `}</style>
            
            <${Launcher} isOpen=${launcherOpen} onClose=${() => setLauncherOpen(false)} onAppSelect=${launch} settings=${settings} />

            ${wins.map(w => html`
                        <${Window} key=${w.id} data=${w} onFocus=${() => focusWin(w.id)} onCloseRequest=${() => closeWin(w.id)} onRemove=${() => removeWin(w.id)}>
                            ${w.meta && w.meta.widget ? (() => {
                        try {
                            const d = w.meta.widgetData || {};
                            const factory = window.GlassWidgets && window.GlassWidgets[d.type];
                            if (!factory) return html`<div style=${{ padding: '12px', color: 'white' }}>Widget not available</div>`;
                            const content = factory(d.props || {});
                            if (typeof content === 'function') {
                                const Comp = content;
                                return html`<${Comp} ...${(d.props || {})} />`;
                            }
                            return content;
                        } catch (err) {
                            return html`<div style=${{ padding: '12px', color: 'white' }}>Error rendering widget</div>`;
                        }
                    })() : (
                            (() => {
                                try {
                                    const findRegistered = (id) => {
                                        if (!id) return null;
                                        if (AppRegistry.has(id)) return id;
                                        const low = id.toLowerCase();
                                        const list = AppRegistry.list() || [];
                                        for (let k of list) { if (String(k).toLowerCase() === low) return k; }
                                        return null;
                                    };
                                    const regId = findRegistered(w.id);
                                    if (regId) {
                                        const Comp = AppRegistry.get(regId);
                                        return html`<${Comp} settings=${settings} setSettings=${setSettings} />`;
                                    }
                                    // Fallback to global component constructors like window.EaglarApp GONE
                                    if (w.id && typeof window[`${w.id}App`] === 'function') {
                                        const Comp = window[`${w.id}App`];
                                        return html`<${Comp} settings=${settings} />`;
                                    }
                                } catch (err) {}
                                // User-built apps (id starts with USERAPP_) non existent
                                if (w.id && w.id.startsWith('USERAPP_')) return html`<${UserAppRenderer} appId=${w.id} />`;
                                return html`<${SettingsApp} settings=${settings} setSettings=${setSettings} />`;
                            })()
                    )}
                <//>
            `)}

            <!-- First-run setup panel (external) -->
            ${typeof window.SetupPanel === 'function' ? html`<${window.SetupPanel} visible=${showSetup} onClose=${() => setShowSetup(false)} onSave=${(payload) => { try { localStorage.setItem('glex-setup-complete','true'); } catch(e){} setShowSetup(false); }} settings=${settings} />` : ''}

            <!-- App Menu Popup -->
            ${spotlightOpen ? html`
                <div class="spotlight-overlay" onclick=${() => setSpotlightOpen(false)} style=${{ position: 'fixed', inset: 0, zIndex: 10050, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.35)' }}>
                    <div class="spotlight-card" onclick=${(e) => e.stopPropagation()} style=${{ width: '520px', maxWidth: '96%', borderRadius: '14px', padding: '24px', background: 'rgba(20,20,25,0.85)', boxShadow: '0 30px 80px rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(14px)', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style="font-size:22px;font-weight:700;margin-bottom:18px;">All Apps</div>
                        <div style="display:flex;flex-wrap:wrap;gap:22px;justify-content:center;">
                            ${getAllApps().map(app => html`
                                <div style="display:flex;flex-direction:column;align-items:center;gap:8px;cursor:pointer;min-width:90px;" onclick=${() => { try { const rid = findRegistered(app.id); launch(rid || app.id); } catch(e){ launch(app.id); } setSpotlightOpen(false); }}>
                                    <div style="font-size:32px;">${app.emoji}</div>
                                    <div style="font-weight:600;font-size:15px;">${app.name}</div>
                                </div>
                            `)}
                        </div>
                    </div>
                </div>
            ` : ''}
            ${(() => {
                try {
                    const layout = (localStorage.getItem('desktopLayout') || settings.desktopLayout || 'classic');
                    if (layout === 'macdock' || layout === 'classic') {
                        const apps = ['settings','notes','filemanager','camera','gallery','calendar','clock'];
                        const minimized = (wins || []).filter(w => w.minimized);
                        return html`
                            <div>
                                <div class="dock-wrap showing" style="position:fixed;left:50%;transform:translateX(-50%);bottom:18px;z-index:10000;display:flex;align-items:center;gap:8px;padding:8px 12px;">
                                    <div class="dock" style="display:flex;gap:8px;align-items:center;">
                                        ${apps.map(a => html`<button onclick=${() => { try { launch(a); } catch(e) { window.launch && window.launch(a); } }} class="dock-icon" style="border-radius:10px;padding:6px;border:none;background:transparent;color:var(--text-main);display:flex;align-items:center;justify-content:center;">
                                            <img src=${'icons/' + a + '.png'} alt=${a} style="width:44px;height:44px;object-fit:contain;" onerror=${(e) => { e.target.style.display = 'none'; }} />
                                        </button>`) }
                                    </div>
                                </div>

                                <!-- Stage Manager: vertical strip of minimized windows (macOS stage-like) -->
                                <div class="stage-manager" style="position:fixed;right:12px;top:50%;transform:translateY(-50%);z-index:10000;display:flex;flex-direction:column;gap:8px;pointer-events:auto;">
                                    ${minimized.length ? minimized.map(m => html`<button class="stage-item" title=${m.title || m.id} onclick=${() => { setWins(ws => ws.map(it => it.id === m.id ? { ...it, minimized: false } : it)); try { focusWin(m.id); } catch(e){} }} style="border:none;background:transparent;padding:6px;border-radius:8px;display:flex;align-items:center;justify-content:center;"> <img src=${'icons/' + m.id + '.png'} alt=${m.id} style="width:46px;height:46px;object-fit:contain;" onerror=${(e) => { e.target.style.display = 'none'; }} /></button>`) : html`<div style="opacity:0.6;font-size:12px;padding:6px 10px;color:var(--text-main);">No minimized</div>`}
                                </div>
                            </div>
                        `;
                    }
                } catch (e) {}
                return html``;
            })()}
            ${(() => {
                try {
                    const layout = (localStorage.getItem('desktopLayout') || settings.desktopLayout || 'classic');
                    if (layout === 'win11') {
                        // show running apps in the taskbar; start opens full-screen Launcher
                        const running = (wins || []).map(w => ({ id: w.id, title: w.title || w.id, minimized: !!w.minimized, z: w.z }));
                        return html`
                            <div class="taskbar" style="position:fixed;left:0;right:0;bottom:0;height:52px;display:flex;align-items:center;justify-content:center;padding:8px;z-index:10000;pointer-events:auto;">
                                <div style="position:fixed;left:12px;bottom:8px;display:flex;align-items:center;gap:8px;">
                                    <button class="start-button" onclick=${(e)=>{ e.stopPropagation(); setStartOpen(s => { const next = !s; if (next) setLauncherOpen(false); return next; }); }} style="display:flex;align-items:center;justify-content:center;border-radius:10px;padding:8px;background:transparent;border:none;">☰</button>
                                </div>
                                <div style="display:flex;align-items:center;justify-content:center;gap:6px;padding:6px 12px;border-radius:999px;background:rgba(255,255,255,0.02);backdrop-filter:blur(6px);min-width:160px;">
                                    ${running.length ? running.map(r => html`<button title=${r.title} onclick=${() => { if (r.minimized) { setWins(ws => ws.map(it => it.id === r.id ? { ...it, minimized: false } : it)); focusWin(r.id); } else { setWins(ws => ws.map(it => it.id === r.id ? { ...it, minimized: true } : it)); } }} class="taskbar-icon ${r.minimized ? 'minimized' : ''}" style="border:none;background:transparent;padding:6px;border-radius:8px;display:flex;align-items:center;justify-content:center;"> <img src=${'icons/' + r.id + '.png'} alt=${r.id} style="width:36px;height:36px;object-fit:contain;" onerror=${(e) => { e.target.style.display = 'none'; }} />${!document.querySelector && ''}</button>`) : html`<div style="opacity:0.6;font-size:13px;padding:6px 10px;">No running apps</div>`}
                                </div>
                                <div style="position:fixed;right:14px;bottom:10px;color:var(--text-main);opacity:0.9;font-size:13px;font-weight:600;">${new Date().toLocaleTimeString()}</div>
                                ${startOpen ? html`<${Launcher} isOpen=${startOpen} onClose=${() => setStartOpen(false)} onAppSelect=${launch} settings=${settings} />` : ''}
                            </div>
                        `;
                    }
                } catch (e) {}
                return html``;
            })()}
        </div>
    `;
};

// SafariApp moved to `safari.js` to isolate network/proxy logic for safer file:// usage. doesnt exist anymore
// `safari.js` defines `SafariApp` (must be loaded before this file). nope

// NotesApp moved to notes.js 
// SettingsApp moved to settings.js

const Window = ({ data, onFocus, onClose, onCloseRequest, onRemove, children }) => {
    const { x, y, w, h, z, title, closing } = data;
    const [pos, setPos] = useState({ x, y });
    const [size, setSize] = useState({ w, h });
    const [entered, setEntered] = useState(false);
    const isDragging = useRef(false);
    const isResizing = useRef(false);

    const clamp = (val, a, b) => Math.max(a, Math.min(b, val));

    const drag = (e) => {
        if (e.target.classList.contains('dot')) return;
        onFocus();
        const sX = e.clientX - pos.x, sY = e.clientY - pos.y;

        const latest = { x: pos.x, y: pos.y };
        const lastApplied = { x: pos.x, y: pos.y };

        const handleMove = (m) => {
            latest.x = clamp(m.clientX - sX, 8, window.innerWidth - size.w - 8);
            latest.y = clamp(m.clientY - sY, 8, window.innerHeight - size.h - 8);
        };

        const applyLatest = () => {
            try {
                const cfg = (window.PerformanceManager && window.PerformanceManager.getCurrentConfig && window.PerformanceManager.getCurrentConfig()) || { level: 'high' };
                let targetX = latest.x, targetY = latest.y;
                const alpha = cfg.level === 'low' ? 0.45 : 1;
                let nx, ny;
                if (alpha === 1) {
                    nx = Math.round(targetX);
                    ny = Math.round(targetY);
                } else {
                    nx = Math.round(lastApplied.x + (targetX - lastApplied.x) * alpha);
                    ny = Math.round(lastApplied.y + (targetY - lastApplied.y) * alpha);
                }
                if (cfg.level === 'low') {
                    nx = Math.round(nx / 8) * 8;
                    ny = Math.round(ny / 8) * 8;
                }
                if (nx !== lastApplied.x || ny !== lastApplied.y) {
                    lastApplied.x = nx; lastApplied.y = ny;
                    setPos({ x: nx, y: ny });
                }
            } catch (err) {}
        };

        isDragging.current = true;

        let cancelLoop = null;
        if (window.PerformanceAdapter && typeof window.PerformanceAdapter.rafSchedule === 'function') {
            cancelLoop = window.PerformanceAdapter.rafSchedule(() => { applyLatest(); });
        } else {
            let rafId = null;
            const loop = () => { applyLatest(); rafId = requestAnimationFrame(loop); };
            rafId = requestAnimationFrame(loop);
            cancelLoop = () => { try { cancelAnimationFrame(rafId); } catch (e) {} };
        }

        window.addEventListener('mousemove', handleMove, { passive: true });
        const stop = () => {
            try { window.removeEventListener('mousemove', handleMove); } catch (e) {}
            try { cancelLoop && cancelLoop(); } catch (e) {}
            try { isDragging.current = false; } catch (e) {}
        };
        window.addEventListener('mouseup', stop, { once: true });
    };

    const startResize = (dir) => (e) => {
        e.stopPropagation();
        onFocus();
        const startX = e.clientX, startY = e.clientY;
        const startPos = { ...pos };
        const startSize = { ...size };
        const minW = 300, minH = 180;

        const rawMove = (m, cfg) => {
            let dx = m.clientX - startX, dy = m.clientY - startY;
            let nx = startPos.x, ny = startPos.y, nw = startSize.w, nh = startSize.h;
            if (dir.includes('e')) nw = clamp(startSize.w + dx, minW, window.innerWidth - startPos.x - 8);
            if (dir.includes('s')) nh = clamp(startSize.h + dy, minH, window.innerHeight - startPos.y - 8);
            if (dir.includes('w')) { nw = clamp(startSize.w - dx, minW, startSize.w + startPos.x); nx = clamp(startPos.x + dx, 8, startPos.x + startSize.w - minW); }
            if (dir.includes('n')) { nh = clamp(startSize.h - dy, minH, startSize.h + startPos.y); ny = clamp(startPos.y + dy, 8, startPos.y + startSize.h - minH); }
            if (cfg && cfg.level === 'low') {
                nx = Math.round(nx / 8) * 8;
                ny = Math.round(ny / 8) * 8;
                nw = Math.round(nw / 8) * 8;
                nh = Math.round(nh / 8) * 8;
            }
            setPos({ x: nx, y: ny });
            setSize({ w: nw, h: nh });
        };

        let move;
        let cancelLoop = null;
        if (window.PerformanceAdapter && typeof window.PerformanceAdapter.rafSchedule === 'function') {
            const latest = { clientX: startX, clientY: startY };
            const handleMove = (m) => { latest.clientX = m.clientX; latest.clientY = m.clientY; };
            const applyLatest = () => {
                try { isResizing.current = true; const cfg = window.PerformanceManager && window.PerformanceManager.getCurrentConfig ? window.PerformanceManager.getCurrentConfig() : null; rawMove({ clientX: latest.clientX, clientY: latest.clientY }, cfg); } catch (e) {}
            };
            cancelLoop = window.PerformanceAdapter.rafSchedule(() => { applyLatest(); });
            move = handleMove;
            window.addEventListener('pointermove', move, { passive: true });
        } else if (window.PerformanceAdapter && typeof window.PerformanceAdapter.throttleLatest === 'function') {
            move = (m) => {
                isResizing.current = true;
                window.PerformanceAdapter.throttleLatest('win-resize-' + data.id, (dx, dy) => {
                    try { rawMove({ clientX: startX + dx, clientY: startY + dy }); } catch (e) {}
                    try { isResizing.current = false; } catch (e) {}
                }, [m.clientX - startX, m.clientY - startY]);
            };
            window.addEventListener('pointermove', move, { passive: true });
        } else {
            move = (m) => { isResizing.current = true; rawMove(m); isResizing.current = false; };
            window.addEventListener('pointermove', move, { passive: true });
        }

        const stop = () => {
            try { if (move) window.removeEventListener('pointermove', move); } catch (e) {}
            try { if (cancelLoop) cancelLoop(); } catch (e) {}
            try { isResizing.current = false; } catch (e) {}
        };
        window.addEventListener('pointerup', stop, { once: true });
    };

    useEffect(() => {
        try {
            const cfg = (window.PerformanceManager && window.PerformanceManager.getCurrentConfig && window.PerformanceManager.getCurrentConfig()) || { level: 'high' };
            if (cfg.level === 'low') {
                setEntered(true);
            } else {
                requestAnimationFrame(() => setEntered(true));
            }
        } catch (e) { requestAnimationFrame(() => setEntered(true)); }
    }, []);

    useEffect(() => {
        try {
            if (isDragging.current || isResizing.current) return;
            if (typeof data.x === 'number' || typeof data.y === 'number') {
                setPos({ x: data.x, y: data.y });
            }
            if (typeof data.w === 'number' || typeof data.h === 'number') {
                setSize({ w: data.w, h: data.h });
            }
        } catch (e) { /* fuck sync */ }
    }, [data.x, data.y, data.w, data.h]);

    useEffect(() => {
        try {
            if (data.minimized) {
                setEntered(false);
            } else {
                requestAnimationFrame(() => setEntered(true));
            }
        } catch (e) {}
    }, [data.minimized]);

    useEffect(() => {
        if (closing) {
            try {
                const cfg = (window.PerformanceManager && window.PerformanceManager.getCurrentConfig && window.PerformanceManager.getCurrentConfig()) || { level: 'high' };
                if (cfg.level === 'low') {
                    try { if (typeof onRemove === 'function') onRemove(); else if (typeof onClose === 'function') onClose(); } catch (e) {}
                    return;
                }
            } catch (e) {}
            setEntered(false);
            const t = setTimeout(() => { try { if (typeof onRemove === 'function') onRemove(); else if (typeof onClose === 'function') onClose(); } catch (e){} }, 320);
            return () => clearTimeout(t);
        }
    }, [closing]);

    const handleClose = (e) => {
        e.stopPropagation();
        if (typeof onCloseRequest === 'function') return onCloseRequest();
        if (typeof onClose === 'function') return onClose();
    };

    let transitionStr = 'transform 260ms cubic-bezier(.2,.9,.3,1), opacity 220ms ease';
    try {
        const cfg = (window.PerformanceManager && window.PerformanceManager.getCurrentConfig && window.PerformanceManager.getCurrentConfig()) || { level: 'high' };
        if (cfg.level === 'low') transitionStr = 'none';
        else if (cfg.level === 'medium') transitionStr = 'transform 140ms cubic-bezier(.2,.9,.3,1), opacity 140ms ease';
    } catch (e) {}

    const style = `left:${pos.x}px; top:${pos.y}px; width:${size.w}px; height:${size.h}px; z-index:${z}; ${data.minimized ? 'display:none;' : ''} transform: ${entered ? 'translateZ(0) scale(1)' : 'translateZ(0) scale(0.98)'}; opacity:${entered ? 1 : 0}; transition: ${transitionStr}`;

    let titlebarExtra = null;
    try {
        const reg = (window.__appTitlebarButtons && window.__appTitlebarButtons[data.id]);
        if (typeof reg === 'function') {
            titlebarExtra = reg({ appId: data.id }) || null;
        } else {
            const comp = (AppRegistry && AppRegistry.get && AppRegistry.get(data.id)) || (window[`${data.id}App`] && window[`${data.id}App`]);
            if (comp && typeof comp.titlebarButtons === 'function') {
                titlebarExtra = comp.titlebarButtons({ appId: data.id });
            }
        }
    } catch (e) { /* ignore */ }

    return html`
        <div class=${'window ' + (data.maximized ? 'maximized' : '')} style=${style} onPointerDown=${onFocus}>
            <div class="titlebar" onPointerDown=${drag}>
                ${(() => {
                    try {
                        const layout = document.documentElement.getAttribute('data-layout') || null;
                        if (layout === 'win11') {
                            // no left dots in Windows style
                            return html``;
                        }
                    } catch (e) {}
                    return html`<div class="dots">
                        <div class="dot close" onclick=${handleClose}></div>
                        <div class="dot tile" onclick=${(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('glex-minimize', { detail: { id: data.id } })); window.dispatchEvent(new CustomEvent('window-minimize', { detail: { id: data.id } })); }}></div>
                        <div class="dot full" onclick=${(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('glex-maximize', { detail: { id: data.id } })); window.dispatchEvent(new CustomEvent('window-maximize', { detail: { id: data.id } })); }}></div>
                    </div>`;
                })()}
                <div class="win-title">${title}</div>
                <div class="win-actions">
                    ${titlebarExtra}
                    ${(() => {
                        try {
                            const layout = document.documentElement.getAttribute('data-layout') || null;
                            if (layout === 'win11') {
                                return html`
                                    <div style="display:flex;gap:6px;align-items:center;">
                                        <button class="title-action title-min" onclick=${(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('glex-minimize', { detail: { id: data.id } })); window.dispatchEvent(new CustomEvent('window-minimize', { detail: { id: data.id } })); }} title="Minimize">−</button>
                                        <button class="title-action title-max" onclick=${(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('glex-maximize', { detail: { id: data.id } })); window.dispatchEvent(new CustomEvent('window-maximize', { detail: { id: data.id } })); }} title="Maximize">▢</button>
                                        <button class="title-action title-close" onclick=${(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('glex-close', { detail: { id: data.id } })); window.dispatchEvent(new CustomEvent('window-close', { detail: { id: data.id } })); }} title="Close">✕</button>
                                    </div>
                                `;
                            }
                        } catch (e) {}
                        return html``;
                    })()}
                </div>
            </div>
            <div style="flex:1; overflow:hidden; position:relative;">
                ${children}
                <div class="resizer nw" onPointerDown=${startResize('nw')}></div>
                <div class="resizer ne" onPointerDown=${startResize('ne')}></div>
                <div class="resizer sw" onPointerDown=${startResize('sw')}></div>
                <div class="resizer se" onPointerDown=${startResize('se')}></div>
                <div class="resizer n" onPointerDown=${startResize('n')}></div>
                <div class="resizer s" onPointerDown=${startResize('s')}></div>
                <div class="resizer e" onPointerDown=${startResize('e')}></div>
                <div class="resizer w" onPointerDown=${startResize('w')}></div>
            </div>
        </div>
    `;
};

try {
    seqDebug && seqDebug.log('Starting render of SequoiaOS');
    try {
        (function(){
            const cleaner = (mutations) => {
                try {
                    const r = document.getElementById('root');
                    if (!r) return;
                    Array.from(r.childNodes).forEach(n => {
                        try {
                            if (n.nodeType === Node.TEXT_NODE && n.textContent && n.textContent.trim().toLowerCase() === 'div') {
                                console.warn('Removing stray text node "div" under #root', n);
                                try { console.trace('Trace: stray div insertion point'); } catch (t) {}
                                n.parentNode && n.parentNode.removeChild(n);
                            }
                        } catch (inner) { /* ignore */ }
                    });
                } catch (e) { console.error('Cleaner failed', e); }
            };
            cleaner();
            const mo = new MutationObserver((mutations) => {
                try {
                    for (const m of mutations) {
                        for (const n of Array.from(m.addedNodes || [])) {
                            if (n && n.nodeType === Node.TEXT_NODE && n.textContent && n.textContent.trim().toLowerCase() === 'div') {
                                console.warn('MutationObserver: detected stray text node "div"', n, m);
                                try { console.trace('Trace: mutation added stray div'); } catch (t) {}
                                n.parentNode && n.parentNode.removeChild(n);
                            }
                        }
                    }
                } catch (e) { console.error('Mutation handler error', e); }
                cleaner(mutations);
            });
            try { mo.observe(document.body, { childList: true, subtree: true, characterData: true }); window.__strayObserver = mo; } catch (e) { console.error('Failed to observe document.body for stray nodes', e); }
        })();
    } catch (e) { console.error('Stray node setup failed', e); }
    let _root = null;
    try {
        const existing = document.getElementById('root');
        try {
            if (existing && existing.parentNode) {
                Array.from(existing.parentNode.childNodes).forEach(n => {
                    try {
                        if (n && n.nodeType === Node.TEXT_NODE && n.textContent && n.textContent.trim()) {
                            n.parentNode && n.parentNode.removeChild(n);
                        }
                    } catch (e) {}
                });
            }
        } catch (e) {}

        if (existing) {
            try { existing.parentNode && existing.parentNode.removeChild(existing); } catch (e) {}
        }

        const fresh = document.createElement('div');
        fresh.id = 'root';
        fresh.setAttribute('data-fresh-root', '1');
        try {
            Array.from(document.body.childNodes).forEach(n => {
                if (n && n.nodeType === Node.TEXT_NODE && n.textContent && n.textContent.trim()) {
                    n.parentNode && n.parentNode.removeChild(n);
                }
            });
        } catch (e) {}

        document.body.appendChild(fresh);
        _root = fresh;
    } catch (e) {
        try { _root = document.getElementById('root'); } catch (err) { _root = null; }
    }
    try {
        Array.from(document.body.childNodes).forEach(n => {
            if (n.nodeType === Node.TEXT_NODE && n.textContent && n.textContent.trim()) {
                const t = n.textContent.trim();
                if (t.length > 0) n.parentNode && n.parentNode.removeChild(n);
            }
        });
    } catch (e) { /* ignore */ }
    render(html`<${SequoiaOS} />`, _root || document.getElementById('root'));
    seqDebug && seqDebug.log('Render completed');
    try { if (window.__strayObserver) { try { window.__strayObserver.disconnect(); } catch(e){} delete window.__strayObserver; } } catch(e){}
} catch (err) {
    console.error('Render failed:', err);
    try {
        seqDebug && seqDebug.error(err);
        const root = document.getElementById('root');
        if (root) {
            root.innerHTML = `<div style="padding:24px; color:#fff; background:#111; height:100vh; box-sizing:border-box; display:flex; align-items:center; justify-content:center; flex-direction:column"> <h2 style=\"margin:0 0 12px;font-weight:700;\">Sequoia failed to start</h2> <pre id=\"sequoia-error\" style=\"max-width:880px;white-space:pre-wrap;opacity:0.9;\"></pre> </div>`;
            try { const pre = document.getElementById('sequoia-error'); if (pre) pre.textContent = String(err && err.stack ? err.stack : err); } catch (e) {}
        }
    } catch (e) { console.error('Failure while reporting render error', e); }
}

//READY FOR RELEASE HELL YEAHHHHHHHHHHHHHHHHHHHHHHHHHHH