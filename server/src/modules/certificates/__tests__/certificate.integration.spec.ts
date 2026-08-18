import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../../app';
import { prisma } from '../../../prisma';
import { generateAccessToken } from '../../../utils/jwt';
import bcrypt from 'bcrypt';

describe('Automated Course Certificates API (TDD)', () => {
  let studentToken: string;
  let studentId: string;
  let certificateCode: string;

  beforeAll(async () => {
    const hashedPassword = await bcrypt.hash('password123', 10);
    const student = await prisma.user.create({
      data: {
        email: `student_cert_${Date.now()}@eduplatform.com`,
        password: hashedPassword,
        name: 'Certificate Student',
        role: 'STUDENT',
      },
    });
    studentId = student.id;

    studentToken = generateAccessToken({
      userId: student.id,
      role: 'STUDENT',
      teacherStatus: null,
    });
  });

  afterAll(async () => {
    try {
      await prisma.certificate.deleteMany();
      await prisma.user.deleteMany({ where: { email: { contains: 'student_cert_' } } });
    } catch (e) {}
  });

  it('POST /api/v1/certificates/issue - should generate certificate PDF buffer and code', async () => {
    const res = await request(app)
      .post('/api/v1/certificates/issue')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        courseId: 'demo-course-id',
        courseName: 'Physics 1st Secondary',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.certificateCode).toBeDefined();
    certificateCode = res.body.data.certificateCode;
  });

  it('GET /api/v1/certificates/verify/:code - should verify certificate by code', async () => {
    const res = await request(app)
      .get(`/api/v1/certificates/verify/${certificateCode}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.certificateCode).toBe(certificateCode);
  });
});
