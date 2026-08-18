import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../../app';
import { prisma } from '../../../prisma';
import { generateAccessToken } from '../../../utils/jwt';

describe('Academic Hierarchy Integration Tests', () => {
  let adminToken: string;
  let studentToken: string;
  let stageId: string;
  let gradeId: string;
  let yearId: string;
  let subjectId: string;

  beforeAll(async () => {
    // 1. Create Admin user
    const admin = await prisma.user.create({
      data: {
        email: `admin-acad-${Date.now()}@test.com`,
        password: 'Password123!',
        name: 'Admin User',
        role: 'ADMIN',
      },
    });
    adminToken = generateAccessToken({ userId: admin.id, role: 'ADMIN' });

    // 2. Create Student user
    const student = await prisma.user.create({
      data: {
        email: `student-acad-${Date.now()}@test.com`,
        password: 'Password123!',
        name: 'Student User',
        role: 'STUDENT',
      },
    });
    studentToken = generateAccessToken({ userId: student.id, role: 'STUDENT' });

    // 3. Create a Subject
    const subject = await prisma.subject.create({
      data: {
        nameEn: `Physics Sec 1 ${Date.now()}`,
        nameAr: 'فيزياء الصف الأول',
      },
    });
    subjectId = subject.id;
  });

  afterAll(async () => {
    // Cleanup academic test entities
    if (subjectId) {
      await prisma.subject.deleteMany({ where: { id: subjectId } });
    }
    if (stageId) {
      await prisma.educationalStage.deleteMany({ where: { id: stageId } });
    }
    if (yearId) {
      await prisma.academicYear.deleteMany({ where: { id: yearId } });
    }
    await prisma.user.deleteMany({ where: { email: { contains: '-acad-' } } });
  });

  describe('Educational Stages API', () => {
    it('should allow ADMIN to create an educational stage', async () => {
      const res = await request(app)
        .post('/api/v1/academic/stages')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          nameEn: 'Secondary Stage',
          nameAr: 'المرحلة الثانوية',
          code: `SEC_${Date.now()}`,
          sortOrder: 1,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.nameEn).toBe('Secondary Stage');
      stageId = res.body.data.id;
    });

    it('should deny non-ADMIN from creating an educational stage', async () => {
      const res = await request(app)
        .post('/api/v1/academic/stages')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          nameEn: 'Unauthorized Stage',
          nameAr: 'مرحلة غير مصرحة',
          code: 'UNAUTH',
        });

      expect(res.status).toBe(403);
    });

    it('should list all educational stages publicly', async () => {
      const res = await request(app).get('/api/v1/academic/stages');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Grades API', () => {
    it('should allow ADMIN to create a grade within a stage', async () => {
      const res = await request(app)
        .post('/api/v1/academic/grades')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          stageId,
          nameEn: 'Grade 10 - 1st Secondary',
          nameAr: 'الصف الأول الثانوي',
          code: `G10_${Date.now()}`,
          sortOrder: 1,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.stageId).toBe(stageId);
      gradeId = res.body.data.id;
    });

    it('should list grades for a specific stage', async () => {
      const res = await request(app).get(`/api/v1/academic/stages/${stageId}/grades`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data[0].id).toBe(gradeId);
    });
  });

  describe('Academic Years API', () => {
    it('should allow ADMIN to create an academic year', async () => {
      const res = await request(app)
        .post('/api/v1/academic/years')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: '2026/2027',
          startDate: '2026-09-01T00:00:00.000Z',
          endDate: '2027-06-30T00:00:00.000Z',
          isActive: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('2026/2027');
      yearId = res.body.data.id;
    });
  });

  describe('Grade-Subject Association API', () => {
    it('should link a subject to a grade and academic year', async () => {
      const res = await request(app)
        .post('/api/v1/academic/grade-subjects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          gradeId,
          subjectId,
          academicYearId: yearId,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.gradeId).toBe(gradeId);
      expect(res.body.data.subjectId).toBe(subjectId);
    });

    it('should query subjects available for a student grade', async () => {
      const res = await request(app).get(`/api/v1/academic/grades/${gradeId}/subjects`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.some((s: any) => s.id === subjectId)).toBe(true);
    });
  });
});
