const NotesApp = ({ settings, setSettings }) => {
    const tr = tFor(settings);
    const _sanitize = (html) => {
        try {
            if (typeof window.Sanitizer === 'function') {
                try {
                    const s = new window.Sanitizer();
                    if (typeof s.sanitize === 'function') return s.sanitize(html || '');
                    if (typeof s.sanitizeFor === 'function') return s.sanitizeFor('div', html || '');
                } catch (e) {}
            }
            if (window.Sanitizer && typeof window.Sanitizer.sanitize === 'function') return window.Sanitizer.sanitize(html || '');
        } catch (e) {}
        return html || '';
    };
    const [notes, setNotes] = useState(() => JSON.parse(localStorage.getItem('seq-notes-data') || JSON.stringify([{ id: Date.now(), title: 'Welcome', content: '<p>Welcome to Notes. Start typing...</p>', pinned: false, modified: Date.now() }])));
    const [activeId, setActiveId] = useState(notes.length ? notes[0].id : null);
    const [query, setQuery] = useState('');
    const [isFullscreen, setIsFullscreen] = useState(false);
    const editorRef = useRef(null);

    const [miniBrowserOpen, setMiniBrowserOpen] = useState(false);
    const [browserCwd, setBrowserCwd] = useState('C:\\');
    const [browserNodes, setBrowserNodes] = useState([]);
    const allowedExtRe = /\.(txt|md|markdown|js|ts|jsx|tsx|css|html?|json|csv|xml|py|java|c|cpp|h)$/i;

    async function parentPath(p){ if(!p) return 'C:\\'; const i = p.lastIndexOf('\\'); if(i<=2) return 'C:\\'; return p.slice(0,i); }

    async function refreshBrowser(cwd){
        if (!window.GlexFS) { setBrowserNodes([]); return; }
        const prefix = String(cwd || 'C:\\');
        const all = await window.GlexFS.list(prefix);
        const children = (all || []).filter(n => {
            if (!n || !n.path) return false;
            if (n.path === prefix) return false;
            let rel = n.path.slice(prefix.length).replace(/^\\+/, '');
            if (!rel) return false;
            if (rel.indexOf('\\') !== -1) return false; // not direct child
            return n.type === 'file' && allowedExtRe.test(n.name || '');
        }).sort((a,b)=> (a.name||'').localeCompare(b.name||''));
        setBrowserNodes(children);
    }

    useEffect(()=>{ if (miniBrowserOpen) refreshBrowser(browserCwd); }, [miniBrowserOpen, browserCwd]);

    useEffect(() => { localStorage.setItem('seq-notes-data', JSON.stringify(notes)); }, [notes]);

    useEffect(() => {
        if (activeId) {
            const n = notes.find(x => x.id === activeId);
            if (editorRef.current) {
                try {
                    // only set if editor is not focused to avoid moving caret while typing
                    if (document.activeElement !== editorRef.current) {
                        const raw = n ? n.content : '';
                        editorRef.current.innerHTML = _sanitize(raw);
                    }
                } catch (e) { if (editorRef.current) editorRef.current.innerHTML = n ? n.content : ''; }
            }
        }
    }, [activeId]);

    useEffect(() => {
        try {
            if (!editorRef.current) return;
            if (document.activeElement === editorRef.current) return;
            const n = notes.find(x => x.id === activeId);
            if (n && editorRef.current && editorRef.current.innerHTML !== n.content) {
                editorRef.current.innerHTML = _sanitize(n.content || '');
            }
        } catch (e) { /* ignore */ }
    }, [notes]);


    useEffect(() => {
        const handler = async (e) => {
            try {
                const d = e.detail; if (!d || !d.id || !d.action) return;
                const sendResult = (result) => window.dispatchEvent(new CustomEvent('assistant-result', { detail: { id: d.id, result } }));
                const active = notes.find(n => n.id === activeId) || null;
                if (d.action === 'get-active') {
                    sendResult(active ? (active.content || '') : '');
                    return;
                }
                if (!active) { sendResult(null); return; }
                const getContent = () => editorRef.current ? editorRef.current.innerHTML : active.content || '';
                const setContent = (htmlText) => {
                    const safe = _sanitize(htmlText);
                    if (editorRef.current) editorRef.current.innerHTML = safe;
                    setNotes(prev => prev.map(n => n.id === activeId ? { ...n, content: safe, modified: Date.now() } : n));
                };

                if (d.action === 'correct-active') {
                    const src = getContent();
                    try {
                        if (window.SequoiaAI && window.SequoiaAI.local && window.SequoiaAI.local.ready) {
                            const prompt = 'Fix spelling and grammar errors in this text:\n' + src.replace(/<[^>]*>/g,'').trim();
                            const corrected = await window.SequoiaAI.localGenerate(prompt, { maxTokens: 500 });
                            const htmlOut = '<p>' + corrected.replace(/\n\n+/g,'</p><p>').replace(/\n/g,'<br/>') + '</p>';
                            setContent(htmlOut);
                            sendResult('corrected'); return;
                        }
                    } catch (e) { console.warn('AI correction failed', e); }
                    
                    const applyAutocorrect = (htmlText) => {
                        try {
                            const map = { 'teh':'the','recieve':'receive','adress':'address','dont':"don't","cant":"can't","im":"I'm","youre":"you're","its":"it's","thier":"their","adn":"and" };
                            const doc = document.createElement('div'); doc.innerHTML = htmlText;
                            const walker = document.createTreeWalker(doc, NodeFilter.SHOW_TEXT, null, false);
                            const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
                            nodes.forEach(tNode => { let s = tNode.nodeValue; s = s.replace(/\b([A-Za-z']+)\b/g, (m) => { const key = m.toLowerCase(); if (map[key]) { const repl = map[key]; if (/[A-Z]/.test(m[0])) return repl.charAt(0).toUpperCase() + repl.slice(1); return repl; } return m; }); tNode.nodeValue = s; });
                            return doc.innerHTML;
                        } catch (e) { return htmlText; }
                    };
                    const out = applyAutocorrect(src); const safeOut = _sanitize(out); setContent(safeOut); sendResult('corrected'); return;
                }

                if (d.action === 'summarize-active') {
                    const src = (active.content || '').replace(/<[^>]*>/g,'').trim();
                    try {
                        if (window.SequoiaAI && window.SequoiaAI.local && window.SequoiaAI.local.ready) {
                            const prompt = 'Write a brief summary of this text:\n' + src;
                            const summary = await window.SequoiaAI.localGenerate(prompt, { maxTokens: 200 });
                            sendResult(summary); return;
                        }
                    } catch (e) { console.warn('AI summarization failed', e); }
                    
                    const para = src.split(/\n\s*\n/).filter(Boolean)[0] || src;
                    const summary = para.length > 300 ? para.substring(0,300).trim() + '…' : para;
                    sendResult(summary); return;
                }

                if (d.action === 'rewrite-active') {
                    const style = (d.opts && d.opts.style) || (d.style) || 'polished';
                    const src = (active.content || '').replace(/<[^>]*>/g,'').trim();
                    
                    try {
                        if (window.SequoiaAI && window.SequoiaAI.local && window.SequoiaAI.local.ready) {
                            const stylePrompt = style === 'formal' ? 'in a formal tone' : style === 'casual' ? 'in a casual tone' : style === 'concise' ? 'in a concise way' : 'in a polished way';
                            const prompt = 'Rewrite this text ' + stylePrompt + ':\n' + src;
                            const rewritten = await window.SequoiaAI.localGenerate(prompt, { maxTokens: 500 });
                            const htmlOut = '<p>' + rewritten.replace(/\n\n+/g,'</p><p>').replace(/\n/g,'<br/>') + '</p>';
                                const safeOut = _sanitize(htmlOut);
                                setContent(safeOut);
                            sendResult('rewritten'); return;
                        }
                    } catch (e) { console.warn('AI rewrite failed', e); }
                    
                    // Fallback: AI NEVER WORKED OUT REMOVE LATER
                    let out = src;
                    if (style === 'formal') out = out.replace(/\bI'm\b/gi, "I am").replace(/\bcan't\b/gi, 'cannot');
                    else if (style === 'concise') out = out.split('\n').map(s=>s.trim()).filter(Boolean).slice(0,3).join(' ');
                    else if (style === 'casual') out = out.replace(/\bI am\b/gi, "I'm");
                    const htmlOut = '<p>' + out.replace(/\n\n+/g,'</p><p>').replace(/\n/g,'<br/>') + '</p>';
                    setContent(htmlOut);
                    sendResult('rewritten'); return;
                }

                sendResult(null);
            } catch (err) { console.warn('assistant-action handler error', err); }
        };
        window.addEventListener('assistant-action', handler);
        return () => window.removeEventListener('assistant-action', handler);
    }, [notes, activeId]);

    const addNote = () => {
        const id = Date.now();
        const note = { id, title: 'Untitled', content: '<p></p>', pinned: false, modified: Date.now() };
        setNotes([note, ...notes]);
        setActiveId(id);
        setTimeout(() => { if (editorRef.current) editorRef.current.focus(); }, 80);
        try {
            if (window.NotificationCenter) window.NotificationCenter.notify({ title: 'Note created', message: `Created "${note.title}"`, appId: 'notes', actions: [{ label: 'Note', callback: () => setActiveId(id) }], timeout: 3500 });
        } catch (e) {}
    };

    useEffect(() => {
        const handler = (e) => {
            const d = e && e.detail;
            if (!d || !d.action) return;
            try {
                if (d.action === 'new') return addNote();
                if (d.action === 'toggle-fullscreen') return setIsFullscreen(f => !f);
                if (d.action === 'export') return exportHTML();
                if (d.action === 'cmd' && d.cmd) return runCmd(d.cmd, d.value);
            } catch (err) { console.warn('notes-action handler error', err); }
        };
        window.addEventListener('notes-action', handler);
        return () => window.removeEventListener('notes-action', handler);
    }, [notes, activeId]);

    useEffect(() => {
        const escapeHtml = (s) => {
            return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        };

        const handler = async (e) => {
            try {
                if (!window.__notes_recent_open) window.__notes_recent_open = new Map();
            } catch (err) { /* ignore */ }
            try {
                const d = e && e.detail; if (!d) return;
                const nm = d.name || (d.path ? d.path.split('\\').pop() : 'Imported');
                let sample = '';
                if (d.content) sample = String(d.content).slice(0, 8192);
                else if (d.url) sample = String(d.url).slice(0, 8192);
                else if (d.data) sample = String(d.data).slice(0, 8192);
                const sig = nm + '::' + sample;
                const recent = window.__notes_recent_open;
                const now = Date.now();
                if (recent && recent.has(sig) && (now - recent.get(sig) < 2000)) {
                    // ignore duplicate
                    return;
                }
                try { if (recent) { recent.set(sig, now); setTimeout(()=>{ try{ recent.delete(sig); }catch(e){} }, 3000); } } catch(e){}
                const name = d.name || (d.path ? d.path.split('\\').pop() : 'Imported');
                const ext = (name.split('.').pop() || '').toLowerCase();
                const codeExts = ['txt','md','markdown','js','ts','jsx','tsx','css','html','json','csv','xml','py','java','c','cpp','h'];
                const imageExts = ['png','jpg','jpeg','gif','webp','svg','bmp','ico'];

                if ((d.mime && d.mime.startsWith('image/')) || imageExts.includes(ext)) {
                    const src = d.url || d.data || d.content || '';
                    const content = `<div style="display:flex;flex-direction:column;gap:8px;align-items:flex-start;"><div style="font-weight:700;margin-bottom:6px;">${escapeHtml(name)}</div><img src="${src}" style="max-width:100%;height:auto;border-radius:8px;" /></div>`;
                    const id = Date.now();
                    const note = { id, title: name.replace(/\.[^/.]+$/, '') || 'Imported', content, pinned: false, modified: Date.now() };
                    if (notes && notes.length && notes[0].title === note.title && notes[0].content === note.content) { setActiveId(notes[0].id); return; }
                    setNotes(prev => [note, ...prev]); setActiveId(id); return;
                }

                if (codeExts.includes(ext) || (d.mime && (d.mime.startsWith('text/') || d.mime === 'application/javascript' || d.mime === 'application/json'))) {
                    let text = '';
                    if (d.content) text = d.content;
                    else if (d.url) {
                        try { const res = await fetch(d.url); text = await res.text(); } catch (err) { text = ''; }
                    } else if (d.data && String(d.data).startsWith('data:')) {
                        try { const res = await fetch(d.data); text = await res.text(); } catch (err) { text = ''; }
                    } else if (d.data) {
                        try { text = atob(String(d.data)); } catch (err) { text = String(d.data); }
                    }
                    const escaped = escapeHtml(text || '');
                    const content = `<div style="font-family:var(--mono-font, monospace);"><div style="font-weight:700;margin-bottom:6px;">${escapeHtml(name)}</div><pre style="white-space:pre-wrap;word-break:break-word;padding:12px;border-radius:8px;background:rgba(0,0,0,0.12);overflow:auto;max-height:60vh;"><code>${escaped}</code></pre></div>`;
                    const id = Date.now();
                    const note = { id, title: name.replace(/\.[^/.]+$/, '') || 'Imported', content, pinned: false, modified: Date.now() };
                    if (notes && notes.length && notes[0].title === note.title && notes[0].content === note.content) { setActiveId(notes[0].id); return; }
                    setNotes(prev => [note, ...prev]); setActiveId(id); return;
                }

                // Fallback: try to read content as text and sanitize (but escape to avoid accidental HTML rendering)
                let fallback = '';
                if (d.content) fallback = d.content;
                else if (d.url) { try { const res = await fetch(d.url); fallback = await res.text(); } catch (err) { fallback = ''; } }
                else if (d.data) { try { fallback = atob(String(d.data)); } catch (err) { fallback = String(d.data); } }
                if (!fallback) return;
                const safe = _sanitize(escapeHtml(fallback));
                const id = Date.now();
                const note = { id, title: name.replace(/\.[^/.]+$/, '') || 'Imported', content: safe, pinned: false, modified: Date.now() };
                    if (notes && notes.length && notes[0].title === note.title && notes[0].content === note.content) { setActiveId(notes[0].id); return; }
                setNotes(prev => [note, ...prev]); setActiveId(id);

            } catch (err) { console.warn('notes open-file handler error', err); }
        };
        window.addEventListener('notes-open-file', handler);
        // also honor generic opens targeted at notes
        const generic = (e) => { if (e && e.detail && e.detail.appId && String(e.detail.appId).toLowerCase() === 'notes') handler(e.detail.payload ? { detail: e.detail.payload } : e); };
        window.addEventListener('glex-open-file', generic);
        return () => { window.removeEventListener('notes-open-file', handler); window.removeEventListener('glex-open-file', generic); };
    }, []);

    const [editingId, setEditingId] = useState(null);
    const [editTitle, setEditTitle] = useState('');
    const startEditTitle = (e, id, current) => { e.stopPropagation(); setEditingId(id); setEditTitle(current || ''); setTimeout(()=>{ const el = document.getElementById('note-title-input'); if (el) el.focus(); }, 20); };
    const commitEditTitle = (id) => { if (!id) return; updateActiveTitle(editTitle); setNotes(prev => prev.map(n => n.id === id ? { ...n, title: editTitle || 'Untitled', modified: Date.now() } : n)); setEditingId(null); };
    const cancelEdit = () => { setEditingId(null); };


    const deleteNote = (id) => {
        const toDelete = notes.find(n => n.id === id);
        setNotes(prev => {
            const next = prev.filter(n => n.id !== id);
            if (activeId === id) setActiveId(next.length ? next[0].id : null);
            return next;
        });
        try {
            if (toDelete && window.NotificationCenter) window.NotificationCenter.notify({ title: 'Note deleted', message: `Deleted "${toDelete.title || 'Untitled'}"`, appId: 'notes', actions: [{ label: 'Undo', callback: () => { setNotes(s => [toDelete, ...s]); setActiveId(toDelete.id); } }], timeout: 8000 });
        } catch (e) {}
    };


    const updateActiveTitle = (title) => {
        setNotes(notes.map(n => n.id === activeId ? { ...n, title, modified: Date.now() } : n));
    };

    const runCmd = (cmd, value) => {
        try { document.execCommand(cmd, false, value); } catch (e) { console.warn('execCommand failed', e); }
        autosave();
    };

    const promptLink = () => {
        const url = prompt('Insert link URL');
        if (url) runCmd('createLink', url);
    };

    const autosave = (() => {
        let timer = null;
        return () => {
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => {
                if (!activeId) return;
                const content = editorRef.current ? editorRef.current.innerHTML : '';
                const applyAutocorrect = (htmlText) => {
                    try {
                        const map = {
                            'teh': 'the', 'recieve': 'receive', 'adress': 'address', 'dont': "don't", 'cant': "can't",
                            'im': "I'm", 'youre': "you're", 'its': "it's", 'thier': 'their', 'adn': 'and'
                        };
                        const doc = document.createElement('div');
                        doc.innerHTML = htmlText;
                        const walker = document.createTreeWalker(doc, NodeFilter.SHOW_TEXT, null, false);
                        const nodes = [];
                        while (walker.nextNode()) nodes.push(walker.currentNode);
                        nodes.forEach(tNode => {
                            let s = tNode.nodeValue;
                            // simple word-boundary replacement, preserve capitalization of first char
                            s = s.replace(/\b([A-Za-z']+)\b/g, (m) => {
                                const key = m.toLowerCase();
                                if (map[key]) {
                                    const repl = map[key];
                                    if (/[A-Z]/.test(m[0])) return repl.charAt(0).toUpperCase() + repl.slice(1);
                                    return repl;
                                }
                                return m;
                            });
                            tNode.nodeValue = s;
                        });
                        return doc.innerHTML;
                    } catch (e) { return htmlText; }
                };

                let final = content;
                try {
                    if (settings && settings.enableAutoCorrect) final = applyAutocorrect(content);
                } catch (e) { final = content; }

                // sanitize before saving
                const safeFinal = _sanitize(final);
                setNotes(prev => prev.map(n => n.id === activeId ? { ...n, content: safeFinal, modified: Date.now() } : n));
            }, 500);
        };
    })();

    // keyboard shortcuts
    useEffect(() => {
        const onKey = (e) => {
            const mod = e.metaKey || e.ctrlKey;
            if (!mod) return;
            if (e.key.toLowerCase() === 'b') { e.preventDefault(); runCmd('bold'); }
            if (e.key.toLowerCase() === 'i') { e.preventDefault(); runCmd('italic'); }
            if (e.key.toLowerCase() === 'u') { e.preventDefault(); runCmd('underline'); }
            if (e.key.toLowerCase() === 's') { e.preventDefault(); if (editorRef.current) { autosave(); alert('Saved'); } }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [activeId]);

    const exportHTML = () => {
        if (!activeId) return alert('Select a note');
        const n = notes.find(x => x.id === activeId);
        const blob = new Blob([n.content], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = (n.title || 'note') + '.html'; a.click(); URL.revokeObjectURL(url);
    };

    const openBrowserNode = async (node) => {
        if (!node) return alert('No node');
        if (!window.GlexFS) return alert('Files API not available');
        const n = await window.GlexFS.getNode(node.path);
        if (!n) return alert('File not found');
        let text = '';
        try{
            if (n.blobRef) {
                const b = await window.GlexFS.getBlob(n.path);
                if (b) text = await (new Response(b)).text();
            } else if (n.blobMeta && n.data && String(n.data).startsWith('data:')){
                const res = await fetch(n.data); text = await res.text();
            } else if (n.blobMeta && n.data){ text = atob(n.data); }
            else text = n.content || '';
        }catch(e){ text = n.content || ''; }
        const safe = _sanitize(text);
        if (!activeId) return alert('Select or create a note first');
        setNotes(prev => prev.map(x => x.id === activeId ? { ...x, content: safe, modified: Date.now() } : x));
        if (editorRef.current) editorRef.current.innerHTML = safe;
        setMiniBrowserOpen(false);
    };

    // Integration with Files app
    const readBlobAsDataURL = (blob) => new Promise(r => { const fr = new FileReader(); fr.onload = e => r(e.target.result); fr.readAsDataURL(blob); });

    const saveActiveToFiles = async () => {
        if (!activeId) return alert('Select a note');
        if (!window.GlexFS) return alert('Files API not available');
        const name = prompt('Filename to save as (e.g. mynote.html)', ((notes.find(n=>n.id===activeId)||{}).title || 'note') + '.html');
        if (!name) return;
        const folder = 'C:\\Notes';
        await window.GlexFS.ensureFolder(folder);
        const content = editorRef.current ? editorRef.current.innerHTML : (notes.find(n=>n.id===activeId)||{}).content || '';
        const blob = new Blob([content], { type: 'text/html' });
        const dataUrl = await readBlobAsDataURL(blob);
        const path = folder + '\\' + name;
        await window.GlexFS.putNode({ path, type: 'file', name, mime: 'text/html', size: blob.size, blobMeta: true, data: dataUrl, createdAt: Date.now(), updatedAt: Date.now() });
        alert('Saved to ' + path);
    };

    const openFromFiles = async () => {
        if (!window.GlexFS) return alert('Files API not available');
        const path = prompt('Enter file path to open (e.g. C:\\Notes\\mynote.html)');
        if (!path) return;
        const node = await window.GlexFS.getNode(path);
        if (!node) return alert('File not found');
        let text = '';
        if (node.blobMeta && node.data && String(node.data).startsWith('data:')){
            try{ const res = await fetch(node.data); text = await res.text(); }catch(e){ text = node.content || ''; }
        } else if (node.blobMeta && node.data){ try{ text = atob(node.data); }catch(e){ text = node.content || ''; } }
        else text = node.content || '';
        // set as active note content
        if (!activeId) return alert('No active note to load into');
        const safe = _sanitize(text);
        setNotes(prev => prev.map(n => n.id === activeId ? { ...n, content: safe, modified: Date.now() } : n));
        if (editorRef.current) editorRef.current.innerHTML = safe;
    };



    const visible = notes.filter(n => n && n.title !== undefined).filter(n => {
        if (!query) return true;
        const q = query.toLowerCase();
        return (n.title && n.title.toLowerCase().includes(q)) || (n.content && n.content.toLowerCase().includes(q));
    }).sort((a,b) => (b.modified || 0) - (a.modified || 0));

    return html`
        <style>${`
            .notes-sidebar-title { font-weight:800; font-size:15px; letter-spacing:0.2px; }
            .notes-search { width:100%; padding:8px; border:1px solid var(--border); border-radius:8px; background:transparent; color:var(--text-main); transition: box-shadow .18s ease, transform .12s ease; }
            .notes-search:focus { box-shadow: 0 6px 20px rgba(0,0,0,0.6); transform: translateY(-2px); outline:none; }
            .note-row { padding:10px 12px; border-radius:8px; margin:8px 10px; transition: background .18s ease, transform .18s ease, box-shadow .18s ease; }
            .note-row:hover { background: rgba(255,255,255,0.02); transform: translateY(-2px); box-shadow: 0 6px 18px rgba(0,0,0,0.45); }
            .note-row.active { background: rgba(255,255,255,0.04); }
            @keyframes glexFadeIn { from { opacity:0; transform: translateY(6px); } to { opacity:1; transform: translateY(0); } }
            .note-row { animation: glexFadeIn 200ms ease both; }
            #notes-editor { transition: opacity .2s ease, transform .2s ease; }
            .notes-fullscreen #notes-editor { transform: scale(1.01); }
        `}</style>

        <div style="display:flex; height:100%; background:var(--win-bg); color:var(--text-main);" class="${isFullscreen ? 'notes-fullscreen' : ''}">
            <div class="sidebar" style="display:${isFullscreen ? 'none' : 'flex'}; flex-direction:column; width:240px; border-right:1px solid var(--border); background:var(--win-bg);">
                <div style="padding:14px 12px 12px; display:flex; flex-direction:column; gap:8px; border-bottom: 1px solid var(--border);">
                    <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
                        <div class="notes-sidebar-title">Notes</div>
                        <div style="color:var(--text-main); opacity:0.7; font-size:12px;">${visible.length} notes</div>
                    </div>
                    <div style="padding-top:4px;">
                        <input class="notes-search" placeholder="Search notes" value=${query} onInput=${e => setQuery(e.target.value)} />
                    </div>
                </div>
                <div style="overflow:auto; flex:1; padding-bottom:8px;">
                    ${visible.map(n => html`
                        <div class="note-row ${activeId===n.id ? 'active' : ''}" onclick=${() => { setActiveId(n.id); }}>
                            <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
                                <div style="flex:1;">
                                    ${editingId === n.id ? html`<input id="note-title-input" value=${editTitle} onInput=${e => setEditTitle(e.target.value)} onBlur=${() => commitEditTitle(n.id)} onKeyDown=${(e)=>{ if (e.key === 'Enter') { commitEditTitle(n.id); } else if (e.key === 'Escape') { cancelEdit(); } }} style="width:100%; padding:6px 8px; border:1px solid var(--border); border-radius:6px; background:transparent; color:var(--text-main);" />` : html`<div class="title" onclick=${(e)=> startEditTitle(e, n.id, n.title)} style="cursor:text;">${n.title || 'Untitled'}</div>`}
                                </div>
                                <div style="display:flex; gap:8px; align-items:center;">
                                    <button onclick=${(e) => { e.stopPropagation(); if (!confirm('Delete this note?')) return; deleteNote(n.id); }} title="Delete" style="background:transparent; border:none; cursor:pointer; color:var(--text-main);">Del</button>
                                </div>
                            </div>
                            <div class="excerpt">${(n.content || '').replace(/<[^>]*>/g,'').substring(0,120).replace(/\n/g,' ')}</div>
                        </div>
                    `)}
                </div>
            </div>

            <div style="display:flex; flex-direction:column; flex:1; background:var(--win-bg); color:var(--text-main);">
                <div style="display:flex; flex-wrap:wrap; justify-content:space-between; gap:12px; padding:12px 16px; background:var(--win-bg); border-bottom:1px solid var(--border);">
                    <!-- Toolbar moved to titlebar; keep this area minimal now -->
                    <div></div>
                </div>

                <div ref=${editorRef} id="notes-editor" contentEditable="true" style="flex:1; padding:20px; overflow:auto; outline:none; background:var(--win-bg); color:var(--text-main); font-size:15px; line-height:1.6; border:none;" onInput=${() => autosave()} onBlur=${() => autosave()} onKeyDown=${(e)=>{ if (e.key === 'Tab') { e.preventDefault(); runCmd('insertText','\t'); } }}></div>
            </div>
        </div>
        ${miniBrowserOpen ? html`<div style="position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);width:640px;max-width:95%;height:420px;background:var(--win-bg);border:1px solid var(--border);border-radius:8px;padding:12px;z-index:4000;box-shadow:0 20px 60px rgba(0,0,0,0.6);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;"><div style="font-weight:700">Files — ${browserCwd}</div><div style="display:flex;gap:8px;"><button onclick=${() => { setBrowserCwd(parentPath(browserCwd)); }} style="padding:6px 8px;border-radius:6px;">Up</button><button onclick=${() => { setMiniBrowserOpen(false); }} style="padding:6px 8px;border-radius:6px;">Close</button></div></div>
            <div style="height:320px;overflow:auto;border-top:1px solid var(--border);padding-top:8px;">
                ${browserNodes.map(n => html`<div key=${n.path} style="display:flex;justify-content:space-between;align-items:center;padding:6px;border-radius:6px;cursor:pointer;" onclick=${() => openBrowserNode(n)}><div>${n.name}</div><div style="color:var(--text-main);font-size:12px">${(n.size||'')}</div></div>`)}
                ${browserNodes.length===0 ? html`<div style="color:var(--text-main);padding:12px;">No matching files in this folder.</div>` : ''}
            </div>
            <div style="margin-top:8px;display:flex;gap:8px;justify-content:flex-end;"><button onclick=${() => { setBrowserCwd('C:\\'); refreshBrowser('C:\\'); }} style="padding:6px 8px;border-radius:6px;">Root</button></div>
        </div>` : ''}
    `;
};

AppRegistry.register('notes', NotesApp);
window.NotesApp = NotesApp;

NotesApp.titlebarButtons = ({ appId } = {}) => html`<div style="display:flex;gap:8px;align-items:center;">
    <button title="New note" onclick=${() => window.dispatchEvent(new CustomEvent('notes-action', { detail: { action: 'new' } }))} style="background:transparent;border:1px solid var(--border);color:var(--text-main);padding:6px 8px;border-radius:8px;">＋</button>
    <button title="Bold" onclick=${() => window.dispatchEvent(new CustomEvent('notes-action', { detail: { action: 'cmd', cmd: 'bold' } }))} style="background:transparent;border:1px solid var(--border);color:var(--text-main);padding:6px 8px;border-radius:8px;font-weight:700;">B</button>
    <button title="Italic" onclick=${() => window.dispatchEvent(new CustomEvent('notes-action', { detail: { action: 'cmd', cmd: 'italic' } }))} style="background:transparent;border:1px solid var(--border);color:var(--text-main);padding:6px 8px;border-radius:8px;font-style:italic;">I</button>
    <button title="Underline" onclick=${() => window.dispatchEvent(new CustomEvent('notes-action', { detail: { action: 'cmd', cmd: 'underline' } }))} style="background:transparent;border:1px solid var(--border);color:var(--text-main);padding:6px 8px;border-radius:8px;text-decoration:underline;">U</button>
    <button title="Bulleted list" onclick=${() => window.dispatchEvent(new CustomEvent('notes-action', { detail: { action: 'cmd', cmd: 'insertUnorderedList' } }))} style="background:transparent;border:1px solid var(--border);color:var(--text-main);padding:6px 8px;border-radius:8px;">•</button>
    <button title="Undo" onclick=${() => window.dispatchEvent(new CustomEvent('notes-action', { detail: { action: 'cmd', cmd: 'undo' } }))} style="background:transparent;border:1px solid var(--border);color:var(--text-main);padding:6px 8px;border-radius:8px;">↶</button>
    <button title="Redo" onclick=${() => window.dispatchEvent(new CustomEvent('notes-action', { detail: { action: 'cmd', cmd: 'redo' } }))} style="background:transparent;border:1px solid var(--border);color:var(--text-main);padding:6px 8px;border-radius:8px;">↷</button>
    <button title="Export" onclick=${() => window.dispatchEvent(new CustomEvent('notes-action', { detail: { action: 'export' } }))} style="background:transparent;border:1px solid var(--border);color:var(--text-main);padding:6px 8px;border-radius:8px;">Export</button>
    <button title="Toggle fullscreen" onclick=${() => window.dispatchEvent(new CustomEvent('notes-action', { detail: { action: 'toggle-fullscreen' } }))} style="background:transparent;border:1px solid var(--border);color:var(--text-main);padding:6px 8px;border-radius:8px;">⤢</button>
</div>`;