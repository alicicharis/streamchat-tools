import { describe, expect, it } from 'vitest';
import { deriveThreadTitle } from './thread-title';

describe('deriveThreadTitle', () => {
  it('passes short text through unchanged', () => {
    expect(deriveThreadTitle('Hello there')).toBe('Hello there');
  });

  it('collapses internal whitespace and trims', () => {
    expect(deriveThreadTitle('  Hello   there  \n friend  ')).toBe(
      'Hello there friend',
    );
  });

  it('passes text of exactly 60 characters through unchanged', () => {
    const text = 'a'.repeat(60);
    expect(deriveThreadTitle(text)).toBe(text);
  });

  it('truncates text over 60 characters with a trailing ellipsis', () => {
    const text = 'a'.repeat(70);
    const result = deriveThreadTitle(text);
    expect(result).toBe(`${'a'.repeat(60)}…`);
    expect(result.length).toBe(61);
  });
});
