import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    fileParallelism: false,
    testTimeout: 45000,
    hookTimeout: 45000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.spec.ts',
        'src/**/*.test.ts',
        'src/server.ts',
        'src/types/**',
      ],
      thresholds: {
        statements: 70,
        branches: 60,
        functions: 80,
        lines: 70,
      },
    },
    include: ['src/**/*.{test,spec}.ts'],
  },
});
