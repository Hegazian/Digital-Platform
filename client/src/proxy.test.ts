import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { proxy } from './proxy';

const hint = (payload: unknown) => `e30.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.signature`;
const current = (role: string) => hint({ role, exp: Date.now() / 1000 + 60 });
function navigate(path: string, cookie?: string) {
  return proxy(new NextRequest(`http://localhost:3000${path}`, { headers: cookie ? { cookie: `eduplat_rt=${cookie}` } : {} }));
}
describe('Next proxy navigation guard', () => {
  it('leaves public course pages accessible without a cookie', () => {
    expect(navigate('/courses/course-a').headers.get('x-middleware-next')).toBe('1');
  });
  it.each([undefined, 'garbage', hint(null), hint({ role: 'UNKNOWN', exp: Date.now() / 1000 + 60 }), hint({ role: 'STUDENT', exp: 1 }), hint({ role: 'ADMIN' })])('redirects absent/invalid/expired hints to login: %s', (cookie) => {
    const response = navigate('/student/dashboard', cookie);
    expect(response.status).toBe(307);
    expect(new URL(response.headers.get('location')!).pathname).toBe('/login');
  });
  it.each([['ADMIN', '/admin/dashboard'], ['TEACHER', '/teacher/dashboard'], ['STUDENT', '/student/dashboard']])('allows the %s dashboard', (role, path) => {
    expect(navigate(path, current(role)).headers.get('x-middleware-next')).toBe('1');
  });
  it.each([['STUDENT', '/student/dashboard'], ['TEACHER', '/teacher/dashboard']])('redirects %s away from admin without a loop', (role, target) => {
    expect(new URL(navigate('/admin/dashboard', current(role)).headers.get('location')!).pathname).toBe(target);
    expect(navigate(target, current(role)).headers.get('x-middleware-next')).toBe('1');
  });
  it.each(['ADMIN', 'TEACHER', 'STUDENT'])('permits the %s profile', (role) => {
    expect(navigate('/profile', current(role)).headers.get('x-middleware-next')).toBe('1');
  });
});
