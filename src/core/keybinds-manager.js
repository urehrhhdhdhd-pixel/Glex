// Use this for uhhhhh keybind
(function(w){
  if (w.KeybindsManager) return;
  const map = {
    's': 'launcher',
  };
  const api = {
    getAction(e){
      if (!e || !e.key) return null;
      const k = (e.key || '').toLowerCase();
      return map[k] || null;
    },
    getAll(){
      // Return a copy of the keybinds map
      return { ...map };
    }
  };
  w.KeybindsManager = api;
  try { KeybindsManager = api; } catch (e) {}
})(window);
