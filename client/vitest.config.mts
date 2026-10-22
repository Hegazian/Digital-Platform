import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  oxc: { jsx: { runtime: 'automatic' } },
  test: {
    environment: 'jsdom',
    environmentOptions: { jsdom: { url: 'http://localhost:3000' } },
    setupFiles: ['./tests/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8', reporter: ['text-summary', 'json-summary', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}'],
      thresholds: {
        'src/lib/api.ts': { statements: 90, branches: 80, functions: 100, lines: 90 },
        'src/proxy.ts': { statements: 90, branches: 85, functions: 100, lines: 90 },
        'src/lib/protected-files.ts': { statements: 90, branches: 80, functions: 90, lines: 90 },
        'src/lib/usePlaybackSource.ts': { statements: 80, branches: 75, functions: 80, lines: 80 },
      },
    },
  },
});
