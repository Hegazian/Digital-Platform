"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const vitest_1 = require("vitest");
const app_1 = __importDefault(require("../../../app"));
(0, vitest_1.describe)('Health Check & Request Correlation Engine (TDD)', () => {
    (0, vitest_1.it)('should return 200 OK with database connection status and uptime metrics', async () => {
        const res = await (0, supertest_1.default)(app_1.default).get('/health');
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.status).toBe('healthy');
        (0, vitest_1.expect)(res.body.database).toBe('connected');
        (0, vitest_1.expect)(typeof res.body.uptime).toBe('number');
        (0, vitest_1.expect)(res.body.memory).toBeDefined();
    });
    (0, vitest_1.it)('should attach x-request-id header to incoming and outgoing requests', async () => {
        const res = await (0, supertest_1.default)(app_1.default).get('/health');
        (0, vitest_1.expect)(res.headers['x-request-id']).toBeDefined();
        (0, vitest_1.expect)(typeof res.headers['x-request-id']).toBe('string');
    });
    (0, vitest_1.it)('should preserve and echo client provided x-request-id header', async () => {
        const customId = 'custom-client-trace-12345';
        const res = await (0, supertest_1.default)(app_1.default).get('/health').set('x-request-id', customId);
        (0, vitest_1.expect)(res.headers['x-request-id']).toBe(customId);
    });
});
