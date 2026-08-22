import { prisma } from '../../prisma';
import { NotFoundError, BadRequestError } from '../../utils/errors';

export class AcademicService {
  // Educational Stages
  static async createEducationalStage(data: {
    nameEn: string;
    nameAr: string;
    code: string;
    sortOrder?: number;
  }) {
    const existing = await prisma.educationalStage.findUnique({
      where: { code: data.code },
    });
    if (existing) {
      throw new BadRequestError(`Educational stage with code '${data.code}' already exists`);
    }

    return await prisma.educationalStage.create({
      data: {
        nameEn: data.nameEn,
        nameAr: data.nameAr,
        code: data.code,
        sortOrder: data.sortOrder ?? 0,
      },
    });
  }

  static async getAllEducationalStages() {
    return await prisma.educationalStage.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        grades: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
  }

  // Grades
  static async createGrade(data: {
    stageId: string;
    nameEn: string;
    nameAr: string;
    code: string;
    sortOrder?: number;
  }) {
    const stage = await prisma.educationalStage.findUnique({
      where: { id: data.stageId },
    });
    if (!stage) {
      throw new NotFoundError('Educational stage not found');
    }

    return await prisma.grade.create({
      data: {
        stageId: data.stageId,
        nameEn: data.nameEn,
        nameAr: data.nameAr,
        code: data.code,
        sortOrder: data.sortOrder ?? 0,
      },
    });
  }

  static async getGradesByStage(stageId: string) {
    return await prisma.grade.findMany({
      where: { stageId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  static async updateEducationalStage(id: string, data: Partial<{
    nameEn: string;
    nameAr: string;
    code: string;
    sortOrder: number;
  }>) {
    const stage = await prisma.educationalStage.findUnique({ where: { id } });
    if (!stage) throw new NotFoundError('Educational stage not found');

    if (data.code && data.code !== stage.code) {
      const clash = await prisma.educationalStage.findUnique({ where: { code: data.code } });
      if (clash) throw new BadRequestError(`Educational stage with code '${data.code}' already exists`);
    }

    return await prisma.educationalStage.update({
      where: { id },
      data,
    });
  }

  static async deleteEducationalStage(id: string) {
    const stage = await prisma.educationalStage.findUnique({ where: { id } });
    if (!stage) throw new NotFoundError('Educational stage not found');
    // Cascades to grades -> grade-subject associations (schema-defined).
    await prisma.educationalStage.delete({ where: { id } });
  }

  static async updateGrade(id: string, data: Partial<{
    nameEn: string;
    nameAr: string;
    code: string;
    sortOrder: number;
  }>) {
    const grade = await prisma.grade.findUnique({ where: { id } });
    if (!grade) throw new NotFoundError('Grade not found');

    return await prisma.grade.update({ where: { id }, data });
  }

  static async deleteGrade(id: string) {
    const grade = await prisma.grade.findUnique({ where: { id } });
    if (!grade) throw new NotFoundError('Grade not found');

    const courseCount = await prisma.course.count({ where: { gradeId: id } });
    if (courseCount > 0) {
      throw new BadRequestError(`Cannot delete a grade that still has ${courseCount} course(s) attached`);
    }
    const studentCount = await prisma.user.count({ where: { gradeId: id } });
    if (studentCount > 0) {
      throw new BadRequestError(`Cannot delete a grade that still has ${studentCount} student(s) enrolled`);
    }

    await prisma.grade.delete({ where: { id } });
  }

  // Academic Years
  static async createAcademicYear(data: {
    name: string;
    startDate: string | Date;
    endDate: string | Date;
    isActive?: boolean;
  }) {
    return await prisma.academicYear.create({
      data: {
        name: data.name,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        isActive: data.isActive ?? true,
      },
    });
  }

  static async getAllAcademicYears() {
    return await prisma.academicYear.findMany({
      orderBy: { startDate: 'desc' },
    });
  }

  static async updateAcademicYear(id: string, data: Partial<{
    name: string;
    startDate: string | Date;
    endDate: string | Date;
    isActive: boolean;
  }>) {
    const year = await prisma.academicYear.findUnique({ where: { id } });
    if (!year) throw new NotFoundError('Academic year not found');

    const startDate = data.startDate ? new Date(data.startDate) : year.startDate;
    const endDate = data.endDate ? new Date(data.endDate) : year.endDate;
    if (startDate >= endDate) {
      throw new BadRequestError('startDate must be before endDate');
    }

    return await prisma.academicYear.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.startDate !== undefined && { startDate }),
        ...(data.endDate !== undefined && { endDate }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });
  }

  static async deleteAcademicYear(id: string) {
    const year = await prisma.academicYear.findUnique({ where: { id } });
    if (!year) throw new NotFoundError('Academic year not found');

    const associationCount = await prisma.gradeSubject.count({ where: { academicYearId: id } });
    if (associationCount > 0) {
      throw new BadRequestError(
        `Cannot delete an academic year with ${associationCount} grade-subject association(s)`
      );
    }

    await prisma.academicYear.delete({ where: { id } });
  }

  // Grade - Subject Association
  static async createGradeSubject(data: {
    gradeId: string;
    subjectId: string;
    academicYearId: string;
  }) {
    const grade = await prisma.grade.findUnique({ where: { id: data.gradeId } });
    if (!grade) throw new NotFoundError('Grade not found');

    const subject = await prisma.subject.findUnique({ where: { id: data.subjectId } });
    if (!subject) throw new NotFoundError('Subject not found');

    const year = await prisma.academicYear.findUnique({ where: { id: data.academicYearId } });
    if (!year) throw new NotFoundError('Academic year not found');

    return await prisma.gradeSubject.create({
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

  static async getSubjectsByGrade(gradeId: string) {
    const gradeSubjects = await prisma.gradeSubject.findMany({
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

  static async updateGradeSubject(id: string, data: { isActive?: boolean }) {
    const association = await prisma.gradeSubject.findUnique({ where: { id } });
    if (!association) throw new NotFoundError('Grade-subject association not found');

    return await prisma.gradeSubject.update({ where: { id }, data });
  }

  static async deleteGradeSubject(id: string) {
    const association = await prisma.gradeSubject.findUnique({ where: { id } });
    if (!association) throw new NotFoundError('Grade-subject association not found');

    await prisma.gradeSubject.delete({ where: { id } });
  }

  static async getGradeSubjects(filters: { gradeId?: string; academicYearId?: string }) {
    return await prisma.gradeSubject.findMany({
      where: {
        ...(filters.gradeId && { gradeId: filters.gradeId }),
        ...(filters.academicYearId && { academicYearId: filters.academicYearId }),
      },
      include: {
        grade: true,
        subject: true,
        academicYear: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}
