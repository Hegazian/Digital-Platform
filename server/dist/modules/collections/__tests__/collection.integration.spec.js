"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const supertest_1 = __importDefault(require("supertest"));
const app_1 = __importDefault(require("../../../app"));
const prisma_1 = require("../../../prisma");
const jwt_1 = require("../../../utils/jwt");
const bcrypt_1 = __importDefault(require("bcrypt"));
(0, vitest_1.describe)('Curated Collections API (TDD)', () => {
    let adminToken;
    let adminId;
    let collectionId;
    (0, vitest_1.beforeAll)(async () => {
        const hashedPassword = await bcrypt_1.default.hash('password123', 10);
        const admin = await prisma_1.prisma.user.create({
            data: {
                email: `admin_coll_${Date.now()}@eduplatform.com`,
                password: hashedPassword,
                name: 'Collection Admin',
                role: 'ADMIN',
            },
        });
        adminId = admin.id;
        adminToken = (0, jwt_1.generateAccessToken)({
            userId: admin.id,
            role: 'ADMIN',
            teacherStatus: null,
        });
    });
    (0, vitest_1.afterAll)(async () => {
        try {
            await prisma_1.prisma.collectionCourse.deleteMany();
            await prisma_1.prisma.collection.deleteMany();
            await prisma_1.prisma.user.deleteMany({ where: { email: { contains: 'admin_coll_' } } });
        }
        catch (e) { }
    });
    (0, vitest_1.it)('POST /api/v1/collections - should create a curated course collection', async () => {
        const res = await (0, supertest_1.default)(app_1.default)
            .post('/api/v1/collections')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
            titleEn: 'Egyptian General Secondary Mastery Track',
            titleAr: 'مسار إتقان الثانوية العامة المصرية',
            slug: `sec-mastery-${Date.now()}`,
            description: 'Complete physics, math, and programming curriculum bundle.',
        });
        (0, vitest_1.expect)(res.status).toBe(201);
        (0, vitest_1.expect)(res.body.success).toBe(true);
        (0, vitest_1.expect)(res.body.data.id).toBeDefined();
        collectionId = res.body.data.id;
    });
    (0, vitest_1.it)('GET /api/v1/collections - should list published collections', async () => {
        const res = await (0, supertest_1.default)(app_1.default)
            .get('/api/v1/collections');
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.success).toBe(true);
        (0, vitest_1.expect)(Array.isArray(res.body.data)).toBe(true);
    });
});
