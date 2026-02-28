// This code is messssy
const WORLD_CITIES = [
    { name: 'New York', tz: 'America/New_York' },
    { name: 'Los Angeles', tz: 'America/Los_Angeles' },
    { name: 'Chicago', tz: 'America/Chicago' },
    { name: 'Denver', tz: 'America/Denver' },
    { name: 'London', tz: 'Europe/London' },
    { name: 'Paris', tz: 'Europe/Paris' },
    { name: 'Berlin', tz: 'Europe/Berlin' },
    { name: 'Madrid', tz: 'Europe/Madrid' },
    { name: 'Moscow', tz: 'Europe/Moscow' },
    { name: 'Dubai', tz: 'Asia/Dubai' },
    { name: 'Mumbai', tz: 'Asia/Kolkata' },
    { name: 'Bangkok', tz: 'Asia/Bangkok' },
    { name: 'Singapore', tz: 'Asia/Singapore' },
    { name: 'Hong Kong', tz: 'Asia/Hong_Kong' },
    { name: 'Tokyo', tz: 'Asia/Tokyo' },
    { name: 'Seoul', tz: 'Asia/Seoul' },
    { name: 'Sydney', tz: 'Australia/Sydney' },
    { name: 'Auckland', tz: 'Pacific/Auckland' },
    { name: 'São Paulo', tz: 'America/Sao_Paulo' },
    { name: 'Mexico City', tz: 'America/Mexico_City' },
    { name: 'Toronto', tz: 'America/Toronto' },
    { name: 'Istanbul', tz: 'Europe/Istanbul' },
    { name: 'Cairo', tz: 'Africa/Cairo' },
    { name: 'Lagos', tz: 'Africa/Lagos' },
    { name: 'Johannesburg', tz: 'Africa/Johannesburg' },
    { name: 'Kuala Lumpur', tz: 'Asia/Kuala_Lumpur' },
    { name: 'Jakarta', tz: 'Asia/Jakarta' },
    { name: 'Manila', tz: 'Asia/Manila' },
    { name: 'Taipei', tz: 'Asia/Taipei' },
    { name: 'Shanghai', tz: 'Asia/Shanghai' },
    { name: 'Athens', tz: 'Europe/Athens' },
    { name: 'Rome', tz: 'Europe/Rome' },
    { name: 'Amsterdam', tz: 'Europe/Amsterdam' },
    { name: 'Prague', tz: 'Europe/Prague' },
];

