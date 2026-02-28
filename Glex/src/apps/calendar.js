const CalendarApp = ({ settings }) => {
    const [events, setEvents] = useState(() => {
        return Persistence.get('calendar.events', []);
    });
    const [view, setView] = useState('month');
    const [cursorDate, setCursorDate] = useState(new Date());
    const [popover, setPopover] = useState(null);

    useEffect(() => {
        Persistence.set('calendar.events', events);
    }, [events]);

    useEffect(() => {
        const handler = (e) => {
            const d = e && e.detail; if (!d || !d.action) return;
            try {
                if (d.action === 'add-event') return setPopover({ date: new Date(cursorDate) });
                if (d.action === 'prev') return moveMonth(-1);
                if (d.action === 'next') return moveMonth(1);
                if (d.action === 'today') return setCursorDate(new Date());
                if (d.action === 'view-month') return setView('month');
                if (d.action === 'view-list') return setView('list');
            } catch (err) { console.warn('calendar-action', err); }
        };
        window.addEventListener('calendar-action', handler);
        return () => window.removeEventListener('calendar-action', handler);
    }, [cursorDate]);

    const addEvent = (ev) => {
        const newEvent = { 
            ...ev, 
            id: Math.random().toString(36).slice(2, 9),
            end: ev.end || ev.start + 3600000 // Default 1 hour duration if no end
        };
        setEvents(s => [...s, newEvent].sort((a, b) => a.start - b.start));
    };

    const deleteEvent = (id, e) => {
        e.stopPropagation();
        if (confirm('Delete this event?')) {
            setEvents(s => s.filter(ev => ev.id !== id));
        }
    };

    const moveMonth = (offset) => {
        const d = new Date(cursorDate);
        d.setMonth(d.getMonth() + offset);
        setCursorDate(d);
    };

    // glassMorphism removed, use solid styles please
    const rootStyle = 'background: #111; color: #eee; height: 100vh; font-family: sans-serif; display: flex; flex-direction: column;';
    const headerStyle = 'padding: 20px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #333;';
    const dayLabelsStyle = 'padding: 10px; background: #1a1a1a; font-size: 12px; display: grid; grid-template-columns: repeat(7, 1fr); text-align: center; color: #666';
    const mainStyle = 'flex: 1; overflow-y: auto; padding: 10px;';
    const modalOverlayStyle = 'position: fixed; inset: 0; background: rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:1000;';
    const modalContentStyle = 'background: linear-gradient(135deg, #2a2a2a 0%, #1f1f1f 100%); padding: 28px; border-radius: 16px; width: 380px; border: 1px solid #555; box-shadow: 0 20px 60px rgba(0,0,0,0.6); max-height: 90vh; overflow-y: auto;';

    const renderMonthView = () => {
        const containerStyle = 'background: #111';
        const borderCol = '#333';
        const year = cursorDate.getFullYear();
        const month = cursorDate.getMonth();
        const start = new Date(year, month, 1);
        const startWeekDay = start.getDay();
        const days = [];
        const dayEventMap = {};

        for (let i = 0; i < 42; i++) {
            const d = new Date(year, month, i - startWeekDay + 1);
            const key = d.toDateString();
            dayEventMap[key] = events.filter(ev => {
                const evStart = new Date(ev.start);
                const evEnd = new Date(ev.end);
                evStart.setHours(0, 0, 0, 0);
                evEnd.setHours(23, 59, 59, 999);
                d.setHours(0, 0, 0, 0);
                return d >= evStart && d <= evEnd;
            });
        }

        for (let i = 0; i < 42; i++) {
            const d = new Date(year, month, i - startWeekDay + 1);
            const isToday = new Date().toDateString() === d.toDateString();
            const isCurrentMonth = d.getMonth() === month;
            const dayEvents = dayEventMap[d.toDateString()] || [];

            const handleClick = () => {
                if (isCurrentMonth) {
                    setPopover({ date: d });
                }
            };

            const cellBg = isCurrentMonth ? '#1e1e1e' : '#151515';
            const cellBorder = borderCol;

            days.push(html`
                <div onclick=${handleClick}
                     style="background: ${cellBg}; border: 1px solid ${cellBorder}; min-height: 100px; padding: 8px; cursor: ${isCurrentMonth ? 'pointer' : 'default'}; transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1); position: relative; overflow: hidden;"
                     onmouseover=${e => {
                         if (isCurrentMonth) {
                            e.currentTarget.style.background = '#2a2a2a';
                             e.currentTarget.style.transform = 'translateY(-2px)';
                             e.currentTarget.style.boxShadow = '0 8px 16px rgba(59, 130, 246, 0.2)';
                         }
                     }}
                     onmouseout=${e => {
                        e.currentTarget.style.background = isCurrentMonth ? cellBg : '#151515';
                         e.currentTarget.style.transform = 'translateY(0)';
                         e.currentTarget.style.boxShadow = 'none';
                     }}>
                    <div style="color: ${isToday ? '#60a5fa' : isCurrentMonth ? '#eee' : '#555'}; font-weight: ${isToday ? '800' : '400'}; font-size: 14px; margin-bottom: 4px">
                        ${d.getDate()}
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 4px">
                        ${dayEvents.map((ev, idx) => {
                            const evStart = new Date(ev.start);
                            const evEnd = new Date(ev.end);
                            const startTime = evStart.toLocaleTimeString('default', { hour: '2-digit', minute: '2-digit' });
                            const endTime = evEnd.toLocaleTimeString('default', { hour: '2-digit', minute: '2-digit' });
                            const isMultiDay = evStart.toDateString() !== evEnd.toDateString();
                            const isStartDay = evStart.toDateString() === d.toDateString();
                            const isEndDay = evEnd.toDateString() === d.toDateString();
                            
                            return html`
                                <div style="background: ${isMultiDay ? 'linear-gradient(90deg, #8b5cf6 0%, #6d28d9 100%)' : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'}; color: white; font-size: 10px; padding: 4px 6px; border-radius: 4px; display: flex; justify-content: space-between; align-items: center; animation: slideUp 0.3s ease-out ${idx * 0.08}s both; cursor: default;"
                                     onmouseover=${e => e.currentTarget.style.opacity = '0.9'}
                                     onmouseout=${e => e.currentTarget.style.opacity = '1'}>
                                    <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; font-weight: 600">${ev.title}</span>
                                    <span style="font-size: 9px; opacity: 0.8; margin: 0 4px">${isStartDay ? startTime : '…'} ${isEndDay ? endTime : '…'}</span>
                                    <span onclick=${(e) => deleteEvent(ev.id, e)} style="opacity: 0.7; font-weight: bold; cursor: pointer; transition: opacity 0.2s;" onmouseover=${e => e.target.style.opacity = '1'} onmouseout=${e => e.target.style.opacity = '0.7'}>×</span>
                                </div>
                            `;
                        })}
                    </div>
                    ${isCurrentMonth && dayEvents.length === 0 ? html`<div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); opacity: 0; transition: opacity 0.2s; font-size: 24px; color: rgba(59, 130, 246, 0.3);" onmouseover=${e => e.currentTarget.style.opacity = '0.6'} onmouseout=${e => e.currentTarget.style.opacity = '0'}>+</div>` : ''}
                </div>
            `);
        }
        return html`<div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 1px; background: ${borderCol}; border: 1px solid ${borderCol};">${days}</div>`;
    };

    const QuickAddModal = () => {
        const [text, setText] = useState('');
        const [startDate, setStartDate] = useState(popover?.date?.toISOString().split('T')[0] || '');
        const [startTime, setStartTime] = useState('09:00');
        const [endDate, setEndDate] = useState(popover?.date?.toISOString().split('T')[0] || '');
        const [endTime, setEndTime] = useState('10:00');
        const [saved, setSaved] = useState(false);
        
        if (!popover) return null;

        const save = () => {
            if (!text.trim() || !startDate) return;
            
            let finalStartTime = startTime;
            let finalEndTime = endTime;
            
            const timeMatch = text.match(/(\d{1,2})(:\d{2})?\s*(am|pm)?(?:\s*[-–]\s*(\d{1,2})(:\d{2})?\s*(am|pm)?)?/i);
            if (timeMatch) {
                let startH = parseInt(timeMatch[1]);
                const startM = timeMatch[2] ? parseInt(timeMatch[2].slice(1)) : 0;
                const isPM = timeMatch[3]?.toLowerCase() === 'pm';
                if (isPM && startH < 12) startH += 12;
                if (!isPM && startH === 12) startH = 0;
                finalStartTime = `${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}`;
                
                if (timeMatch[4]) {
                    let endH = parseInt(timeMatch[4]);
                    const endM = timeMatch[5] ? parseInt(timeMatch[5].slice(1)) : 0;
                    const endPM = timeMatch[6]?.toLowerCase() === 'pm' || isPM;
                    if (endPM && endH < 12) endH += 12;
                    if (!endPM && endH === 12) endH = 0;
                    finalEndTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
                }
            }

            const startDt = new Date(`${startDate}T${finalStartTime}`);
            const endDt = new Date(`${endDate || startDate}T${finalEndTime}`);
            
            addEvent({ 
                title: text.replace(/\d+(:\d{2})?\s*(am|pm)?\s*[-–]?\s*\d+(:\d{2})?\s*(am|pm)?/gi, '').trim() || 'New Event', 
                start: startDt.getTime(), 
                end: endDt.getTime() 
            });
            setSaved(true);
            setTimeout(() => {
                setSaved(false);
                setText('');
                setStartDate(popover?.date?.toISOString().split('T')[0] || '');
                setStartTime('09:00');
                setEndDate(popover?.date?.toISOString().split('T')[0] || '');
                setEndTime('10:00');
                setPopover(null);
            }, 600);
        };

        return html`
            <style>
                @keyframes fadeInScale { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
                @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                @keyframes checkmark { 0% { transform: scale(0); } 50% { transform: scale(1.2); } 100% { transform: scale(1); } }
                .modal-overlay { animation: fadeInScale 0.25s ease-out; }
                .modal-content { animation: slideUp 0.3s ease-out; }
                .event-saved { animation: checkmark 0.5s cubic-bezier(0.34, 1.56, 0.64, 1); }
            </style>
            <div class="modal-overlay" style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(2px);">
                <div class="modal-content" style="background: linear-gradient(135deg, #2a2a2a 0%, #1f1f1f 100%); padding: 28px; border-radius: 16px; width: 380px; border: 1px solid #555; box-shadow: 0 20px 60px rgba(0,0,0,0.6); max-height: 90vh; overflow-y: auto;">
                    ${saved ? html`
                        <div style="text-align: center; display: flex; flex-direction: column; align-items: center; gap: 12px;">
                            <div class="event-saved" style="font-size: 48px">✓</div>
                            <div style="color: #4ade80; font-weight: 600">Event Added!</div>
                            <div style="color: #888; font-size: 13px">${startDate}${endDate !== startDate ? ` - ${endDate}` : ''}</div>
                        </div>
                    ` : html`
                        <h3 style="color: #fff; margin: 0 0 8px; font-size: 18px">New Event</h3>
                        <p style="color: #888; font-size: 13px; margin: 0 0 16px">${popover.date.toLocaleDateString('default', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
                        
                        <input autofocus oninput=${e => setText(e.target.value)} onkeydown=${e => e.key === 'Enter' && save()} placeholder="e.g. Gym at 6pm, Project 2pm-4pm" style="width: 100%; background: rgba(0,0,0,0.3); border: 1px solid #555; color: #fff; padding: 12px 14px; border-radius: 8px; margin-bottom: 14px; font-size: 14px; box-sizing: border-box" />
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px">
                            <div>
                                <label style="color: #aaa; font-size: 12px; display: block; margin-bottom: 4px">Start Date</label>
                                <input type="date" value=${startDate} oninput=${e => setStartDate(e.target.value)} style="width: 100%; background: rgba(0,0,0,0.3); border: 1px solid #555; color: #fff; padding: 8px; border-radius: 6px; font-size: 13px; box-sizing: border-box" />
                            </div>
                            <div>
                                <label style="color: #aaa; font-size: 12px; display: block; margin-bottom: 4px">Start Time</label>
                                <input type="time" value=${startTime} oninput=${e => setStartTime(e.target.value)} style="width: 100%; background: rgba(0,0,0,0.3); border: 1px solid #555; color: #fff; padding: 8px; border-radius: 6px; font-size: 13px; box-sizing: border-box" />
                            </div>
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px">
                            <div>
                                <label style="color: #aaa; font-size: 12px; display: block; margin-bottom: 4px">End Date</label>
                                <input type="date" value=${endDate} oninput=${e => setEndDate(e.target.value)} style="width: 100%; background: rgba(0,0,0,0.3); border: 1px solid #555; color: #fff; padding: 8px; border-radius: 6px; font-size: 13px; box-sizing: border-box" />
                            </div>
                            <div>
                                <label style="color: #aaa; font-size: 12px; display: block; margin-bottom: 4px">End Time</label>
                                <input type="time" value=${endTime} oninput=${e => setEndTime(e.target.value)} style="width: 100%; background: rgba(0,0,0,0.3); border: 1px solid #555; color: #fff; padding: 8px; border-radius: 6px; font-size: 13px; box-sizing: border-box" />
                            </div>
                        </div>

                        <div style="display: flex; gap: 10px; justify-content: flex-end">
                            <button onclick=${() => setPopover(null)} style="background: transparent; color: #aaa; border: 1px solid #666; cursor: pointer; padding: 8px 16px; border-radius: 6px; font-size: 14px; transition: all 0.2s ease;" onmouseover=${e => { e.target.style.borderColor = '#888'; e.target.style.color = '#ccc'; }} onmouseout=${e => { e.target.style.borderColor = '#666'; e.target.style.color = '#aaa'; }}>Cancel</button>
                            <button onclick=${save} style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; border: none; padding: 8px 18px; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 600; transition: all 0.2s ease; opacity: ${text.trim() && startDate ? '1' : '0.5'};" onmouseover=${e => text.trim() && startDate && (e.target.style.transform = 'translateY(-2px)')} onmouseout=${e => (e.target.style.transform = 'translateY(0)')}>Save</button>
                        </div>
                    `}
                </div>
            </div>`;
    };

    const arrowLeft = String.fromCharCode(60);
    const arrowRight = String.fromCharCode(62);

        return html`
        <div style="${rootStyle}">
            <header style="${headerStyle}">
                <div style="display: flex; align-items: center; gap: 20px">
                    <h2 style="margin: 0; font-size: 1.2rem">${cursorDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
                    <div style="display: flex; gap: 8px">
                            <div style="display: flex; gap: 8px">
                                <!-- Navigation moved to titlebar: Prev / Today / Next handled via titlebar buttons -->
                            </div>
                    </div>
                </div>
                <div style="display: flex; background: rgba(0,0,0,0.18); border-radius: 8px; padding: 6px">
                        <div style="display: flex; background: rgba(0,0,0,0.18); border-radius: 8px; padding: 6px">
                            <!-- View controls moved to titlebar (Month/List) -->
                        </div>
                </div>
            </header>

            <div style="${dayLabelsStyle}">
                ${['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => html`<div>${d}</div>`)}
            </div>

            <main style="${mainStyle}">
                ${view === 'month' ? renderMonthView() : html`
                    <div style="padding: 20px">
                        ${events.length === 0 ? html`<p style="color: #9aa6b2">No upcoming events</p>` : events.map(ev => {
                            const evStart = new Date(ev.start);
                            const evEnd = new Date(ev.end);
                            const isSameDay = evStart.toDateString() === evEnd.toDateString();
                            return html`
                                <div style="padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.03); display: flex; justify-content: space-between; align-items: center; transition: all 0.2s ease;" onmouseover=${e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'} onmouseout=${e => e.currentTarget.style.background = 'transparent'}>
                                    <div style="flex: 1">
                                        <div style="font-weight: bold; color: #fff">${ev.title}</div>
                                        <div style="color: #9aa6b2; font-size: 12px">
                                            ${isSameDay 
                                                ? evStart.toLocaleDateString() + ' • ' + evStart.toLocaleTimeString('default', { hour: '2-digit', minute: '2-digit' }) + ' - ' + evEnd.toLocaleTimeString('default', { hour: '2-digit', minute: '2-digit' })
                                                : evStart.toLocaleString('default', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' → ' + evEnd.toLocaleString('default', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                                            }
                                        </div>
                                    </div>
                                    <button onclick=${(e) => deleteEvent(ev.id, e)} style="background: #cc0000; color: white; border: none; border-radius: 6px; padding: 6px 10px; cursor: pointer; transition: all 0.2s ease;" onmouseover=${e => e.target.style.background = '#ff0000'} onmouseout=${e => e.target.style.background = '#cc0000'}>Delete</button>
                                </div>
                            `;
                        })}
                    </div>
                `}
            </main>

            ${QuickAddModal()}
        </div>
    `;
};

AppRegistry.register('calendar', CalendarApp);
window.CalendarApp = CalendarApp;

CalendarApp.titlebarButtons = ({ appId } = {}) => html`<div style="display:flex;gap:8px;align-items:center;">
    <button title="Prev" onclick=${() => window.dispatchEvent(new CustomEvent('calendar-action', { detail: { action: 'prev' } }))} style="background:transparent;border:1px solid var(--border);color:var(--text-main);padding:6px 8px;border-radius:8px;">◀</button>
    <button title="Today" onclick=${() => window.dispatchEvent(new CustomEvent('calendar-action', { detail: { action: 'today' } }))} style="background:transparent;border:1px solid var(--border);color:var(--text-main);padding:6px 8px;border-radius:8px;">Today</button>
    <button title="Next" onclick=${() => window.dispatchEvent(new CustomEvent('calendar-action', { detail: { action: 'next' } }))} style="background:transparent;border:1px solid var(--border);color:var(--text-main);padding:6px 8px;border-radius:8px;">▶</button>
    <button title="Add Event" onclick=${() => window.dispatchEvent(new CustomEvent('calendar-action', { detail: { action: 'add-event' } }))} style="background:transparent;border:1px solid var(--border);color:var(--text-main);padding:6px 8px;border-radius:8px;">＋</button>
    <button title="Month View" onclick=${() => window.dispatchEvent(new CustomEvent('calendar-action', { detail: { action: 'view-month' } }))} style="background:transparent;border:1px solid var(--border);color:var(--text-main);padding:6px 8px;border-radius:8px;">Month</button>
    <button title="List View" onclick=${() => window.dispatchEvent(new CustomEvent('calendar-action', { detail: { action: 'view-list' } }))} style="background:transparent;border:1px solid var(--border);color:var(--text-main);padding:6px 8px;border-radius:8px;">List</button>
</div>`;
