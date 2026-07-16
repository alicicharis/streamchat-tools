import { describe, expect, it } from 'vitest';
import { evaluate } from './expression-parser';

describe('evaluate', () => {
  it('respects standard precedence', () => {
    expect(evaluate('2+3*4')).toBe(14);
    expect(evaluate('2*3^2')).toBe(18);
  });

  it('handles right-associative exponentiation', () => {
    expect(evaluate('2^3^2')).toBe(512);
  });

  it('handles unary minus with correct binding', () => {
    expect(evaluate('-2^2')).toBe(-4);
    expect(evaluate('--3')).toBe(3);
    expect(evaluate('-(2+3)')).toBe(-5);
  });

  it('handles parentheses and nesting', () => {
    expect(evaluate('(2+3)*4')).toBe(20);
    expect(evaluate('((1+2)*(3+4))')).toBe(21);
  });

  it('handles decimals', () => {
    expect(evaluate('1.5+2.5')).toBe(4);
    expect(evaluate('0.1+0.2')).toBeCloseTo(0.3);
  });

  it('ignores whitespace', () => {
    expect(evaluate('  2 +  3 * 4 ')).toBe(14);
  });

  it('throws on division by zero', () => {
    expect(() => evaluate('1/0')).toThrow(/division by zero/i);
  });

  it('throws on empty input', () => {
    expect(() => evaluate('')).toThrow(/empty/i);
    expect(() => evaluate('   ')).toThrow(/empty/i);
  });

  it('throws on unbalanced parentheses', () => {
    expect(() => evaluate('(2+3')).toThrow();
    expect(() => evaluate('2+3)')).toThrow();
  });

  it('throws on trailing garbage', () => {
    expect(() => evaluate('2+3 4')).toThrow();
  });

  it('throws on unknown characters', () => {
    expect(() => evaluate('2+a')).toThrow();
    expect(() => evaluate('2&3')).toThrow();
  });

  it('basic arithmetic operators', () => {
    expect(evaluate('10-4')).toBe(6);
    expect(evaluate('10/4')).toBe(2.5);
  });
});
