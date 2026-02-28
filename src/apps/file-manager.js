(function(){
  const html = window.html;
  const useState = window.useState;
  const useEffect = window.useEffect;
  const useRef = window.useRef;
  if (!html || !useState) return; // file manager missing deps

  const ROOT = 'C:\\';
  const CHUNK_UPLOAD_THRESHOLD = 5 * 1024 * 1024; // 5MB
  const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB per chunk

  function openFs(){
    return new Promise((resolve,reject)=>{
      try{
        const r = indexedDB.open('glex_fs',1);
        r.onupgradeneeded = (e)=>{ const db = e.target.result; if(!db.objectStoreNames.contains('nodes')) db.createObjectStore('nodes',{ keyPath: 'path' }); };
        r.onsuccess = ()=> resolve(r.result);
        r.onerror = ()=> reject(r.error);
      }catch(e){ reject(e); }
    });
  }

  async function fsPut(node){ const db = await openFs(); const tx = db.transaction('nodes','readwrite'); tx.objectStore('nodes').put(node); return new Promise(r=>{ tx.oncomplete=()=>{ try{db.close();}catch(e){} r(node); }; tx.onerror=()=>{ try{db.close();}catch(e){} r(null); }; }); }
  async function fsGet(path){ const db = await openFs(); return new Promise(r=>{ try{ const tx = db.transaction('nodes','readonly'); const req = tx.objectStore('nodes').get(path); req.onsuccess=()=>{ r(req.result); try{db.close();}catch(e){} }; req.onerror=()=>{ r(null); try{db.close();}catch(e){} }; }catch(e){ r(null); try{db.close();}catch(e){} } }); }
  async function fsDelete(path){ const db = await openFs(); return new Promise(r=>{ try{ const tx = db.transaction('nodes','readwrite'); tx.objectStore('nodes').delete(path); tx.oncomplete=()=>{ try{db.close();}catch(e){} r(true); }; tx.onerror=()=>{ try{db.close();}catch(e){} r(false); }; }catch(e){ r(false); try{db.close();}catch(e){} } }); }
  async function fsList(prefix){ const db = await openFs(); return new Promise(r=>{ try{ const tx = db.transaction('nodes','readonly'); const store = tx.objectStore('nodes'); const res = []; store.openCursor().onsuccess = function(ev){ const cur = ev.target.result; if(!cur){ try{db.close();}catch(e){} r(res); return; } const p = cur.value.path; if (p !== prefix && p.startsWith(prefix)) res.push(cur.value); cur.continue(); }; }catch(e){ r([]); try{db.close();}catch(e){} } }); }

  function norm(p){ if(!p) return ROOT; p = String(p).replace(/\//g,'\\'); if(!p.startsWith('C:')) p = 'C:' + (p.startsWith('\\')? '' : '\\') + p; if(!p.endsWith('\\') && p !== 'C:') p = p; return p; }
  function join(parent,name){ if(parent.endsWith('\\')) return parent + name; return parent + '\\' + name; }
  function parentOf(p){ if(!p) return null; const i = p.lastIndexOf('\\'); if(i<=2) return ROOT; return p.slice(0,i); }

  const FileManagerApp = ({ settings }) => {
    const [cwd, setCwd] = useState(ROOT);
    const [nodes, setNodes] = useState([]);
    const [selectedItems, setSelectedItems] = useState([]); // array of paths
    const [editorOpen, setEditorOpen] = useState(false);
    const [editorText, setEditorText] = useState('');
    const [newName, setNewName] = useState('');
    const fileInputRef = useRef(null);
    const dropRef = useRef(null);
    const [playerOpen, setPlayerOpen] = useState(false);
    const [playlist, setPlaylist] = useState([]);
    const [playlistIndex, setPlaylistIndex] = useState(0);
    const playerRef = useRef(null);
    const [playing, setPlaying] = useState(false);
    const [playProgress, setPlayProgress] = useState(0);
    const [playTime, setPlayTime] = useState(0);
    const [volume, setVolume] = useState(1);
    const [muted, setMuted] = useState(false);
    const [speed, setSpeed] = useState(1);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [zipProgress, setZipProgress] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState(null);
    const [previewNode, setPreviewNode] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [imageViewerOpen, setImageViewerOpen] = useState(false);
    const [imageViewerIndex, setImageViewerIndex] = useState(0);
    const [imageList, setImageList] = useState([]);
    const [imageViewerSrc, setImageViewerSrc] = useState(null);
    const [imageZoom, setImageZoom] = useState(1);
    const [imageRotate, setImageRotate] = useState(0);
    const [imagePan, setImagePan] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const panRef = useRef({ lastX: 0, lastY: 0 });
    const [fitMode, setFitMode] = useState('contain'); // 'contain' or 'actual'

    useEffect(()=>{ refresh(); }, [cwd]);

    

    useEffect(() => {
      if (previewUrl) {
        try { URL.revokeObjectURL(previewUrl); } catch (e) {}
      }
      setPreviewUrl(null);
      setPreviewNode(null);
      return () => {};
    }, [selectedItems]);

    useEffect(() => {
      let mounted = true;
      if (!searchTerm || !String(searchTerm).trim()) { setSearchResults(null); return; }
      (async () => {
        try {
          const all = await fsList(cwd);
          if (!mounted) return;
          const q = String(searchTerm).toLowerCase();
          const matches = (all || []).filter(n => {
            if (!n || !n.name) return false;
            return n.type === 'file' && String(n.name).toLowerCase().includes(q);
          }).sort((a,b)=> (a.name||'').localeCompare(b.name||''));
          setSearchResults(matches);
        } catch (e) { if (mounted) setSearchResults([]); }
      })();
      return () => { mounted = false; };
    }, [searchTerm, cwd]);

    useEffect(() => {
      const handler = (e) => {
        const d = e && e.detail; if (!d || !d.action) return;
        try {
          if (d.action === 'new-folder') {
            const name = prompt('Folder name'); if (name) { setNewName(''); try{ createFolder(name); }catch(e){} }
            return;
          }
          if (d.action === 'upload') { if (fileInputRef.current) fileInputRef.current.click(); return; }
          if (d.action === 'delete-selected') { removeSelected(); return; }
          if (d.action === 'refresh') { refresh(); return; }
          if (d.action === 'zip-selected') { createZipFromSelected(); return; }
          if (d.action === 'unzip-target') { const t = selectedItems && selectedItems[0]; if(t) unzipNode(t, cwd); return; }
          if (d.action === 'play-selected') { playSelected(); return; }
        } catch (err) { /* filemanager-action error */ }
      };
      window.addEventListener('filemanager-action', handler);
      return () => window.removeEventListener('filemanager-action', handler);
    }, [fileInputRef, selectedItems, cwd, newName]);

    useEffect(() => {
      try {
        if (playerRef.current) {
          playerRef.current.volume = volume;
          playerRef.current.playbackRate = speed;
          playerRef.current.muted = muted;
        }
      } catch (e) {}
    }, [volume, speed, muted]);

    useEffect(() => {
      const onKey = (e) => {
        if (!playerOpen) return;
        if (e.key === ' ' || e.code === 'Space') {
          e.preventDefault(); if (playerRef.current) { if (playerRef.current.paused) { playerRef.current.play().catch(()=>{}); } else { playerRef.current.pause(); } }
        }
        if (e.key === 'ArrowRight') { if (playerRef.current && playerRef.current.duration) playerRef.current.currentTime = Math.min(playerRef.current.duration, playerRef.current.currentTime + 5); }
        if (e.key === 'ArrowLeft') { if (playerRef.current && playerRef.current.duration) playerRef.current.currentTime = Math.max(0, playerRef.current.currentTime - 5); }
        if (e.key === 'f') { try{ const el = playerRef.current; if (el && el.requestFullscreen) el.requestFullscreen(); }catch(e){} }
        if (e.key === 'm') { setMuted(m=>{ const nm = !m; try{ if(playerRef.current) playerRef.current.muted = nm; }catch(e){} return nm; }); }
      };
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }, [playerOpen]);

    async function ensureRoot(){ const r = await fsGet(ROOT); if(!r) await fsPut({ path: ROOT, type: 'folder', name: 'C:\\', createdAt: Date.now(), updatedAt: Date.now() }); }

    async function refresh(){
      await ensureRoot();
      const list = await fsList(cwd);
      const children = list.filter(n => {
        if (n.path === cwd) return false;
        let rel = n.path.slice(cwd.length);
        rel = rel.replace(/^\\+/, '');
        if (!rel) return false;
        return rel.indexOf('\\') === -1;
      }).sort((a,b)=> {
        try {
          if (a.type === b.type) return String(a.name || '').localeCompare(String(b.name || ''));
          return a.type === 'folder' ? -1 : 1;
        } catch (e) { return 0; }
      });
      setNodes(children);
      setSelectedItems([]);
    }

    function breadcrumbs(p){
      const parts = p.split('\\').filter(Boolean);
      const acc = [];
      const res = [];
      for(let i=0;i<parts.length;i++){
        acc.push(parts[i]);
        res.push({ name: parts[i], path: (i===0? parts[i] : acc.join('\\')) });
      }
      return res;
    }

    const createFolder = async (providedName) => {
      const raw = providedName !== undefined ? providedName : newName;
      const name = raw && String(raw).trim(); if(!name) return; const p = join(cwd,name);
      // avoid overwrite
      const exists = await fsGet(p);
      if (exists) { setNewName(''); return; }
      await fsPut({ path: p, type: 'folder', name, createdAt: Date.now(), updatedAt: Date.now() }); setNewName(''); refresh();
      try { if (window.NotificationCenter) window.NotificationCenter.notify({ title: 'Folder created', message: p, appId: 'filemanager', actions: [{ label: 'Note', callback: () => setCwd(p) }], timeout: 3000 }); } catch(e){}
    };

    const uploadFile = async (file, onProgress) => {
      if(!file) return;
      const p = join(cwd, file.name);
      const isVideo = file.type && String(file.type).startsWith('video/');
      // chunked upload for big files
      if (file.size > CHUNK_UPLOAD_THRESHOLD && !isVideo) {
        const total = file.size;
        const chunkCount = Math.ceil(total / CHUNK_SIZE);
        // store a manifest first
        await fsPut({ path: p, type: 'file', name: file.name, size: file.size, mime: file.type, blobMeta: true, chunked: true, chunkCount, createdAt: Date.now(), updatedAt: Date.now() });
        for (let i = 0; i < chunkCount; i++) {
          const start = i * CHUNK_SIZE; const end = Math.min(total, start + CHUNK_SIZE);
          const slice = file.slice(start, end);
          const b64 = await blobToBase64(slice);
          await fsPut({ path: p + '::chunk::' + i, data: b64, index: i, size: end - start });
          if (typeof onProgress === 'function') onProgress(Math.round(((i+1)/chunkCount)*100));
        }
        // update manifest timestamp
        const manifest = await fsGet(p);
        manifest.updatedAt = Date.now();
        await fsPut(manifest);
        refresh();
        try { if (window.NotificationCenter) window.NotificationCenter.notify({ title: 'Upload complete', message: file.name, appId: 'filemanager', timeout: 3000 }); } catch(e){}
        return;
      }

      // small file: store as single base64 blob
      const arr = await new Promise(r => { const fr = new FileReader(); fr.onload = e => r(e.target.result); fr.readAsArrayBuffer(file); });
      const blob = new Blob([arr], { type: file.type || 'application/octet-stream' });
      const p2 = p;
      await fsPut({ path: p2, type: 'file', name: file.name, size: file.size, mime: file.type, blobMeta: true, data: await blobToBase64(blob), createdAt: Date.now(), updatedAt: Date.now() });
      refresh();
      try { if (window.NotificationCenter) window.NotificationCenter.notify({ title: 'Upload complete', message: file.name, appId: 'filemanager', timeout: 3000 }); } catch(e){}
    };

    // handle multiple file uploads (used by drag/drop)
    const uploadFiles = async (files) => {
      if (!files || !files.length) return;
      for (let i=0;i<files.length;i++) {
        try { await uploadFile(files[i], (p)=>{/* placeholder progress */}); } catch(e) { /* uploadFiles item failed */ }
      }
      // ensure UI refresh and notify others
      try { await refresh(); } catch(e) { /* ignore */ }
      try { window.dispatchEvent(new CustomEvent('filemanager-updated', { detail: { cwd } })); } catch(e) {}
    };

    async function blobToBase64(blob){ return new Promise(r => { const fr = new FileReader(); fr.onload = e => { try { const dataUrl = e.target.result; const comma = dataUrl.indexOf(','); r(comma>=0? dataUrl.slice(comma+1) : dataUrl); } catch(err){ r(null); } }; fr.readAsDataURL(blob); }); }
    function base64ToBlob(b64, type){ const bin = atob(b64); const len = bin.length; const arr = new Uint8Array(len); for(let i=0;i<len;i++) arr[i]=bin.charCodeAt(i); return new Blob([arr], { type: type || 'application/octet-stream' }); }

    async function buildPreviewForNode(n){
      try {
        if (!n) return null;
        // revoke previous
        try{ if (previewUrl) { URL.revokeObjectURL(previewUrl); } } catch(e){}
        setPreviewUrl(null);
        setPreviewNode(n);
        if (n.blobMeta) {
          const PREVIEW_MAX = 50 * 1024 * 1024; // 50MB
          const size = n.size || 0;
          if (n.chunked) {
            const parts = [];
            for (let i = 0; i < (n.chunkCount || 0); i++) {
              const ch = await fsGet(n.path + '::chunk::' + i);
              if (ch && ch.data) parts.push(ch.data);
            }
            const all = parts.join('');
            if (size <= PREVIEW_MAX) {
              const blob = base64ToBlob(all, n.mime);
              const u = URL.createObjectURL(blob); setPreviewUrl(u); return u;
            }
            return null;
          } else if (n.data) {
            if (size <= PREVIEW_MAX) {
              if (String(n.data).startsWith('data:')) {
                try { const res = await fetch(n.data); const blob = await res.blob(); const u = URL.createObjectURL(blob); setPreviewUrl(u); return u; } catch(e){}
              }
              const blob = base64ToBlob(n.data, n.mime);
              const u = URL.createObjectURL(blob); setPreviewUrl(u); return u;
            }
            return null;
          }
        }
        if (n.url) { setPreviewUrl(n.url); return n.url; }
      } catch (e) { /* buildPreviewForNode error */ }
      return null;
    }

    const downloadNode = async (n) => {
      if(!n) return; if(n.type === 'folder') return;
      try { window.NotificationCenter && window.NotificationCenter.notify({ title: 'Download started', message: n.name, appId: 'filemanager', timeout: 4000 }); } catch(e){}
      let data = n.data;
      if(n.blobMeta && data){
        let blob = null;
        if (n.chunked) {
          const parts = [];
          for (let i = 0; i < (n.chunkCount || 0); i++) {
            const ch = await fsGet(n.path + '::chunk::' + i);
            if (ch && ch.data) parts.push(ch.data);
          }
          const all = parts.join('');
          blob = base64ToBlob(all, n.mime);
        } else {
          blob = base64ToBlob(data, n.mime);
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = n.name; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
        try { window.NotificationCenter && window.NotificationCenter.notify({ title: 'Download complete', message: n.name, appId: 'filemanager', timeout: 3000 }); } catch(e){}
      }
    };

    const isTextLike = (n) => {
      if (!n) return false;
      try {
        const name = String(n.name || '').toLowerCase();
        if (n.mime && (n.mime.startsWith('text/') || n.mime === 'application/json')) return true;
        if (/\.(txt|md|markdown|js|ts|jsx|tsx|css|html?|json|csv|xml|py|java|c|cpp|h)$/i.test(name)) return true;
      } catch (e) {}
      return false;
    };

    const isImageLike = (n) => {
      if (!n) return false;
      try {
        if (n.mime && n.mime.startsWith('image/')) return true;
        const name = String(n.name || '').toLowerCase();
        return /\.(png|jpe?g|gif|webp|bmp|svg|avif|heic)$/i.test(name);
      } catch (e) { return false; }
    };

    const isVideoLike = (n) => {
      if (!n) return false;
      try {
        if (n.mime && n.mime.startsWith('video/')) return true;
        const name = String(n.name || '').toLowerCase();
        return /\.(mp4|mov|webm|ogv|m4v|mkv)$/i.test(name);
      } catch (e) { return false; }
    };

    const getTextPreview = (n, maxChars = 20000) => {
      if (!n) return '';
      try {
        if (n.content) return String(n.content).slice(0, maxChars);
        if (n.blobMeta && n.data) {
          try { const decoded = decodeURIComponent(escape(atob(n.data))); return String(decoded).slice(0, maxChars); } catch (e) { try { return String(atob(n.data)).slice(0, maxChars); } catch (err) { return ''; } }
        }
      } catch (e) {}
      return '';
    };

    const sendToNotes = async (node) => {
      if (!node) return;
      try {
        const n = await fsGet(node.path);
        if (!n) return;
        let text = '';
        if (n.blobMeta && n.data) {
          try { text = decodeURIComponent(escape(atob(n.data))); } catch (e) { try { text = atob(n.data); } catch (err) { text = ''; } }
        } else {
          text = n.content || '';
        }
        const payload = { path: n.path, name: n.name, mime: n.mime, content: text };
        try { if (window.launch) window.launch('Notes'); } catch (e) {}
        setTimeout(() => {
          try { window.dispatchEvent(new CustomEvent('notes-open-file', { detail: payload })); } catch (e) {}
          try { window.dispatchEvent(new CustomEvent('glex-open-file', { detail: { appId: 'notes', payload } })); } catch (e) {}
        }, 160);
      } catch (e) { /* sendToNotes error */ }
    };

    function formatSize(bytes){ if(!bytes && bytes !== 0) return ''; if(bytes < 1024) return bytes + ' B'; if(bytes < 1024*1024) return (bytes/1024).toFixed(1) + ' KB'; return (bytes/(1024*1024)).toFixed(1) + ' MB'; }

    const openNode = async (n) => { if(!n) return; if(n.type === 'folder'){ setCwd(n.path); return; } // file
      if (isImageLike(n)){
        try {
          const parent = parentOf(n.path) || cwd;
          let imgs = [];
          if (parent === cwd) {
            imgs = (nodes||[]).filter(x => x && x.type==='file' && isImageLike(x)).map(x=>x.path);
          } else {
            const all = await fsList(parent);
            imgs = (all||[]).filter(x => x && x.type==='file' && isImageLike(x)).map(x=>x.path);
          }
          const idx = imgs.indexOf(n.path);
          setImageList(imgs);
          setImageViewerIndex(idx >= 0 ? idx : 0);
          await openImageAtPath(n.path);
          setImageViewerOpen(true);
        } catch(e){ /* open image viewer error */ }
        return;
      }
      if (isVideoLike(n)){
        try {
          const parent = parentOf(n.path) || cwd;
          let vids = [];
          if (parent === cwd) {
            vids = (nodes||[]).filter(x => x && x.type==='file' && isVideoLike(x)).map(x=>x.path);
          } else {
            const all = await fsList(parent);
            vids = (all||[]).filter(x => x && x.type==='file' && isVideoLike(x)).map(x=>x.path);
          }
          const idx = vids.indexOf(n.path);
          let url = n.url || null;
          if (!url) {
            let blob = null;
            if (n.blobMeta) {
              if (n.data) blob = base64ToBlob(n.data, n.mime);
              else if (n.chunked) {
                const parts = [];
                for (let i = 0; i < (n.chunkCount || 0); i++) {
                  const ch = await fsGet(n.path + '::chunk::' + i);
                  if (ch && ch.data) parts.push(ch.data);
                }
                if (parts.length) {
                  const all = parts.join('');
                  blob = base64ToBlob(all, n.mime);
                }
              }
            }
            if (blob) url = URL.createObjectURL(blob);
          }
          const list = vids.map(p => ({ path: p, url: null }));
          for (let i=0;i<list.length;i++){
            if (list[i].path === n.path) list[i].url = url;
            else {
              try { const other = await fsGet(list[i].path); if (other) { if (other.data) list[i].url = URL.createObjectURL(base64ToBlob(other.data, other.mime)); else if (other.blobMeta && other.chunked) { const parts = []; for (let j=0;j<(other.chunkCount||0);j++){ const ch = await fsGet(other.path+'::chunk::'+j); if (ch && ch.data) parts.push(ch.data); } if (parts.length) list[i].url = URL.createObjectURL(base64ToBlob(parts.join(''), other.mime)); } } } catch(e){}
            }
          }
          setPlaylist(list.map(x=>({ url: x.url, name: x.path.split('\\').pop(), mime: 'video/*' }))); setPlaylistIndex(idx >= 0 ? idx : 0); setPlayerOpen(true);
        } catch(e){ /* open video error */ }
        return;
      }
      if (n.mime && n.mime.startsWith('video/')) {
        try {
          let blob = null;
          if (n.blobMeta) {
            if (n.data) blob = base64ToBlob(n.data, n.mime);
            else if (n.chunked) {
              const parts = [];
              for (let i = 0; i < (n.chunkCount || 0); i++) {
                const ch = await fsGet(n.path + '::chunk::' + i);
                if (ch && ch.data) parts.push(ch.data);
              }
              if (parts.length) {
                const all = parts.join('');
                blob = base64ToBlob(all, n.mime);
              }
            }
          }
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          try { playlist.forEach(p => p.url && URL.revokeObjectURL(p.url)); } catch (e) {}
          setPlaylist([{ url, name: n.name, mime: n.mime }]); setPlaylistIndex(0); setPlayerOpen(true);
        } catch (e) { /* open video error */ }
        return;
      }
      // markdown preview
      if(n.mime && n.mime === 'text/markdown' || n.name.match(/\.md$/i)){
        let text = '';
        if(n.blobMeta && n.data) text = decodeURIComponent(escape(atob(n.data)));
        else text = n.content || '';
        setEditorText(text); setEditorOpen(true); setSelectedItems([n.path]); return;
      }
      if(n.mime && n.mime.startsWith('text/') || n.name.match(/\.txt$|\.json$|\.js$|\.html$/i)){
        let text = '';
        if(n.blobMeta && n.data) text = decodeURIComponent(escape(atob(n.data)));
        else text = n.content || '';
        setEditorText(text); setEditorOpen(true); setSelectedItems([n.path]); return;
      }
      const findDefaultApp = (node) => {
        if (!node || !node.name) return null;
        const nm = String(node.name || '').toLowerCase();
        if (/\.md$|\.txt$|\.json$|\.js$|\.html?$/.test(nm)) return 'notes';
        return null;
      };

      const openWithApp = async (appId, node) => {
        if (!appId || !node) return false;
        // prepare payload: try to provide a blob URL when possible
        const payload = { path: node.path, name: node.name, mime: node.mime };
        try {
          if (node.blobMeta && node.data) {
            const blob = base64ToBlob(node.data, node.mime);
            const url = URL.createObjectURL(blob);
            payload.url = url;
          } else if (node.content) {
            payload.content = node.content;
          }
        } catch (e) { /* ignore */ }

        try {
          if (window.launch) window.launch(appId);
          setTimeout(() => {
            try { window.dispatchEvent(new CustomEvent(appId.toLowerCase() + '-open-file', { detail: payload })); } catch (e) {}
            try { window.dispatchEvent(new CustomEvent('glex-open-file', { detail: { appId, payload } })); } catch (e) {}
          }, 160);
          return true;
        } catch (e) { return false; }
      };

      const def = findDefaultApp(n);
      if (def) { const ok = await openWithApp(def, n); if (ok) return; }

      // Don't auto-download unknown file types. For text-like files, open in Notes; otherwise show info.
      if (isTextLike(n)) { try { sendToNotes(n); } catch(e){ /* sendToNotes fallback */ } return; }
      try { alert('No viewer available for this file type. Use the DL button to download.'); } catch(e){}
      return;
    };

    const saveEditor = async () => { const p = selectedItems && selectedItems[0]; if(!p) return; const node = await fsGet(p); node.content = editorText; node.updatedAt = Date.now(); await fsPut(node); setEditorOpen(false); refresh(); };

    const remove = async (n) => { if(!n) return; // if folder, delete recursive
      if(n.type === 'folder'){
        const children = await fsList(n.path);
        for(const c of children) await fsDelete(c.path);
      }
      await fsDelete(n.path); refresh();
      try { if (window.NotificationCenter) window.NotificationCenter.notify({ title: 'Deleted', message: n.path || n.name, appId: 'filemanager', timeout: 3000 }); } catch(e){}
    };

    const rename = async (n,newNm) => { if(!n||!newNm) return; const np = join(parentOf(n.path), newNm); const old = await fsGet(n.path); if(!old) return; old.name = newNm; old.path = np; old.updatedAt = Date.now(); await fsPut(old); await fsDelete(n.path); refresh(); };

    // multi-delete
    const removeSelected = async () => {
      if (!selectedItems || !selectedItems.length) return;
      for (const p of selectedItems) {
        const n = await fsGet(p); if (!n) continue; await remove(n);
      }
      setSelectedItems([]);
    };

    // Create a ZIP from selected files and trigger download (requires vendor JSZip as window.JSZip)
    const createZipFromSelected = async () => {
      if (!window.JSZip) { alert('JSZip not available'); return; }
      if (!selectedItems || !selectedItems.length) return;
      const zip = new window.JSZip();
      setZipProgress({ step: 'collecting', count: selectedItems.length });
      for (let i = 0; i < selectedItems.length; i++) {
        const p = selectedItems[i]; const n = await fsGet(p); if (!n) continue;
        if (n.type === 'file') {
          let blob;
          if (n.blobMeta && n.data) blob = base64ToBlob(n.data, n.mime);
          else if (n.content) blob = new Blob([n.content], { type: n.mime || 'application/octet-stream' });
          else continue;
          const arr = await blob.arrayBuffer();
          zip.file(n.name, arr);
        }
        setZipProgress({ step: 'adding', index: i+1, total: selectedItems.length });
      }
      setZipProgress({ step: 'generating' });
      const content = await zip.generateAsync({ type: 'blob' }, metadata => {
        setZipProgress({ step: 'generating', progress: metadata.percent });
      });
      const url = URL.createObjectURL(content); const a = document.createElement('a'); a.href = url; a.download = 'files.zip'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
      try { window.NotificationCenter && window.NotificationCenter.notify({ title: 'ZIP ready', message: 'files.zip', appId: 'filemanager', timeout: 3000 }); } catch(e){}
      setZipProgress(null);
    };

    const unzipNode = async (nodePath, targetFolder) => {
      if (!window.JSZip) { alert('JSZip not available'); return; }
      const n = await fsGet(nodePath); if(!n) return;
      let blob;
      if (n.blobMeta && n.data) blob = base64ToBlob(n.data, n.mime);
      else { alert('Not a zip file'); return; }
      const arrayBuffer = await blob.arrayBuffer();
      const zip = await window.JSZip.loadAsync(arrayBuffer);
      const entries = Object.keys(zip.files);
      for (const entryName of entries) {
        const entry = zip.file(entryName);
        if (!entry) {
          const dir = entryName.replace(/\/+$/,'');
          if (!dir) continue;
          const parts = dir.split('/').filter(Boolean);
          let cur = targetFolder;
          for (const part of parts) {
            cur = join(cur, part);
            const ex = await fsGet(cur);
            if (!ex) {
              await fsPut({ path: cur, type: 'folder', name: part, createdAt: Date.now(), updatedAt: Date.now() });
            }
          }
          continue;
        }
        const parts = entryName.split('/').filter(Boolean);
        const fileName = parts.pop();
        let curFolder = targetFolder;
        for (const part of parts) {
          curFolder = join(curFolder, part);
          const ex = await fsGet(curFolder);
          if (!ex) {
            await fsPut({ path: curFolder, type: 'folder', name: part, createdAt: Date.now(), updatedAt: Date.now() });
          }
        }
        const content = await entry.async('uint8array');
        const childPath = join(curFolder, fileName);
        const childBlob = new Blob([content]);
        const base64Data = await blobToBase64(childBlob);
        await fsPut({ path: childPath, type: 'file', name: fileName, size: content.length, mime: '', blobMeta: true, data: base64Data, createdAt: Date.now(), updatedAt: Date.now() });
      }
      refresh();
      try { if (window.NotificationCenter) window.NotificationCenter.notify({ title: 'Unzip complete', message: targetFolder, appId: 'filemanager', timeout: 3000 }); } catch(e){}
    };

    const playSelected = async () => {
      if (!selectedItems || !selectedItems.length) return;
      const list = [];
      for (const p of selectedItems) {
        const n = await fsGet(p); if (!n || n.type !== 'file') continue;
        // only audio/video
        if (n.mime && (n.mime.startsWith('audio/') || n.mime.startsWith('video/'))) {
          let blob = null;
          if (n.blobMeta) {
            if (n.data) {
              blob = base64ToBlob(n.data, n.mime);
            } else if (n.chunked) {
              // assemble chunks for playback
              const parts = [];
              for (let i = 0; i < (n.chunkCount || 0); i++) {
                const ch = await fsGet(n.path + '::chunk::' + i);
                if (ch && ch.data) parts.push(ch.data);
              }
              if (parts.length) {
                const all = parts.join('');
                blob = base64ToBlob(all, n.mime);
              }
            }
          }
          if (!blob) continue;
          const url = URL.createObjectURL(blob);
          list.push({ url, name: n.name, mime: n.mime });
        }
      }
      if (!list.length) return alert('No playable files selected');
      // cleanup previous playlist urls
      try { playlist.forEach(p => p.url && URL.revokeObjectURL(p.url)); } catch (e) {}
      setPlaylist(list); setPlaylistIndex(0); setPlayerOpen(true);
    };

    // Open an image by path into the viewer (assemble blob if needed)
    const openImageAtPath = async (path) => {
      try {
        const n = await fsGet(path);
        if (!n) return null;
        let blob = null;
        if (n.blobMeta) {
          if (n.data) {
            blob = base64ToBlob(n.data, n.mime);
          } else if (n.chunked) {
            const parts = [];
            for (let i = 0; i < (n.chunkCount || 0); i++) {
              const ch = await fsGet(n.path + '::chunk::' + i);
              if (ch && ch.data) parts.push(ch.data);
            }
            if (parts.length) {
              const all = parts.join('');
              blob = base64ToBlob(all, n.mime);
            }
          }
        }
        if (!blob && n.url) {
          setImageViewerSrc(n.url);
          setImageZoom(1);
          setImageRotate(0);
          setImagePan({ x: 0, y: 0 });
          setFitMode('contain');
          return n.url;
        }
        if (blob) {
          try { if (imageViewerSrc) { URL.revokeObjectURL(imageViewerSrc); } } catch(e){}
          const u = URL.createObjectURL(blob);
          setImageViewerSrc(u);
          setImageZoom(1);
          setImageRotate(0);
          setImagePan({ x: 0, y: 0 });
          setFitMode('contain');
          return u;
        }
        return null;
      } catch (e) { /* openImageAtPath error */ return null; }
    };

    // Image viewer keyboard shortcuts: nav, zoom, close
    useEffect(() => {
      const onKey = (e) => {
        if (!imageViewerOpen) return;
        if (e.key === 'Escape') {
          try{ if (imageViewerSrc) URL.revokeObjectURL(imageViewerSrc); }catch(e){}
          setImageViewerOpen(false);
        }
        if (e.key === 'ArrowLeft') {
          const idx = Math.max(0, imageViewerIndex-1);
          setImageViewerIndex(idx);
          if (imageList[idx]) openImageAtPath(imageList[idx]);
        }
        if (e.key === 'ArrowRight') {
          const idx = Math.min(imageList.length-1, imageViewerIndex+1);
          setImageViewerIndex(idx);
          if (imageList[idx]) openImageAtPath(imageList[idx]);
        }
        if (e.key === '+' || e.key === '=' ) { setImageZoom(z=>Math.min(8, +(z+0.2).toFixed(3))); setFitMode('actual'); }
        if (e.key === '-') { setImageZoom(z=>Math.max(0.2, +(z-0.2).toFixed(3))); setFitMode('actual'); }
      };
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }, [imageViewerOpen, imageViewerIndex, imageList, imageViewerSrc]);

    

    return html`
        <div style="width:100%;height:100%;display:flex;gap:12px;padding:12px;box-sizing:border-box;" ondragover=${e=>{ e.preventDefault(); }} ondrop=${e=>{ e.preventDefault(); const dt = e.dataTransfer; if(dt && dt.files && dt.files.length){ uploadFiles(dt.files); } }} ref=${dropRef}>
          <input ref=${fileInputRef} type="file" style="display:none" onchange=${e=>{ const files = e.target.files; if(files && files.length) uploadFiles(files); e.target.value = ''; }} multiple />
          <div style="flex:1;display:flex;flex-direction:column;gap:12px;">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
              <div style="display:flex;align-items:center;gap:8px;">
                ${breadcrumbs(cwd).map((b, i) => html`<button onclick=${()=>setCwd((i===0? b.name : b.path))} style="background:transparent;border:none;color:var(--text-main);opacity:0.8;padding:4px 6px;border-radius:6px;">${b.name}${i < breadcrumbs(cwd).length-1 ? ' ▸' : ''}</button>`)}
              </div>
              <div style="display:flex;align-items:center;gap:8px;">
                <input placeholder="Search files" value=${searchTerm} onInput=${e=>setSearchTerm(e.target.value)} style="padding:8px;border-radius:8px;background:transparent;border:1px solid rgba(255,255,255,0.06);color:#fff;" />
              </div>
            </div>

            <div style="display:flex;gap:12px;flex:1;overflow:hidden;">
              <div tabindex="0" style="flex:1;overflow:auto;padding:6px;border-radius:8px;border:1px solid var(--border);background:transparent;">
                <div class="fm-grid">
                  ${searchTerm && searchResults === null ? html`<div style="color:#bbb;padding:12px;width:100%">Searching...</div>` : ''}
                  ${(searchTerm ? (searchResults || []) : nodes).map(n => html`
                    <div key=${n.path} class=${'fm-tile ' + (selectedItems.includes(n.path) ? 'selected':'' )}
                         onClick=${(e)=>{
                           e.stopPropagation();
                           if (e.shiftKey) { setSelectedItems(s => (s.includes(n.path) ? s : s.concat([n.path]))); }
                           else if (e.ctrlKey || e.metaKey) { setSelectedItems(s => (s.includes(n.path) ? s.filter(x=>x!==n.path) : s.concat([n.path]))); }
                           else {
                             if (selectedItems.includes(n.path)) {
                               try {
                                 if (n && n.mime && (n.mime.startsWith('image/') || n.mime.startsWith('video/') || n.mime.startsWith('audio/'))) {
                                   openNode(n);
                                 } else if (isTextLike(n)) {
                                   sendToNotes(n);
                                 } else {
                                   openNode(n);
                                 }
                               } catch (e) { try { openNode(n); } catch(err){} }
                             } else {
                               setSelectedItems([n.path]);
                             }
                           }
                         }}
                         onDblClick=${(e)=>{ e.stopPropagation(); try { if (n && n.mime && (n.mime.startsWith('image/') || n.mime.startsWith('video/') || n.mime.startsWith('audio/'))) { openNode(n); } else if (isTextLike(n)) { sendToNotes(n); } else { openNode(n); } } catch(err){ try{ openNode(n); }catch(e){} } }}>
                      <div class="icon">${n.type==='folder' ? '[DIR]':'[FILE]'}</div>
                      <div class="name">${n.name}</div>
                      <div class="meta">${n.type==='folder' ? 'Folder' : (n.size ? formatSize(n.size) : (n.mime || 'File'))}</div>
                      <div class="fm-actions">
                        <button onclick=${(e)=>{ e.stopPropagation(); downloadNode(n); }}>DL</button>
                        ${isTextLike(n) ? html`<button title="Open in Notes" onclick=${(e)=>{ e.stopPropagation(); sendToNotes(n); }}>Note</button>` : ''}
                        ${ (n && (n.mime === 'application/zip' || (n.name && String(n.name).toLowerCase().endsWith('.zip')))) ? html`<button title="Unzip" onclick=${async (e)=>{ e.stopPropagation(); try { const target = parentOf(n.path) || cwd; await unzipNode(n.path, target); alert('Unzipped to ' + target); } catch(err){ console.warn('unzip', err); alert('Unzip failed'); } }}>UNZIP</button>` : '' }
                        <button onclick=${(e)=>{ e.stopPropagation(); remove(n); }}>Del</button>
                      </div>
                    </div>
                  `)}
                </div>
              </div>

              
            </div>
            ${zipProgress ? html`<div style="height:8px;border-radius:8px;overflow:hidden;background:rgba(255,255,255,0.04);"><div style="height:100%;width:${zipProgress.progress||0}% ;background:linear-gradient(90deg,var(--accent),rgba(255,255,255,0.06));"></div></div>` : ''}
          </div>

        
        ${playerOpen ? html`<div style="position:fixed;left:0;top:0;right:0;bottom:0;display:flex;align-items:center;justify-content:center;z-index:3000;">
          <div style="background:rgba(6,6,8,0.96);padding:14px;border-radius:10px;color:#fff;display:flex;flex-direction:column;gap:12px;min-width:420px;max-width:1100px;box-shadow:0 10px 30px rgba(0,0,0,0.6);">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
              <div style="font-weight:700;font-size:16px;">${playlist && playlist[playlistIndex] ? playlist[playlistIndex].name : 'Player'}</div>
              <div style="display:flex;gap:8px;align-items:center;">
                <button onclick=${() => setPlaylistIndex(i=>Math.max(0,i-1))} style="padding:8px;border-radius:8px;background:transparent;border:1px solid rgba(255,255,255,0.04);">◀</button>
                <button onclick=${async () => { if (playerRef.current) { if (playing) { playerRef.current.pause(); } else { try { await playerRef.current.play(); } catch(e){} } } }} title="Play/Pause" style="padding:8px;border-radius:8px;background:linear-gradient(90deg,var(--accent),rgba(255,255,255,0.04));border:none;font-weight:700;">${playing ? '❚❚' : '▶'}</button>
                <button onclick=${() => setPlaylistIndex(i=>Math.min(playlist.length-1,i+1))} style="padding:8px;border-radius:8px;background:transparent;border:1px solid rgba(255,255,255,0.04);">▶</button>
                <button onclick=${() => { setPlayerOpen(false); try{ playlist.forEach(p=>p.url && URL.revokeObjectURL(p.url)); }catch(e){} setPlaylist([]); setPlaylistIndex(0); setPlaying(false); }} style="padding:8px;border-radius:8px;background:transparent;border:1px solid rgba(255,255,255,0.04);">Close</button>
              </div>
            </div>

            <div style="display:flex;gap:12px;align-items:center;">
              <div style="flex:1;max-height:66vh;overflow:hidden;display:flex;align-items:center;justify-content:center;border-radius:8px;background:#000;">
                ${playlist && playlist[playlistIndex] && playlist[playlistIndex].mime && playlist[playlistIndex].mime.startsWith('video/') ? html`<video ref=${playerRef} src=${playlist[playlistIndex].url} style="max-width:100%;max-height:66vh;border-radius:6px; background:black;outline:none;" playsinline ontimeupdate=${(e)=>{ const v = e.target; setPlayProgress(v.duration ? (v.currentTime / v.duration) * 100 : 0); setPlayTime(Math.floor(v.currentTime)); }} onplay=${()=>setPlaying(true)} onpause=${()=>setPlaying(false)} onended=${()=>{ setPlaying(false); setPlayProgress(100); }} onloadedmetadata=${(e)=>{ try{ if (playerRef.current) { playerRef.current.volume = volume; playerRef.current.playbackRate = speed; playerRef.current.muted = muted; } }catch(err){} }} />` : html`<audio ref=${playerRef} src=${playlist && playlist[playlistIndex] ? playlist[playlistIndex].url : ''} style="width:100%;" ontimeupdate=${(e)=>{ const v = e.target; setPlayProgress(v.duration ? (v.currentTime / v.duration) * 100 : 0); setPlayTime(Math.floor(v.currentTime)); }} onplay=${()=>setPlaying(true)} onpause=${()=>setPlaying(false)} onended=${()=>{ setPlaying(false); setPlayProgress(100); }} controlsList="nodownload" />`}
              </div>
            </div>

            <div style="display:flex;align-items:center;gap:10px;">
              <div style="flex:1;cursor:pointer;" onclick=${(e)=>{ const rect = e.currentTarget.getBoundingClientRect(); const clickX = e.clientX - rect.left; const pct = (clickX/rect.width); if (playerRef.current && playerRef.current.duration) playerRef.current.currentTime = playerRef.current.duration * pct; }}>
                <div style="height:10px;background:rgba(255,255,255,0.04);border-radius:8px;overflow:hidden;">
                  <div style="height:100%;width:${playProgress}% ;background:linear-gradient(90deg,var(--accent),rgba(255,255,255,0.06));transition:width .08s linear"></div>
                </div>
              </div>
              <div style="display:flex;gap:8px;align-items:center;">
                <div style="min-width:90px;text-align:right;color:#ccc;font-family:'SF Mono',monospace;font-size:13px;">${() => { const mm = Math.floor(playTime/60); const ss = playTime%60; return String(mm).padStart(2,'0')+':' + String(ss).padStart(2,'0'); }}()</div>
                <div style="color:#777">/</div>
                <div style="min-width:90px;text-align:left;color:#777;font-family:'SF Mono',monospace;font-size:13px;">${() => { try { const d = playerRef.current && playerRef.current.duration ? Math.floor(playerRef.current.duration) : 0; const mm = Math.floor(d/60); const ss = d%60; return String(mm).padStart(2,'0')+':' + String(ss).padStart(2,'0'); } catch(e){ return '00:00'; } }}()</div>
              </div>
            </div>

            <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
              <div style="display:flex;align-items:center;gap:8px;">
                <button title="Mute" onclick=${()=>{ setMuted(m=>{ const nm = !m; try{ if(playerRef.current) playerRef.current.muted = nm; }catch(e){} return nm; }); }} style="padding:6px;border-radius:6px;background:transparent;border:1px solid rgba(255,255,255,0.04);">${muted ? 'M' : 'M'}</button>
                <input type="range" min="0" max="1" step="0.01" value=${volume} onInput=${(e)=>{ const v = parseFloat(e.target.value); setVolume(v); try{ if(playerRef.current){ playerRef.current.volume = v; if (v > 0) setMuted(false); } }catch(e){} }} style="width:140px;" />
                <select value=${speed} onChange=${(e)=>{ const s = parseFloat(e.target.value); setSpeed(s); try{ if(playerRef.current) playerRef.current.playbackRate = s; }catch(e){} }} style="background:transparent;border:1px solid rgba(255,255,255,0.04);padding:6px;border-radius:6px;color:#fff;">
                  <option value="0.5">0.5x</option>
                  <option value="0.75">0.75x</option>
                  <option value="1">1x</option>
                  <option value="1.25">1.25x</option>
                  <option value="1.5">1.5x</option>
                  <option value="2">2x</option>
                </select>
              </div>
              <div style="display:flex;align-items:center;gap:8px;">
                <button title="Toggle Fullscreen" onclick=${()=>{ try{ const el = playerRef.current; if (!document.fullscreenElement && el && el.requestFullscreen) { el.requestFullscreen(); setIsFullscreen(true); } else if (document.exitFullscreen) { document.exitFullscreen(); setIsFullscreen(false); } }catch(e){}}} style="padding:6px;border-radius:6px;background:transparent;border:1px solid rgba(255,255,255,0.04);">⤢</button>
                ${typeof document !== 'undefined' && document.pictureInPictureEnabled ? html`<button title="Picture-in-Picture" onclick=${async ()=>{ try{ if (playerRef.current && playerRef.current.requestPictureInPicture) { await playerRef.current.requestPictureInPicture(); } }catch(e){}}} style="padding:6px;border-radius:6px;background:transparent;border:1px solid rgba(255,255,255,0.04);">⧉</button>` : ''}
              </div>
            </div>
          </div>
        </div>` : ''}
        ${imageViewerOpen ? html`<div style="position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:3200;background:linear-gradient(rgba(0,0,0,0.88), rgba(0,0,0,0.95));">
          <div style="position:relative;max-width:96%;max-height:96%;width:auto;display:flex;flex-direction:column;align-items:center;gap:8px;">
            <div style="width:100%;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px;background:transparent;">
              <div style="color:#ddd;font-weight:600;max-width:70%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${playlist && playlist[playlistIndex] ? playlist[playlistIndex].name : (imageList[imageViewerIndex]||'')}</div>
              <div style="display:flex;gap:8px;align-items:center;">
                <button title="Prev" onclick=${async ()=>{ const idx = Math.max(0, imageViewerIndex-1); setImageViewerIndex(idx); if (imageList[idx]) await openImageAtPath(imageList[idx]); }} style="padding:8px;border-radius:8px;background:transparent;border:1px solid rgba(255,255,255,0.04);">◀</button>
                <button title="Zoom out" onclick=${()=>{ setImageZoom(z=>Math.max(0.2, +(z-0.2).toFixed(3))); setFitMode('actual'); }} style="padding:8px;border-radius:8px;background:transparent;border:1px solid rgba(255,255,255,0.04);">－</button>
                <button title="Reset/Contain" onclick=${()=>{ setImageZoom(1); setImagePan({x:0,y:0}); setImageRotate(0); setFitMode('contain'); }} style="padding:8px;border-radius:8px;background:transparent;border:1px solid rgba(255,255,255,0.04);">⤺</button>
                <button title="Zoom in" onclick=${()=>{ setImageZoom(z=>Math.min(8, +(z+0.2).toFixed(3))); setFitMode('actual'); }} style="padding:8px;border-radius:8px;background:linear-gradient(90deg,var(--accent),rgba(255,255,255,0.04));border:none;color:#000;font-weight:700;">＋</button>
                <button title="Rotate left" onclick=${()=>{ setImageRotate(r=> (r-90) % 360); }} style="padding:8px;border-radius:8px;background:transparent;border:1px solid rgba(255,255,255,0.04);">⟲</button>
                <button title="Rotate right" onclick=${()=>{ setImageRotate(r=> (r+90) % 360); }} style="padding:8px;border-radius:8px;background:transparent;border:1px solid rgba(255,255,255,0.04);">⟳</button>
                <button title="Download" onclick=${async ()=>{ try { const path = imageList[imageViewerIndex]; const n = await fsGet(path); if (n) downloadNode(n); } catch(e){ /* error */ } }} style="padding:8px;border-radius:8px;background:transparent;border:1px solid rgba(255,255,255,0.04);">DL</button>
                <button title="Unzip" onclick=${async ()=>{ try { const path = imageList[imageViewerIndex]; if (!path) return; const n = await fsGet(path); if (n && (n.mime === 'application/zip' || n.name && n.name.toLowerCase().endsWith('.zip'))) { const target = parentOf(n.path) || cwd; await unzipNode(n.path, target); alert('Unzipped to ' + target); } } catch(e){ console.warn(e); alert('Unzip failed'); } }} style="padding:8px;border-radius:8px;background:transparent;border:1px solid rgba(255,255,255,0.04);">UNZIP</button>
                <button title="Close" onclick=${()=>{ try{ if (imageViewerSrc) URL.revokeObjectURL(imageViewerSrc); }catch(e){} setImageViewerSrc(null); setImageViewerOpen(false); }} style="padding:8px;border-radius:8px;background:transparent;border:1px solid rgba(255,255,255,0.04);">✕</button>
              </div>
            </div>

            <div style="flex:1;display:flex;align-items:center;justify-content:center;max-width:100%;max-height:calc(100% - 120px);overflow:hidden;">
                  <img src=${imageViewerSrc}
                    style=${`display:block;max-width:100%;max-height:100%;transform: translate(${imagePan.x}px, ${imagePan.y}px) scale(${imageZoom}) rotate(${imageRotate}deg); transition: ${isPanning ? 'none' : 'transform .12s'}; cursor: ${isPanning ? 'grabbing' : 'grab'}`}
                    onWheel=${(e)=>{ e.preventDefault(); const delta = e.deltaY; const factor = Math.exp(-delta * 0.0016); setImageZoom(z => { const nz = Math.max(0.2, Math.min(8, z * factor)); setFitMode('actual'); return +(nz.toFixed(3)); }); }}
                    onDblClick=${()=>{ if (fitMode === 'contain') { setFitMode('actual'); setImageZoom(1.0); } else { setFitMode('contain'); setImageZoom(1); setImagePan({x:0,y:0}); } }}
                    onPointerDown=${(e)=>{ e.preventDefault(); try{ e.target.setPointerCapture && e.target.setPointerCapture(e.pointerId); }catch(err){} setIsPanning(true); panRef.current.lastX = e.clientX; panRef.current.lastY = e.clientY; }}
                    onPointerMove=${(e)=>{ if (!isPanning) return; const dx = e.clientX - panRef.current.lastX; const dy = e.clientY - panRef.current.lastY; panRef.current.lastX = e.clientX; panRef.current.lastY = e.clientY; setImagePan(p => ({ x: p.x + dx, y: p.y + dy })); }}
                    onPointerUp=${(e)=>{ try{ e.target.releasePointerCapture && e.target.releasePointerCapture(e.pointerId); }catch(err){} setIsPanning(false); }}
                    onPointerCancel=${()=>{ setIsPanning(false); }}
                  />
            </div>

            <div style="width:100%;display:flex;align-items:center;justify-content:center;gap:8px;padding:6px;">
              <div style="color:#999;font-size:13px;">${imageViewerIndex+1} / ${imageList.length}</div>
            </div>
          </div>
        </div>` : ''}
      </div>
    `;
  };

  AppRegistry.register('filemanager', FileManagerApp);
  window.FileManagerApp = FileManagerApp;

  FileManagerApp.titlebarButtons = ({ appId } = {}) => html`<div style="display:flex;gap:8px;align-items:center;">
    <button title="New folder" onclick=${() => window.dispatchEvent(new CustomEvent('filemanager-action', { detail: { action: 'new-folder' } }))} style="background:transparent;border:1px solid var(--border);color:var(--text-main);padding:6px 8px;border-radius:8px;">＋Folder</button>
    <button title="Upload" onclick=${() => window.dispatchEvent(new CustomEvent('filemanager-action', { detail: { action: 'upload' } }))} style="background:transparent;border:1px solid var(--border);color:var(--text-main);padding:6px 8px;border-radius:8px;">Upload</button>
    <button title="Delete selected" onclick=${() => window.dispatchEvent(new CustomEvent('filemanager-action', { detail: { action: 'delete-selected' } }))} style="background:transparent;border:1px solid var(--border);color:var(--text-main);padding:6px 8px;border-radius:8px;">Del</button>
    <button title="Refresh" onclick=${() => window.dispatchEvent(new CustomEvent('filemanager-action', { detail: { action: 'refresh' } }))} style="background:transparent;border:1px solid var(--border);color:var(--text-main);padding:6px 8px;border-radius:8px;">↻</button>
    <button title="Zip selected" onclick=${() => window.dispatchEvent(new CustomEvent('filemanager-action', { detail: { action: 'zip-selected' } }))} style="background:transparent;border:1px solid var(--border);color:var(--text-main);padding:6px 8px;border-radius:8px;">Zip</button>
    <button title="Play selected" onclick=${() => window.dispatchEvent(new CustomEvent('filemanager-action', { detail: { action: 'play-selected' } }))} style="background:transparent;border:1px solid var(--border);color:var(--text-main);padding:6px 8px;border-radius:8px;">Play</button>
  </div>`;
})();
