type ClosableServer = {
  close(callback?: (error?: Error) => void): unknown;
  closeAllConnections?: () => void;
};

/** Stop accepting requests, allow a bounded drain, then release shared resources. */
export async function closeGracefully(
  server: ClosableServer,
  disconnect: () => Promise<unknown>,
  timeoutMs = 10_000
): Promise<boolean> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let timedOut = false;
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
  await disconnect();
  return !timedOut;
}
