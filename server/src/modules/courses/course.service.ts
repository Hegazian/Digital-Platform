import { prisma } from '../../prisma';
import { NotFoundError, ForbiddenError, BadRequestError } from '../../utils/errors';
import { VideoStatus, Role } from '@prisma/client';
import { logAuditAction } from '../audit/audit.service';

export class CourseService {
  /**
   * Strip answer keys from embedded quiz questions. Required for any
   * response delivered to users who cannot manage the course, otherwise
   * correct answers / explanations leak to students (NFR-001).
   */
  private static sanitizeCourseContent<T extends { modules?: any[]; sections?: any[] }>(course: T): T {
    const stripLesson = (lesson: any) => {
      if (lesson?.quiz?.questions) {
        lesson.quiz.questions = lesson.quiz.questions.map((q: any) => ({
          ...q,
          options: Array.isArray(q.options)
            ? q.options.map(({ isCorrect: _isCorrect, ...opt }: any) => opt)
            : q.options,
          explanation: null,
        }));
      }
      return lesson;
    };

    return {
      ...course,
      modules: course.modules?.map((m: any) => ({ ...m, lessons: m.lessons?.map(stripLesson) })),
      sections: course.sections?.map((s: any) => ({ ...s, lessons: s.lessons?.map(stripLesson) })),
    };
  }

  private static canManageCourse(course: { teacherId: string }, user?: { userId: string; role: Role } | null): boolean {
    if (!user) return false;
    return user.role === Role.ADMIN || course.teacherId === user.userId;
  }

