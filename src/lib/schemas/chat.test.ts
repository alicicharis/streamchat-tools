import { describe, expect, it } from 'vitest';
import { chatRequestSchema } from './chat';

const validBody = {
  threadId: '123e4567-e89b-12d3-a456-426614174000',
  message: 'Hello, world!',
  model: 'claude-sonnet-5',
};

describe('chatRequestSchema', () => {
  it('accepts a valid body', () => {
    const result = chatRequestSchema.safeParse(validBody);
    expect(result.success).toBe(true);
  });

  it('rejects an unknown model', () => {
    const result = chatRequestSchema.safeParse({
      ...validBody,
      model: 'gpt-5',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an empty message', () => {
    const result = chatRequestSchema.safeParse({ ...validBody, message: '' });
    expect(result.success).toBe(false);
  });

  it('rejects an oversized message', () => {
    const result = chatRequestSchema.safeParse({
      ...validBody,
      message: 'a'.repeat(8001),
    });
    expect(result.success).toBe(false);
  });

  it('rejects a missing threadId', () => {
    const rest: Record<string, unknown> = { ...validBody };
    delete rest.threadId;
    const result = chatRequestSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects a malformed threadId', () => {
    const result = chatRequestSchema.safeParse({
      ...validBody,
      threadId: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });
});
