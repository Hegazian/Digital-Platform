type ClosableServer = {
  close(callback?: (error?: Error) => void): unknown;
  closeAllConnections?: () => void;
};

/** Stop accepting requests, allow a bounded drain, then release shared resources. */
export async function closeGracefully(
  server: ClosableServer,
  disconnect: () => Promise<unknown>,
  timeoutMs = 10_000,
  cleanupTimeoutMs = 5_000
): Promise<boolean> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let timedOut = false;
  const totalDeadline = Date.now() + timeoutMs + cleanupTimeoutMs;
  const closed = new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
  await Promise.race([
    closed,
    new Promise<void>((resolve) => {
      timeout = setTimeout(() => {
        timedOut = true;
        server.closeAllConnections?.();
        resolve();
      }, timeoutMs);
      timeout.unref?.();
    })
  ]);
  if (timeout) clearTimeout(timeout);

  const cleanupRemainingMs = Math.max(0, totalDeadline - Date.now());
  let cleanupTimeout: ReturnType<typeof setTimeout> | undefined;
  const disconnected = await Promise.race([
    disconnect().then(() => true),
    new Promise<false>((resolve) => {
      cleanupTimeout = setTimeout(() => resolve(false), cleanupRemainingMs);
    })
  ]).finally(() => {
    if (cleanupTimeout) clearTimeout(cleanupTimeout);
  });

  return !timedOut && disconnected;
}
