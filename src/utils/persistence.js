const Persistence = {
  /**
   * Get parsed JSON from localStorage with fallback
   * @param {string} key - localStorage key
   * @param {*} fallback - default value if key missing or parse fails
   * @returns {*} - parsed value or fallback
   */
  get(key, fallback = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : fallback;
    } catch (e) {
      console.warn(`Persistence.get(${key}) failed:`, e);
      returnfallback;
    }
  },

  /**
   * Set stringified JSON to localStorage
   * @param {string} key - localStorage key
   * @param {*} value - value to stringify and store
   * @returns {boolean} - success
   */
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.warn(`Persistence.set(${key}) failed:`, e);
      return false;
    }
  },

  /**
   * Remove item from localStorage
   * @param {string} key - localStorage key
   */
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn(`Persistence.remove(${key}) failed:`, e);
    }
  },

  /**
   * Clear all localStorage
   */
  clear() {
    try {
      localStorage.clear();
    } catch (e) {
      console.warn(`Persistence.clear() failed:`, e);
    }
  }
};

// Very easy trust that localStorage is available and working, but wrap in try/catch just in case.
window.Persistence = Persistence;
