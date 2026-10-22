import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  useConfigStore,
  useHomeContent,
  useSiteName,
  useSiteSlogan,
  useSiteDescription,
  DEFAULT_HOME_CONTENT,
} from '../configStore';
import { useAppStore } from '../store';

describe('configStore & content resolution', () => {
  beforeEach(() => {
    useConfigStore.setState({ config: null, isLoading: false, error: null });
    useAppStore.setState({ lang: 'en', dir: 'ltr' });
  });

  it('returns DEFAULT_HOME_CONTENT when config is not loaded', () => {
    const { result } = renderHook(() => useHomeContent());
    expect(result.current.navbar.subtitleEn).toBe(DEFAULT_HOME_CONTENT.navbar.subtitleEn);
    expect(result.current.hero.headingLine1En).toBe(DEFAULT_HOME_CONTENT.hero.headingLine1En);
    expect(result.current.howItWorks.steps.length).toBe(DEFAULT_HOME_CONTENT.howItWorks.steps.length);
  });

  it('preserves default content when partial homeContent overrides are provided', () => {
    useConfigStore.setState({
      config: {
        siteNameEn: 'Custom Platform',
        siteNameAr: 'منصة مخصصة',
        siteDescriptionEn: 'Desc',
        siteDescriptionAr: 'وصف',
        allowTeacherRegistration: true,
        enableCodePlaygrounds: false,
        enableCollaborativeBoards: false,
        primaryColor: '#4f46e5',
        homeContent: {
          navbar: {
            subtitleEn: 'Special Engineering Prep',
          },
          hero: {
            headingLine1En: 'Custom Header',
          },
        },
      },
    });

    const { result } = renderHook(() => useHomeContent());
    // Overridden fields
    expect(result.current.navbar.subtitleEn).toBe('Special Engineering Prep');
    expect(result.current.hero.headingLine1En).toBe('Custom Header');

    // Preserved default fields
    expect(result.current.navbar.subtitleAr).toBe(DEFAULT_HOME_CONTENT.navbar.subtitleAr);
    expect(result.current.hero.primaryCtaEn).toBe(DEFAULT_HOME_CONTENT.hero.primaryCtaEn);
    expect(result.current.howItWorks.steps.length).toBe(DEFAULT_HOME_CONTENT.howItWorks.steps.length);
  });

  it('resolves site name, slogan, and description with Arabic and English localization', () => {
    useConfigStore.setState({
      config: {
        siteNameEn: 'English Edu',
        siteNameAr: 'عربي إديو',
        sloganEn: 'Learn Fast',
        sloganAr: 'تعلم بسرعة',
        siteDescriptionEn: 'Top Math Courses',
        siteDescriptionAr: 'أفضل دورات الرياضيات',
        allowTeacherRegistration: true,
        enableCodePlaygrounds: false,
        enableCollaborativeBoards: false,
        primaryColor: '#4f46e5',
      },
    });

    // English
    useAppStore.setState({ lang: 'en' });
    const { result: nameEn } = renderHook(() => useSiteName());
    const { result: sloganEn } = renderHook(() => useSiteSlogan());
    const { result: descEn } = renderHook(() => useSiteDescription());

    expect(nameEn.current).toBe('English Edu');
    expect(sloganEn.current).toBe('Learn Fast');
    expect(descEn.current).toBe('Top Math Courses');

    // Arabic
    useAppStore.setState({ lang: 'ar' });
    const { result: nameAr } = renderHook(() => useSiteName());
    const { result: sloganAr } = renderHook(() => useSiteSlogan());
    const { result: descAr } = renderHook(() => useSiteDescription());

    expect(nameAr.current).toBe('عربي إديو');
    expect(sloganAr.current).toBe('تعلم بسرعة');
    expect(descAr.current).toBe('أفضل دورات الرياضيات');
  });
});
