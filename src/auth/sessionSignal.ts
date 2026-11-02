const channel =
  typeof window !== 'undefined' && typeof window.BroadcastChannel === 'function'
    ? new window.BroadcastChannel('xc-account-session')
    : null;
export function notifySessionChange() {
  channel?.postMessage({ type: 'changed' });
}
export function onSessionChange(listener: () => void) {
  const receive = (event: MessageEvent) => {
    if (event.data?.type === 'changed') listener();
  };
  channel?.addEventListener('message', receive);
  return () => channel?.removeEventListener('message', receive);
}
