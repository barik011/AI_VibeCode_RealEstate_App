export const storage = {
  get(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(`dubai-bayt:${key}`)) ?? fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(`dubai-bayt:${key}`, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },
};