  static async getAllCourses(query: any = {}, user?: { userId: string; role: Role } | null) {
    const { subjectId, teacherId, gradeId, isPublished, status, search, page, limit } = query;
    const pageNum = page ? parseInt(page as string, 10) : 1;
    const limitNum = limit ? parseInt(limit as string, 10) : 100;
    const skip = (pageNum - 1) * limitNum;

    const PUBLISHED_FILTER = { isPublished: true, status: 'PUBLISHED' as const };

    let where: any = {
      ...(subjectId && { subjectId }),
      ...(gradeId && { gradeId }),
      ...(search && {
        OR: [
          { titleEn: { contains: search, mode: 'insensitive' } },
          { titleAr: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    if (!user || user.role === Role.STUDENT) {
      // Students / anonymous visitors: published courses only. Caller-supplied
      // isPublished/status/teacherId are ignored to prevent enumeration.
      where = { ...where, ...PUBLISHED_FILTER };
    } else if (user.role === Role.TEACHER) {
      // Teachers: full visibility of their own courses, published-only for others.
      where = {
        ...where,
        AND: [{ OR: [{ teacherId: user.userId }, PUBLISHED_FILTER] }],
      };
    } else {
      // Admins: unrestricted, honor explicit filters.
      where = {
        ...where,
        ...(teacherId && { teacherId }),
        ...(isPublished !== undefined && { isPublished: isPublished === 'true' || isPublished === true }),
        ...(status && { status }),
      };
    }

    const courses = await prisma.course.findMany({
      where,
      include: {
        teacher: {
          select: { id: true, name: true, avatar: true },
        },
        subject: {
          select: { id: true, nameEn: true, nameAr: true },
        },
        grade: {
          select: { id: true, nameEn: true, nameAr: true, code: true },
        },
        modules: {
          orderBy: { sortOrder: 'asc' },
          include: {
            lessons: {
              orderBy: { orderIndex: 'asc' },
              include: {
                video: true,
                quiz: {
                  include: { questions: true },
                },
                materials: true,
                blocks: true,
              },
            },
          },
        },
      },
      skip,
      take: limitNum,
      orderBy: { createdAt: 'desc' },
    });

    const total = await prisma.course.count({ where });

    const courseIds = courses.map((c) => c.id);
    const products = prisma.product
      ? await prisma.product.findMany({
          where: { productType: 'COURSE', resourceId: { in: courseIds } },
        })
      : [];
    const productMap = new Map(products.map((p) => [p.resourceId, p]));

    const enrichedCourses = courses.map((c) => {
      const prod = productMap.get(c.id);
      // Free courses always display as free, regardless of any stale product row.
      const priceEgp = c.isFree ? 0 : prod ? Number(prod.priceEgp) : 150;
      const priceUsd = c.isFree ? 0 : prod ? Number(prod.priceUsd) : 10;
      const enriched = {
        ...c,
        priceEgp,
        priceUsd,
        productId: prod?.id,
      };
      return this.canManageCourse(c, user) ? enriched : this.sanitizeCourseContent(enriched);
    });

    return {
      courses: enrichedCourses,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  static async getCourseById(id: string, user?: { userId: string; role: Role } | null) {
    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        teacher: {
          select: { id: true, name: true, avatar: true, email: true },
        },
        subject: true,
        grade: true,
        modules: {
          orderBy: { sortOrder: 'asc' },
          include: {
            lessons: {
              orderBy: { orderIndex: 'asc' },
              include: {
                video: true,
                quiz: {
                  include: { questions: true },
                },
                materials: true,
                blocks: true,
              },
            },
          },
        },
        sections: {
          orderBy: { orderIndex: 'asc' },
          include: {
            lessons: {
              orderBy: { orderIndex: 'asc' },
              include: {
                video: true,
                quiz: {
                  include: { questions: true },
                },
                materials: true,
                blocks: true,
              },
            },
          },
        },
      },
    });

    if (!course) {
      throw new NotFoundError('Course not found');
    }

    // Visibility: only admins and the owning teacher may read unpublished
    // courses. Everyone else gets a 404 (no existence leak) for drafts.
    const canManage = this.canManageCourse(course, user);
    if (!canManage && (course.status !== 'PUBLISHED' || !course.isPublished)) {
      throw new NotFoundError('Course not found');
    }

    const product = prisma.product
      ? await prisma.product.findFirst({
          where: { productType: 'COURSE', resourceId: course.id },
        })
      : null;

    const enriched = {
      ...course,
      priceEgp: course.isFree ? 0 : product ? Number(product.priceEgp) : 150,
      priceUsd: course.isFree ? 0 : product ? Number(product.priceUsd) : 10,
      productId: product?.id,
    };

    return canManage ? enriched : this.sanitizeCourseContent(enriched);
  }

  /**
   * Resolves a Subject for course create/update:
   * - explicit subjectId wins (validated)
   * - otherwise subjectName is find-or-created (teachers may invent new
   *   subjects on the fly; duplicates collapse onto the existing row)
   */
  private static async resolveSubject(data: { subjectId?: string; subjectName?: string }) {
    if (data.subjectId) {
      let subject = await prisma.subject.findUnique({ where: { id: data.subjectId } });
      if (!subject) {
        const { SubjectService } = await import('./subject.service');
        await SubjectService.ensureDefaultSubjectsExist();
        subject = await prisma.subject.findUnique({ where: { id: data.subjectId } });
      }
      if (!subject) {
        throw new NotFoundError('Selected subject does not exist. Please select a valid subject.');
      }
      return subject;
    }

    const name = data.subjectName?.trim();
    if (!name) {
      throw new BadRequestError('A subject must be selected or named');
    }

    const existing = await prisma.subject.findFirst({
      where: { nameEn: { equals: name, mode: 'insensitive' } },
    });
    if (existing) return existing;

    try {
      return await prisma.subject.create({
        data: { nameEn: name, nameAr: name },
      });
    } catch (err: any) {
      // Concurrent creation hit the same unique value - reuse it.
      if (err?.code === 'P2002') {
        const raced = await prisma.subject.findFirst({
          where: { nameEn: { equals: name, mode: 'insensitive' } },
        });
        if (raced) return raced;
      }
      throw err;
    }
  }

  static async createCourse(data: any) {
    const subject = await this.resolveSubject(data);

    if (data.gradeId) {
      const grade = await prisma.grade.findUnique({ where: { id: data.gradeId } });
      if (!grade) {
        throw new NotFoundError('Selected grade does not exist.');
      }
    }

    const course = await prisma.course.create({
      data: {
        titleEn: data.titleEn,
        titleAr: data.titleAr,
        description: data.description,
        thumbnail: data.thumbnail,
        teacherId: data.teacherId,
        subjectId: subject.id,
        gradeId: data.gradeId || null,
        academicYearId: data.academicYearId || null,
        isFree: Boolean(data.isFree),
        status: 'DRAFT',
      },
    });

    // Free courses get a zero-priced product so catalog/pricing views stay
    // uniform; paid courses default to the platform price when unspecified.
    const isFree = Boolean(data.isFree);
    const priceEgp = isFree ? 0 : data.priceEgp !== undefined ? Number(data.priceEgp) : 150;
    const priceUsd = isFree ? 0 : data.priceUsd !== undefined ? Number(data.priceUsd) : 10;

    if (prisma.product) {
      await prisma.product.create({
        data: {
          nameEn: course.titleEn,
          nameAr: course.titleAr,
          description: course.description,
          productType: 'COURSE',
          resourceId: course.id,
          priceEgp,
          priceUsd,
          isActive: true,
        },
      });
    }

    // NFR-003: audit course creation
    await logAuditAction(course.teacherId, 'COURSE_CREATED', course.id, 'Course', {
      titleEn: course.titleEn,
      subjectId: course.subjectId,
    });

    return course;
  }

  static async updateCourse(id: string, teacherId: string, data: any, userRole?: Role) {
    const course = await prisma.course.findUnique({ where: { id } });
    if (!course) {
      throw new NotFoundError('Course not found');
    }

    if (course.teacherId !== teacherId && userRole !== Role.ADMIN) {
      throw new ForbiddenError('Only the course owner or Admin can edit this course');
    }

    // Renaming the subject by name (dynamic subject support)
    let resolvedSubjectId: string | undefined;
    if (data.subjectName && !data.subjectId) {
      const subject = await this.resolveSubject({ subjectName: data.subjectName });
      resolvedSubjectId = subject.id;
    }

    const updatedCourse = await prisma.course.update({
      where: { id },
      data: {
        ...(data.titleEn && { titleEn: data.titleEn }),
        ...(data.titleAr && { titleAr: data.titleAr }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.thumbnail !== undefined && { thumbnail: data.thumbnail }),
        ...(data.subjectId && { subjectId: data.subjectId }),
        ...(resolvedSubjectId && { subjectId: resolvedSubjectId }),
        ...(data.gradeId !== undefined && { gradeId: data.gradeId }),
        ...(data.academicYearId !== undefined && { academicYearId: data.academicYearId }),
        ...(data.isFree !== undefined && { isFree: data.isFree }),
        ...(data.teacherId && userRole === Role.ADMIN && { teacherId: data.teacherId }),
        // NOTE: `status` and `isPublished` are intentionally NOT writable here.
        // Lifecycle transitions go through /submit (teacher) and /review or
        // /publish (admin) so the review workflow cannot be bypassed.
        ...(data.isPublished !== undefined && userRole === Role.ADMIN && { isPublished: data.isPublished }),
      },
    });

    // Pricing rules (see isFree flag):
    // - isFree true  -> product prices are forced to 0
    // - isFree false -> explicit prices win; a course that was free gets the
    //   platform default rather than staying accidentally purchasable at 0
    if (
      (data.isFree !== undefined || data.priceEgp !== undefined || data.priceUsd !== undefined) &&
      prisma.product
    ) {
      const willBeFree = data.isFree ?? course.isFree;
      let priceEgp: number;
      let priceUsd: number;

      if (willBeFree) {
        priceEgp = 0;
        priceUsd = 0;
      } else {
        let explicitEgp =
          data.priceEgp !== undefined ? Number(data.priceEgp) : undefined;
        let explicitUsd =
          data.priceUsd !== undefined ? Number(data.priceUsd) : undefined;

        if (explicitEgp === undefined || explicitUsd === undefined) {
          const existingProduct = await prisma.product.findFirst({
            where: { productType: 'COURSE', resourceId: id },
          });
          const currentPaid =
            existingProduct && Number(existingProduct.priceEgp) > 0
              ? existingProduct
              : null;

          if (explicitEgp === undefined) {
            explicitEgp = currentPaid ? Number(currentPaid.priceEgp) : 150;
          }
          if (explicitUsd === undefined) {
            explicitUsd = currentPaid ? Number(currentPaid.priceUsd) : 10;
          }
        }

        priceEgp = explicitEgp as number;
        priceUsd = explicitUsd as number;
      }

      const existingProduct = await prisma.product.findFirst({
        where: {
          productType: 'COURSE',
          resourceId: id,
        },
      });

      if (existingProduct) {
        await prisma.product.update({
          where: { id: existingProduct.id },
          data: {
            nameEn: data.titleEn || updatedCourse.titleEn,
            nameAr: data.titleAr || updatedCourse.titleAr,
            priceEgp,
            priceUsd,
          },
        });
      } else {
        await prisma.product.create({
          data: {
            nameEn: updatedCourse.titleEn,
            nameAr: updatedCourse.titleAr,
            description: updatedCourse.description,
            productType: 'COURSE',
            resourceId: id,
            priceEgp,
            priceUsd,
            isActive: true,
          },
        });
      }
    }

    // NFR-003: audit course updates (track which fields changed)
    await logAuditAction(teacherId, 'COURSE_UPDATED', id, 'Course', {
      changedFields: Object.keys(data).filter(
        (k) => k !== 'priceEgp' && k !== 'priceUsd' && k !== 'isFree'
      ),
    });

    return updatedCourse;
  }

  static async deleteCourse(id: string, teacherId: string, userRole?: Role) {
    const course = await prisma.course.findUnique({ where: { id } });
    if (!course) {
      throw new NotFoundError('Course not found');
    }

    if (course.teacherId !== teacherId && userRole !== Role.ADMIN) {
      throw new ForbiddenError('Only the course owner or Admin can delete this course');
    }

    if (course.status === 'PUBLISHED' && userRole !== Role.ADMIN) {
      throw new ForbiddenError('Published courses cannot be permanently deleted. Please archive the course instead.');
    }

    // Explicit cascading cleanups to prevent orphaned records or constraints
    if (prisma.product?.deleteMany) {
      await prisma.product.deleteMany({
        where: { productType: 'COURSE', resourceId: id },
      });
    }

    if (prisma.discussionThread?.deleteMany) {
      await prisma.discussionThread.deleteMany({
        where: { courseId: id },
      });
    }

    if (prisma.collectionCourse?.deleteMany) {
      await prisma.collectionCourse.deleteMany({
        where: { courseId: id },
      });
    }

    if (prisma.certificate?.deleteMany) {
      await prisma.certificate.deleteMany({
        where: { courseId: id },
      });
    }

    await prisma.course.delete({ where: { id } });
    return { id, success: true };
  }

  static async archiveCourse(id: string, teacherId: string, userRole?: Role) {
    const course = await prisma.course.findUnique({ where: { id } });
    if (!course) {
      throw new NotFoundError('Course not found');
    }

    if (course.teacherId !== teacherId && userRole !== Role.ADMIN) {
      throw new ForbiddenError('Only the course owner or Admin can archive this course');
    }

    const updated = await prisma.course.update({
      where: { id },
      data: {
        status: 'ARCHIVED',
        isPublished: false,
      },
    });

    await logAuditAction(
      teacherId,
      'COURSE_ARCHIVED',
      id,
      'Course',
      { previousStatus: course.status }
    );

    return updated;
  }

  static async enrollStudentFree(courseId: string, studentId: string) {
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) {
      throw new NotFoundError('Course not found');
    }

    if (!course.isPublished && course.status !== 'PUBLISHED') {
      throw new ForbiddenError('Cannot enroll in unpublished courses');
    }

    // Free courses are open-enrollment by definition. Everything else must
    // not have an active priced product - paid courses go through checkout.
    if (!course.isFree) {
      const paidProduct = await prisma.product.findFirst({
        where: {
          productType: 'COURSE',
          resourceId: courseId,
          isActive: true,
          priceEgp: { gt: 0 },
        },
      });

      if (paidProduct) {
        throw new ForbiddenError('This course requires purchase. Please complete checkout to enroll.');
      }
    }

    const existingEntitlement = await prisma.entitlement.findFirst({
      where: {
        studentId,
        resourceType: 'COURSE',
        resourceId: courseId,
        status: 'ACTIVE',
      },
    });

    if (existingEntitlement) {
      return { success: true, message: 'Already enrolled in this course', entitlement: existingEntitlement };
    }

    const entitlement = await prisma.entitlement.create({
      data: {
        studentId,
        resourceType: 'COURSE',
        resourceId: courseId,
        sourceType: 'PURCHASE',
        status: 'ACTIVE',
      },
    });

    return { success: true, message: 'Enrolled successfully', entitlement };
  }

  /**
   * Publishes a course. ADMIN-ONLY: publication is the outcome of the review
   * workflow (TC-ADMIN-030..034). The course must pass the same completeness
   * validation as submit-for-review (min module/lesson + every lesson has a
   * resource).
   */
  static async publishCourse(id: string, actorId: string, userRole?: Role) {
    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        modules: { include: { lessons: { include: { blocks: true, materials: true } } } },
        sections: { include: { lessons: { include: { blocks: true, materials: true } } } },
      },
    });
    if (!course) {
      throw new NotFoundError('Course not found');
    }

    if (userRole !== Role.ADMIN) {
      throw new ForbiddenError('Only administrators can publish courses. Submit the course for review instead.');
    }

    if (course.status === 'ARCHIVED') {
      throw new BadRequestError('Archived courses cannot be published');
    }

    // Completeness gate — identical rules to submit-for-review.
    const allLessons = [
      ...(course.modules || []).flatMap((m) => m.lessons || []),
      ...(course.sections || []).flatMap((s) => s.lessons || []),
    ];
    const hasUnits = ((course.modules?.length ?? 0) + (course.sections?.length ?? 0)) > 0;
    if (!hasUnits || allLessons.length === 0) {
      throw new BadRequestError('Cannot publish an incomplete course: at least one module and lesson are required');
    }
    const emptyLessons = allLessons.filter((l) => {
      return !(l.videoId || l.quizId || ((l as any).materials?.length ?? 0) > 0 || ((l as any).blocks?.length ?? 0) > 0);
    });
    if (emptyLessons.length > 0) {
      throw new BadRequestError(
        `Cannot publish an incomplete course: ${emptyLessons.length} lesson(s) have no video, document, text block, or quiz`
      );
    }

    const updated = await prisma.course.update({
      where: { id },
      data: { isPublished: true, status: 'PUBLISHED', rejectionReason: null },
    });

    await logAuditAction(
      actorId,
      'COURSE_PUBLISHED',
      id,
      'Course',
      { previousStatus: course.status }
    );

    return updated;
  }

