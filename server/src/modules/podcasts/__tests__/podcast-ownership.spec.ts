import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../../app';
import { prisma } from '../../../prisma';
import { generateAccessToken } from '../../../utils/jwt';

/**
 * Podcast Studio (Phase U3):
 * PREVIOUS STATE: any authenticated user could append episodes to ANY
 * podcast, an 'anonymous' author fallback existed, and no update/delete/
 * detail endpoints were present.
 */
describe('Podcast ownership & episode management', () => {
  const ts = Date.now();
  let ownerAToken: string;
  let ownerBToken: string;
  let studentToken: string;
  let podcastAId: string;
  const cleanup = {
    userIds: [] as string[],
    podcastIds: [] as string[],
  };

  async function makeUser(email: string, role: 'TEACHER' | 'STUDENT', approved = true) {
    const bcrypt = await import('bcrypt');
    const u = await prisma.user.create({
      data: {
        email,
        password: await bcrypt.hash('Password123!', 10),
        name: email.split('@')[0],
        role,
        isActive: true,
        ...(role === 'TEACHER' ? { teacherStatus: approved ? 'APPROVED' : 'PENDING' } : {}),
      },
    });
    cleanup.userIds.push(u.id);
    return u;
  }

  beforeAll(async () => {
    const ownerA = await makeUser(`pod-owner-a-${ts}@test.com`, 'TEACHER');
    const ownerB = await makeUser(`pod-owner-b-${ts}@test.com`, 'TEACHER');
    const student = await makeUser(`pod-student-${ts}@test.com`, 'STUDENT');

    ownerAToken = generateAccessToken({ userId: ownerA.id, role: 'TEACHER', teacherStatus: 'APPROVED' });
    ownerBToken = generateAccessToken({ userId: ownerB.id, role: 'TEACHER', teacherStatus: 'APPROVED' });
    studentToken = generateAccessToken({ userId: student.id, role: 'STUDENT' });

    const podcast = await request(app)
      .post('/api/v1/podcasts')
      .set('Authorization', `Bearer ${ownerAToken}`)
      .send({
        titleEn: `Physics Weekly ${ts}`,
        titleAr: 'فيزياء أسبوعياً',
        description: 'Episodes about mechanics and waves',
      });
    expect(podcast.status).toBe(201);
    podcastAId = podcast.body.data.id;
    cleanup.podcastIds.push(podcastAId);
  });

  afterAll(async () => {
    try {
      await prisma.podcast.deleteMany({ where: { id: { in: cleanup.podcastIds } } });
      await prisma.refreshToken
        .deleteMany({ where: { userId: { in: cleanup.userIds } } })
        .catch(() => undefined);
      await prisma.user.deleteMany({ where: { id: { in: cleanup.userIds } } });
    } catch {}
  });

  it('owner adds episodes; sortOrder increments automatically', async () => {
    const e1 = await request(app)
      .post(`/api/v1/podcasts/${podcastAId}/episodes`)
      .set('Authorization', `Bearer ${ownerAToken}`)
      .send({
        titleEn: 'Episode 1 - Newton',
        titleAr: 'الحلقة ١',
        audioUrl: '/uploads/podcasts/ep1.mp3',
        durationSec: 900,
      });
    expect(e1.status).toBe(201);

    const e2 = await request(app)
      .post(`/api/v1/podcasts/${podcastAId}/episodes`)
      .set('Authorization', `Bearer ${ownerAToken}`)
      .send({
        titleEn: 'Episode 2 - Waves',
        titleAr: 'الحلقة ٢',
        audioUrl: 'https://cdn.example.com/ep2.mp3',
        durationSec: 1200,
      });
    expect(e2.status).toBe(201);
    expect(e2.body.data.sortOrder).toBeGreaterThan(e1.body.data.sortOrder);
  });

  it('NON-owners cannot modify or append to a foreign podcast', async () => {
    const foreignAppend = await request(app)
      .post(`/api/v1/podcasts/${podcastAId}/episodes`)
      .set('Authorization', `Bearer ${ownerBToken}`)
      .send({
        titleEn: 'Hijacked Episode',
        titleAr: 'حلقة مختطفة',
        audioUrl: '/uploads/x.mp3',
      });
    expect(foreignAppend.status).toBe(403);

    const foreignPatch = await request(app)
      .patch(`/api/v1/podcasts/${podcastAId}`)
      .set('Authorization', `Bearer ${ownerBToken}`)
      .send({ titleEn: 'Hijacked Show' });
    expect(foreignPatch.status).toBe(403);

    const foreignDelete = await request(app)
      .delete(`/api/v1/podcasts/${podcastAId}`)
      .set('Authorization', `Bearer ${ownerBToken}`);
    expect(foreignDelete.status).toBe(403);

    // Students are blocked from creator surfaces entirely
    const studentCreate = await request(app)
      .post('/api/v1/podcasts')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ titleEn: 'Student Show', titleAr: 'عرض' });
    expect(studentCreate.status).toBe(403);
  });

  it('validation rejects bad audio URLs and missing titles', async () => {
    const badUrl = await request(app)
      .post(`/api/v1/podcasts/${podcastAId}/episodes`)
      .set('Authorization', `Bearer ${ownerAToken}`)
      .send({ titleEn: 'Valid Title Here', titleAr: 'عنوان', audioUrl: 'ftp://weird' });
    expect(badUrl.status).toBe(400);

    const shortTitle = await request(app)
      .patch(`/api/v1/podcasts/${podcastAId}`)
      .set('Authorization', `Bearer ${ownerAToken}`)
      .send({ titleEn: 'x' });
    expect(shortTitle.status).toBe(400);
  });

  it('detail + mine endpoints expose episodes in order', async () => {
    const detail = await request(app).get(`/api/v1/podcasts/${podcastAId}`);
    expect(detail.status).toBe(200);
    const eps = detail.body.data.episodes;
    expect(eps.length).toBeGreaterThanOrEqual(2);

    // Public shape hides internal sortOrder - playback order is proven by
    // append sequence instead:
    expect(eps[0].titleEn).toBe('Episode 1 - Newton');
    expect(eps[1].titleEn).toBe('Episode 2 - Waves');

    // Owner view exposes the raw ordering column
    const mine = await request(app)
      .get('/api/v1/podcasts/mine')
      .set('Authorization', `Bearer ${ownerAToken}`);
    expect(mine.status).toBe(200);
    const mineShow = mine.body.data.find((p: any) => p.id === podcastAId);
    for (let i = 1; i < mineShow.episodes.length; i++) {
      expect(mineShow.episodes[i].sortOrder).toBeGreaterThanOrEqual(
        mineShow.episodes[i - 1].sortOrder
      );
    }
    const notMine = await request(app)
      .get('/api/v1/podcasts/mine')
      .set('Authorization', `Bearer ${ownerBToken}`);
    expect(notMine.body.data.some((p: any) => p.id === podcastAId)).toBe(false);
  });

  it('owner deletes an episode; public list keeps the rest', async () => {
    const detail = await request(app).get(`/api/v1/podcasts/${podcastAId}`);
    const firstEpisodeId = detail.body.data.episodes[0].id;

    const del = await request(app)
      .delete(`/api/v1/podcasts/${podcastAId}/episodes/${firstEpisodeId}`)
      .set('Authorization', `Bearer ${ownerAToken}`);
    expect(del.status).toBe(200);

    const after = await request(app)
      .get(`/api/v1/podcasts`)
      .set('Authorization', `Bearer ${studentToken}`);
    const show = after.body.data.find((p: any) => p.id === podcastAId);
    expect(show.episodes.length).toBe(detail.body.data.episodes.length - 1);
  });
});
