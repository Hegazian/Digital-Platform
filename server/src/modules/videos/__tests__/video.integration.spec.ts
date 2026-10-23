import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import http from 'node:http';
import net from 'node:net';
import fs from 'node:fs/promises';
import { Role, TeacherStatus } from '@prisma/client';
import app from '../../../app';
import { prisma } from '../../../prisma';
import { generateAccessToken } from '../../../utils/jwt';
import { getUploadStagingRoot, StorageService } from '../../../utils/storage';

describe('Video Pipeline Integration Tests', () => {
  let teacherToken: string;
  let studentToken: string;
  let teacherId: string;
  let studentId: string;
  let subjectId: string;
  let courseId: string;
  const uploadedVideoIds: string[] = [];

  beforeAll(async () => {
    // Teacher
    const teacher = await prisma.user.create({
      data: {
        email: `videoteacher-${Date.now()}@test.com`,
        password: 'hashedpassword',
        name: 'Video Teacher',
        role: Role.TEACHER,
        teacherStatus: TeacherStatus.APPROVED,
      },
    });
    teacherId = teacher.id;
    teacherToken = generateAccessToken({ userId: teacher.id, role: teacher.role, teacherStatus: teacher.teacherStatus });

    // Student
    const student = await prisma.user.create({
      data: {
        email: `videostudent-${Date.now()}@test.com`,
        password: 'hashedpassword',
        name: 'Video Student',
        role: Role.STUDENT,
      },
    });
    studentId = student.id;
    studentToken = generateAccessToken({ userId: student.id, role: student.role });

    // Subject, Course
    const subject = await prisma.subject.create({
      data: { nameEn: `Physics 101 ${Date.now()}`, nameAr: 'فيزياء 101' },
    });
    subjectId = subject.id;

    const course = await prisma.course.create({
      data: {
        titleEn: 'Intro to Mechanics',
        titleAr: 'مقدمة',
        description: 'Physics',
        teacherId: teacher.id,
        subjectId: subject.id,
        isPublished: true,
      },
    });
    courseId = course.id;
  });

  afterAll(async () => {
    const uploadedVideos = await prisma.video.findMany({ where: { id: { in: uploadedVideoIds } }, select: { videoUrl: true } });
    for (const video of uploadedVideos) if (video.videoUrl) await StorageService.deleteFile(video.videoUrl);
    await prisma.video.deleteMany({ where: { id: { in: uploadedVideoIds } } });
    if (courseId) {
      await prisma.course.deleteMany({ where: { id: courseId } });
    }
    if (subjectId) {
      await prisma.subject.deleteMany({ where: { id: subjectId } });
    }
    await prisma.user.deleteMany({ where: { email: { contains: 'videoteacher-' } } });
    await prisma.user.deleteMany({ where: { email: { contains: 'videostudent-' } } });
  });

  describe('POST /api/v1/videos/upload', () => {
    it('streams a validated upload from private staging and reports processing until probed', async () => {
      const fixture = Buffer.from('0000ftypisom' + 'video payload');
      const res = await request(app)
        .post('/api/v1/videos/upload')
        .set('Authorization', `Bearer ${teacherToken}`)
        .attach('file', fixture, { filename: 'lesson.mp4', contentType: 'video/mp4' });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('PROCESSING');
      expect(res.body.data.sizeBytes).toBe(fixture.length);
      expect(res.body.data.videoUrl).toContain('/uploads/lesson-videos/');
      uploadedVideoIds.push(res.body.data.id);

      const playback = await request(app)
        .get(`/api/v1/videos/${res.body.data.id}/playback-url`)
        .set('Authorization', `Bearer ${teacherToken}`);
      expect(playback.status).toBe(409);
    });

    it('rejects mismatched media and does not create a video record', async () => {
      const before = await prisma.video.count({ where: { teacherId } });
      const res = await request(app)
        .post('/api/v1/videos/upload')
        .set('Authorization', `Bearer ${teacherToken}`)
        .attach('file', Buffer.from('not an mp4 file'), { filename: 'bad.mp4', contentType: 'video/mp4' });

      expect(res.status).toBe(400);
      expect(await prisma.video.count({ where: { teacherId } })).toBe(before);
    });

    it('keeps two live scans bounded and reuses capacity only after a disconnected scan is cleaned up', async () => {
      let scannerConnections = 0;
      let terminalFrames = 0;
      const scannerSockets = new Map<number, net.Socket>();
      const closedScanners = new Set<number>();
      const terminalWaiters: Array<() => void> = [];
      const closeWaiters = new Map<number, Array<() => void>>();
      const resolveTerminalCount = () => {
        terminalFrames += 1;
        for (const waiter of terminalWaiters.splice(0)) waiter();
      };
      const scanner = net.createServer((socket) => {
        const index = ++scannerConnections;
        scannerSockets.set(index, socket);
        let received = Buffer.alloc(0);
        let offset = 0;
        const prefix = Buffer.from('zINSTREAM\0');
        socket.on('data', (chunk) => {
          received = Buffer.concat([received, Buffer.from(chunk)]);
          if (offset === 0) {
            if (received.length < prefix.length) return;
            if (!received.subarray(0, prefix.length).equals(prefix)) return socket.destroy();
            offset = prefix.length;
          }
          while (offset + 4 <= received.length) {
            const size = received.readUInt32BE(offset);
            offset += 4;
            if (size === 0) {
              resolveTerminalCount();
              if (index === 3) socket.end('stream: OK\0');
              return;
            }
            if (offset + size > received.length) {
              offset -= 4;
              return;
            }
            offset += size;
          }
        });
        socket.on('close', () => {
          closedScanners.add(index);
          for (const waiter of closeWaiters.get(index) || []) waiter();
          closeWaiters.delete(index);
        });
      });
      const waitFor = async (predicate: () => boolean, register: (resolve: () => void) => void, description: string) => {
        if (predicate()) return;
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error(`Timed out waiting for ${description}`)), 5_000);
          register(() => { clearTimeout(timeout); resolve(); });
        });
      };
      const waitForTerminalFrames = (count: number) => waitFor(
        () => terminalFrames >= count,
        (resolve) => terminalWaiters.push(resolve),
        `${count} scanner terminal frames`,
      );
      const waitForScannerClose = (index: number) => waitFor(
        () => closedScanners.has(index),
        (resolve) => {
          const waiters = closeWaiters.get(index) || [];
          waiters.push(resolve);
          closeWaiters.set(index, waiters);
        },
        `scanner ${index} to close`,
      );
      const bodyFor = (boundary: string) => Buffer.concat([
        Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="lesson.mp4"\r\nContent-Type: video/mp4\r\n\r\n`),
        Buffer.from('0000ftypisom' + 'video payload'),
        Buffer.from(`\r\n--${boundary}--\r\n`),
      ]);
      const requests: http.ClientRequest[] = [];
      const issueUpload = (server: http.Server) => {
        const boundary = `video-test-${Math.random().toString(16).slice(2)}`;
        const body = bodyFor(boundary);
        const address = server.address() as import('node:net').AddressInfo;
        const client = http.request({
          host: '127.0.0.1', port: address.port, path: '/api/v1/videos/upload', method: 'POST',
          headers: {
            Authorization: `Bearer ${teacherToken}`,
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
            'Content-Length': String(body.length),
          },
        });
        requests.push(client);
        const response = new Promise<{ status: number; body: string }>((resolve, reject) => {
          client.once('response', (res) => {
            let responseBody = '';
            res.setEncoding('utf8');
            res.on('data', (chunk) => { responseBody += chunk; });
            res.on('end', () => resolve({ status: res.statusCode || 0, body: responseBody }));
          });
          client.once('error', reject);
        });
        void response.catch(() => undefined);
        client.end(body);
        return { client, response };
      };
      let api: http.Server | undefined;
      let recordedId: string | undefined;
      let stagingRoot = '';
      let stagingBefore = new Set<string>();
      try {
        vi.stubEnv('CLAMAV_HOST', '127.0.0.1');
        stagingRoot = getUploadStagingRoot();
        stagingBefore = new Set(await fs.readdir(stagingRoot));
        await new Promise<void>((resolve) => scanner.listen(0, '127.0.0.1', resolve));
        vi.stubEnv('CLAMAV_PORT', String((scanner.address() as net.AddressInfo).port));
        api = http.createServer(app);
        await new Promise<void>((resolve) => api!.listen(0, '127.0.0.1', resolve));

        const first = issueUpload(api);
        await waitForTerminalFrames(1);
        const second = issueUpload(api);
        await waitForTerminalFrames(2);
        const saturated = await issueUpload(api).response;
        expect(saturated.status).toBe(503);

        first.client.destroy();
        first.client.socket?.destroy();
        await waitForScannerClose(1);
        const resumed = issueUpload(api);
        const accepted = await resumed.response;
        expect(accepted.status).toBe(201);
        recordedId = JSON.parse(accepted.body).data.id;
        await waitForTerminalFrames(3);
        expect(scannerConnections).toBe(3);
        expect((await fs.readdir(stagingRoot)).filter((file) => !stagingBefore.has(file))).toHaveLength(1);

        second.client.destroy();
        second.client.socket?.destroy();
        await waitForScannerClose(2);
        await vi.waitFor(async () => expect((await fs.readdir(stagingRoot)).filter((file) => !stagingBefore.has(file))).toHaveLength(0), { timeout: 5_000 });
        expect((await prisma.video.findUnique({ where: { id: recordedId } }))?.status).toBe('PROCESSING');
      } finally {
        vi.unstubAllEnvs();
        for (const client of requests) client.destroy();
        for (const socket of scannerSockets.values()) socket.destroy();
        if (api?.listening) await new Promise<void>((resolve) => api!.close(() => resolve()));
        if (scanner.listening) await new Promise<void>((resolve) => scanner.close(() => resolve()));
        if (recordedId) {
          const record = await prisma.video.findUnique({ where: { id: recordedId }, select: { videoUrl: true } });
          if (record?.videoUrl) await StorageService.deleteFile(record.videoUrl);
          await prisma.video.deleteMany({ where: { id: recordedId } });
        }
      }
    });

    it('should block non-teachers from uploading', async () => {
      const res = await request(app)
        .post('/api/v1/videos/upload')
        .set('Authorization', `Bearer ${studentToken}`)
        .attach('file', Buffer.from('fake video data'), 'test.mp4');

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/videos/:videoId/playback-url', () => {
    it('should deny playback url for non-existent video', async () => {
      const res = await request(app)
        .get('/api/v1/videos/00000000-0000-0000-0000-000000000000/playback-url')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(404);
    });
  });
});
