import { describe, it, expect } from 'vitest';
import { safeParse, safeDate } from './parsing';

describe('safeParse', () => {
  it('returns an empty array for null or undefined', () => {
    expect(safeParse(null)).toEqual([]);
    expect(safeParse(undefined)).toEqual([]);
  });

  it('returns an empty array for the literal string "[]"', () => {
    expect(safeParse('[]')).toEqual([]);
  });

  it('parses a valid JSON array string', () => {
    expect(safeParse('["a","b"]')).toEqual(['a', 'b']);
  });

  it('returns an empty array for malformed JSON', () => {
    expect(safeParse('not json')).toEqual([]);
  });

  it('returns an empty array when the parsed value is not an array', () => {
    expect(safeParse('{"a":1}')).toEqual([]);
  });
});

describe('safeDate', () => {
  it('returns null for a falsy value', () => {
    expect(safeDate(null)).toBeNull();
    expect(safeDate(undefined)).toBeNull();
    expect(safeDate('')).toBeNull();
  });

  it('returns a Date for a valid date string', () => {
    const result = safeDate('2026-01-01');
    expect(result).toBeInstanceOf(Date);
    expect(result?.toISOString().startsWith('2026-01-01')).toBe(true);
  });

  it('returns null for an invalid date string', () => {
    expect(safeDate('not-a-date')).toBeNull();
  });
});
