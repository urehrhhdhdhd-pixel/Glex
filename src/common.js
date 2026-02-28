(function(){
    const lib = window.htmPreact || window.htm || window.htmpreact || window.h || {};
    // script.js failed to do this so we need a helper ig
    if (lib.html) window.html = lib.html;
    if (lib.render) window.render = lib.render;
    if (lib.useState) window.useState = lib.useState;
    if (lib.useEffect) window.useEffect = lib.useEffect;
    if (lib.useRef) window.useRef = lib.useRef;
    if (lib.useLayoutEffect) window.useLayoutEffect = lib.useLayoutEffect;

    try{
        if (!window.html && window.htm && window.preact && window.preact.h) {
            window.html = window.htm.bind(window.preact.h);
        }
    }catch(e){}

    if (!window.html && typeof window.htm === 'function') {
        window.html = window.htm;
    }

    if (window.html && typeof window.html === 'function' && !window.__html_wrapped) {
        const _origHtml = window.html;
        window.html = function(){
            try{
                return _origHtml.apply(this, arguments);
            }catch(err){
                try{
                    console.error('Error in html template:', err, { firstArgType: typeof arguments[0], firstArgIsArray: Array.isArray(arguments[0]) });
                }catch(e){}
                throw err;
            }
        };
        window.__html_wrapped = true;
    }

    window.tFor = window.tFor || function (settings) {
        return function (key) { return key; };
    };
    window.tr = window.tr || function (key) { return key; };
    // `testAllOrigins` removed (unused) to avoid leaving unused globals it sucks

    // Provide a no-op seqDebug to avoid runtime errors when not present
    window.seqDebug = window.seqDebug || { log: function(){}, error: function(){} };

    // Peak system btw inf icons without disgigned icons
    (function(){
        const map = {
            settings: 'SET', notes: 'NOT', filemanager: 'FM', calendar: 'CAL', clock: 'CLK', gallery: 'G', camera: 'CM', safari: 'WEB', mail: 'MAIL', terminal: 'CMD', music: 'MUS', messages: 'MSG', default: ''
        };
        function getLabel(id){ if(!id) return map.default; const key = String(id).toLowerCase(); return map[key] || key.slice(0,3).toUpperCase(); }
        try{ window.getIconLabel = getLabel; }catch(e){}

        function makePlaceholder(appId, size){
            const span = document.createElement('span');
            span.className = 'icon-placeholder';
            const label = getLabel(appId) || '';
            span.textContent = label;
            const px = size ? (size + 'px') : '36px';
            const fs = size ? Math.max(10, Math.floor(size * 0.45)) : 14;
            span.style.display = 'inline-flex';
            span.style.alignItems = 'center';
            span.style.justifyContent = 'center';
            span.style.width = px;
            span.style.height = px;
            span.style.background = '#000';
            span.style.color = '#fff';
            span.style.borderRadius = '50%';
            span.style.fontSize = fs + 'px';
            span.style.fontWeight = '600';
            span.style.fontFamily = 'system-ui, sans-serif';
            span.style.lineHeight = '1';
            span.style.userSelect = 'none';
            span.style.pointerEvents = 'none';
            return span;
        }

        function replaceImg(img){
            try{
                if (!img || !(img instanceof HTMLImageElement)) return;
                if (img.__iconReplaced) return;
                let id = img.dataset && img.dataset.appId ? img.dataset.appId : null;
                if (!id) {
                    const src = img.getAttribute('src') || '';
                    const m = src.match(/icons\/(.+?)\./);
                    if (m && m[1]) id = m[1];
                }
                let size = 36;
                try{
                    const rect = img.getBoundingClientRect ? img.getBoundingClientRect() : null;
                    const w = img.width || (rect && rect.width) || 0;
                    const h = img.height || (rect && rect.height) || 0;
                    size = Math.round(Math.max(16, Math.min(64, Math.max(w,h) || 36)));
                }catch(e){}
                const ph = makePlaceholder(id, size);
                img.style.display = 'none';
                img.parentNode && img.parentNode.insertBefore(ph, img.nextSibling);
                img.__iconReplaced = true;
            }catch(e){}
        }

        const forceReplace = new Set(['camera','gallery']);

        function attach(root){
            if (!root) root = document;
            root.querySelectorAll('img').forEach(img => {
                if (img.__iconBound) return;
                img.addEventListener('error', () => replaceImg(img));
                try{
                    let id = img.dataset && img.dataset.appId ? img.dataset.appId : null;
                    if (!id) {
                        const src = img.getAttribute('src') || '';
                        const m = src.match(/icons\/(.+?)\./);
                        if (m && m[1]) id = m[1];
                    }
                    if (id && forceReplace.has(String(id).toLowerCase())) {
                        replaceImg(img);
                    } else if (img.complete && img.naturalWidth === 0) replaceImg(img);
                }catch(e){ if (img.complete && img.naturalWidth === 0) replaceImg(img); }
                img.__iconBound = true;
            });
        }

        try{
            const mo = new MutationObserver((mutations) => {
                for (const m of mutations){
                    if (!m.addedNodes) continue;
                    m.addedNodes.forEach(n => {
                        try{
                            if (n && n.nodeType === 1) {
                                if (n.tagName === 'IMG') attach(n.parentNode || document);
                                else attach(n);
                            }
                        }catch(e){}
                    });
                }
            });
            mo.observe(document.documentElement || document.body, { childList: true, subtree: true });
        }catch(e){}

        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => attach(document));
        else attach(document);
    })();
})();