const ClockApp = ({ settings }) => {
    const [tab, setTab] = useState('clock');
    const [worldClocks, setWorldClocks] = useState(() => {
        return Persistence.get('clock.worldClocks', []);
    });
    const [showCityPicker, setShowCityPicker] = useState(false);
    const [citySearch, setCitySearch] = useState('');
    const [alarms, setAlarms] = useState(() => {
        return Persistence.get('clock.alarms', []);
    });
    const [showAlarmForm, setShowAlarmForm] = useState(false);
    const [alarmTime, setAlarmTime] = useState('09:00');
    const [alarmLabel, setAlarmLabel] = useState('');
    const [stopwatchRunning, setStopwatchRunning] = useState(false);
    const [stopwatchTime, setStopwatchTime] = useState(0);
    const [stopwatchLaps, setStopwatchLaps] = useState([]);
    const [timerDuration, setTimerDuration] = useState(300);
    const [timerRemaining, setTimerRemaining] = useState(300);
    const [timerRunning, setTimerRunning] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!stopwatchRunning) return;
        const interval = setInterval(() => setStopwatchTime(t => t + 10), 10);
        return () => clearInterval(interval);
    }, [stopwatchRunning]);

    useEffect(() => {
        if (!timerRunning || timerRemaining <= 0) {
            if (timerRemaining <= 0) setTimerRunning(false);
            return;
        }
        const interval = setInterval(() => setTimerRemaining(t => Math.max(0, t - 1)), 1000);
        return () => clearInterval(interval);
    }, [timerRunning, timerRemaining]);

    useEffect(() => {
        let mounted = true;
        const check = () => {
            try {
                const now = new Date();
                const hh = String(now.getHours()).padStart(2, '0');
                const mm = String(now.getMinutes()).padStart(2, '0');
                const nowStr = hh + ':' + mm;
                alarms.forEach(a => {
                    if (!a.enabled || a._fired) return;
                    if (a.time === nowStr) {
                        a._fired = true;
                        setAlarms(as => as.map(x => x.id === a.id ? ({ ...x, _fired: true }) : x));
                        try {
                            if (window.NotificationCenter) window.NotificationCenter.notify({ title: 'Alarm', message: a.label || 'Alarm', appId: 'clock', timeout: 8000 });
                        } catch (e) {}
                        try {
                            const ctx = new (window.AudioContext || window.webkitAudioContext)();
                            const nowt = ctx.currentTime;
                            for (let i = 0; i < 3; i++) {
                                const o = ctx.createOscillator();
                                const g = ctx.createGain();
                                o.type = 'sine'; o.frequency.setValueAtTime(880 - i*120, nowt + i*0.2);
                                g.gain.setValueAtTime(0.0001, nowt + i*0.2);
                                g.gain.exponentialRampToValueAtTime(0.2, nowt + i*0.2 + 0.02);
                                g.gain.exponentialRampToValueAtTime(0.0001, nowt + i*0.2 + 0.18);
                                o.connect(g); g.connect(ctx.destination);
                                o.start(nowt + i*0.2); o.stop(nowt + i*0.2 + 0.2);
                            }
                        } catch (e) {}
                    }
                });
            } catch (e) {}
        };
        const iv = setInterval(check, 1000);
        check();
        return () => { clearInterval(iv); mounted = false; };
    }, [alarms]);

    useEffect(() => {
        Persistence.set('clock.worldClocks', worldClocks);
    }, [worldClocks]);

    useEffect(() => {
        const handler = (e) => {
            const d = e && e.detail; if (!d || !d.action) return;
            try {
                if (d.action === 'add-city') return setShowCityPicker(s => !s);
                if (d.action === 'new-alarm') return setShowAlarmForm(s => !s);
                if (d.action === 'toggle-stopwatch') return setStopwatchRunning(r => !r);
                if (d.action === 'reset-stopwatch') { setStopwatchRunning(false); setStopwatchTime(0); setStopwatchLaps([]); }
                if (d.action === 'set-tab' && d.tab) return setTab(d.tab);
            } catch (err) { console.warn('clock-action handler', err); }
        };
        window.addEventListener('clock-action', handler);
        return () => window.removeEventListener('clock-action', handler);
    }, []);

    useEffect(() => {
        Persistence.set('clock.alarms', alarms);
    }, [alarms]);

    useEffect(() => {
        const playBeep = () => {
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const o = ctx.createOscillator(); const g = ctx.createGain();
                o.type = 'sine'; o.frequency.setValueAtTime(880, ctx.currentTime);
                g.gain.setValueAtTime(0.001, ctx.currentTime);
                g.gain.exponentialRampToValueAtTime(0.5, ctx.currentTime + 0.02);
                o.connect(g); g.connect(ctx.destination); o.start();
                setTimeout(() => { try { o.stop(); ctx.close(); } catch (e) {} }, 900);
            } catch (e) { /* ignore */ }
        };

        const iv = setInterval(() => {
            try {
                const now = new Date();
                const hh = String(now.getHours()).padStart(2,'0');
                const mm = String(now.getMinutes()).padStart(2,'0');
                const cur = `${hh}:${mm}`;
                let changed = false;
                const updated = alarms.map(a => {
                    if (!a.enabled) return a;
                    if (a.time === cur) {
                        const last = a.lastTriggered || null;
                        const today = (new Date()).toDateString();
                        if (last !== today) {
                            // trigger
                            try { window.NotificationCenter && window.NotificationCenter.notify({ title: 'Alarm', message: a.label || 'Alarm', appId: 'clock', timeout: 6000 }); } catch(e){}
                            playBeep();
                            changed = true;
                            return { ...a, lastTriggered: today };
                        }
                    }
                    return a;
                });
                if (changed) setAlarms(updated);
            } catch (e) {}
        }, 1000);
        return () => clearInterval(iv);
    }, [alarms]);

    const filteredCities = WORLD_CITIES.filter(c => 
        c.name.toLowerCase().includes(citySearch.toLowerCase()) && 
        !worldClocks.some(wc => wc.tz === c.tz)
    );

    const addCity = (city) => {
        setWorldClocks([...worldClocks, { id: Math.random().toString(36).slice(2, 9), name: city.name, tz: city.tz }]);
        setShowCityPicker(false);
        setCitySearch('');
    };

    const deleteWorldClock = (id) => {
        setWorldClocks(worldClocks.filter(c => c.id !== id));
    };

    const addAlarm = () => {
        if (alarmTime) {
            setAlarms([...alarms, { id: Math.random().toString(36).slice(2, 9), time: alarmTime, label: alarmLabel || 'Alarm', enabled: true }]);
            setAlarmTime('09:00');
            setAlarmLabel('');
            setShowAlarmForm(false);
        }
    };

    const toggleAlarm = (id) => {
        setAlarms(alarms.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a));
    };

    const deleteAlarm = (id) => {
        setAlarms(alarms.filter(a => a.id !== id));
    };

    const getClockTime = (tz) => {
        try {
            const formatter = new Intl.DateTimeFormat('default', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false });
            return formatter.format(currentTime);
        } catch (e) {
            return '--:--';
        }
    };

    const getOffset = (tz) => {
        try {
            const utc = currentTime.toLocaleString('sv-SE', { timeZone: 'UTC' });
            const local = currentTime.toLocaleString('sv-SE', { timeZone: tz });
            const utcTime = new Date(utc);
            const localTime = new Date(local);
            const offset = (localTime - utcTime) / 3600000;
            const sign = offset >= 0 ? '+' : '';
            return `UTC ${sign}${offset}`;
        } catch (e) {
            return 'UTC';
        }
    };

    const cardBg = '#1a1a1a';
    const borderColor = '#333';
    const controlBg = '#222';

    const formatTime = (ms) => {
        const total = Math.floor(ms / 1000);
        const mins = Math.floor(total / 60);
        const secs = total % 60;
        const centis = Math.floor((ms % 1000) / 10);
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(centis).padStart(2, '0')}`;
    };

    const formatTimerDisplay = (secs) => {
        const h = Math.floor(secs / 3600);
        const m = Math.floor((secs % 3600) / 60);
        const s = secs % 60;
        if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        return `${m}:${String(s).padStart(2, '0')}`;
    };

    const WorldClockView = () => html`
        <div style="padding: 16px; display: flex; flex-direction: column; gap: 12px; height: 100%">
            <!-- Add City moved to titlebar; use titlebar button to open city picker -->
            
            ${showCityPicker ? html`
                <div style="background: ${cardBg}; border-radius: 12px; padding: 12px; border: 1px solid ${borderColor}">
                    <input autofocus type="text" placeholder="Search cities..." value=${citySearch} oninput=${e => setCitySearch(e.target.value)} style="width: 100%; background: ${controlBg}; border: 1px solid ${borderColor}; color: #fff; padding: 10px 12px; border-radius: 8px; margin-bottom: 10px; font-size: 13px; box-sizing: border-box" />
                    <div style="max-height: 200px; overflow-y: auto; display: grid; grid-template-columns: 1fr 1fr; gap: 8px">
                        ${filteredCities.slice(0, 20).map(city => html`
                            <button onclick=${() => addCity(city)} style="background: ${controlBg}; border: 1px solid ${borderColor}; color: #fff; padding: 8px 10px; border-radius: 6px; cursor: pointer; font-size: 12px; text-align: left" onmouseover=${e => { e.target.style.background = '#2a2a2a'; e.target.style.borderColor = '${borderColor}'; }} onmouseout=${e => { e.target.style.background = controlBg; e.target.style.borderColor = borderColor; }}>${city.name}</button>
                        `)}
                    </div>
                    <button onclick=${() => setShowCityPicker(false)} style="width: 100%; background: transparent; border: 1px solid #555; color: #aaa; padding: 8px; border-radius: 6px; cursor: pointer; margin-top: 10px; font-size: 12px" onmouseover=${e => { e.target.style.borderColor = '#888'; e.target.style.color = '#fff'; }} onmouseout=${e => { e.target.style.borderColor = '#555'; e.target.style.color = '#aaa'; }}>Close</button>
                </div>
            ` : ''}

            ${worldClocks.length === 0 ? html`<div style="color: #666; text-align: center; padding: 40px 10px; font-size: 13px">Add cities to see their current time</div>` : html`
                <div style="display: flex; flex-direction: column; gap: 10px; flex: 1; overflow-y: auto">
                    ${worldClocks.map(clock => html`
                        <div style="background: ${cardBg}; border: 1px solid ${borderColor}; padding: 14px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <div style="font-size: 13px; color: rgba(255,255,255,0.75); margin-bottom: 4px">${clock.name}</div>
                                <div style="font-size: 32px; font-weight: 300; letter-spacing: 1px; font-family: 'SF Mono', monospace">${getClockTime(clock.tz)}</div>
                                <div style="font-size: 11px; color: rgba(255,255,255,0.7); margin-top: 4px">${getOffset(clock.tz)}</div>
                            </div>
                            <button onclick=${() => deleteWorldClock(clock.id)} style="background: #cc0000; color: white; border: none; padding: 6px 10px; border-radius: 6px; cursor: pointer; font-size: 12px" onmouseover=${e => e.target.style.background = '#ff0000'} onmouseout=${e => e.target.style.background = '#cc0000'}>×</button>
                        </div>
                    `)}
                </div>
            `}
        </div>
    `;

    const AlarmView = () => html`
        <div style="padding: 16px; display: flex; flex-direction: column; gap: 12px; height: 100%">
            <!-- New Alarm moved to titlebar; use titlebar button to toggle alarm form -->
            
            ${showAlarmForm ? html`
                <div style="background: ${cardBg}; border-radius: 12px; padding: 14px; border: 1px solid ${borderColor}">
                    <input type="time" value=${alarmTime} oninput=${e => setAlarmTime(e.target.value)} style="width: 100%; background: ${controlBg}; border: 1px solid ${borderColor}; color: #fff; padding: 10px 12px; border-radius: 8px; margin-bottom: 10px; font-size: 16px; box-sizing: border-box" />
                    <input type="text" placeholder="Label (optional)" value=${alarmLabel} oninput=${e => setAlarmLabel(e.target.value)} style="width: 100%; background: ${controlBg}; border: 1px solid ${borderColor}; color: #fff; padding: 10px 12px; border-radius: 8px; margin-bottom: 10px; font-size: 13px; box-sizing: border-box" />
                    <div style="display: flex; gap: 10px">
                        <button onclick=${addAlarm} style="flex: 1; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; border: none; padding: 10px; border-radius: 8px; cursor: pointer; font-weight: 600">Save</button>
                        <button onclick=${() => setShowAlarmForm(false)} style="flex: 1; background: ${controlBg}; color: white; border: none; padding: 10px; border-radius: 8px; cursor: pointer">Cancel</button>
                    </div>
                </div>
            ` : ''}

            ${alarms.length === 0 ? html`<div style="color: #666; text-align: center; padding: 60px 10px; font-size: 13px">No alarms set</div>` : html`
                <div style="display: grid; grid-template-columns: 1fr; gap: 8px; flex: 1; overflow-y: auto">
                    ${alarms.map(alarm => html`
                        <div style="background: ${cardBg}; border: 1px solid ${borderColor}; padding: 10px; border-radius: 10px; display: flex; justify-content: space-between; align-items: center;">
                            <div style="display:flex;flex-direction:column">
                                <div style="font-size: 20px; font-weight:700; letter-spacing: 1px; font-family: 'SF Mono', monospace">${alarm.time}</div>
                                <div style="font-size: 12px; color: rgba(255,255,255,0.75); margin-top: 4px">${alarm.label}</div>
                            </div>
                            <div style="display: flex; gap: 6px; align-items:center">
                                <div style="font-size:11px;color:rgba(255,255,255,0.7);">${alarm.lastTriggered ? 'Triggered' : ''}</div>
                                <button onclick=${() => toggleAlarm(alarm.id)} style="background: ${alarm.enabled ? '#3b82f6' : '#555'}; color: white; border: none; padding: 6px 10px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 11px">${alarm.enabled ? 'On' : 'Off'}</button>
                                <button onclick=${() => deleteAlarm(alarm.id)} style="background: #cc0000; color: white; border: none; padding: 6px 8px; border-radius: 6px; cursor: pointer; font-size: 11px">×</button>
                            </div>
                        </div>
                    `)}
                </div>
            `}
        </div>
    `;

    const StopwatchView = () => html`
        <div style="padding: 16px; display: flex; flex-direction: column; gap: 16px; height: 100%; overflow-y: auto">
            <div style="background: ${cardBg}; border: 1px solid ${borderColor}; padding: 24px; border-radius: 12px; text-align: center">
                <div style="font-size: 72px; font-weight: 300; letter-spacing: 2px; font-family: 'SF Mono', monospace; margin-bottom: 20px">${formatTime(stopwatchTime)}</div>
                <div style="display: flex; gap: 12px; justify-content: center">
                    <button onclick=${() => { if (stopwatchRunning) { setStopwatchLaps([...stopwatchLaps, stopwatchTime]); } else { setStopwatchTime(0); setStopwatchLaps([]); } }} style="background: #555; color: white; border: none; width: 64px; height: 64px; border-radius: 50%; cursor: pointer; font-weight: 600; font-size: 11px; box-shadow: 0 4px 12px rgba(0,0,0,0.3)" onmouseover=${e => e.target.style.background = '#666'} onmouseout=${e => e.target.style.background = '#555'}>
                        ${stopwatchRunning ? 'LAP' : 'RESET'}
                    </button>
                    <button onclick=${() => setStopwatchRunning(!stopwatchRunning)} style="background: ${stopwatchRunning ? 'linear-gradient(135deg, #ff6b6b 0%, #ff0000 100%)' : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'}; color: white; border: none; width: 64px; height: 64px; border-radius: 50%; cursor: pointer; font-weight: 600; font-size: 11px; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3)" onmouseover=${e => e.target.style.transform = 'scale(1.05)'} onmouseout=${e => e.target.style.transform = 'scale(1)'}>
                        ${stopwatchRunning ? 'STOP' : 'START'}
                    </button>
                </div>
            </div>
            ${stopwatchLaps.length > 0 ? html`
                <div style="display: grid; grid-template-columns: 1fr; gap: 8px">
                    <h3 style="color: #888; font-size: 12px; margin: 0; text-transform: uppercase; letter-spacing: 0.5px">Laps</h3>
                    ${stopwatchLaps.map((lap, idx) => html`
                        <div style="background: ${cardBg}; border: 1px solid ${borderColor}; padding: 12px 14px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center">
                            <span style="color: rgba(255,255,255,0.75); font-size: 12px">Lap ${idx + 1}</span>
                            <span style="font-family: 'SF Mono', monospace; font-size: 14px; color: #fff">${formatTime(lap)}</span>
                        </div>
                    `)}
                </div>
            ` : ''}
        </div>
    `;

    const TimerView = () => {
        const hours = Array.from({ length: 24 }, (_, i) => i);
        const mins = Array.from({ length: 60 }, (_, i) => i);
        const secs = Array.from({ length: 60 }, (_, i) => i);

        const setFromParts = (h, m, s) => {
            const total = (Number(h) || 0) * 3600 + (Number(m) || 0) * 60 + (Number(s) || 0);
            const clamped = Math.max(1, Math.min(24 * 3600, total));
            setTimerDuration(clamped); setTimerRemaining(clamped);
        };

        return html`
            <div style="padding: 16px; display: flex; flex-direction: column; gap: 16px; height: 100%; overflow-y: auto">
                <div style="background: ${cardBg}; border: 1px solid ${borderColor}; padding: 24px; border-radius: 12px; text-align: center">
                    <div style="font-size: 72px; font-weight: 300; letter-spacing: 2px; font-family: 'SF Mono', monospace; color: ${timerRemaining <= 60 && timerRemaining > 0 ? '#ff6b6b' : '#fff'}; margin-bottom: 20px">${formatTimerDisplay(timerRemaining)}</div>
                    <div style="display: flex; gap: 12px; justify-content: center">
                        ${timerRunning ? html`
                            <button onclick=${() => setTimerRunning(false)} style="background: #555; color: white; border: none; width: 64px; height: 64px; border-radius: 50%; cursor: pointer; font-weight: 600; font-size: 11px; box-shadow: 0 4px 12px rgba(0,0,0,0.3)" onmouseover=${e => e.target.style.background = '#666'} onmouseout=${e => e.target.style.background = '#555'}>PAUSE</button>
                        ` : html`
                            <button onclick=${() => setTimerRunning(true)} style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; border: none; width: 64px; height: 64px; border-radius: 50%; cursor: pointer; font-weight: 600; font-size: 11px; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3)" onmouseover=${e => e.target.style.transform = 'scale(1.05)'} onmouseout=${e => e.target.style.transform = 'scale(1)'}>START</button>
                        `}
                        ${timerRunning || timerRemaining !== timerDuration ? html`
                            <button onclick=${() => { setTimerRunning(false); setTimerRemaining(timerDuration); }} style="background: #555; color: white; border: none; width: 64px; height: 64px; border-radius: 50%; cursor: pointer; font-weight: 600; font-size: 11px; box-shadow: 0 4px 12px rgba(0,0,0,0.3)" onmouseover=${e => e.target.style.background = '#666'} onmouseout=${e => e.target.style.background = '#555'}>RESET</button>
                        ` : ''}
                    </div>
                </div>

                ${!timerRunning && timerRemaining === timerDuration ? html`
                    <div style="display:flex;gap:12px;justify-content:center;align-items:center;">
                        <div style="width:120px;height:180px;overflow:auto;border-radius:8px;background:${controlBg};border:1px solid ${borderColor};text-align:center;padding-top:30px;">
                            ${hours.map(h => html`<div onclick=${() => setFromParts(h, Math.floor(timerDuration/60)%60, timerDuration%60)} style="padding:6px 0;cursor:pointer;color:${Math.floor(timerDuration/3600)===h? '#fff':'#bbb'}">${String(h).padStart(2,'0')}</div>`)}
                        </div>
                        <div style="width:120px;height:180px;overflow:auto;border-radius:8px;background:${controlBg};border:1px solid ${borderColor};text-align:center;padding-top:30px;">
                            ${mins.map(m => html`<div onclick=${() => setFromParts(Math.floor(timerDuration/3600), m, timerDuration%60)} style="padding:6px 0;cursor:pointer;color:${Math.floor((timerDuration%3600)/60)===m? '#fff':'#bbb'}">${String(m).padStart(2,'0')}</div>`)}
                        </div>
                        <div style="width:120px;height:180px;overflow:auto;border-radius:8px;background:${controlBg};border:1px solid ${borderColor};text-align:center;padding-top:30px;">
                            ${secs.map(s => html`<div onclick=${() => setFromParts(Math.floor(timerDuration/3600), Math.floor((timerDuration%3600)/60), s)} style="padding:6px 0;cursor:pointer;color:${timerDuration%60===s? '#fff':'#bbb'}">${String(s).padStart(2,'0')}</div>`)}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    };

    return html`
        <div style="background: transparent; color: #eee; height: 100vh; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; display: flex; flex-direction: column">
            <header style="padding: 16px 20px; border-bottom: 1px solid ${borderColor}; display: flex; align-items: center; justify-content: space-between">
                <h2 style="margin: 0; font-size: 1.2rem; font-weight: 400">${currentTime.toLocaleTimeString('default', { hour: '2-digit', minute: '2-digit' })}</h2>
                <div style="display: flex; background: ${cardBg}; border-radius: 8px; padding: 4px; gap: 2px; border: 1px solid ${borderColor}">
                    ${['clock', 'alarm', 'stopwatch', 'timer'].map(t => {
                        const isActive = tab === t;
                        return html`
                            <button onclick=${() => setTab(t)} style="background: ${isActive ? cardBg : 'transparent'}; border: none; color: ${isActive ? '#fff' : 'rgba(255,255,255,0.65)'}; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 11px; font-weight: 600; text-transform: capitalize; transition: all 0.2s ease;" onmouseover=${e => !isActive && (e.target.style.color = '#fff')} onmouseout=${e => !isActive && (e.target.style.color = 'rgba(255,255,255,0.65)')}>${t}</button>
                        `;
                    })}
                </div>
            </header>

            <main style="flex: 1; overflow-y: auto; overflow-x: hidden">
                ${tab === 'clock' ? WorldClockView() : tab === 'alarm' ? AlarmView() : tab === 'stopwatch' ? StopwatchView() : TimerView()}
            </main>
        </div>
    `;
};

AppRegistry.register('clock', ClockApp);
window.ClockApp = ClockApp;

ClockApp.titlebarButtons = ({ appId } = {}) => html`<div style="display:flex;gap:8px;align-items:center;">
    <button title="Add city" onclick=${() => window.dispatchEvent(new CustomEvent('clock-action', { detail: { action: 'add-city' } }))} style="background:transparent;border:1px solid var(--border);color:var(--text-main);padding:6px 8px;border-radius:8px;">＋</button>
    <button title="New alarm" onclick=${() => window.dispatchEvent(new CustomEvent('clock-action', { detail: { action: 'new-alarm' } }))} style="background:transparent;border:1px solid var(--border);color:var(--text-main);padding:6px 8px;border-radius:8px;">⏰</button>
    <button title="Toggle stopwatch" onclick=${() => window.dispatchEvent(new CustomEvent('clock-action', { detail: { action: 'toggle-stopwatch' } }))} style="background:transparent;border:1px solid var(--border);color:var(--text-main);padding:6px 8px;border-radius:8px;">⏱</button>
</div>`;

// Listen for titlebar actions
try {
    window.addEventListener('clock-action', (e) => {
        const d = e && e.detail;
        if (!d || !d.action) return;
        try {
            window.dispatchEvent(new CustomEvent('glex-clock-bridge', { detail: d }));
        } catch (err) {}
    });
} catch (e) {}
