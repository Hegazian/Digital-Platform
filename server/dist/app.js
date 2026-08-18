"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const crypto_1 = __importDefault(require("crypto"));
const prisma_1 = require("./prisma");
const logger_1 = require("./utils/logger");
const auth_routes_1 = __importDefault(require("./modules/auth/auth.routes"));
const course_routes_1 = require("./modules/courses/course.routes");
const video_routes_1 = __importDefault(require("./modules/videos/video.routes"));
const subscription_routes_1 = __importDefault(require("./modules/subscriptions/subscription.routes"));
const admin_routes_1 = __importDefault(require("./modules/admin/admin.routes"));
const quiz_routes_1 = __importDefault(require("./modules/quizzes/quiz.routes"));
const material_routes_1 = __importDefault(require("./modules/materials/material.routes"));
const progress_routes_1 = __importDefault(require("./modules/progress/progress.routes"));
const academic_routes_1 = __importDefault(require("./modules/academic/academic.routes"));
const commerce_routes_1 = __importDefault(require("./modules/commerce/commerce.routes"));
const assessment_routes_1 = __importDefault(require("./modules/assessment/assessment.routes"));
const notification_routes_1 = __importDefault(require("./modules/notifications/notification.routes"));
const teacher_routes_1 = __importDefault(require("./modules/teacher/teacher.routes"));
const live_routes_1 = __importDefault(require("./modules/live/live.routes"));
const config_routes_1 = __importDefault(require("./modules/config/config.routes"));
const playground_routes_1 = __importDefault(require("./modules/courses/playground.routes"));
const board_routes_1 = __importDefault(require("./modules/courses/board.routes"));
const discussion_routes_1 = __importDefault(require("./modules/discussions/discussion.routes"));
const podcast_routes_1 = __importDefault(require("./modules/podcasts/podcast.routes"));
const certificate_routes_1 = __importDefault(require("./modules/certificates/certificate.routes"));
const collection_routes_1 = __importDefault(require("./modules/collections/collection.routes"));
const ai_routes_1 = __importDefault(require("./modules/ai/ai.routes"));
const api_token_routes_1 = __importDefault(require("./modules/developer/api-token.routes"));
const webhook_routes_1 = __importDefault(require("./modules/developer/webhook.routes"));
const mfa_routes_1 = __importDefault(require("./modules/auth/mfa.routes"));
const audit_routes_1 = __importDefault(require("./modules/audit/audit.routes"));
const app = (0, express_1.default)();
// 1. Request ID Middleware
app.use((req, res, next) => {
    const requestId = req.headers['x-request-id'] || crypto_1.default.randomUUID();
    req.headers['x-request-id'] = requestId;
    res.setHeader('x-request-id', requestId);
    next();
});
// 2. Standard Middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({ origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true }));
app.use(express_1.default.json());
if (process.env.NODE_ENV !== 'test') {
    app.use((0, morgan_1.default)('combined'));
}
// 3. Rate Limiting
const globalLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    limit: 1000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests from this IP, please try again later.' },
});
app.use('/api', globalLimiter);
// Dedicated Auth & Brute Force Rate Limiter
const authLimiter = (0, express_rate_limit_1.default)({
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
const handleHealthCheck = async (req, res) => {
    let dbStatus = 'disconnected';
    try {
        await prisma_1.prisma.$queryRawUnsafe('SELECT 1');
        dbStatus = 'connected';
    }
    catch (e) {
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
app.get('/', (req, res) => {
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
app.use('/api/v1/auth', auth_routes_1.default);
app.use('/api/v1/subjects', course_routes_1.subjectRouter);
app.use('/api/v1/courses', course_routes_1.courseRouter);
app.use('/api/v1/videos', video_routes_1.default);
app.use('/api/v1/subscriptions', subscription_routes_1.default);
app.use('/api/v1/admin', admin_routes_1.default);
app.use('/api/v1/quizzes', quiz_routes_1.default);
app.use('/api/v1/materials', material_routes_1.default);
app.use('/api/v1/progress', progress_routes_1.default);
app.use('/api/v1/academic', academic_routes_1.default);
app.use('/api/v1/commerce', commerce_routes_1.default);
app.use('/api/v1/assessment', assessment_routes_1.default);
app.use('/api/v1/notifications', notification_routes_1.default);
app.use('/api/v1/teacher', teacher_routes_1.default);
app.use('/api/v1/live', live_routes_1.default);
app.use('/api/v1/config', config_routes_1.default);
app.use('/api/v1/playgrounds', playground_routes_1.default);
app.use('/api/v1/boards', board_routes_1.default);
app.use('/api/v1/discussions', discussion_routes_1.default);
app.use('/api/v1/podcasts', podcast_routes_1.default);
app.use('/api/v1/certificates', certificate_routes_1.default);
app.use('/api/v1/collections', collection_routes_1.default);
app.use('/api/v1/ai', ai_routes_1.default);
app.use('/api/v1/developer', api_token_routes_1.default);
app.use('/api/v1/developer', webhook_routes_1.default);
app.use('/api/v1/mfa', mfa_routes_1.default);
app.use('/api/v1/audit', audit_routes_1.default);
// 7. Error Handling Middleware
app.use((err, req, res, next) => {
    const requestId = req.headers['x-request-id'];
    logger_1.Logger.error(err.message || 'Internal Server Error', requestId, { stack: err.stack });
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        success: false,
        message: err.message || 'Internal Server Error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
});
exports.default = app;
