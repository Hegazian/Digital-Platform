import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../../app';
import { prisma } from '../../../prisma';
import { generateAccessToken } from '../../../utils/jwt';
import bcrypt from 'bcrypt';

describe('Audio Podcasts API (TDD)', () => {
  let teacherToken: string;
  let teacherId: string;
  let podcastId: string;

  beforeAll(async () => {
    const hashedPassword = await bcrypt.hash('password123', 10);
    const teacher = await prisma.user.create({
      data: {
        email: `teacher_pod_${Date.now()}@eduplatform.com`,
        password: hashedPassword,
        name: 'Podcast Teacher',
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
  });

  afterAll(async () => {
    try {
      await prisma.podcastEpisode.deleteMany();
      await prisma.podcast.deleteMany();
      await prisma.user.deleteMany({ where: { email: { contains: 'teacher_pod_' } } });
    } catch (e) {}
  });

  it('POST /api/v1/podcasts - should create a podcast channel', async () => {
    const res = await request(app)
      .post('/api/v1/podcasts')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        titleEn: 'Physics Audio Review',
        titleAr: 'مراجعة الفيزياء الصوتية',
        description: 'On-the-go physics summaries for high school students.',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    podcastId = res.body.data.id;
  });

  it('GET /api/v1/podcasts - should list all podcasts', async () => {
    const res = await request(app)
      .get('/api/v1/podcasts')
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('POST /api/v1/podcasts/:id/episodes - should add an episode to a podcast', async () => {
    const res = await request(app)
      .post(`/api/v1/podcasts/${podcastId}/episodes`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        titleEn: 'Episode 1: Newton Laws Overview',
        titleAr: 'الحلقة الأولى: نظرة عامة على قوانين نيوتن',
        audioUrl: 'https://example.com/audio1.mp3',
        durationSec: 900,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.podcastId).toBe(podcastId);
  });
});
