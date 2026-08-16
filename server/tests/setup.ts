import { vi, beforeAll, afterAll } from 'vitest';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret';