  static async submitCourseForReview(courseId: string, teacherId: string) {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        modules: {
          include: {
            lessons: {
              include: {
                blocks: true,
                materials: true,
              },
            },
          },
        },
        sections: {
          include: {
            lessons: {
              include: {
                blocks: true,
                materials: true,
              },
            },
          },
        },
      },
    });

    if (!course) {
      throw new NotFoundError('Course not found');
    }

    if (course.teacherId !== teacherId) {
      throw new ForbiddenError('You do not have permission to submit this course');
    }

    const hasUnits = (course.modules && course.modules.length > 0) || (course.sections && course.sections.length > 0);
    const hasLessons =
      (course.modules && course.modules.some((m) => m.lessons && m.lessons.length > 0)) ||
      (course.sections && course.sections.some((s) => s.lessons && s.lessons.length > 0));

    if (!hasUnits || !hasLessons) {
      throw new BadRequestError(
        'Course must contain at least one module and lesson before submitting for review'
      );
    }

    // Every lesson must carry at least one learning resource
    // (video, material, quiz, or content block).
    const allLessons = [
      ...(course.modules || []).flatMap((m) => m.lessons || []),
      ...(course.sections || []).flatMap((s) => s.lessons || []),
    ];
    const emptyLessons = allLessons.filter((l) => {
      const hasResources =
        Boolean(l.videoId) || Boolean(l.quizId) || ((l as any).materials?.length ?? 0) > 0 || ((l as any).blocks?.length ?? 0) > 0;
      return !hasResources;
    });

    if (allLessons.length === 0) {
      throw new BadRequestError('Course must contain at least one lesson with learning resources');
    }
    if (emptyLessons.length > 0) {
      const names = emptyLessons.slice(0, 3).map((l) => `"${l.titleEn}"`).join(', ');
      throw new BadRequestError(
        `Every lesson needs at least one video, document, text block, or quiz before submission. Missing: ${names}${emptyLessons.length > 3 ? ` and ${emptyLessons.length - 3} more` : ''}`
      );
    }

    const updated = await prisma.course.update({
      where: { id: courseId },
      data: { status: 'UNDER_REVIEW', rejectionReason: null },
    });

    await logAuditAction(
      teacherId,
      'COURSE_SUBMITTED_FOR_REVIEW',
      courseId,
      'Course'
    );

    return updated;
  }

  static async reviewCourseStatus(
    courseId: string,
    decision: 'APPROVED' | 'REJECTED',
    rejectionReason?: string
  ) {
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) {
      throw new NotFoundError('Course not found');
    }

    const newStatus = decision === 'APPROVED' ? 'PUBLISHED' : 'REJECTED';
    const isPublished = decision === 'APPROVED';

    const updated = await prisma.course.update({
      where: { id: courseId },
      data: {
        status: newStatus as any,
        isPublished,
        rejectionReason: decision === 'REJECTED' ? (rejectionReason || 'Course does not meet quality requirements') : null,
      },
    });

    await logAuditAction(
      'ADMIN',
      decision === 'APPROVED' ? 'COURSE_APPROVED' : 'COURSE_REJECTED',
      courseId,
      'Course',
      { decision, rejectionReason }
    );

    return updated;
  }

  // Module Management
  static async createModule(
    courseId: string,
    data: { titleEn: string; titleAr: string; description?: string; sortOrder?: number },
    teacherId?: string,
    userRole?: Role
  ) {
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) {
      throw new NotFoundError('Course not found');
    }

    if (teacherId && course.teacherId !== teacherId && userRole !== Role.ADMIN) {
      throw new ForbiddenError('Only the course owner can add modules to this course');
    }

    return await prisma.courseModule.create({
      data: {
        courseId,
        titleEn: data.titleEn,
        titleAr: data.titleAr,
        description: data.description,
        sortOrder: data.sortOrder ?? 0,
      },
    });
  }

  static async updateModule(
    moduleId: string,
    data: { titleEn?: string; titleAr?: string; description?: string; sortOrder?: number },
    teacherId?: string,
    userRole?: Role
  ) {
    const module = await prisma.courseModule.findUnique({
      where: { id: moduleId },
      include: { course: true },
    });
    if (!module) {
      throw new NotFoundError('Module not found');
    }

    if (teacherId && module.course.teacherId !== teacherId && userRole !== Role.ADMIN) {
      throw new ForbiddenError('Only the course owner can update this module');
    }

    return await prisma.courseModule.update({ where: { id: moduleId }, data });
  }

  static async deleteModule(moduleId: string, teacherId?: string, userRole?: Role) {
    const module = await prisma.courseModule.findUnique({
      where: { id: moduleId },
      include: { course: true },
    });
    if (!module) {
      throw new NotFoundError('Module not found');
    }

    if (teacherId && module.course.teacherId !== teacherId && userRole !== Role.ADMIN) {
      throw new ForbiddenError('Only the course owner can delete modules from this course');
    }

    await prisma.courseModule.delete({ where: { id: moduleId } });
    return true;
  }

  static async reorderModules(
    courseId: string,
    items: Array<{ id: string; sortOrder: number }>,
    teacherId?: string,
    userRole?: Role
  ) {
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) {
      throw new NotFoundError('Course not found');
    }

    // Ownership: only the owning teacher (or an admin) may reorder modules.
    if (teacherId && course.teacherId !== teacherId && userRole !== Role.ADMIN) {
      throw new ForbiddenError('Only the course owner can reorder this course\'s modules');
    }

    // All modules must belong to the given course.
    const moduleIds = await prisma.courseModule.findMany({
      where: { id: { in: items.map((i) => i.id) } },
      select: { id: true, courseId: true },
    });
    const foreign = moduleIds.find((m) => m.courseId !== courseId);
    if (foreign || moduleIds.length !== items.length) {
      throw new BadRequestError('One or more modules do not belong to this course');
    }

    await prisma.$transaction(
      items.map((item) =>
        prisma.courseModule.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder },
        })
      )
    );
    return true;
  }

  // Lesson & Resource Management
  static async createLesson(
    moduleId: string,
    data: {
      titleEn: string;
      titleAr?: string;
      content?: string;
      orderIndex?: number;
      estimatedDuration?: number;
      video?: { title?: string; videoUrl: string; duration?: number };
      materials?: Array<{ title: string; fileUrl: string; fileType?: string; fileSize?: number }>;
      quiz?: { title: string; passingScore?: number; timeLimit?: number; questions: Array<{ questionText: string; points?: number; orderIndex?: number; options: Array<{ optionText: string; isCorrect: boolean; orderIndex?: number }> }> };
    },
    teacherId?: string,
    userRole?: Role
  ) {
    const module = await prisma.courseModule.findUnique({
      where: { id: moduleId },
      include: { course: true },
    });
    if (!module) {
      throw new NotFoundError('Module not found');
    }

    if (teacherId && module.course.teacherId !== teacherId && userRole !== Role.ADMIN) {
      throw new ForbiddenError('Only the course owner can add lessons to this course');
    }

    let videoId: string | undefined;
    if (data.video && data.video.videoUrl) {
      const video = await prisma.video.create({
        data: {
          teacherId: teacherId || module.course.teacherId,
          status: VideoStatus.READY,
          videoUrl: data.video.videoUrl,
          durationSec: data.video.duration || 0,
          originalFileName: data.video.title || 'lesson-video.mp4',
        },
      });
      videoId = video.id;
    }

    let quizId: string | undefined;
    if (data.quiz && data.quiz.title) {
      // Delegate to QuizService so embedded quizzes get the same per-type
      // validation and normalization as standalone ones (quiz engine v2).
      const { QuizService } = await import('../quizzes/quiz.service');
      const quiz = await QuizService.createQuiz({
        titleEn: data.quiz.title,
        titleAr: data.quiz.title,
        passingScore: data.quiz.passingScore,
        timeLimit: data.quiz.timeLimit,
        maxAttempts: (data.quiz as any).maxAttempts,
        questions: data.quiz.questions || [],
      });
      quizId = quiz.id;
    }

    const lesson = await prisma.lesson.create({
      data: {
        moduleId,
        titleEn: data.titleEn,
        titleAr: data.titleAr || data.titleEn,
        content: data.content,
        orderIndex: data.orderIndex ?? 0,
        estimatedDuration: data.estimatedDuration,
        videoId,
        quizId,
        materials: data.materials && data.materials.length > 0 ? {
          create: data.materials.map((m) => ({
            title: m.title,
            fileUrl: m.fileUrl,
            fileType: m.fileType || 'pdf',
            sizeBytes: m.fileSize || 1024,
          })),
        } : undefined,
      },
      include: {
        video: true,
        quiz: { include: { questions: true } },
        materials: true,
        blocks: true,
      },
    });

    return lesson;
  }

  static async attachVideoToLesson(
    lessonId: string,
    data: { videoUrl: string; duration?: number; title?: string },
    teacherId?: string,
    userRole?: Role
  ) {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        module: { include: { course: true } },
        section: { include: { course: true } },
      },
    });
    if (!lesson) {
      throw new NotFoundError('Lesson not found');
    }

    const courseTeacherId = lesson.module?.course?.teacherId || lesson.section?.course?.teacherId;
    if (teacherId && courseTeacherId && courseTeacherId !== teacherId && userRole !== Role.ADMIN) {
      throw new ForbiddenError('Only the course owner can attach videos to this lesson');
    }

    const video = await prisma.video.create({
      data: {
        teacherId: teacherId || courseTeacherId || '',
        status: VideoStatus.READY,
        videoUrl: data.videoUrl,
        durationSec: data.duration || 0,
        originalFileName: data.title || 'lesson-video.mp4',
      },
    });

    await prisma.lesson.update({
      where: { id: lessonId },
      data: { videoId: video.id },
    });

    return video;
  }

  static async attachMaterialToLesson(
    lessonId: string,
    data: { title: string; fileUrl: string; fileType?: string; fileSize?: number },
    teacherId?: string,
    userRole?: Role
  ) {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        module: { include: { course: true } },
        section: { include: { course: true } },
      },
    });
    if (!lesson) {
      throw new NotFoundError('Lesson not found');
    }

    const courseTeacherId = lesson.module?.course?.teacherId || lesson.section?.course?.teacherId;
    if (teacherId && courseTeacherId && courseTeacherId !== teacherId && userRole !== Role.ADMIN) {
      throw new ForbiddenError('Only the course owner can attach materials to this lesson');
    }

    return await prisma.material.create({
      data: {
        lessonId,
        title: data.title,
        fileUrl: data.fileUrl,
        fileType: data.fileType || 'pdf',
        sizeBytes: data.fileSize || 1024,
      },
    });
  }

  static async attachQuizToLesson(
    lessonId: string,
    data: { title: string; passingScore?: number; timeLimit?: number; questions?: Array<{ questionText: string; points?: number; orderIndex?: number; options: Array<{ optionText: string; isCorrect: boolean; orderIndex?: number }> }> },
    teacherId?: string,
    userRole?: Role
  ) {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        module: { include: { course: true } },
        section: { include: { course: true } },
      },
    });
    if (!lesson) {
      throw new NotFoundError('Lesson not found');
    }

    const courseTeacherId = lesson.module?.course?.teacherId || lesson.section?.course?.teacherId;
    if (teacherId && courseTeacherId && courseTeacherId !== teacherId && userRole !== Role.ADMIN) {
      throw new ForbiddenError('Only the course owner can attach quizzes to this lesson');
    }

    const quiz = await (async () => {
      // Delegate to QuizService for v2 validation + typed questions.
      const { QuizService } = await import('../quizzes/quiz.service');
      return QuizService.createQuiz({
        titleEn: data.title,
        titleAr: data.title,
        passingScore: data.passingScore,
        timeLimit: data.timeLimit,
        questions: data.questions || [],
      });
    })();

    await prisma.lesson.update({
      where: { id: lessonId },
      data: { quizId: quiz.id },
    });

    return quiz;
  }

  static async deleteLesson(lessonId: string, teacherId?: string, userRole?: Role) {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        module: { include: { course: true } },
        section: { include: { course: true } },
      },
    });
    if (!lesson) {
      throw new NotFoundError('Lesson not found');
    }

    const courseTeacherId = lesson.module?.course?.teacherId || lesson.section?.course?.teacherId;
    if (teacherId && courseTeacherId && courseTeacherId !== teacherId && userRole !== Role.ADMIN) {
      throw new ForbiddenError('Only the course owner can delete lessons from this course');
    }

    await prisma.lesson.delete({ where: { id: lessonId } });
    return true;
  }

  static async updateLesson(
    lessonId: string,
    data: { titleEn?: string; titleAr?: string; content?: string; estimatedDuration?: number },
    teacherId?: string,
    userRole?: Role
  ) {
    const lesson = await this.getOwnedLessonOrThrow(lessonId, teacherId, userRole);
    void lesson;

    return await prisma.lesson.update({
      where: { id: lessonId },
      data,
    });
  }

  /**
   * Reorders lessons by explicit orderIndex values. Every affected lesson's
   * parent course must be owned by the requesting teacher.
   */
  static async reorderLessons(
    items: Array<{ id: string; orderIndex: number }>,
    teacherId?: string,
    userRole?: Role
  ) {
    if (items.length === 0) {
      throw new BadRequestError('lessons array cannot be empty');
    }

    const lessons = await prisma.lesson.findMany({
      where: { id: { in: items.map((i) => i.id) } },
      include: {
        module: { select: { course: { select: { teacherId: true } } } },
        section: { select: { course: { select: { teacherId: true } } } },
      },
    });

    if (lessons.length !== items.length) {
      throw new NotFoundError('One or more lessons were not found');
    }

    for (const lesson of lessons) {
      const owner = lesson.module?.course?.teacherId || lesson.section?.course?.teacherId;
      if (teacherId && owner && owner !== teacherId && userRole !== Role.ADMIN) {
        throw new ForbiddenError('Only the course owner can reorder these lessons');
      }
    }

    await prisma.$transaction(
      items.map((item) =>
        prisma.lesson.update({
          where: { id: item.id },
          data: { orderIndex: item.orderIndex },
        })
      )
    );
    return true;
  }

  private static async getOwnedLessonOrThrow(lessonId: string, teacherId?: string, userRole?: Role) {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        module: { include: { course: true } },
        section: { include: { course: true } },
      },
    });
    if (!lesson) {
      throw new NotFoundError('Lesson not found');
    }

    const courseTeacherId = lesson.module?.course?.teacherId || lesson.section?.course?.teacherId;
    if (teacherId && courseTeacherId && courseTeacherId !== teacherId && userRole !== Role.ADMIN) {
      throw new ForbiddenError('Only the course owner can modify this lesson');
    }

    return { lesson, courseTeacherId };
  }

  static async addLessonBlock(
    lessonId: string,
    data: { blockType: string; configuration: any; sortOrder?: number; isRequired?: boolean },
    teacherId?: string,
    userRole?: Role
  ) {
    await this.getOwnedLessonOrThrow(lessonId, teacherId, userRole);

    return await prisma.lessonBlock.create({
      data: {
        lessonId,
        blockType: data.blockType as any,
        configurationJson: JSON.stringify(data.configuration || {}),
        sortOrder: data.sortOrder ?? 0,
        isRequired: data.isRequired ?? true,
      },
    });
  }

  // NOTE: gradeAssignmentSubmission was removed — grading is owned by the
  // assignments module (AssignmentService.gradeSubmission), which enforces
  // assignment ownership and validates score bounds. See FR-TEACHER-010.

  static async getTeacherDashboardStats(teacherId: string) {
    const activeCourses = await prisma.course.count({
      where: { teacherId, status: 'PUBLISHED' },
    });

    // Students holding an active entitlement to one of THIS teacher's courses.
    const myCourseIds = (
      await prisma.course.findMany({
        where: { teacherId },
        select: { id: true },
      })
    ).map((c) => c.id);

    let totalStudents = 0;
    if (myCourseIds.length > 0) {
      const distinct = await prisma.entitlement.findMany({
        where: {
          status: 'ACTIVE',
          resourceType: 'COURSE',
          resourceId: { in: myCourseIds },
        },
        select: { studentId: true },
        distinct: ['studentId'],
      });
      totalStudents = distinct.length;
    }

    // Submissions awaiting grading for assignments inside this teacher's lessons.
    // (Assignment.lessonId is a bare string with no Prisma relation, so we
    // resolve the teacher's lesson IDs first.)
    const myLessonIds = (
      await prisma.lesson.findMany({
        where: {
          OR: [
            { module: { course: { teacherId } } },
            { section: { course: { teacherId } } },
          ],
        },
        select: { id: true },
      })
    ).map((l) => l.id);

    let pendingAssignments = 0;
    if (myLessonIds.length > 0) {
      pendingAssignments = await prisma.assignmentSubmission.count({
        where: {
          status: 'SUBMITTED',
          assignment: { lessonId: { in: myLessonIds } },
        },
      });
    }

    return {
      activeCourses,
      totalStudents,
      pendingAssignments,
    };
  }
}
