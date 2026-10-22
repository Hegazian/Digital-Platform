import { defineConfig, mergeConfig } from 'vitest/config';
import config from './vitest.config.mts';

export default mergeConfig(config, defineConfig({ test: { coverage: { thresholds: { statements: 80, branches: 75, functions: 80, lines: 80 } } } }));
