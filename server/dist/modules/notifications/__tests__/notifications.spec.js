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
const cache_1 = require("../../../utils/cache");
const eventBus_1 = require("../../../utils/eventBus");
(0, vitest_1.describe)('Background Event Queue, Caching & Notifications Unit & Integration Tests', () => {
    let studentToken;
    let studentId;
    let notificationId;
    (0, vitest_1.beforeAll)(async () => {
        // 1. Create Student
        const student = await prisma_1.prisma.user.create({
            data: {
                email: `student-notif-${Date.now()}@test.com`,
                password: 'Password123!',
                name: 'Notif Student',
                role: 'STUDENT',
            },
        });
        studentId = student.id;
        studentToken = (0, jwt_1.generateAccessToken)({ userId: student.id, role: 'STUDENT' });
    });
    (0, vitest_1.afterAll)(async () => {
        if (studentId) {
            await prisma_1.prisma.notification.deleteMany({ where: { userId: studentId } });
            await prisma_1.prisma.user.deleteMany({ where: { id: studentId } });
        }
    });
    (0, vitest_1.describe)('CacheService (Redis / In-Memory Fallback)', () => {
        (0, vitest_1.it)('should set, retrieve, and delete cached items with TTL', async () => {
            const cacheKey = `test_key_${Date.now()}`;
            const payload = { foo: 'bar', timestamp: Date.now() };
            await cache_1.CacheService.set(cacheKey, payload, 60);
            const retrieved = await cache_1.CacheService.get(cacheKey);
            (0, vitest_1.expect)(retrieved).toEqual(payload);
            await cache_1.CacheService.del(cacheKey);
            const deleted = await cache_1.CacheService.get(cacheKey);
            (0, vitest_1.expect)(deleted).toBeNull();
        });
    });
    (0, vitest_1.describe)('EventDispatcher (Event Bus)', () => {
        (0, vitest_1.it)('should register handlers and dispatch async events cleanly', async () => {
            const handlerMock = vitest_1.vi.fn();
            const testEvent = `course.published.${Date.now()}`;
            eventBus_1.EventDispatcher.subscribe(testEvent, handlerMock);
            await eventBus_1.EventDispatcher.emit(testEvent, { courseId: '123-test-id' });
            (0, vitest_1.expect)(handlerMock).toHaveBeenCalledTimes(1);
            (0, vitest_1.expect)(handlerMock).toHaveBeenCalledWith({ courseId: '123-test-id' });
        });
    });
    (0, vitest_1.describe)('Notifications API & Lifecycle', () => {
        (0, vitest_1.it)('should create an in-app notification for user and list it via API', async () => {
            const notif = await prisma_1.prisma.notification.create({
                data: {
                    user: { connect: { id: studentId } },
                    titleEn: 'Course Update Published',
                    titleAr: 'تم نشر تحديث للمنهج',
                    messageEn: 'Section 2 has been unlocked for your enrolled course.',
                    messageAr: 'تم فتح الفصل الثاني من المنهج.',
                },
            });
            notificationId = notif.id;
            const res = await (0, supertest_1.default)(app_1.default)
                .get('/api/v1/notifications/me')
                .set('Authorization', `Bearer ${studentToken}`);
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.success).toBe(true);
            (0, vitest_1.expect)(Array.isArray(res.body.data)).toBe(true);
            (0, vitest_1.expect)(res.body.data.some((n) => n.id === notificationId)).toBe(true);
        });
        (0, vitest_1.it)('should allow student to mark notification as read', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .patch(`/api/v1/notifications/${notificationId}/read`)
                .set('Authorization', `Bearer ${studentToken}`);
            (0, vitest_1.expect)(res.status).toBe(200);
            (0, vitest_1.expect)(res.body.success).toBe(true);
            (0, vitest_1.expect)(res.body.data.isRead).toBe(true);
        });
    });
});
