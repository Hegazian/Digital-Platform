"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const vitest_1 = require("vitest");
const app_1 = __importDefault(require("../../../app"));
(0, vitest_1.describe)('Targeted API Rate Defense (TDD)', () => {
    (0, vitest_1.it)('should allow normal requests within rate limit threshold', async () => {
        const res = await (0, supertest_1.default)(app_1.default).post('/api/v1/auth/login').send({
            email: 'nonexistent@test.com',
            password: 'wrongpassword',
        });
        // Should return 401 Unauthorized from auth service, not 429 Too Many Requests
        (0, vitest_1.expect)(res.status).toBe(401);
    });
});
