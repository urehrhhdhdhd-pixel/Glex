
const PerformanceAdapter = (() => {
    const pending = new Map();

    const getConfig = () => {
        try {
            if (window.PerformanceManager && typeof window.PerformanceManager.getCurrentConfig === 'function') return window.PerformanceManager.getCurrentConfig();
        } catch (e) {}
        return { throttleMs: 300, frameSkip: 0 };
    };

    const throttleLatest = (key, fn, args) => {
        const cfg = getConfig();
        if (!pending.has(key)) {
            pending.set(key, { timer: null, latest: args });
            const t = setTimeout(() => {
                const p = pending.get(key);
                try { fn.apply(null, p.latest); } catch (e) {}
                pending.delete(key);
            }, cfg.throttleMs);
            pending.set(key, { timer: t, latest: args });
        } else {
            const p = pending.get(key);
            p.latest = args;
            pending.set(key, p);
        }
    };

    const rafSchedule = (fn) => {
        const cfg = getConfig();
        let canceled = false;
        let count = 0;
        const loop = () => {
            if (canceled) return;
            try {
                if (!cfg.frameSkip || cfg.frameSkip === 0) {
                    fn();
                } else {
                    count++;
                    if (count % (cfg.frameSkip + 1) === 0) {
                        fn();
                    }
                }
            } catch (e) {}
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
        return () => { canceled = true; };
    };

    const wrapEventHandler = (key, handler) => {
        return function wrapped(e) {
            throttleLatest(key, () => handler(e), [e]);
        };
    };

    return {
        getConfig,
        throttleLatest,
        rafSchedule,
        wrapEventHandler
    };
})();

try { window.PerformanceAdapter = PerformanceAdapter; } catch (e) {}
