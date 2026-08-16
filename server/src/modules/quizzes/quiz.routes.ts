import { Router } from 'express';
import { QuizController } from './quiz.controller';
import { authenticate, requireApprovedTeacher } from '../auth/auth.middleware';

const quizRouter = Router();

// Teacher routes
quizRouter.post('/', authenticate, requireApprovedTeacher, QuizController.createQuiz);

// Shared / Student routes
quizRouter.get('/:id', authenticate, QuizController.getQuiz);
quizRouter.post('/:id/attempts', authenticate, QuizController.submitAttempt);
quizRouter.get('/:id/attempts', authenticate, QuizController.getMyAttempts);

export default quizRouter;
