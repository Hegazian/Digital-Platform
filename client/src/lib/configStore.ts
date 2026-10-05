'use client';

import { create } from 'zustand';
import { useEffect } from 'react';
import { fetchApi } from './api';
import { errorMessage } from './apiTypes';
import { useAppStore } from './store';

export interface HomeTopicBadge {
  labelEn: string;
  labelAr: string;
  subEn?: string;
  subAr?: string;
}

export interface HomeTrustBadge {
  labelEn: string;
  labelAr: string;
}

export interface HomeStepItem {
  step: string;
  titleEn: string;
  titleAr: string;
  bodyEn: string;
  bodyAr: string;
}

export interface HomeContentConfig {
  navbar?: {
    subtitleEn?: string;
    subtitleAr?: string;
  };
  hero?: {
    topicBadges?: HomeTopicBadge[];
    headingLine1En?: string;
    headingLine1Ar?: string;
    headingLine2En?: string;
    headingLine2Ar?: string;
    descriptionEn?: string;
    descriptionAr?: string;
    primaryCtaEn?: string;
    primaryCtaAr?: string;
    secondaryCtaEn?: string;
    secondaryCtaAr?: string;
    trustBadges?: HomeTrustBadge[];
    bottomTaglineEn?: string;
    bottomTaglineAr?: string;
  };
  subjectsSection?: {
    titleEn?: string;
    titleAr?: string;
    viewAllEn?: string;
    viewAllAr?: string;
  };
  howItWorks?: {
    tagEn?: string;
    tagAr?: string;
    titleEn?: string;
    titleAr?: string;
    steps?: HomeStepItem[];
  };
  teacherBanner?: {
    titleEn?: string;
    titleAr?: string;
    bodyEn?: string;
    bodyAr?: string;
    ctaEn?: string;
    ctaAr?: string;
  };
  footer?: {
    brandDescriptionEn?: string;
    brandDescriptionAr?: string;
    audienceTitleEn?: string;
    audienceTitleAr?: string;
    audienceTagsEn?: string[];
    audienceTagsAr?: string[];
    designedWithTextEn?: string;
    designedWithTextAr?: string;
  };
}

export interface StrictHomeContent {
  navbar: {
    subtitleEn: string;
    subtitleAr: string;
  };
  hero: {
    topicBadges: HomeTopicBadge[];
    headingLine1En: string;
    headingLine1Ar: string;
    headingLine2En: string;
    headingLine2Ar: string;
    descriptionEn: string;
    descriptionAr: string;
    primaryCtaEn: string;
    primaryCtaAr: string;
    secondaryCtaEn: string;
    secondaryCtaAr: string;
    trustBadges: HomeTrustBadge[];
    bottomTaglineEn: string;
    bottomTaglineAr: string;
  };
  subjectsSection: {
    titleEn: string;
    titleAr: string;
    viewAllEn: string;
    viewAllAr: string;
  };
  howItWorks: {
    tagEn: string;
    tagAr: string;
    titleEn: string;
    titleAr: string;
    steps: HomeStepItem[];
  };
  teacherBanner: {
    titleEn: string;
    titleAr: string;
    bodyEn: string;
    bodyAr: string;
    ctaEn: string;
    ctaAr: string;
  };
  footer: {
    brandDescriptionEn: string;
    brandDescriptionAr: string;
    audienceTitleEn: string;
    audienceTitleAr: string;
    audienceTagsEn: string[];
    audienceTagsAr: string[];
    designedWithTextEn: string;
    designedWithTextAr: string;
  };
}

export interface AppConfig {
  siteNameEn: string;
  siteNameAr: string;
  siteDescriptionEn: string | null;
  siteDescriptionAr: string | null;
  sloganEn?: string | null;
  sloganAr?: string | null;
  allowTeacherRegistration: boolean;
  enableCodePlaygrounds: boolean;
  enableCollaborativeBoards: boolean;
  primaryColor: string;
  homeContent?: HomeContentConfig | null;
}

interface ConfigState {
  config: AppConfig | null;
  isLoading: boolean;
  error: string | null;
  fetchConfig: () => Promise<void>;
}

/**
 * Public platform configuration (site name, slogan, feature flags).
 * Fetched once at app boot via <Providers>; every brand surface reads
 * from here instead of hardcoded strings.
 */
export const useConfigStore = create<ConfigState>((set) => ({
  config: null,
  isLoading: false,
  error: null,
  fetchConfig: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetchApi('/config');
      if (res.success) {
        set({ config: res.data, isLoading: false });
      } else {
        set({ error: res.message, isLoading: false });
      }
    } catch (err: unknown) {
      set({ error: errorMessage(err), isLoading: false });
    }
  },
}));

