"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.LiveService = void 0;
const prisma_1 = require("../../prisma");
const errors_1 = require("../../utils/errors");
class LiveService {
    static async createLiveSession(data) {
        const subject = await prisma_1.prisma.subject.findUnique({
            where: { id: data.subjectId },
        });
        if (!subject) {
            throw new errors_1.NotFoundError('Subject not found');
        }
        const meetingId = `zoom-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const zoomJoinUrl = `https://zoom.us/j/${meetingId}`;
        const zoomStartUrl = `https://zoom.us/s/${meetingId}?role=host`;
        return await prisma_1.prisma.liveSession.create({
            data: {
                teacher: { connect: { id: data.teacherId } },
                subject: { connect: { id: data.subjectId } },
                titleEn: data.titleEn,
                titleAr: data.titleAr,
                startTime: new Date(data.startTime),
                durationMinutes: data.durationMinutes,
                zoomMeetingId: meetingId,
                zoomJoinUrl,
                zoomStartUrl,
            },
        });
    }
    static async getSubjectLiveSessions(studentId, subjectId) {
        // Check unified entitlement access (Subscription or Entitlement)
        const { EntitlementResolver } = await Promise.resolve().then(() => __importStar(require('../commerce/entitlement-resolver.service')));
        const hasAccess = await EntitlementResolver.hasSubjectAccess(studentId, subjectId);
        if (!hasAccess) {
            throw new errors_1.ForbiddenError('Active subject entitlement required to access live sessions');
        }
        const sessions = await prisma_1.prisma.liveSession.findMany({
            where: { subjectId },
            orderBy: { startTime: 'asc' },
        });
        // Strip host start URL for students
        return sessions.map((s) => ({
            id: s.id,
            subjectId: s.subjectId,
            titleEn: s.titleEn,
            titleAr: s.titleAr,
            startTime: s.startTime,
            durationMinutes: s.durationMinutes,
            zoomJoinUrl: s.zoomJoinUrl,
        }));
    }
}
exports.LiveService = LiveService;
