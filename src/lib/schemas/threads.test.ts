import { describe, expect, it } from 'vitest';
import { renameThreadSchema, deleteThreadSchema } from './threads';

const validId = '123e4567-e89b-12d3-a456-426614174000';

describe('renameThreadSchema', () => {
  it('accepts a valid input', () => {
    const result = renameThreadSchema.safeParse({
      id: validId,
      title: 'A valid title',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an empty title', () => {
    const result = renameThreadSchema.safeParse({ id: validId, title: '' });
    expect(result.success).toBe(false);
  });

  it('rejects a whitespace-only title', () => {
    const result = renameThreadSchema.safeParse({
      id: validId,
      title: '   ',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an over-max title', () => {
    const result = renameThreadSchema.safeParse({
      id: validId,
      title: 'a'.repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it('rejects a non-uuid id', () => {
    const result = renameThreadSchema.safeParse({
      id: 'not-a-uuid',
      title: 'Valid title',
    });
    expect(result.success).toBe(false);
  });
});

describe('deleteThreadSchema', () => {
  it('accepts a valid id', () => {
    const result = deleteThreadSchema.safeParse({ id: validId });
    expect(result.success).toBe(true);
  });

  it('rejects a non-uuid id', () => {
    const result = deleteThreadSchema.safeParse({ id: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });
});