/** Localized platform name with graceful fallback until config loads. */
export function useSiteName(): string {
  const { lang } = useAppStore();
  const config = useConfigStore((s) => s.config);
  if (!config) return lang === 'ar' ? 'إديوبلاتفورم' : 'EduPlatform';
  return (lang === 'ar' ? config.siteNameAr : config.siteNameEn) || 'EduPlatform';
}

/** Localized slogan; empty string when not configured. */
export function useSiteSlogan(): string {
  const { lang } = useAppStore();
  const config = useConfigStore((s) => s.config);
  if (!config) return '';
  return ((lang === 'ar' ? config.sloganAr : config.sloganEn) ?? '').trim();
}

/** Localized marketing description; empty string when not configured. */
export function useSiteDescription(): string {
  const lang = useAppStore((s) => s.lang);
  const config = useConfigStore((s) => s.config);
  if (!config) return '';
  return ((lang === 'ar' ? config.siteDescriptionAr : config.siteDescriptionEn) ?? '').trim();
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

/**
 * Bootstraps configuration once per app lifetime AND applies every
 * runtime-configurable surface:
 * - tab title        <- siteName*
 * - meta description <- siteDescription*
 * - theme-color + --brand-primary CSS variable <- primaryColor
 */
export function useConfigBootstrap() {
  const fetchConfig = useConfigStore((s) => s.fetchConfig);
  const config = useConfigStore((s) => s.config);
  const lang = useAppStore((s) => s.lang);

  useEffect(() => {
    if (!config) fetchConfig().catch(() => undefined);
  }, [config, fetchConfig]);

  useEffect(() => {
    if (!config || typeof document === 'undefined') return;

    const name = (lang === 'ar' ? config.siteNameAr : config.siteNameEn) || 'EduPlatform';
    const description =
      ((lang === 'ar' ? config.siteDescriptionAr : config.siteDescriptionEn) ?? '').trim();

    document.title = name;
    upsertMeta('name', 'description', description);
    upsertMeta('name', 'theme-color', config.primaryColor || '#4f46e5');
    document.documentElement.style.setProperty(
      '--brand-primary',
      config.primaryColor || '#4f46e5'
    );
  }, [config, lang]);
}

export const DEFAULT_HOME_CONTENT: StrictHomeContent = {
  navbar: {
    subtitleEn: 'Thanaweya Amma · Scientific Math',
    subtitleAr: 'ثانوية عامة · علمي رياضة',
  },
  hero: {
    topicBadges: [
      { labelEn: 'Engineering', labelAr: 'كلية الهندسة', subEn: 'Engineering', subAr: 'هندسة' },
      { labelEn: 'Computer & AI', labelAr: 'حاسبات وذكاء اصطناعي', subEn: 'Computer & AI', subAr: 'حاسبات وذكاء اصطناعي' },
      { labelEn: 'Advanced Math', labelAr: 'رياضيات', subEn: 'Advanced Math', subAr: 'رياضيات متقدمة' },
      { labelEn: 'Physics', labelAr: 'فيزياء', subEn: 'Physics', subAr: 'فيزياء' },
    ],
    headingLine1En: 'Thanaweya Amma. Scientific Math.',
    headingLine1Ar: 'ثانوية عامة. علمي رياضة.',
    headingLine2En: "Tomorrow's Engineers & Developers.",
    headingLine2Ar: 'مهندسو ومبرمجو الغد.',
    descriptionEn: 'Master Math, Physics & Programming — your direct path to Engineering and Computer faculties.',
    descriptionAr: 'أتقن الرياضيات والفيزياء والبرمجة — طريقك المباشر لكليات الهندسة والحاسبات.',
    primaryCtaEn: 'Start Learning',
    primaryCtaAr: 'ابدأ التعلم',
    secondaryCtaEn: 'Explore Courses',
    secondaryCtaAr: 'استكشف الدورات',
    trustBadges: [
      { labelEn: 'Secure Video Lessons', labelAr: 'فيديو آمن' },
      { labelEn: 'Scientific Math Curriculum', labelAr: 'منهج علمي رياضة' },
      { labelEn: 'Live Teacher Support', labelAr: 'دعم مباشر' },
      { labelEn: 'Engineering & Programming Tracks', labelAr: 'مسارات هندسة وبرمجة' },
    ],
    bottomTaglineEn: 'Built for the Egyptian Thanaweya Amma — Scientific Math track (Secondary 1, 2 & 3)',
    bottomTaglineAr: 'مصمم لطلاب الثانوية العامة — قسم علمي رياضة (الصفوف الثلاثة)',
  },
  subjectsSection: {
    titleEn: 'Explore by subject',
    titleAr: 'تصفح حسب المادة',
    viewAllEn: 'View all courses',
    viewAllAr: 'عرض كل الدورات',
  },
  howItWorks: {
    tagEn: 'How it works',
    tagAr: 'كيف تعمل المنصة',
    titleEn: 'Three steps to your future',
    titleAr: 'ثلاث خطوات نحو مستقبلك',
    steps: [
      {
        step: '1',
        titleEn: 'Pick your target faculty',
        titleAr: 'اختر كليتك المستهدفة',
        bodyEn: 'Engineering or Computers & AI — we map the exact Scientific Math courses you need for admission.',
        bodyAr: 'هندسة أو حاسبات وذكاء اصطناعي — نحدد لك دورات علمي رياضة التي تحتاجها للقبول بالضبط.',
      },
      {
        step: '2',
        titleEn: 'Master the curriculum',
        titleAr: 'أتقن المنهج',
        bodyEn: 'Math, Physics and Programming explained lesson by lesson — with quizzes, assignments and a real code playground.',
        bodyAr: 'رياضيات وفيزياء وبرمجة شرح درس بدرس — مع اختبارات وواجبات ومحرر أكواد حقيقي.',
      },
      {
        step: '3',
        titleEn: 'Be exam-ready',
        titleAr: 'استعد للثانوية',
        bodyEn: 'Track your progress lesson by lesson, drill with quizzes and assignments, and walk into Thanaweya Amma fully prepared.',
        bodyAr: 'تابع تقدمك درس بدرس، وتدرب على الاختبارات والواجبات، ودخل الامتحان وأنت مستعد تماماً.',
      },
    ],
  },
  teacherBanner: {
    titleEn: 'Are you a Scientific Math teacher?',
    titleAr: 'هل أنت معلم علمي رياضة؟',
    bodyEn: 'Publish your Thanaweya Amma curriculum on EduPlatform — reach thousands of scientific-math students with video lessons, quizzes, assignments and live sessions.',
    bodyAr: 'انشر منهجك للثانوية العامة على المنصة — اوصل لآلاف طلاب علمي رياضة عبر دروس مرئية واختبارات وواجبات وحصص مباشرة.',
    ctaEn: 'Start teaching',
    ctaAr: 'ابدأ التدريس',
  },
  footer: {
    brandDescriptionEn: 'The Thanaweya Amma Scientific Math platform — everything engineering and programming students need: video lessons, quizzes, assignments and live sessions in one place.',
    brandDescriptionAr: 'منصة الثانوية العامة علمي رياضة — كل ما يحتاجه طلاب الهندسة والبرمجة: دروس مرئية واختبارات وواجبات وشهادات في مكان واحد.',
    audienceTitleEn: 'Built for',
    audienceTitleAr: 'موجه لـ',
    audienceTagsEn: ['Scientific Math', 'Secondary 1', 'Secondary 2', 'Secondary 3'],
    audienceTagsAr: ['علمي رياضة', 'الأول الثانوي', 'الثاني الثانوي', 'الثالث الثانوي'],
    designedWithTextEn: "for Egypt's future engineers & developers.",
    designedWithTextAr: 'لمهندسي ومبرمجي مصر في المستقبل.',
  },
};

export function useHomeContent(): StrictHomeContent {
  const config = useConfigStore((s) => s.config);
  const custom = config?.homeContent;

  return {
    navbar: {
      subtitleEn: custom?.navbar?.subtitleEn || DEFAULT_HOME_CONTENT.navbar.subtitleEn,
      subtitleAr: custom?.navbar?.subtitleAr || DEFAULT_HOME_CONTENT.navbar.subtitleAr,
    },
    hero: {
      topicBadges: custom?.hero?.topicBadges?.length ? custom.hero.topicBadges : DEFAULT_HOME_CONTENT.hero.topicBadges,
      headingLine1En: custom?.hero?.headingLine1En || DEFAULT_HOME_CONTENT.hero.headingLine1En,
      headingLine1Ar: custom?.hero?.headingLine1Ar || DEFAULT_HOME_CONTENT.hero.headingLine1Ar,
      headingLine2En: custom?.hero?.headingLine2En || DEFAULT_HOME_CONTENT.hero.headingLine2En,
      headingLine2Ar: custom?.hero?.headingLine2Ar || DEFAULT_HOME_CONTENT.hero.headingLine2Ar,
      descriptionEn: custom?.hero?.descriptionEn || config?.sloganEn || config?.siteDescriptionEn || DEFAULT_HOME_CONTENT.hero.descriptionEn,
      descriptionAr: custom?.hero?.descriptionAr || config?.sloganAr || config?.siteDescriptionAr || DEFAULT_HOME_CONTENT.hero.descriptionAr,
      primaryCtaEn: custom?.hero?.primaryCtaEn || DEFAULT_HOME_CONTENT.hero.primaryCtaEn,
      primaryCtaAr: custom?.hero?.primaryCtaAr || DEFAULT_HOME_CONTENT.hero.primaryCtaAr,
      secondaryCtaEn: custom?.hero?.secondaryCtaEn || DEFAULT_HOME_CONTENT.hero.secondaryCtaEn,
      secondaryCtaAr: custom?.hero?.secondaryCtaAr || DEFAULT_HOME_CONTENT.hero.secondaryCtaAr,
      trustBadges: custom?.hero?.trustBadges?.length ? custom.hero.trustBadges : DEFAULT_HOME_CONTENT.hero.trustBadges,
      bottomTaglineEn: custom?.hero?.bottomTaglineEn || DEFAULT_HOME_CONTENT.hero.bottomTaglineEn,
      bottomTaglineAr: custom?.hero?.bottomTaglineAr || DEFAULT_HOME_CONTENT.hero.bottomTaglineAr,
    },
    subjectsSection: {
      titleEn: custom?.subjectsSection?.titleEn || DEFAULT_HOME_CONTENT.subjectsSection.titleEn,
      titleAr: custom?.subjectsSection?.titleAr || DEFAULT_HOME_CONTENT.subjectsSection.titleAr,
      viewAllEn: custom?.subjectsSection?.viewAllEn || DEFAULT_HOME_CONTENT.subjectsSection.viewAllEn,
      viewAllAr: custom?.subjectsSection?.viewAllAr || DEFAULT_HOME_CONTENT.subjectsSection.viewAllAr,
    },
    howItWorks: {
      tagEn: custom?.howItWorks?.tagEn || DEFAULT_HOME_CONTENT.howItWorks.tagEn,
      tagAr: custom?.howItWorks?.tagAr || DEFAULT_HOME_CONTENT.howItWorks.tagAr,
      titleEn: custom?.howItWorks?.titleEn || DEFAULT_HOME_CONTENT.howItWorks.titleEn,
      titleAr: custom?.howItWorks?.titleAr || DEFAULT_HOME_CONTENT.howItWorks.titleAr,
      steps: custom?.howItWorks?.steps?.length ? custom.howItWorks.steps : DEFAULT_HOME_CONTENT.howItWorks.steps,
    },
    teacherBanner: {
      titleEn: custom?.teacherBanner?.titleEn || DEFAULT_HOME_CONTENT.teacherBanner.titleEn,
      titleAr: custom?.teacherBanner?.titleAr || DEFAULT_HOME_CONTENT.teacherBanner.titleAr,
      bodyEn: custom?.teacherBanner?.bodyEn || DEFAULT_HOME_CONTENT.teacherBanner.bodyEn,
      bodyAr: custom?.teacherBanner?.bodyAr || DEFAULT_HOME_CONTENT.teacherBanner.bodyAr,
      ctaEn: custom?.teacherBanner?.ctaEn || DEFAULT_HOME_CONTENT.teacherBanner.ctaEn,
      ctaAr: custom?.teacherBanner?.ctaAr || DEFAULT_HOME_CONTENT.teacherBanner.ctaAr,
    },
    footer: {
      brandDescriptionEn: custom?.footer?.brandDescriptionEn || DEFAULT_HOME_CONTENT.footer.brandDescriptionEn,
      brandDescriptionAr: custom?.footer?.brandDescriptionAr || DEFAULT_HOME_CONTENT.footer.brandDescriptionAr,
      audienceTitleEn: custom?.footer?.audienceTitleEn || DEFAULT_HOME_CONTENT.footer.audienceTitleEn,
      audienceTitleAr: custom?.footer?.audienceTitleAr || DEFAULT_HOME_CONTENT.footer.audienceTitleAr,
      audienceTagsEn: custom?.footer?.audienceTagsEn?.length ? custom.footer.audienceTagsEn : DEFAULT_HOME_CONTENT.footer.audienceTagsEn,
      audienceTagsAr: custom?.footer?.audienceTagsAr?.length ? custom.footer.audienceTagsAr : DEFAULT_HOME_CONTENT.footer.audienceTagsAr,
      designedWithTextEn: custom?.footer?.designedWithTextEn || DEFAULT_HOME_CONTENT.footer.designedWithTextEn,
      designedWithTextAr: custom?.footer?.designedWithTextAr || DEFAULT_HOME_CONTENT.footer.designedWithTextAr,
    },
  };
}
