// Fuck ass app-reg
(function (w) {
  if (w.AppRegistry) return;
  const registry = Object.create(null);
  const api = {
    register(id, comp) {
      if (!id) return;
      console.log('AppRegistry.register', id);
      registry[id] = comp;
      return comp;
    },
    get(id) { return registry[id]; },
    has(id) { return !!registry[id]; },
    list() { return Object.keys(registry); }
  };
  w.AppRegistry = api;
  try { AppRegistry = api; } catch (e) {}
})(window);
