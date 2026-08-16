import { prisma } from '../../prisma';
import { NotFoundError, BadRequestError } from '../../utils/errors';
import { ProgressService } from '../progress/progress.service';

export class ParentService {
  /**
   * Links a parent account to a student account using the student's email.
   */
  static async linkStudent(parentId: string, studentEmail: string) {
    const student = await prisma.user.findUnique({
      where: { email: studentEmail },
    });

    if (!student) {
      throw new NotFoundError('No student found with that email address.');
    }

    if (student.role !== 'STUDENT') {
      throw new BadRequestError('The provided email does not belong to a student account.');
    }

    try {
      const link = await prisma.parentStudent.create({
        data: {
          parentId,
          studentId: student.id,
        },
      });
      return link;
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new BadRequestError('You are already linked to this student.');
      }
      throw error;
    }
  }

  /**
   * Fetches all students linked to the parent, along with their progress analytics.
   */
  static async getChildrenAnalytics(parentId: string) {
    const links = await prisma.parentStudent.findMany({
      where: { parentId },
      include: {
        student: true,
      },
    });

    const childrenAnalytics = await Promise.all(
      links.map(async (link) => {
        const student = link.student;
        const progressSummary = await ProgressService.getStudentProgressSummary(student.id);

        return {
          studentId: student.id,
          name: student.name,
          email: student.email,
          avatar: student.avatar,
          totalWatchTimeSec: progressSummary.totalWatchTimeSec,
          avgQuizScore: progressSummary.avgQuizScore,
          activeCourses: progressSummary.courses,
        };
      })
    );

    return childrenAnalytics;
  }
}
