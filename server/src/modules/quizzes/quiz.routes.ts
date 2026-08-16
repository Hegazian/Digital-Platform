import { Router } from 'express';
import { QuizController } from './quiz.controller';
import { authenticate, requireApprovedTeacher } from '../auth/auth.middleware';
import { validateBody } from '../../utils/validate';
import { createQuizSchema, submitQuizAttemptSchema } from '../../utils/schemas';

const quizRouter = Router();

// Teacher routes
quizRouter.post('/', authenticate, requireApprovedTeacher, validateBody(createQuizSchema), QuizController.createQuiz);

// Shared / Student routes
quizRouter.get('/:id', authenticate, QuizController.getQuiz);
quizRouter.post('/:id/attempts', authenticate, validateBody(submitQuizAttemptSchema), QuizController.submitAttempt);
quizRouter.get('/:id/attempts', authenticate, QuizController.getMyAttempts);

export default quizRouter;
