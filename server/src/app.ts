import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import authRoutes from './modules/auth/auth.routes';
import { subjectRouter, courseRouter } from './modules/courses/course.routes';
import videoRoutes from './modules/videos/video.routes';
import subscriptionRoutes from './modules/subscriptions/subscription.routes';
import adminRoutes from './modules/admin/admin.routes';
import quizRouter from './modules/quizzes/quiz.routes';
import materialRouter from './modules/materials/material.routes';
import progressRoutes from './modules/progress/progress.routes';
import parentRoutes from './modules/parent/parent.routes';

const app: Express = express();

// Middleware
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(morgan('dev'));

// Rate Limiting (Production Audit)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests from this IP, please try again later.' }
});
app.use('/api', limiter);

// Welcome Root Route for Browser Visits
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

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/subjects', subjectRouter);
app.use('/api/v1/courses', courseRouter);
app.use('/api/v1/videos', videoRoutes);
app.use('/api/v1/subscriptions', subscriptionRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/quizzes', quizRouter);
app.use('/api/v1/materials', materialRouter);
app.use('/api/v1/progress', progressRoutes);
app.use('/api/v1/parent', parentRoutes);

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'OK' });
});

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('App Error Handler:', err);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

export default app;
