import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../../app';
import { prisma } from '../../../prisma';
import { generateAccessToken } from '../../../utils/jwt';
import bcrypt from 'bcrypt';

describe('Collaborative Board API hard-off gate', () => {
  let teacherToken: string;
  let teacherId: string;
  let lessonBlockId: string;
  let outsiderToken: string;

  beforeAll(async () => {
    // Create teacher user
    const hashedPassword = await bcrypt.hash('password123', 10);
    const teacher = await prisma.user.create({
      data: {
        email: `teacher_board_${Date.now()}@eduplatform.com`,
        password: hashedPassword,
        name: 'Board Teacher',
        role: 'TEACHER',
        teacherStatus: 'APPROVED',
      },
    });
    teacherId = teacher.id;

    teacherToken = generateAccessToken({
      userId: teacher.id,
      role: 'TEACHER',
      teacherStatus: 'APPROVED',
    });

    // An unrelated authenticated user (must NOT access the board - IDOR guard)
    const outsider = await prisma.user.create({
      data: {
        email: `student_board_${Date.now()}@eduplatform.com`,
        password: hashedPassword,
        name: 'Board Outsider',
        role: 'STUDENT',
      },
    });
    outsiderToken = generateAccessToken({ userId: outsider.id, role: 'STUDENT' });

    // Create a subject, course, module, lesson, and lessonBlock
    const subject = await prisma.subject.create({
      data: { nameEn: 'Math Board', nameAr: 'رياضيات' },
    });

    const course = await prisma.course.create({
      data: {
        titleEn: 'Algebra',
        titleAr: 'جبر',
        description: 'Test course',
        teacherId: teacher.id,
        subjectId: subject.id,
      },
    });

    const section = await prisma.section.create({
      data: {
        courseId: course.id,
        titleEn: 'Ch 1',
        titleAr: 'فصل 1',
        orderIndex: 1,
      },
    });

    const lesson = await prisma.lesson.create({
      data: {
        sectionId: section.id,
        titleEn: 'Whiteboard Lesson',
        titleAr: 'درس سبورة',
      },
    });

    const block = await prisma.lessonBlock.create({
      data: {
        lessonId: lesson.id,
        blockType: 'TEXT',
        configurationJson: '{}',
      },
    });
    lessonBlockId = block.id;
  });

  afterAll(async () => {
    try {
      await prisma.board.deleteMany({ where: { lessonBlockId } });
      await prisma.lessonBlock.deleteMany({ where: { id: lessonBlockId } });
      await prisma.course.deleteMany({ where: { teacherId } });
      await prisma.user.deleteMany({ where: { email: { contains: 'teacher_board_' } } });
      await prisma.user.deleteMany({ where: { email: { contains: 'student_board_' } } });
      await prisma.subject.deleteMany({ where: { nameEn: 'Math Board' } });
    } catch (e) {
      console.warn('Board cleanup error:', e);
    }
  });

  it('returns FEATURE_DISABLED for reads even when the request is authenticated', async () => {
    const res = await request(app)
      .get(`/api/v1/boards/${lessonBlockId}`)
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(res.status).toBe(503);
    expect(res.body.code).toBe('FEATURE_DISABLED');
  });

  it('never persists writes while collaboration is staged', async () => {
    const res = await request(app)
      .post(`/api/v1/boards/${lessonBlockId}/state`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        elementsJson: JSON.stringify([{ type: 'line', x1: 10, y1: 10, x2: 50, y2: 50, color: '#00ffff' }]),
      });

    expect(res.status).toBe(503);
    expect(res.body.code).toBe('FEATURE_DISABLED');
    expect(await prisma.board.findUnique({ where: { lessonBlockId } })).toBeNull();
  });

  it('GET board by a non-enrolled outsider is rejected (IDOR guard)', async () => {
    const res = await request(app)
      .get(`/api/v1/boards/${lessonBlockId}`)
      .set('Authorization', `Bearer ${outsiderToken}`);

    expect(res.status).toBe(503);
  });

  it('POST board state by a non-owner is rejected (IDOR guard)', async () => {
    const res = await request(app)
      .post(`/api/v1/boards/${lessonBlockId}/state`)
      .set('Authorization', `Bearer ${outsiderToken}`)
      .send({ elementsJson: '[]' });

    expect(res.status).toBe(503);
  });

  it('unknown block id returns 404 and creates nothing', async () => {
    const ghostId = '00000000-0000-4000-8000-000000000000';
    const res = await request(app)
      .get(`/api/v1/boards/${ghostId}`)
      .set('Authorization', `Bearer ${teacherToken}`);
    expect(res.status).toBe(503);

    const post = await request(app)
      .post(`/api/v1/boards/${ghostId}/state`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ elementsJson: '[]' });
    expect(post.status).toBe(503);

    const rows = await prisma.board.findMany({ where: { lessonBlockId: ghostId } });
    expect(rows.length).toBe(0);
  });
});
