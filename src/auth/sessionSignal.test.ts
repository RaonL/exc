import { expect, it, vi } from 'vitest';
it('signals other tabs without invalidating the tab that just logged in', async () => {
  const channels: MockChannel[] = [];
  class MockChannel extends EventTarget {
    constructor(public name: string) {
      super();
      channels.push(this);
    }
    postMessage(data: unknown) {
      for (const channel of channels)
        if (channel !== this && channel.name === this.name)
          channel.dispatchEvent(new MessageEvent('message', { data }));
    }
  }
  vi.stubGlobal('BroadcastChannel', MockChannel);
  try {
    const { notifySessionChange, onSessionChange } = await import('./sessionSignal');
    const local = vi.fn(),
      other = vi.fn();
    const unsubscribe = onSessionChange(local);
    const external = new MockChannel('xc-account-session');
    external.addEventListener('message', other);
    notifySessionChange();
    expect(local).not.toHaveBeenCalled();
    expect(other).toHaveBeenCalledTimes(1);
    external.postMessage({ type: 'changed' });
    expect(local).toHaveBeenCalledTimes(1);
    unsubscribe();
  } finally {
    vi.unstubAllGlobals();
  }
});
