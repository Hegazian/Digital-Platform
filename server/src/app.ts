import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
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
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

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
