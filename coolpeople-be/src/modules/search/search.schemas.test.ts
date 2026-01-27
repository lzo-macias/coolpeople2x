import { describe, it, expect } from 'vitest';
import { searchQuerySchema } from './search.schemas.js';

describe('Search Schemas', () => {
  // ---------------------------------------------------------------------------
  // searchQuerySchema
  // ---------------------------------------------------------------------------

  describe('searchQuerySchema', () => {
    it('accepts a valid query with q parameter', () => {
      const input = { query: { q: 'hello world' } };
      const result = searchQuerySchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.query.q).toBe('hello world');
      }
    });

    it('rejects an empty q string', () => {
      const input = { query: { q: '' } };
      const result = searchQuerySchema.safeParse(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Search query is required');
      }
    });

    it('rejects q longer than 200 characters', () => {
      const input = { query: { q: 'a'.repeat(201) } };
      const result = searchQuerySchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('accepts valid type values', () => {
      const validTypes = ['users', 'parties', 'races', 'reels', 'hashtags'] as const;

      for (const type of validTypes) {
        const input = { query: { q: 'search', type } };
        const result = searchQuerySchema.safeParse(input);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.query.type).toBe(type);
        }
      }
    });

    it('rejects an invalid type value', () => {
      const input = { query: { q: 'search', type: 'invalid' } };
      const result = searchQuerySchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('type is optional', () => {
      const input = { query: { q: 'search' } };
      const result = searchQuerySchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.query.type).toBeUndefined();
      }
    });

    it('uses default limit of 10 when not provided', () => {
      const input = { query: { q: 'search' } };
      const result = searchQuerySchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.query.limit).toBe(10);
      }
    });

    it('rejects limit greater than 50', () => {
      const input = { query: { q: 'search', limit: 51 } };
      const result = searchQuerySchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('coerces a string limit to a number', () => {
      const input = { query: { q: 'search', limit: '25' } };
      const result = searchQuerySchema.safeParse(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.query.limit).toBe(25);
      }
    });
  });
});
