import { describe, expect, it, vi } from 'vitest';
import { closeGracefully } from '../graceful-shutdown';

describe('graceful HTTP shutdown', () => {
  it('waits for the HTTP server to drain before disconnecting shared resources', async () => {
    const disconnect = vi.fn().mockResolvedValue(undefined);
    const server = {
      close: (callback?: (error?: Error) => void) => setTimeout(() => callback?.(), 0),
      closeAllConnections: vi.fn()
    };

    await expect(closeGracefully(server, disconnect, 100)).resolves.toBe(true);
    expect(disconnect).toHaveBeenCalledOnce();
    expect(server.closeAllConnections).not.toHaveBeenCalled();
  });

  it('closes lingering connections and disconnects when the drain deadline expires', async () => {
    const disconnect = vi.fn().mockResolvedValue(undefined);
    const server = { close: vi.fn(), closeAllConnections: vi.fn() };

    await expect(closeGracefully(server, disconnect, 5)).resolves.toBe(false);
    expect(server.closeAllConnections).toHaveBeenCalledOnce();
    expect(disconnect).toHaveBeenCalledOnce();
  });

  it('bounds shared-resource cleanup after the HTTP drain', async () => {
    const disconnect = vi.fn(() => new Promise<never>(() => undefined));
    const server = { close: (callback?: (error?: Error) => void) => callback?.() };

    await expect(closeGracefully(server, disconnect, 100, 5)).resolves.toBe(false);
    expect(disconnect).toHaveBeenCalledOnce();
  });
});
