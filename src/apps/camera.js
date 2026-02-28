// yeah this is the camera thing. it's a bit hacked together,
// has a viewfinder, a big button, and a few modes. nothing fancy
const { html, useState, useEffect, useRef } = window.htmPreact || window;

const CameraApp = ({ settings = {}, setSettings } = {}) => {
    const [mode, setMode] = useState('PHOTO');
    const [stream, setStream] = useState(null);
    const [facing, setFacing] = useState((settings.camera && settings.camera.facing) || 'environment');
    const [lastPhoto, setLastPhoto] = useState(null);
    const [isShutterDown, setShutterDown] = useState(false);
    const [showSecondary, setShowSecondary] = useState(false);
    const [aeAfLocked, setAeAfLocked] = useState(false);
    const [focusPoint, setFocusPoint] = useState(null);
    const [perfConfig, setPerfConfig] = useState(() => (typeof window.PerformanceManager !== 'undefined' ? window.PerformanceManager.getCurrentConfig() : null));
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const containerRef = useRef(null);

    const [needPermissionPrompt, setNeedPermissionPrompt] = useState(false);

    useEffect(() => {
        if (typeof window.PerformanceManager === 'undefined') return;
        const unsubscribe = window.PerformanceManager.subscribe((level, config) => {
            setPerfConfig(config);
        });
        return unsubscribe;
    }, []);

    useEffect(() => {
        let mounted = true;
        const checkAndStart = async () => {
            if (!mounted) return;
            // try Permissions API first
            let permGranted = false;
            try {
                if (navigator.permissions && navigator.permissions.query) {
                    const p = await navigator.permissions.query({ name: 'camera' });
                    if (p && p.state === 'granted') permGranted = true;
                }
            } catch (e) { /* ignore */ }

            const remember = !!(settings.camera && settings.camera.rememberPermission);
            const stored = !!localStorage.getItem('cameraPermAccepted');
            if (permGranted || remember || stored) {
                try { await startCamera(); try{ localStorage.setItem('cameraPermAccepted','true'); }catch(e){} setNeedPermissionPrompt(false); } catch(e) { /* start failed, whatever */ setNeedPermissionPrompt(true); }
            } else {
                setNeedPermissionPrompt(true);
            }
        };
        checkAndStart();
        return () => { mounted = false; stopCamera(); };
    }, [facing]);

    async function startCamera(){
        try{
            const constraints = { video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: true };
            const s = await navigator.mediaDevices.getUserMedia(constraints);
            setStream(s);
            if (videoRef.current) videoRef.current.srcObject = s;
            try{ localStorage.setItem('cameraPermAccepted','true'); }catch(e){}
            setNeedPermissionPrompt(false);
        }catch(e){ /* camera couldn't start, meh */ throw e; }
    }
    function stopCamera(){ if (stream) { stream.getTracks().forEach(t=>t.stop()); setStream(null); } if (recording) { try{ stopRecording(); }catch(e){} } }

    useEffect(() => {
        if (stream) {
            stream.getAudioTracks().forEach(track => {
                track.enabled = (mode === 'VIDEO');
            });
        }
    }, [mode, stream]);

    async function takePhoto(){
        if (!videoRef.current) return;
        const v = videoRef.current;
        const vw = v.videoWidth || 1280; const vh = v.videoHeight || 720;
        const c = canvasRef.current || document.createElement('canvas');
        c.width = vw; c.height = vh;
        const ctx = c.getContext('2d');
        ctx.drawImage(v, 0, 0, vw, vh);
        const quality = (settings.camera && typeof settings.camera.jpegQuality === 'number') ? settings.camera.jpegQuality : 0.92;
        const data = c.toDataURL('image/jpeg', quality);
        setLastPhoto(data);
        // save photo to gallery (IndexedDB)
        try{
            // convert dataURL to blob
            const res = await fetch(data);
            const blob = await res.blob();
            const id = await saveMedia(blob, 'photo', data);
            // photo saved... maybe
            const autoOpen = !!(settings.camera && settings.camera.autoOpenGallery);
            if (autoOpen) {
                try{ if (typeof window.launch === 'function') window.launch('gallery'); }catch(e){ /* launch probs */ }
                setTimeout(()=>{ try{ window.GalleryAPI && window.GalleryAPI.open && window.GalleryAPI.open(id).catch(()=>{}); }catch(e){ /* nuthin */ } }, 300);
            }
        }catch(e){ /* oh well, photo save catch */ }
        setShutterDown(true);
        setTimeout(()=>setShutterDown(false), 220);
    }

    // --- Video recording system ---
    const [recorder, setRecorder] = useState(null);
    const [recording, setRecording] = useState(false);
    const [recordStart, setRecordStart] = useState(null);
    const [recordedUrl, setRecordedUrl] = useState(null);

    function startRecording(){
        if (!stream) return;
        try{
            const options = { mimeType: 'video/webm;codecs=vp9' };
            const mr = new MediaRecorder(stream, options);
            const chunks = [];
            mr.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
            mr.onstop = async () => {
                const blob = new Blob(chunks, { type: 'video/webm' });
                // generate thumbnail
                const thumb = await generateThumbnailFromBlob(blob).catch(()=>null);
                try{
                    const id = await saveMedia(blob, 'video', thumb);
                    // video stored... yep
                    const autoOpen = !!(settings.camera && settings.camera.autoOpenGallery);
                    if (autoOpen) {
                        try{ if (typeof window.launch === 'function') window.launch('gallery'); }catch(e){ /* ignore */ }
                        setTimeout(()=>{ try{ window.GalleryAPI && window.GalleryAPI.open && window.GalleryAPI.open(id).catch(()=>{}); }catch(e){ /* oh no */ } }, 300);
                    }
                }catch(e){ /* saveMedia bad */ }
                const url = URL.createObjectURL(blob);
                try{ if (recordedUrl) URL.revokeObjectURL(recordedUrl); }catch(e){}
                setRecordedUrl(url);
                setRecording(false);
                setRecordStart(null);
                setRecorder(null);
            };
            mr.start();
            setRecorder(mr);
            setRecording(true);
            setRecordStart(Date.now());
        }catch(e){ /* recording didnt start */ }
    }

    function stopRecording(){
        try{ if (recorder && recorder.state !== 'inactive') recorder.stop(); }catch(e){}
    }

    const [recordTick, setRecordTick] = useState(0);
    useEffect(()=>{
        let iv;
        if (recording) {
            iv = setInterval(()=> setRecordTick(Math.floor((Date.now() - (recordStart||Date.now()))/1000)), 500);
        } else {
            setRecordTick(0);
        }
        return ()=> clearInterval(iv);
    }, [recording, recordStart]);

    function fmtTime(sec){
        if (!sec || sec <= 0) return '00:00';
        const m = Math.floor(sec/60); const s = sec % 60; return String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
    }

    // ===== IndexedDB helpers for gallery =====
    function openCameraDb(){
        return new Promise((resolve, reject) => {
            const req = indexedDB.open('camera-db', 1);
            req.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('media')) db.createObjectStore('media', { keyPath: 'id' });
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    async function saveMedia(blob, type = 'video', thumbDataUrl = null){
        const db = await openCameraDb();
        return new Promise((res, rej) => {
            const tx = db.transaction('media', 'readwrite');
            const st = tx.objectStore('media');
            const id = 'm-' + Date.now() + '-' + Math.floor(Math.random()*10000);
            const rec = { id, type, blob, thumb: thumbDataUrl, created: Date.now() };
            const putReq = st.put(rec);
            putReq.onsuccess = () => res(id);
            putReq.onerror = () => rej(putReq.error);
        });
    }


    function generateThumbnailFromBlob(blob){
        return new Promise((resolve) => {
            try{
                const url = URL.createObjectURL(blob);
                const v = document.createElement('video');
                v.src = url; v.muted = true; v.playsInline = true; v.crossOrigin = 'anonymous';
                v.addEventListener('loadeddata', function onld(){
                    try{
                        const w = v.videoWidth || 320; const h = v.videoHeight || 180;
                        const c = document.createElement('canvas'); c.width = Math.min(320, w); c.height = Math.floor(c.width * (h/w));
                        const ctx = c.getContext('2d'); ctx.drawImage(v, 0, 0, c.width, c.height);
                        const data = c.toDataURL('image/jpeg', 0.7);
                        v.removeEventListener('loadeddata', onld);
                        v.pause(); try{ URL.revokeObjectURL(url); }catch(e){}
                        resolve(data);
                    }catch(e){ try{ URL.revokeObjectURL(url); }catch(e){} resolve(null); }
                });
                // ensure load attempt
                v.load();
            }catch(e){ resolve(null); }
        });
    }

    // (gallery storage helpers kept above). Gallery UI is handled by the standalone Gallery app.

    let longPressTimer = null;
    function onPointerDown(e){
        longPressTimer = setTimeout(()=>{
            setAeAfLocked(true);
            setTimeout(()=>setAeAfLocked(false), 3000);
        }, 700);
    }
    function onPointerUp(e){ if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; } }

    function onTapToFocus(e){
        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left; const y = e.clientY - rect.top;
        setFocusPoint({ x, y, time: Date.now() });
        setTimeout(()=>setFocusPoint(null), 2000);
    }

    const modes = ['PHOTO','VIDEO'];
    const [showSettings, setShowSettings] = useState(false);

    useEffect(() => {
        const handler = () => setShowSettings(true);
        window.addEventListener('camera-settings-open', handler);
        return () => window.removeEventListener('camera-settings-open', handler);
    }, []);

    return html`
    <div class="camera-root" ref=${containerRef} onclick=${onTapToFocus}>
        <style>${`
            .camera-root { height:100%; display:flex; flex-direction:column; }
            .camera-root .camera-viewfinder { position:relative; overflow:hidden; border-radius:12px; flex:1; display:flex; align-items:center; justify-content:center; }
            .camera-root .camera-video { width:100%; height:100%; object-fit:cover; display:block; }
            .camera-root .top-controls { position:absolute;top:12px;left:12px;right:12px;display:flex;justify-content:space-between;align-items:center;z-index:60;pointer-events:auto; }
            .camera-root .control-group { display:flex;gap:8px;align-items:center }
            .camera-root .control-btn { background:rgba(0,0,0,0.45);border:1px solid rgba(255,255,255,0.06);padding:8px;border-radius:10px;color:#fff;cursor:pointer }
            .camera-root .gutter .gallery img { width:56px;height:56px;object-fit:cover;border-radius:8px;border:2px solid rgba(255,255,255,0.08);box-shadow:0 6px 20px rgba(0,0,0,0.5); }
            .camera-root .gutter { position:absolute; left:0; right:0; bottom:18px; display:flex;align-items:center;justify-content:center;gap:18px;z-index:62;pointer-events:none }
            .camera-root .gutter > * { pointer-events:auto }
            .camera-root .outer-ring { width:88px;height:88px;border-radius:999px;display:flex;align-items:center;justify-content:center;border:6px solid rgba(255,255,255,0.06);box-shadow:0 10px 30px rgba(0,0,0,0.45);cursor:pointer }
            .camera-root .outer-ring.down { transform:translateY(1px) scale(0.98); }
            .camera-root .inner-circle { width:58px;height:58px;border-radius:999px;background:linear-gradient(180deg,#fff,#e6e6e6); }
            .camera-root .inner-circle.video { background:linear-gradient(180deg,#ff3b30,#e6372a); box-shadow:0 6px 18px rgba(255,59,48,0.28); }
            .camera-root .focus-reticle { position:absolute;width:48px;height:48px;border:2px solid rgba(255,255,255,0.9);border-radius:6px;transform:scale(0.9);animation:focusPop 260ms ease-out;pointer-events:none; }
            @keyframes focusPop { 0%{ transform:scale(0.6); opacity:0 } 60%{ transform:scale(1.08); opacity:1 } 100%{ transform:scale(1); opacity:1 } }
        `}</style>
        <div class="camera-viewfinder">
            <video ref=${videoRef} autoplay playsinline muted class="camera-video" onpointerdown=${onPointerDown} onpointerup=${onPointerUp} />
            ${ needPermissionPrompt ? html`<div class="camera-perm-overlay" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;z-index:50;pointer-events:auto;">
                    <div style="background:rgba(0,0,0,0.7);padding:18px;border-radius:12px;color:#fff;display:flex;flex-direction:column;gap:8px;align-items:center;">
                        <div style="font-weight:700;">Camera access required</div>
                        <div style="font-size:13px;opacity:0.9;">Click Enable to grant camera access for this site.</div>
                        <div style="display:flex;gap:8px;margin-top:6px;"><button onclick=${async (e)=>{ e.stopPropagation(); try { await startCamera(); } catch(err) { alert('Permission denied or failed'); } }} style="padding:8px 12px;border-radius:8px;">Enable Camera</button><button onclick=${(e)=>{ e.stopPropagation(); setNeedPermissionPrompt(false); }} style="padding:8px 12px;border-radius:8px;background:transparent;border:1px solid rgba(255,255,255,0.12);">Dismiss</button></div>
                    </div>
                </div>` : '' }
            <canvas ref=${canvasRef} style="display:none;" />

            <div class="top-bar ${showSecondary? 'expanded':''}">
                <div class="top-controls">
                        <div class="control-group">
                            <button class="control-btn" title="Switch Camera" onclick=${(e)=>{ e.stopPropagation(); setFacing(facing === 'environment' ? 'user' : 'environment'); }}>&#8646;</button>
                            <button class="control-btn" title="Settings" onclick=${(e)=>{ e.stopPropagation(); setShowSettings(true); }}>⚙</button>
                        </div>
                    </div>
                ${recording ? html`<div style="position:absolute;left:50%;transform:translateX(-50%);top:12px;z-index:50;display:flex;align-items:center;justify-content:center;">
                    <div style="background:linear-gradient(180deg,rgba(255,59,48,0.95),rgba(220,38,38,0.95));backdrop-filter:blur(12px);border:1.5px solid rgba(255,255,255,0.2);border-radius:16px;padding:12px 20px;display:flex;align-items:center;gap:12px;box-shadow:0 8px 32px rgba(255,59,48,0.4),inset 0 1px 0 rgba(255,255,255,0.2);">
                        <div style="width:12px;height:12px;border-radius:50%;background:rgba(255,255,255,0.9);animation:pulse 1s ease-in-out infinite;"></div>
                        <div style="font-weight:800;font-size:24px;color:#fff;font-family:'Monaco','Courier New',monospace;letter-spacing:2px;text-shadow:0 2px 8px rgba(0,0,0,0.4);">${fmtTime(recordTick)}</div>
                    </div>
                </div>` : ''}
            </div>

            ${focusPoint ? html`<div class="focus-reticle" style="left:${focusPoint.x-24}px;top:${focusPoint.y-24}px"></div>` : ''}

            <div class="gutter">
                <div class="gallery" onclick=${()=>{ try{ if (typeof window.launch === 'function') window.launch('gallery'); }catch(e){} }} title="Open Gallery">
                    ${ lastPhoto ? html`<img src=${lastPhoto} alt="Last photo" />` : ( recordedUrl ? html`<video src=${recordedUrl} muted style="width:56px;height:56px;object-fit:cover;border-radius:8px;" />` : html`<div class="placeholder">Gallery</div>` ) }
                </div>

                <div class="shutter-complex">
                    <div class="shutter-wrap">
                        <div class="outer-ring ${isShutterDown? 'down rippling':''}" onpointerdown=${()=>{ setShutterDown(true); }} onpointerup=${async ()=>{ setShutterDown(false); if (mode === 'PHOTO') { await takePhoto(); } else if (mode === 'VIDEO') { if (!recording) startRecording(); else stopRecording(); } }} onpointercancel=${()=>setShutterDown(false)}>
                            <div class="inner-circle ${mode === 'VIDEO' ? 'video' : ''}"></div>
                        </div>
                        <!-- mode label removed to avoid duplicated plain text; mode selection is in the mode bar below -->
                    </div>
                    <div class="mode-bar" style="display:flex;gap:10px;margin-top:12px;justify-content:center;">
                        ${modes.map(m => html`<button class="mode-btn" onclick=${(ev)=>{ ev.stopPropagation(); setMode(m); }} style="padding:8px 12px;border-radius:999px;background:${m===mode ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)'};border:1px solid rgba(255,255,255,0.06);color:#fff;font-weight:700;">${m}</button>`)}
                    </div>
                </div>
            </div>

            ${aeAfLocked ? html`<div class="aeaf-lock">AE/AF LOCK</div>` : ''}

            ${showSettings ? html`<div style="position:fixed;inset:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:300;" onclick=${()=>setShowSettings(false)}>
                <div style="background:var(--win-bg);border:1px solid var(--border);border-radius:12px;padding:20px;max-width:400px;width:90%;max-height:80vh;overflow-y:auto;color:var(--text-main);" onclick=${(e)=>e.stopPropagation()}>
                    <div style="font-weight:800;font-size:18px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;">
                        <span>Camera Settings</span>
                        <button onclick=${()=>setShowSettings(false)} style="background:transparent;border:none;color:var(--text-main);font-size:20px;cursor:pointer;">✕</button>
                    </div>
                    <div style="display:flex;flex-direction:column;gap:14px;">
                        <div style="border-bottom:1px solid var(--border);padding-bottom:14px;">
                            <div style="font-weight:600;margin-bottom:8px;font-size:13px;">Camera Facing</div>
                            <div style="display:flex;gap:8px;">
                                <button onclick=${()=>{ setFacing('environment'); const s = Object.assign({}, settings); s.camera = Object.assign({}, s.camera, {facing: 'environment'}); setSettings(s); }} style=${{background: facing === 'environment' ? 'rgba(0,122,255,0.3)' : 'rgba(255,255,255,0.05)', border: facing === 'environment' ? '1px solid rgba(0,122,255,0.5)' : '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', flex: 1, transition: 'all 0.2s ease'}}>Back</button>
                                <button onclick=${()=>{ setFacing('user'); const s = Object.assign({}, settings); s.camera = Object.assign({}, s.camera, {facing: 'user'}); setSettings(s); }} style=${{background: facing === 'user' ? 'rgba(0,122,255,0.3)' : 'rgba(255,255,255,0.05)', border: facing === 'user' ? '1px solid rgba(0,122,255,0.5)' : '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', flex: 1, transition: 'all 0.2s ease'}}>Front</button>
                            </div>
                        </div>
                        <div style="border-bottom:1px solid var(--border);padding-bottom:14px;">
                            <div style="font-weight:600;margin-bottom:8px;font-size:13px;">JPEG Quality</div>
                            <div style="display:flex;align-items:center;gap:12px;">
                                <input type="range" min="0.5" max="1" step="0.05" value=${(settings.camera && settings.camera.jpegQuality) || 0.92} onchange=${(e)=>{ const val = parseFloat(e.target.value); const s = Object.assign({}, settings); s.camera = Object.assign({}, s.camera, {jpegQuality: val}); setSettings(s); }} style="flex:1;"/>
                                <span style="font-weight:600;min-width:50px;">${Math.round(((settings.camera && settings.camera.jpegQuality) || 0.92) * 100)}%</span>
                            </div>
                        </div>
                        <div style="border-bottom:1px solid var(--border);padding-bottom:14px;">
                            <label style="display:flex;align-items:center;gap:10px;cursor:pointer;">
                                <input type="checkbox" checked=${!!(settings.camera && settings.camera.autoOpenGallery)} onchange=${(e)=>{ const s = Object.assign({}, settings); s.camera = Object.assign({}, s.camera, {autoOpenGallery: e.target.checked}); setSettings(s); }} style="width:18px;height:18px;cursor:pointer;"/>
                                <span style="font-weight:600;font-size:13px;">Auto-open Gallery after capture</span>
                            </label>
                        </div>
                        <div style="padding-bottom:14px;">
                            <label style="display:flex;align-items:center;gap:10px;cursor:pointer;">
                                <input type="checkbox" checked=${!!(settings.camera && settings.camera.rememberPermission)} onchange=${(e)=>{ const s = Object.assign({}, settings); s.camera = Object.assign({}, s.camera, {rememberPermission: e.target.checked}); setSettings(s); }} style="width:18px;height:18px;cursor:pointer;"/>
                                <span style="font-weight:600;font-size:13px;">Remember permission (no prompt)</span>
                            </label>
                        </div>
                        <button onclick=${()=>setShowSettings(false)} style="padding:10px;border-radius:8px;background:rgba(0,122,255,0.2);border:1px solid rgba(0,122,255,0.3);color:#fff;cursor:pointer;font-weight:600;transition:all 0.2s ease;" onmouseover="this.style.background='rgba(0,122,255,0.3)';this.style.boxShadow='0 4px 12px rgba(0,122,255,0.2)'" onmouseout="this.style.background='rgba(0,122,255,0.2)';this.style.boxShadow='none'">Done</button>
                    </div>
                </div>
            </div>` : ''}
        </div>
    </div>
    `;
};

CameraApp.titlebarButtons = () => html`<div style="padding-right:8px;"><button onclick=${()=>window.dispatchEvent(new CustomEvent('camera-settings-open'))} style="background:transparent;border:none;color:var(--text-main);cursor:pointer;font-size:16px;padding:6px 10px;border-radius:6px;transition:all 0.2s ease;" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='transparent'">⚙</button></div>`;

AppRegistry.register('camera', CameraApp);
window.CameraApp = CameraApp;
