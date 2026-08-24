import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import { prisma } from './prisma';
import { Logger } from './utils/logger';
import { ConflictError, NotFoundError, BadRequestError } from './utils/errors';

import authRoutes from './modules/auth/auth.routes';
import { subjectRouter, courseRouter } from './modules/courses/course.routes';
import videoRoutes from './modules/videos/video.routes';
import subscriptionRoutes from './modules/subscriptions/subscription.routes';
import adminRoutes from './modules/admin/admin.routes';
import quizRouter from './modules/quizzes/quiz.routes';
import materialRouter from './modules/materials/material.routes';
import progressRoutes from './modules/progress/progress.routes';

import academicRouter from './modules/academic/academic.routes';
import commerceRouter from './modules/commerce/commerce.routes';
import assessmentRouter from './modules/assessment/assessment.routes';
import notificationRouter from './modules/notifications/notification.routes';
import teacherRouter from './modules/teacher/teacher.routes';
import liveRouter from './modules/live/live.routes';
import configRoutes from './modules/config/config.routes';
import playgroundRoutes from './modules/courses/playground.routes';
import boardRoutes from './modules/courses/board.routes';
import discussionRoutes from './modules/discussions/discussion.routes';
import podcastRoutes from './modules/podcasts/podcast.routes';
import certificateRoutes from './modules/certificates/certificate.routes';
import collectionRoutes from './modules/collections/collection.routes';
import aiRoutes from './modules/ai/ai.routes';
import apiTokenRoutes from './modules/developer/api-token.routes';
import webhookRoutes from './modules/developer/webhook.routes';
import mfaRoutes from './modules/auth/mfa.routes';
import auditRoutes from './modules/audit/audit.routes';
import assignmentRoutes from './modules/assignments/assignment.routes';
import careersRoutes from './modules/careers/careers.routes';

const app: Express = express();

// 1. Request ID Middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const requestId = (req.headers['x-request-id'] as string) || crypto.randomUUID();
  req.headers['x-request-id'] = requestId;
  res.setHeader('x-request-id', requestId);
  next();
});

// 2. Standard Middleware
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json());

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// 3. Rate Limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests from this IP, please try again later.' },
});
app.use('/api', globalLimiter);

// Dedicated Auth & Brute Force Rate Limiter
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many authentication attempts, please try again later.' },
});
app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/auth/register', authLimiter);
app.use('/api/v1/auth/mfa-login', authLimiter);

// 4. Health Check Endpoint
const handleHealthCheck = async (req: Request, res: Response) => {
  let dbStatus = 'disconnected';
  try {
    await prisma.$queryRawUnsafe('SELECT 1');
    dbStatus = 'connected';
  } catch (e) {
    dbStatus = 'error';
  }

  const memory = process.memoryUsage();

  res.status(200).json({
    status: dbStatus === 'connected' ? 'healthy' : 'degraded',
    database: dbStatus,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    memory: {
      heapUsedMb: Math.round((memory.heapUsed / 1024 / 1024) * 100) / 100,
      rssMb: Math.round((memory.rss / 1024 / 1024) * 100) / 100,
    },
  });
};

app.get('/health', handleHealthCheck);
app.get('/api/v1/health', handleHealthCheck);

// 5. Welcome Root Route for Browser Visits
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    name: 'EduPlatform API Backend',
    version: '1.0.0',
    status: 'online',
    endpoints: {
      health: '/health',
      auth: '/api/v1/auth',
      subjects: '/api/v1/subjects',
      courses: '/api/v1/courses',
      videos: '/api/v1/videos',
      subscriptions: '/api/v1/subscriptions',
    },
    documentation: 'See manual_testing_guide.md for API instructions',
  });
});

// 6. Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/subjects', subjectRouter);
app.use('/api/v1/courses', courseRouter);
app.use('/api/v1/videos', videoRoutes);
app.use('/api/v1/subscriptions', subscriptionRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/quizzes', quizRouter);
app.use('/api/v1/materials', materialRouter);
app.use('/api/v1/progress', progressRoutes);

app.use('/api/v1/academic', academicRouter);
app.use('/api/v1/commerce', commerceRouter);
app.use('/api/v1/assessment', assessmentRouter);
app.use('/api/v1/notifications', notificationRouter);
app.use('/api/v1/teacher', teacherRouter);
app.use('/api/v1/live', liveRouter);
app.use('/api/v1/config', configRoutes);
app.use('/api/v1/playgrounds', playgroundRoutes);
app.use('/api/v1/boards', boardRoutes);
app.use('/api/v1/discussions', discussionRoutes);
app.use('/api/v1/podcasts', podcastRoutes);
app.use('/api/v1/certificates', certificateRoutes);
app.use('/api/v1/collections', collectionRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/developer', apiTokenRoutes);
app.use('/api/v1/developer', webhookRoutes);
app.use('/api/v1/mfa', mfaRoutes);
app.use('/api/v1/audit', auditRoutes);
app.use('/api/v1/assignments', assignmentRoutes);
app.use('/api/v1/careers', careersRoutes);

// 7. Error Handling Middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  const requestId = req.headers['x-request-id'] as string;

  // Map well-known Prisma errors to safe HTTP semantics instead of raw 500s.
  if (err?.code === 'P2002') {
    // Unique constraint violation -> Conflict
    const target = Array.isArray(err.meta?.target) ? err.meta.target.join(', ') : err.meta?.target;
    err = new ConflictError(
      target
        ? `A record with the same ${target} already exists`
        : 'A record with these unique values already exists'
    );
  } else if (err?.code === 'P2025') {
    // Record not found / required relation missing
    err = new NotFoundError(err.meta?.cause || 'Related record not found');
  } else if (err?.code === 'P2003') {
    // Foreign key constraint failed
    err = new BadRequestError('Referenced record does not exist');
  }

  Logger.error(err.message || 'Internal Server Error', requestId, { stack: err.stack });

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: statusCode >= 500 ? 'Internal Server Error' : err.message,
    ...(process.env.NODE_ENV === 'development' && statusCode < 500 && { detail: err.message }),
  });
});

export default app;
