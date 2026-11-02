// Legacy storage remains available to isolated unit tests and as an untouched offline backup.
// The application entry point enables account mode before mounting any console UI.
let accountMode = false;
let owner: string | null = null;
let paused = false;
let memory: Record<string, string> = {};
const listeners = new Set<() => void>();
export const accountStorage = {
  getItem: (key: string): string | null =>
    accountMode ? (memory[key] ?? null) : localStorage.getItem(key),
  setItem: (key: string, value: string) => {
    if (!accountMode) return localStorage.setItem(key, value);
    if (!owner || paused) return;
    if (memory[key] === value) return;
    memory[key] = value;
    for (const listener of listeners) listener();
  },
  removeItem: (key: string) => {
    if (!accountMode) return localStorage.removeItem(key);
    if (!owner || paused) return;
    delete memory[key];
    for (const listener of listeners) listener();
  },
};
export function requireAccounts() {
  accountMode = true;
  owner = null;
  memory = {};
}
export function replaceAccountMemory(userId: string, stores: Record<string, string>) {
  owner = userId;
  memory = { ...stores };
}
export function clearAccountMemory() {
  owner = null;
  memory = {};
}
export function readAccountMemory() {
  return { ...memory };
}
export function pauseAccountWrites(value: boolean) {
  paused = value;
}
export function onAccountWrite(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function useLegacyStorageForTests() {
  accountMode = false;
  owner = null;
  memory = {};
  paused = false;
}
