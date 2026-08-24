const KEY = 'bust-a-lead-save-v1';

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn('Bus-a-Lead: failed to load saved game state:', error);
    return null;
  }
}
export function saveGame(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch (error) {
    console.warn('Bus-a-Lead: failed to persist game state:', error);
  }
}
