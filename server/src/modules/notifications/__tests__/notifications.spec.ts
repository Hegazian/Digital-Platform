import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import app from '../../../app';
import { prisma } from '../../../prisma';
import { generateAccessToken } from '../../../utils/jwt';
import { CacheService } from '../../../utils/cache';
import { EventDispatcher } from '../../../utils/eventBus';

describe('Background Event Queue, Caching & Notifications Unit & Integration Tests', () => {
  let studentToken: string;
  let studentId: string;
  let notificationId: string;

  beforeAll(async () => {
    // 1. Create Student
    const student = await prisma.user.create({
      data: {
        email: `student-notif-${Date.now()}@test.com`,
        password: 'Password123!',
        name: 'Notif Student',
        role: 'STUDENT',
      },
    });
    studentId = student.id;
    studentToken = generateAccessToken({ userId: student.id, role: 'STUDENT' });
  });

  afterAll(async () => {
    if (studentId) {
      await prisma.notification.deleteMany({ where: { userId: studentId } });
      await prisma.user.deleteMany({ where: { id: studentId } });
    }
  });

  describe('CacheService (Redis / In-Memory Fallback)', () => {
    it('should set, retrieve, and delete cached items with TTL', async () => {
      const cacheKey = `test_key_${Date.now()}`;
      const payload = { foo: 'bar', timestamp: Date.now() };

      await CacheService.set(cacheKey, payload, 60);
      const retrieved = await CacheService.get(cacheKey);

      expect(retrieved).toEqual(payload);

      await CacheService.del(cacheKey);
      const deleted = await CacheService.get(cacheKey);
      expect(deleted).toBeNull();
    });
  });

  describe('EventDispatcher (Event Bus)', () => {
    it('should register handlers and dispatch async events cleanly', async () => {
      const handlerMock = vi.fn();
      const testEvent = `course.published.${Date.now()}`;

      EventDispatcher.subscribe(testEvent, handlerMock);
      await EventDispatcher.emit(testEvent, { courseId: '123-test-id' });

      expect(handlerMock).toHaveBeenCalledTimes(1);
      expect(handlerMock).toHaveBeenCalledWith({ courseId: '123-test-id' });
    });
  });

  describe('Notifications API & Lifecycle', () => {
    it('should create an in-app notification for user and list it via API', async () => {
      const notif = await prisma.notification.create({
        data: {
          user: { connect: { id: studentId } },
          titleEn: 'Course Update Published',
          titleAr: 'تم نشر تحديث للمنهج',
          messageEn: 'Section 2 has been unlocked for your enrolled course.',
          messageAr: 'تم فتح الفصل الثاني من المنهج.',
        },
      });
      notificationId = notif.id;

      const res = await request(app)
        .get('/api/v1/notifications/me')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.some((n: any) => n.id === notificationId)).toBe(true);
    });

    it('should allow student to mark notification as read', async () => {
      const res = await request(app)
        .patch(`/api/v1/notifications/${notificationId}/read`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isRead).toBe(true);
    });
  });
});
