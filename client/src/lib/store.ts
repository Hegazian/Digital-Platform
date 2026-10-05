import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Language = 'en' | 'ar';
export type ActiveTab = 'home' | 'courses' | 'pricing' | 'student' | 'teacher' | 'video' | 'admin';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'STUDENT' | 'TEACHER' | 'ADMIN';
  teacherStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | null;
  mfaEnabled?: boolean;
}

/** Post-login landing route for a role (dashboards are the signed-in home). */
export function dashboardPathFor(role: User['role'] | undefined | null): string {
  if (role === 'ADMIN') return '/admin/dashboard';
  if (role === 'TEACHER') return '/teacher/dashboard';
  return '/student/dashboard';
}

const translations = {
  en: {
    brand: 'EduPlatform',
    tagline: 'Learn Smart. Achieve More.',
    subtagline: 'Master Egyptian Secondary School Curriculum in Programming, Math, and Physics.',
    navHome: 'Home',
    navCourses: 'Courses',
    navPricing: 'Pricing',
    navStudentDash: 'Student Hub',
    navTeacherDash: 'Teacher Portal',

    login: 'Log In',
    register: 'Sign Up',
    logout: 'Log Out',
    freePreview: 'Free Chapter Preview',
    startLearning: 'Start Free Trial',
    exploreCourses: 'Explore Subjects',
    monthly: 'Monthly',
    sixMonths: '6 Months',
    yearly: 'Yearly (Save 20%)',
    currencyEgp: 'EGP',
    currencyUsd: 'USD',
    perMonth: '/month',
    subscribeNow: 'Subscribe Now',
    activeSub: 'Active Subscription',
    teacherApprovalPending: 'Teacher application pending Admin review',
    teacherApprovedBadge: 'Verified Educator Account',
    linkChild: 'Link Student Account',
    enterInviteCode: 'Enter Invitation Code',
    videoPlayerTitle: 'Interactive Lesson & Secure Video Streaming',
    materials: 'Course Materials & Notes',
    quiz: 'Chapter Quiz',
    resumeVideo: 'Resume Video',
    watchTime: 'Watch Time',
    completedQuizzes: 'Completed Quizzes',
    avgScore: 'Average Quiz Score',
    welcomeBack: 'Welcome Back',
    createNewCourse: 'Create New Course',
    courseTitleEn: 'Course Title (English)',
    courseTitleAr: 'Course Title (Arabic)',
    description: 'Course Description',
    selectSubject: 'Select Subject',
    submitForApproval: 'Submit Course for Approval',
  },
  ar: {
    brand: 'إديوبلاتفورم',
    tagline: 'تعلّم بذكاء. حقّق المزيد.',
    subtagline: 'احترف مناهج الثانوية العامة المصرية في البرمجة، الرياضيات، والفيزياء.',
    navHome: 'الرئيسية',
    navCourses: 'المواد والدورات',
    navPricing: 'الباقات والأسعار',
    navStudentDash: 'منصة الطالب',
    navTeacherDash: 'بوابة المعلم',

    login: 'تسجيل الدخول',
    register: 'إنشاء حساب جديد',
    logout: 'تسجيل الخروج',
    freePreview: 'معاينة الفصل الأول مجاناً',
    startLearning: 'ابدأ التجربة المجانية',
    exploreCourses: 'تصفح المواد',
    monthly: 'شهري',
    sixMonths: '٦ أشهر',
    yearly: 'سنوي (خصم ٢٠٪)',
    currencyEgp: 'ج.م',
    currencyUsd: '$',
    perMonth: '/شهرياً',
    subscribeNow: 'اشترك الآن',
    activeSub: 'اشتراك نشط',
    teacherApprovalPending: 'طلب المعلم قيد مراجعة الإدارة',
    teacherApprovedBadge: 'حساب معلم معتمد',
    linkChild: 'ربط حساب الطالب',
    enterInviteCode: 'أدخل رمز الدعوة',
    videoPlayerTitle: 'مشغل الدروس المشفر والتفاعلي',
    materials: 'الملفات والمذكرات',
    quiz: 'اختبار الفصل',
    resumeVideo: 'متابعة المشاهدة',
    watchTime: 'ساعات المشاهدة',
    completedQuizzes: 'الاختبارات المكتملة',
    avgScore: 'متوسط الدرجات',
    welcomeBack: 'مرحباً بك مجدداً',
    createNewCourse: 'إضافة دورة تدريبية جديدة',
    courseTitleEn: 'عنوان الدورة (بالإنجليزية)',
    courseTitleAr: 'عنوان الدورة (بالعربية)',
    description: 'وصف الدورة التدريبية',
    selectSubject: 'اختر المادة الدراسية',
    submitForApproval: 'إرسال الدورة للمراجعة',
  },
};

interface AppStore {
  lang: Language;
  dir: 'ltr' | 'rtl';
  activeTab: ActiveTab;
  user: User | null;
  token: string | null;
  selectedCourseId: string | null;
  selectedSubjectId: string | null;
  careerTrackSlug: string | null;

  setLang: (lang: Language) => void;
  setActiveTab: (tab: ActiveTab) => void;
  setUser: (user: User | null, token: string | null, refreshToken?: string | null) => void;
  setSelectedCourse: (courseId: string | null) => void;
  setSelectedSubject: (subjectId: string | null) => void;
  setCareerTrack: (slug: string | null) => void;
  t: (key: keyof typeof translations.en) => string;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      lang: 'en',
      dir: 'ltr',
      activeTab: 'home',
      user: null,
      token: null,
      selectedCourseId: null,
      selectedSubjectId: null,
      careerTrackSlug: null,

      setLang: (lang: Language) => {
        const dir = lang === 'ar' ? 'rtl' : 'ltr';
        if (typeof document !== 'undefined') {
          document.documentElement.dir = dir;
          document.documentElement.lang = lang;
        }
        set({ lang, dir });
      },

      setActiveTab: (activeTab: ActiveTab) => set({ activeTab }),

      setUser: (user, token) => {
        if (typeof window !== 'undefined') {
          // Access token only. The refresh token lives in an httpOnly cookie
          // managed by the API - it is never readable by JavaScript.
          if (token) {
            localStorage.setItem('accessToken', token);
          } else {
            localStorage.removeItem('accessToken');
          }
        }
        set({ user, token });
      },

      setSelectedCourse: (selectedCourseId) => set({ selectedCourseId, activeTab: 'video' }),

      setSelectedSubject: (selectedSubjectId) => set({ selectedSubjectId }),

      setCareerTrack: (careerTrackSlug) => set({ careerTrackSlug }),

      t: (key) => {
        const lang = get().lang;
        return translations[lang][key] || translations['en'][key] || key;
      },
    }),
    {
      name: 'eduplatform-storage',
      partialize: (state) => ({
        lang: state.lang,
        dir: state.dir,
        activeTab: state.activeTab,
        user: state.user,
        token: state.token,
        selectedCourseId: state.selectedCourseId,
        selectedSubjectId: state.selectedSubjectId,
        careerTrackSlug: state.careerTrackSlug,
      }),
    }
  )
);
