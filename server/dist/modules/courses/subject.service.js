"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubjectService = void 0;
const prisma_1 = require("../../prisma");
const client_1 = require("@prisma/client");
class SubjectService {
    /**
     * Self-healing utility that ensures default secondary curriculum subjects
     * exist in the database if the table is empty.
     */
    static async ensureDefaultSubjectsExist() {
        const count = await prisma_1.prisma.subject.count();
        if (count === 0) {
            const defaultSubjects = [
                {
                    id: 'subject-prog-sec1',
                    nameEn: 'Programming Secondary 1',
                    nameAr: 'البرمجة للصف الأول الثانوي',
                    description: 'Introductory Python & Web Development for 1st Secondary students.',
                    pricing: [
                        { period: client_1.SubscriptionPeriod.MONTHLY, priceEgp: 200, priceUsd: 10 },
                        { period: client_1.SubscriptionPeriod.SIX_MONTHS, priceEgp: 1000, priceUsd: 50 },
                        { period: client_1.SubscriptionPeriod.YEARLY, priceEgp: 1800, priceUsd: 90 },
                    ],
                },
                {
                    id: 'subject-math-sec1',
                    nameEn: 'Mathematics Secondary 1',
                    nameAr: 'الرياضيات للصف الأول الثانوي',
                    description: 'Algebra, Geometry, and Trigonometry for 1st Secondary students.',
                    pricing: [
                        { period: client_1.SubscriptionPeriod.MONTHLY, priceEgp: 250, priceUsd: 12 },
                        { period: client_1.SubscriptionPeriod.SIX_MONTHS, priceEgp: 1200, priceUsd: 60 },
                        { period: client_1.SubscriptionPeriod.YEARLY, priceEgp: 2200, priceUsd: 110 },
                    ],
                },
                {
                    id: 'subject-physics-sec1',
                    nameEn: 'Physics Secondary 1',
                    nameAr: 'الفيزياء للصف الأول الثانوي',
                    description: 'Physics mechanics, forces, and motion for 1st Secondary students.',
                    pricing: [
                        { period: client_1.SubscriptionPeriod.MONTHLY, priceEgp: 250, priceUsd: 12 },
                        { period: client_1.SubscriptionPeriod.SIX_MONTHS, priceEgp: 1200, priceUsd: 60 },
                        { period: client_1.SubscriptionPeriod.YEARLY, priceEgp: 2200, priceUsd: 110 },
                    ],
                },
            ];
            for (const s of defaultSubjects) {
                const createdSubject = await prisma_1.prisma.subject.create({
                    data: {
                        id: s.id,
                        nameEn: s.nameEn,
                        nameAr: s.nameAr,
                        description: s.description,
                    },
                });
                for (const p of s.pricing) {
                    await prisma_1.prisma.subjectPricing.create({
                        data: {
                            subjectId: createdSubject.id,
                            period: p.period,
                            priceEgp: p.priceEgp,
                            priceUsd: p.priceUsd,
                            isActive: true,
                        },
                    });
                }
            }
        }
    }
    static async getAllSubjects() {
        let subjects = await prisma_1.prisma.subject.findMany({
            include: {
                pricing: true,
            },
        });
        if (subjects.length === 0) {
            await this.ensureDefaultSubjectsExist();
            subjects = await prisma_1.prisma.subject.findMany({
                include: {
                    pricing: true,
                },
            });
        }
        return subjects;
    }
    static async getSubjectById(id) {
        return await prisma_1.prisma.subject.findUnique({
            where: { id },
            include: {
                pricing: true,
                courses: {
                    where: { isPublished: true },
                },
            },
        });
    }
    static async createSubject(data) {
        const { nameEn, nameAr, description, thumbnail, pricing } = data;
        return await prisma_1.prisma.subject.create({
            data: {
                nameEn,
                nameAr,
                description,
                thumbnail,
                ...(pricing && {
                    pricing: {
                        create: pricing,
                    },
                }),
            },
            include: {
                pricing: true,
            },
        });
    }
    static async updateSubject(id, data) {
        return await prisma_1.prisma.subject.update({
            where: { id },
            data,
            include: { pricing: true },
        });
    }
}
exports.SubjectService = SubjectService;
