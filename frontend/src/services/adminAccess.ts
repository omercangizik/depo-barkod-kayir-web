const STORAGE_KEY = "depo.admin-menu-unlocked";
const CHANGE_EVENT = "depo:admin-menu-access-change";
const MENU_PASSWORD = "456";

export function isAdminMenuUnlocked(): boolean {
  try {
    return window.sessionStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function unlockAdminMenu(password: string): boolean {
  if (password !== MENU_PASSWORD) return false;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, "true");
  } catch {
    // Keep access limited to the current view if browser storage is unavailable.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
  return true;
}

export function lockAdminMenu(): void {
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // The route-level password gate remains available without storage.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function onAdminMenuAccessChange(listener: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, listener);
  return () => window.removeEventListener(CHANGE_EVENT, listener);
}
