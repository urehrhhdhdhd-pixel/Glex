// why the code is like this, i was tired and added features as i went. lowk like robtop lol
(function(){
const { html, useState, useEffect, useRef } = window.htmPreact || window;

async function openCameraDb(){
    // yeah db opens, whatever

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

async function listMedia(){
    const db = await openCameraDb();
    return new Promise((res, rej) => {
        const tx = db.transaction('media', 'readonly');
        const st = tx.objectStore('media');
        const items = [];
        const cur = st.openCursor();
        cur.onsuccess = (e) => { const c = e.target.result; if (!c) return res(items.reverse()); items.push(c.value); c.continue(); };
        cur.onerror = () => rej(cur.error);
    });
}

async function getMediaBlob(id){
    const db = await openCameraDb();
    return new Promise((res, rej) => {
        const tx = db.transaction('media','readonly');
        const st = tx.objectStore('media');
        const r = st.get(id);
        r.onsuccess = () => res(r.result ? r.result.blob : null);
        r.onerror = () => rej(r.error);
    });
}

async function deleteMedia(id){
    const db = await openCameraDb();
    return new Promise((res, rej) => {
        const tx = db.transaction('media','readwrite');
        const st = tx.objectStore('media');
        const r = st.delete(id);
        r.onsuccess = () => res(true);
        r.onerror = () => rej(r.error);
    });
}

function blobToDataURL(blob){
    return new Promise((res) => {
        if (!blob) return res(null);
        const fr = new FileReader();
        fr.onload = () => res(fr.result);
        fr.onerror = () => res(null);
        fr.readAsDataURL(blob);
    });
}

// gallery.js loaded (shh no logs please)
const GalleryApp = ({ settings = {}, setSettings } = {}) => {
    const [items, setItems] = useState([]);
    const [open, setOpen] = useState(null);
    const [selected, setSelected] = useState(new Set());
    const gallerySettings = settings.gallery || {};
    const [currentIndex, setCurrentIndex] = useState(-1);
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [showSettings, setShowSettings] = useState(false);
    const [videoTime, setVideoTime] = useState(0);
    const [videoDuration, setVideoDuration] = useState(0);
    const [videoPlaying, setVideoPlaying] = useState(false);
    const [perfConfig, setPerfConfig] = useState(() => (typeof window.PerformanceManager !== 'undefined' ? window.PerformanceManager.getCurrentConfig() : null));
    const videoRef = useRef(null);

    const showVideoControls = (e) => {
        try { const el = document.querySelector('[data-video-controls]'); if (el) el.style.opacity = '1'; } catch (e) {}
    };
    const hideVideoControls = (e) => {
        try { if (videoPlaying) return; const el = document.querySelector('[data-video-controls]'); if (el) el.style.opacity = '0'; } catch (e) {}
    };
    const throttledShow = (window.PerformanceAdapter && window.PerformanceAdapter.wrapEventHandler) ? window.PerformanceAdapter.wrapEventHandler('gallery-show-controls', showVideoControls) : showVideoControls;
    const throttledHide = (window.PerformanceAdapter && window.PerformanceAdapter.wrapEventHandler) ? window.PerformanceAdapter.wrapEventHandler('gallery-hide-controls', hideVideoControls) : hideVideoControls;

    useEffect(() => {
        if (typeof window.PerformanceManager === 'undefined') return;
        const unsubscribe = window.PerformanceManager.subscribe((level, config) => {
            setPerfConfig(config);
        });
        return unsubscribe;
    }, []);

    useEffect(()=>{ 
        load(); 
    }, []);

    useEffect(() => {
        const handler = () => setShowSettings(true);
        window.addEventListener('gallery-settings-open', handler);
        return () => window.removeEventListener('gallery-settings-open', handler);
    }, []);

    useEffect(() => {
        const handler = async (e) => {
            try {
                const id = e && e.detail && e.detail.id;
                // open request for id
                if (!id) return;
                // if nothing yet or missing, reload and try again
                let found = items.find(x => x.id === id);
                if (!found) {
                    await load();
                    found = items.find(x => x.id === id);
                }
                if (found) {
                    await openItem(found);
                } else {
                    // nothing to open
                }
            } catch (err) { console.warn('gallery open handler failed', err); }
        };
        window.addEventListener('gallery-open-item', handler);
        return () => window.removeEventListener('gallery-open-item', handler);
    }, [items]);

    async function load(){
    // loading list, may take a sec


        try{
            let list = await listMedia();
            // ensure thumbs/data urls exist: convert blobs to base64 if needed
            const results = await Promise.all(list.map(async it => {
                const copy = Object.assign({}, it);
                if (copy.thumb) return copy; // already has dataURL thumb
                // try to create a dataURL from stored blob (if present)
                if (copy.blob) {
                    const url = await blobToDataURL(copy.blob).catch(()=>null);
                    copy.thumb = url;
                }
                return copy;
            }));
            // apply gallery settings: sort
            const sort = (gallerySettings && gallerySettings.sort) || 'newest';
            if (sort === 'newest') results.sort((a,b)=> (b.created||0) - (a.created||0));
            else if (sort === 'oldest') results.sort((a,b)=> (a.created||0) - (b.created||0));
            else if (sort === 'type') results.sort((a,b)=> String(a.type).localeCompare(String(b.type)));
            setItems(results);
        }catch(e){ /* oh well loading failed */ }
    }

    async function handleDelete(id){
    // delete thingy

        if (!confirm('Delete this item?')) return;
        await deleteMedia(id);
        await load();
        if (open && open.id === id) closeOpen();
    }

    async function handleMultiDelete(){
        if (selected.size === 0) return;
        if (!confirm(`Delete ${selected.size} item${selected.size > 1 ? 's' : ''}?`)) return;
        for (const id of selected) {
            try{ await deleteMedia(id); }catch(e){}
        }
        setSelected(new Set());
        await load();
    }

    function toggleSelected(id){
        const newSet = new Set(selected);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelected(newSet);
    }

    function closeOpen(){
        // revoke any created object URL
        try{ if (open && open._videoUrl) URL.revokeObjectURL(open._videoUrl); }catch(e){}
        setOpen(null);
        setCurrentIndex(-1);
        setZoom(1);
        setPan({ x: 0, y: 0 });
    }

    async function handleDownload(it){
        try{
            if (it.type === 'photo'){
                // thumbs are base64 data URLs
                const a = document.createElement('a'); a.href = it.thumb || ''; a.download = it.id + '.jpg'; a.click();
                return;
            }
            const blob = await getMediaBlob(it.id);
            if (!blob) return alert('No data');
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = it.id + (it.type==='video'?'.webm':'.bin'); a.click();
            setTimeout(()=>URL.revokeObjectURL(url), 3000);
        }catch(e){ console.warn(e); }
    }

    async function openItem(it){
        try{
            console.log('gallery.openItem', it && it.id);
            const copy = Object.assign({}, it);
            if (copy.type === 'video'){
                const blob = await getMediaBlob(copy.id);
                if (!blob) return alert('Video data not available');
                const vurl = URL.createObjectURL(blob);
                copy._videoUrl = vurl;
                copy.blob = blob;
            } else if (copy.type === 'photo'){
                if (!copy.thumb){
                    const blob = await getMediaBlob(copy.id);
                    if (blob) copy.thumb = await blobToDataURL(blob).catch(()=>null);
                }
            }
            // find index in items
            const idx = items.findIndex(x => x.id === copy.id);
            if (idx >= 0) setCurrentIndex(idx);
            setZoom(1); setPan({ x: 0, y: 0 });
            setOpen(copy);
        }catch(e){ console.warn('openItem failed', e); alert('Failed to open item'); }
    }

    async function openByIndex(idx){
        if (!items || idx < 0 || idx >= items.length) return;
        const it = items[idx];
        await openItem(it);
    }

    function next(){ if (currentIndex < items.length - 1) openByIndex(currentIndex + 1); }
    function prev(){ if (currentIndex > 0) openByIndex(currentIndex - 1); }

    useEffect(() => {
        if (!open) return;
        const handler = (e) => {
            if (e.key === 'Escape') return closeOpen();
            if (e.key === 'ArrowRight') return next();
            if (e.key === 'ArrowLeft') return prev();
            if (e.key === '+' || e.key === '=') return setZoom(z => Math.min(4, +(z + 0.25).toFixed(2)));
            if (e.key === '-' || e.key === '_') return setZoom(z => Math.max(1, +(z - 0.25).toFixed(2)));
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [open, currentIndex, items]);

    // Pan handling for zoomed images
    let isPanning = false; let startPan = null;
    const onPanStart = (e) => {
        if (zoom <= 1) return;
        isPanning = true; startPan = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
        try{ e.target.setPointerCapture && e.target.setPointerCapture(e.pointerId); }catch(_){}
    };
    const onPanMove = (e) => {
        if (!isPanning || !startPan) return;
        const dx = e.clientX - startPan.x; const dy = e.clientY - startPan.y;
        setPan({ x: startPan.px + dx, y: startPan.py + dy });
    };
    const onPanEnd = (e) => { isPanning = false; startPan = null; try{ e.target.releasePointerCapture && e.target.releasePointerCapture(e.pointerId); }catch(_){} };

    return html`
        <div style="padding:20px;display:flex;flex-direction:column;height:100%;gap:12px;">
            <style>${`
                .media-grid .media-tile { transition: transform 180ms ease, box-shadow 180ms ease; }
                .media-grid .media-tile:hover { transform: translateY(-6px) scale(1.03); box-shadow: 0 12px 32px rgba(0,0,0,0.45); }
                .media-grid img { width:100%;height:100%;object-fit:cover;display:block }
                .lightbox .meta { color:rgba(255,255,255,0.85);font-weight:600;font-size:13px }
            `}</style>
            <div style="display:flex;align-items:center;justify-content:space-between;">
                <div style="font-weight:800;font-size:18px;color:var(--text-main);">Gallery</div>
                <div style="display:flex;gap:8px;"><button onclick=${load} style="padding:8px 14px;border-radius:8px;background:rgba(0,122,255,0.15);border:1px solid rgba(0,122,255,0.3);color:var(--text-main);cursor:pointer;font-weight:600;transition:all 0.2s ease;" onmouseover="this.style.background='rgba(0,122,255,0.25)';this.style.boxShadow='0 4px 12px rgba(0,122,255,0.2)'" onmouseout="this.style.background='rgba(0,122,255,0.15)';this.style.boxShadow='none'">↻</button></div>
            </div>
            <div style="flex:1;overflow:auto;">
                ${ items.length ? html`<div class="media-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(${(perfConfig && perfConfig.thumbnailSize) || (gallerySettings && gallerySettings.thumbSize) || 160}px,1fr));gap:10px;">
                    ${ items.map((it, idx) => html`<div class="media-tile" style="background:#000;border:1px solid ${selected.has(it.id) ? 'rgba(0,122,255,0.8)' : 'var(--border)'};border-radius:8px;overflow:hidden;cursor:pointer;aspect-ratio:1;display:flex;align-items:center;justify-content:center;position:relative;" onclick=${(e)=>{ if (!e.metaKey && !e.ctrlKey) openByIndex(idx); }} oncontextmenu=${(e)=>{ e.preventDefault(); toggleSelected(it.id); }}>
                        ${ it.thumb ? html`<img src=${it.thumb} loading="lazy" alt="media-${it.id}"/>` : html`<div style="color:#999;font-size:12px;">${it.type}</div>` }
                        <div style="position:absolute;top:8px;left:8px;width:20px;height:20px;background:${selected.has(it.id) ? 'rgba(0,122,255,0.8)' : 'rgba(0,0,0,0.4)'};border:2px solid #fff;border-radius:4px;display:flex;align-items:center;justify-content:center;cursor:pointer;" onclick=${(e)=>{ e.stopPropagation(); toggleSelected(it.id); }}>${selected.has(it.id) ? html`<span style="color:#fff;font-weight:bold;font-size:12px;">✓</span>` : ''}</div>
                        <div style="position:absolute;bottom:8px;right:8px;background:rgba(0,0,0,0.6);padding:4px 8px;border-radius:4px;font-size:11px;color:#fff;">${it.type === 'photo' ? '◉' : '▶'}</div>
                    </div>` ) }
                </div>` : html`<div style="padding:24px;color:rgba(255,255,255,0.7);">No media yet.</div>` }
            </div>
            ${selected.size > 0 ? html`<div style="position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:100;background:rgba(0,0,0,0.8);border:1px solid rgba(255,255,255,0.2);border-radius:8px;padding:12px 16px;display:flex;align-items:center;gap:12px;">
                <div style="color:#fff;font-weight:600;">${selected.size} selected</div>
                <button onclick=${handleMultiDelete} style="padding:8px 12px;border-radius:6px;background:rgba(239,68,68,0.3);border:1px solid rgba(239,68,68,0.5);color:#ff6b6b;cursor:pointer;font-weight:600;transition:all 0.2s ease;" title="Delete selected" onmouseover="this.style.background='rgba(239,68,68,0.5)'" onmouseout="this.style.background='rgba(239,68,68,0.3)'">✕ Delete</button>
                <button onclick=${()=>setSelected(new Set())} style="padding:8px 12px;border-radius:6px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:#fff;cursor:pointer;font-weight:600;transition:all 0.2s ease;" onmouseover="this.style.background='rgba(255,255,255,0.15)'" onmouseout="this.style.background='rgba(255,255,255,0.1)'">Cancel</button>
            </div>` : ''}

            ${ open ? html`<div class="lightbox" style="position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.95);z-index:220;" onclick=${()=>{ if (selected.size > 0) setSelected(new Set()); else closeOpen(); }}>
                <div style="position:relative;width:90vw;height:90vh;display:flex;flex-direction:column;" onclick=${(e)=>e.stopPropagation()}>
                    <div style="flex:1;display:flex;align-items:center;justify-content:center;overflow:hidden;border-radius:8px;">
                        ${ open.type === 'photo' ? html`<img src=${open.thumb} style=${{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transition: 'transform 80ms linear', maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', cursor: zoom>1 ? 'grab' : 'auto' }} onpointerdown=${onPanStart} onpointermove=${onPanMove} onpointerup=${onPanEnd} onpointercancel=${onPanEnd} />` : html`<div style="position:relative;width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#000;" onmousemove=${throttledShow} onmouseleave=${throttledHide}>
                        ${ open._videoUrl ? html`<video ref=${videoRef} src=${open._videoUrl} autoplay=${!!(perfConfig && perfConfig.disableAutoplay === false && gallerySettings && gallerySettings.autoplayVideos)} muted style="width:100%;height:100%;display:block;" onloadedmetadata=${(e)=>setVideoDuration(e.target.duration)} ontimeupdate=${(e)=>setVideoTime(e.target.currentTime)} onplay=${()=>setVideoPlaying(true)} onpause=${()=>setVideoPlaying(false)} />` : html`<div style="color:#fff;">Loading...</div>` }
                        ${open.type === 'video' ? html`<div data-video-controls style="position:absolute;bottom:0;left:0;right:0;background:linear-gradient(180deg,transparent,rgba(0,0,0,0.8));padding:16px;display:flex;flex-direction:column;gap:8px;opacity:${videoPlaying ? 0.3 : 1};transition:opacity 0.3s ease;">
                            <input type="range" min="0" max="${videoDuration || 100}" value=${videoTime} onchange=${(e)=>{ if (videoRef.current) videoRef.current.currentTime = e.target.value; }} style="width:100%;cursor:pointer;" />
                            <div style="display:flex;align-items:center;gap:12px;">
                                <button onclick=${(e)=>{ e.stopPropagation(); if (videoRef.current) { if (videoRef.current.paused) videoRef.current.play(); else videoRef.current.pause(); } }} style="padding:8px 12px;border-radius:6px;background:rgba(0,122,255,0.3);border:1px solid rgba(0,122,255,0.5);color:#fff;cursor:pointer;font-weight:600;transition:all 0.2s ease;" title="Play/Pause">${videoPlaying ? '⏸' : '▶'}</button>
                                <div style="color:#fff;font-size:12px;font-weight:600;min-width:60px;">${Math.floor(videoTime/60)}:${String(Math.floor(videoTime%60)).padStart(2,'0')} / ${Math.floor(videoDuration/60)}:${String(Math.floor(videoDuration%60)).padStart(2,'0')}</div>
                                <div style="flex:1;"></div>
                                <input type="range" min="0" max="100" value=${videoRef.current ? videoRef.current.volume * 100 : 100} onchange=${(e)=>{ if (videoRef.current) videoRef.current.volume = e.target.value / 100; }} style="width:80px;cursor:pointer;" title="Volume" />
                                <button onclick=${(e)=>{ e.stopPropagation(); if (videoRef.current) videoRef.current.requestFullscreen?.(); }} style="padding:8px 12px;border-radius:6px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:#fff;cursor:pointer;font-weight:600;transition:all 0.2s ease;" title="Fullscreen" onmouseover="this.style.background='rgba(255,255,255,0.2)'" onmouseout="this.style.background='rgba(255,255,255,0.1)'">□</button>
                            </div>
                        </div>` : '' }
                        </div>` }
                    </div>
                    <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-top:12px;padding:12px;background:rgba(0,0,0,0.5);border-radius:8px;">
                        <div style="display:flex;gap:8px;">
                            <button onclick=${(e)=>{ e.stopPropagation(); prev(); }} style="padding:8px 12px;border-radius:6px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:#fff;cursor:pointer;font-weight:600;transition:all 0.2s ease;" title="Previous (←)" onmouseover="this.style.background='rgba(255,255,255,0.2)'" onmouseout="this.style.background='rgba(255,255,255,0.1)'">◀</button>
                            <button onclick=${(e)=>{ e.stopPropagation(); next(); }} style="padding:8px 12px;border-radius:6px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:#fff;cursor:pointer;font-weight:600;transition:all 0.2s ease;" title="Next (→)" onmouseover="this.style.background='rgba(255,255,255,0.2)'" onmouseout="this.style.background='rgba(255,255,255,0.1)'">▶</button>
                        </div>
                        <div style="display:flex;gap:8px;align-items:center">
                                <div class="meta">${open && open.created ? new Date(open.created).toLocaleString() : ''}</div>
                                <button onclick=${(e)=>{ e.stopPropagation(); handleDownload(open); }} style="padding:8px 12px;border-radius:6px;background:rgba(34,197,94,0.2);border:1px solid rgba(34,197,94,0.3);color:#fff;cursor:pointer;font-weight:600;transition:all 0.2s ease;" title="Download" onmouseover="this.style.background='rgba(34,197,94,0.3)'" onmouseout="this.style.background='rgba(34,197,94,0.2)'">↓</button>
                            <button onclick=${(e)=>{ e.stopPropagation(); handleDelete(open.id); }} style="padding:8px 12px;border-radius:6px;background:rgba(239,68,68,0.2);border:1px solid rgba(239,68,68,0.3);color:#ff6b6b;cursor:pointer;font-weight:600;transition:all 0.2s ease;" title="Delete" onmouseover="this.style.background='rgba(239,68,68,0.3)'" onmouseout="this.style.background='rgba(239,68,68,0.2)'">✕</button>
                        </div>
                    </div>
                </div>
            </div>` : '' }

            ${showSettings ? html`<div style="position:fixed;inset:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:300;" onclick=${()=>setShowSettings(false)}>
                <div style="background:var(--win-bg);border:1px solid var(--border);border-radius:12px;padding:20px;max-width:400px;width:90%;max-height:80vh;overflow-y:auto;color:var(--text-main);" onclick=${(e)=>e.stopPropagation()}>
                    <div style="font-weight:800;font-size:18px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;">
                        <span>⚙ Gallery Settings</span>
                        <button onclick=${()=>setShowSettings(false)} style="background:transparent;border:none;color:var(--text-main);font-size:20px;cursor:pointer;">✕</button>
                    </div>
                    <div style="display:flex;flex-direction:column;gap:14px;">
                        <div style="border-bottom:1px solid var(--border);padding-bottom:14px;">
                            <div style="font-weight:600;margin-bottom:8px;font-size:13px;">Sort Order</div>
                            <select onchange=${(e)=>{ const s = Object.assign({}, settings); s.gallery = Object.assign({}, s.gallery, {sort: e.target.value}); setSettings(s); load(); }} style="width:100%;padding:8px;border-radius:8px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:#fff;cursor:pointer;">
                                <option value="newest" selected=${(gallerySettings && gallerySettings.sort) === 'newest'}>Newest first</option>
                                <option value="oldest" selected=${(gallerySettings && gallerySettings.sort) === 'oldest'}>Oldest first</option>
                                <option value="type" selected=${(gallerySettings && gallerySettings.sort) === 'type'}>By type</option>
                            </select>
                        </div>
                        <div style="border-bottom:1px solid var(--border);padding-bottom:14px;">
                            <div style="font-weight:600;margin-bottom:8px;font-size:13px;">Thumbnail Size</div>
                            <div style="display:flex;align-items:center;gap:12px;">
                                <input type="range" min="100" max="320" step="20" value=${(gallerySettings && gallerySettings.thumbSize) || 160} onchange=${(e)=>{ const val = parseInt(e.target.value); const s = Object.assign({}, settings); s.gallery = Object.assign({}, s.gallery, {thumbSize: val}); setSettings(s); }} style="flex:1;"/>
                                <span style="font-weight:600;min-width:50px;">${(gallerySettings && gallerySettings.thumbSize) || 160}px</span>
                            </div>
                        </div>
                        <div style="padding-bottom:14px;">
                            <label style="display:flex;align-items:center;gap:10px;cursor:pointer;">
                                <input type="checkbox" checked=${!!(gallerySettings && gallerySettings.autoplay)} onchange=${(e)=>{ const s = Object.assign({}, settings); s.gallery = Object.assign({}, s.gallery, {autoplay: e.target.checked}); setSettings(s); }} style="width:18px;height:18px;cursor:pointer;"/>
                                <span style="font-weight:600;font-size:13px;">Autoplay videos in viewer</span>
                            </label>
                        </div>
                        <button onclick=${()=>setShowSettings(false)} style="padding:10px;border-radius:8px;background:rgba(0,122,255,0.2);border:1px solid rgba(0,122,255,0.3);color:#fff;cursor:pointer;font-weight:600;transition:all 0.2s ease;" onmouseover="this.style.background='rgba(0,122,255,0.3)';this.style.boxShadow='0 4px 12px rgba(0,122,255,0.2)'" onmouseout="this.style.background='rgba(0,122,255,0.2)';this.style.boxShadow='none'">Done</button>
                    </div>
                </div>
            </div>` : ''}
        </div>
    `;
};

GalleryApp.titlebarButtons = () => html`<div style="padding-right:8px;"><button onclick=${()=>window.dispatchEvent(new CustomEvent('gallery-settings-open'))} style="background:transparent;border:none;color:var(--text-main);cursor:pointer;font-size:16px;padding:6px 10px;border-radius:6px;transition:all 0.2s ease;" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='transparent'">⚙</button></div>`;

AppRegistry.register('gallery', GalleryApp);
window.GalleryApp = GalleryApp;
// Expose a simple Gallery API for other parts of the app cuz why not, may be useful for camera app and such. Note that open() will attempt to launch the Gallery app if not already open, but if it fails to launch or find the item, it will still return the item data (or null) so it can be used in other contexts if needed.
window.GalleryAPI = {
    list: async () => { return await listMedia(); },
    getBlob: async (id) => { return await getMediaBlob(id); },
    getDataUrl: async (id) => { const b = await getMediaBlob(id); return await blobToDataURL(b); },
    open: async (id) => {
        try {
            // Ensure the Gallery app is launched as a window
            if (typeof window.launch === 'function') {
                console.log('GalleryAPI.open: launching gallery window');
                window.launch('gallery');
            }
            await new Promise(r => setTimeout(r, 250));
            console.log('GalleryAPI.open: dispatching gallery-open-item for', id);
            window.dispatchEvent(new CustomEvent('gallery-open-item', { detail: { id } }));
        } catch (e) { /* ignore */ }
        const dbItems = await listMedia();
        return dbItems.find(x => x.id === id);
    }
};

})();
