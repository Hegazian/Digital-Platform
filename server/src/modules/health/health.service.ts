import { prisma } from '../../prisma';
import { StorageService } from '../../utils/storage';

export interface ReadinessResult {
  ready: boolean;
  draining: boolean;
  dependencies: { database: 'ready' | 'unavailable'; storage: 'ready' | 'unavailable' };
}

let draining = false;

export function setReadinessDraining(value: boolean): void {
  draining = value;
}

async function probe(action: () => Promise<unknown>, timeoutMs: number): Promise<boolean> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      action(),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error('Readiness probe deadline exceeded')), timeoutMs);
        timeout.unref?.();
      })
    ]);
    return true;
  } catch {
    return false;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export async function checkReadiness(timeoutMs = 3_000): Promise<ReadinessResult> {
  const [databaseReady, storageReady] = await Promise.all([
    probe(() => prisma.$queryRawUnsafe('SELECT 1'), timeoutMs),
    probe(() => StorageService.checkAvailability(timeoutMs), timeoutMs)
  ]);
  return {
    ready: databaseReady && storageReady && !draining,
    draining,
    dependencies: {
      database: databaseReady ? 'ready' : 'unavailable',
      storage: storageReady ? 'ready' : 'unavailable'
    }
  };
}
