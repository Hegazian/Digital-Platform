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
(0, vitest_1.describe)('Audio Podcasts API (TDD)', () => {
    let teacherToken;
    let teacherId;
    let podcastId;
    (0, vitest_1.beforeAll)(async () => {
        const hashedPassword = await bcrypt_1.default.hash('password123', 10);
        const teacher = await prisma_1.prisma.user.create({
            data: {
                email: `teacher_pod_${Date.now()}@eduplatform.com`,
                password: hashedPassword,
                name: 'Podcast Teacher',
                role: 'TEACHER',
                teacherStatus: 'APPROVED',
            },
        });
        teacherId = teacher.id;
        teacherToken = (0, jwt_1.generateAccessToken)({
            userId: teacher.id,
            role: 'TEACHER',
            teacherStatus: 'APPROVED',
        });
    });
    (0, vitest_1.afterAll)(async () => {
        try {
            await prisma_1.prisma.podcastEpisode.deleteMany();
            await prisma_1.prisma.podcast.deleteMany();
            await prisma_1.prisma.user.deleteMany({ where: { email: { contains: 'teacher_pod_' } } });
        }
        catch (e) { }
    });
    (0, vitest_1.it)('POST /api/v1/podcasts - should create a podcast channel', async () => {
        const res = await (0, supertest_1.default)(app_1.default)
            .post('/api/v1/podcasts')
            .set('Authorization', `Bearer ${teacherToken}`)
            .send({
            titleEn: 'Physics Audio Review',
            titleAr: 'مراجعة الفيزياء الصوتية',
            description: 'On-the-go physics summaries for high school students.',
        });
        (0, vitest_1.expect)(res.status).toBe(201);
        (0, vitest_1.expect)(res.body.success).toBe(true);
        (0, vitest_1.expect)(res.body.data.id).toBeDefined();
        podcastId = res.body.data.id;
    });
    (0, vitest_1.it)('GET /api/v1/podcasts - should list all podcasts', async () => {
        const res = await (0, supertest_1.default)(app_1.default)
            .get('/api/v1/podcasts')
            .set('Authorization', `Bearer ${teacherToken}`);
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.success).toBe(true);
        (0, vitest_1.expect)(Array.isArray(res.body.data)).toBe(true);
    });
    (0, vitest_1.it)('POST /api/v1/podcasts/:id/episodes - should add an episode to a podcast', async () => {
        const res = await (0, supertest_1.default)(app_1.default)
            .post(`/api/v1/podcasts/${podcastId}/episodes`)
            .set('Authorization', `Bearer ${teacherToken}`)
            .send({
            titleEn: 'Episode 1: Newton Laws Overview',
            titleAr: 'الحلقة الأولى: نظرة عامة على قوانين نيوتن',
            audioUrl: 'https://example.com/audio1.mp3',
            durationSec: 900,
        });
        (0, vitest_1.expect)(res.status).toBe(201);
        (0, vitest_1.expect)(res.body.success).toBe(true);
        (0, vitest_1.expect)(res.body.data.podcastId).toBe(podcastId);
    });
});
