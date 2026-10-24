import { describe, expect, it } from 'vitest';
import { CourseCatalogItemSchema, CourseRetractionSchema, CreateOrderRequestSchema } from '@eduplatform/contracts';

describe('shared API contracts', () => {
  it('bounds and strips course retraction commands', () => {
    expect(CourseRetractionSchema.safeParse({ reason: '   too short   ' }).success).toBe(false);
    expect(CourseRetractionSchema.safeParse({ reason: 'Source content withdrawn by owner', adminId: 'spoof' }).success).toBe(false);
    expect(CourseRetractionSchema.parse({ reason: '  Source content withdrawn by owner  ' }).reason).toBe('Source content withdrawn by owner');
  });

  it('only accepts the manual payment mode and a bounded idempotency key', () => {
    const command = { productId: '3d40e52e-00fd-46fc-8557-a888ad1c8402', paymentMethod: 'MANUAL', idempotencyKey: 'order-key-00001' };
    expect(CreateOrderRequestSchema.safeParse(command).success).toBe(true);
    expect(CreateOrderRequestSchema.safeParse({ ...command, paymentMethod: 'PAYMOB' }).success).toBe(false);
    expect(CreateOrderRequestSchema.safeParse({ ...command, idempotencyKey: 'x'.repeat(201) }).success).toBe(false);
  });

  it('validates the public catalog DTO and drops server-only fields', () => {
    const result = CourseCatalogItemSchema.parse({
      id: 'course-1', titleEn: 'Physics', titleAr: 'الفيزياء', description: 'Uploaded lesson course', teacherId: 'teacher-1',
      subjectId: 'subject-1', status: 'PUBLISHED', isPublished: true, isFree: false, priceEgp: 250, priceUsd: 5, passwordHash: 'secret',
    });
    expect(result).not.toHaveProperty('passwordHash');
    expect(CourseCatalogItemSchema.safeParse({ ...result, priceEgp: -1 }).success).toBe(false);
  });
});
