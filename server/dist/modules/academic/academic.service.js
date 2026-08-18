"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AcademicService = void 0;
const prisma_1 = require("../../prisma");
const errors_1 = require("../../utils/errors");
class AcademicService {
    // Educational Stages
    static async createEducationalStage(data) {
        const existing = await prisma_1.prisma.educationalStage.findUnique({
            where: { code: data.code },
        });
        if (existing) {
            throw new errors_1.BadRequestError(`Educational stage with code '${data.code}' already exists`);
        }
        return await prisma_1.prisma.educationalStage.create({
            data: {
                nameEn: data.nameEn,
                nameAr: data.nameAr,
                code: data.code,
                sortOrder: data.sortOrder ?? 0,
            },
        });
    }
    static async getAllEducationalStages() {
        return await prisma_1.prisma.educationalStage.findMany({
            orderBy: { sortOrder: 'asc' },
            include: {
                grades: {
                    orderBy: { sortOrder: 'asc' },
                },
            },
        });
    }
    // Grades
    static async createGrade(data) {
        const stage = await prisma_1.prisma.educationalStage.findUnique({
            where: { id: data.stageId },
        });
        if (!stage) {
            throw new errors_1.NotFoundError('Educational stage not found');
        }
        return await prisma_1.prisma.grade.create({
            data: {
                stageId: data.stageId,
                nameEn: data.nameEn,
                nameAr: data.nameAr,
                code: data.code,
                sortOrder: data.sortOrder ?? 0,
            },
        });
    }
    static async getGradesByStage(stageId) {
        return await prisma_1.prisma.grade.findMany({
            where: { stageId },
            orderBy: { sortOrder: 'asc' },
        });
    }
    // Academic Years
    static async createAcademicYear(data) {
        return await prisma_1.prisma.academicYear.create({
            data: {
                name: data.name,
                startDate: new Date(data.startDate),
                endDate: new Date(data.endDate),
                isActive: data.isActive ?? true,
            },
        });
    }
    static async getAllAcademicYears() {
        return await prisma_1.prisma.academicYear.findMany({
            orderBy: { startDate: 'desc' },
        });
    }
    // Grade - Subject Association
    static async createGradeSubject(data) {
        const grade = await prisma_1.prisma.grade.findUnique({ where: { id: data.gradeId } });
        if (!grade)
            throw new errors_1.NotFoundError('Grade not found');
        const subject = await prisma_1.prisma.subject.findUnique({ where: { id: data.subjectId } });
        if (!subject)
            throw new errors_1.NotFoundError('Subject not found');
        const year = await prisma_1.prisma.academicYear.findUnique({ where: { id: data.academicYearId } });
        if (!year)
            throw new errors_1.NotFoundError('Academic year not found');
        return await prisma_1.prisma.gradeSubject.create({
            data: {
                gradeId: data.gradeId,
                subjectId: data.subjectId,
                academicYearId: data.academicYearId,
            },
            include: {
                grade: true,
                subject: true,
                academicYear: true,
            },
        });
    }
    static async getSubjectsByGrade(gradeId) {
        const gradeSubjects = await prisma_1.prisma.gradeSubject.findMany({
            where: { gradeId, isActive: true },
            include: {
                subject: {
                    include: {
                        pricing: true,
                        _count: {
                            select: { courses: true },
                        },
                    },
                },
            },
        });
        return gradeSubjects.map((gs) => gs.subject);
    }
}
exports.AcademicService = AcademicService;
