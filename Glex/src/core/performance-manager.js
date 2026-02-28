// made for old computers ig 
const PerformanceManager = (() => {
    let subscribers = [];
    let currentLevel = (typeof window.OPTIMIZATION_LEVEL === 'string') ? window.OPTIMIZATION_LEVEL : 'high';
    let currentConfig = null;

    const getConfigFor = (level) => {
        if (level === 'low') {
            return {
                level: 'low',
                animationsEnabled: false,
                throttleMs: 2000,
                frameSkip: 4,
                maxConcurrentMedia: 1,
                disableAutoplay: true,
                reduceTransparency: true,
                prefetchDebounce: 2000,
                proxyConcurrency: 1,
                videoQuality: 'low',
                thumbnailSize: 80,
                autoRefresh: false
            };
        } else if (level === 'medium') {
            return {
                level: 'medium',
                animationsEnabled: true,
                throttleMs: 800,
                frameSkip: 1,
                maxConcurrentMedia: 2,
                disableAutoplay: false,
                reduceTransparency: false,
                prefetchDebounce: 800,
                proxyConcurrency: 3,
                videoQuality: 'medium',
                thumbnailSize: 160,
                autoRefresh: true
            };
        } else {
            // high
            return {
                level: 'high',
                animationsEnabled: true,
                throttleMs: 300,
                frameSkip: 0,
                maxConcurrentMedia: 4,
                disableAutoplay: false,
                reduceTransparency: false,
                prefetchDebounce: 300,
                proxyConcurrency: 6,
                videoQuality: 'high',
                thumbnailSize: 240,
                autoRefresh: true
            };
        }
    };

    const setLevel = (newLevel) => {
        if (!newLevel || newLevel === currentLevel) return;
        currentLevel = newLevel;
        currentConfig = getConfigFor(newLevel);
        window.OPTIMIZATION_LEVEL = newLevel;
        try { document.documentElement.setAttribute('data-optimization', newLevel); } catch (e) {}
        notify();
    };

    const getLevel = () => currentLevel;

    const getConfig = (level) => {
        if (!level) return currentConfig;
        return getConfigFor(level);
    };

    const getCurrentConfig = () => currentConfig;

    const subscribe = (callback) => {
        if (typeof callback !== 'function') return () => {};
        subscribers.push(callback);
        try { callback(currentLevel, currentConfig); } catch (e) {}
        return () => {
            subscribers = subscribers.filter(cb => cb !== callback);
        };
    };

    const notify = () => {
        subscribers.forEach(cb => {
            try { cb(currentLevel, currentConfig); } catch (e) {}
        });
        try {
            window.dispatchEvent(new CustomEvent('performance-changed', {
                detail: { level: currentLevel, config: currentConfig }
            }));
        } catch (e) {}
    };

    const shouldAnimateFrame = (frameIndex) => {
        if (!currentConfig || currentConfig.frameSkip === 0) return true;
        return frameIndex % (currentConfig.frameSkip + 1) === 0;
    };

    const getThrottleMs = () => currentConfig ? currentConfig.throttleMs : 300;

    const shouldAutoplay = () => currentConfig ? !currentConfig.disableAutoplay : true;

    const getMaxConcurrentMedia = () => currentConfig ? currentConfig.maxConcurrentMedia : 4;

    const canRenderAnimation = () => currentConfig ? currentConfig.animationsEnabled : true;

    const getVideoQuality = () => currentConfig ? currentConfig.videoQuality : 'high';

    const getThumbnailSize = () => currentConfig ? currentConfig.thumbnailSize : 160;

    const shouldAutoRefresh = () => currentConfig ? currentConfig.autoRefresh : true;

    const canReduceTransparency = () => currentConfig ? currentConfig.reduceTransparency : false;

    if (!currentConfig) {
        currentConfig = getConfigFor(currentLevel);
    }

    const setupListeners = () => {
        const onOptChanged = (e) => {
            const lvl = (e && e.detail && e.detail.level) || (e && e.detail && e.detail.payload);
            if (lvl && lvl !== currentLevel) setLevel(lvl);
        };

        const onSettingsAction = (e) => {
            if (e && e.detail && e.detail.action === 'optimization-changed' && e.detail.payload) {
                setLevel(e.detail.payload);
            }
        };

        try { window.addEventListener('optimization-changed', onOptChanged); } catch (e) {}
        try { window.addEventListener('settings-action', onSettingsAction); } catch (e) {}
    };

    setupListeners();

    // Expose the API
    return {
        setLevel,
        getLevel,
        getConfig,
        getCurrentConfig,
        subscribe,
        notify,
        shouldAnimateFrame,
        getThrottleMs,
        shouldAutoplay,
        getMaxConcurrentMedia,
        canRenderAnimation,
        getVideoQuality,
        getThumbnailSize,
        shouldAutoRefresh,
        canReduceTransparency
    };
})();

try { window.PerformanceManager = PerformanceManager; } catch (e) {}
