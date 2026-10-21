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
      reporter: ['text-summary', 'json-summary', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.{test,spec}.ts'],
      thresholds: {
        // G0 ratchet over every production source. G3 keeps the agreed 80/75 target.
        statements: process.env.COVERAGE_RELEASE === 'true' ? 80 : 70,
        branches: process.env.COVERAGE_RELEASE === 'true' ? 75 : 60,
        functions: process.env.COVERAGE_RELEASE === 'true' ? 80 : 90,
        lines: process.env.COVERAGE_RELEASE === 'true' ? 80 : 70,
        'src/modules/auth/auth.middleware.ts': { statements: 95, branches: 90, functions: 100, lines: 95 },
        'src/modules/assignments/submission-upload.ts': { statements: 100, branches: 80, functions: 100, lines: 100 },
        'src/utils/file-validation.ts': { statements: 80, branches: 75, functions: 75, lines: 90 },
      },
    },
    include: ['src/**/*.{test,spec}.ts'],
  },
});
