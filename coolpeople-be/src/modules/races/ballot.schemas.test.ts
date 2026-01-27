import { describe, it, expect } from 'vitest';
import { ballotParamSchema, submitBallotSchema } from './ballot.schemas';

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';
const ANOTHER_VALID_UUID = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

describe('ballotParamSchema', () => {
  it('accepts a valid UUID in params.id', () => {
    const result = ballotParamSchema.safeParse({
      params: { id: VALID_UUID },
    });

    expect(result.success).toBe(true);
  });

  it('rejects a non-UUID string in params.id', () => {
    const result = ballotParamSchema.safeParse({
      params: { id: 'not-a-uuid' },
    });

    expect(result.success).toBe(false);
  });

  it('rejects missing id in params', () => {
    const result = ballotParamSchema.safeParse({
      params: {},
    });

    expect(result.success).toBe(false);
  });
});

describe('submitBallotSchema', () => {
  const validInput = {
    params: { id: VALID_UUID },
    body: {
      rankings: [
        { competitorId: VALID_UUID, rank: 1 },
        { competitorId: ANOTHER_VALID_UUID, rank: 2 },
      ],
    },
  };

  it('accepts valid params and body with rankings', () => {
    const result = submitBallotSchema.safeParse(validInput);

    expect(result.success).toBe(true);
  });

  it('rejects an empty rankings array', () => {
    const result = submitBallotSchema.safeParse({
      params: { id: VALID_UUID },
      body: { rankings: [] },
    });

    expect(result.success).toBe(false);
  });

  it('rejects rankings with a non-UUID competitorId', () => {
    const result = submitBallotSchema.safeParse({
      params: { id: VALID_UUID },
      body: {
        rankings: [{ competitorId: 'invalid-id', rank: 1 }],
      },
    });

    expect(result.success).toBe(false);
  });

  it('rejects rankings with a non-positive rank (0)', () => {
    const result = submitBallotSchema.safeParse({
      params: { id: VALID_UUID },
      body: {
        rankings: [{ competitorId: VALID_UUID, rank: 0 }],
      },
    });

    expect(result.success).toBe(false);
  });

  it('rejects rankings with a negative rank', () => {
    const result = submitBallotSchema.safeParse({
      params: { id: VALID_UUID },
      body: {
        rankings: [{ competitorId: VALID_UUID, rank: -1 }],
      },
    });

    expect(result.success).toBe(false);
  });

  it('rejects rankings with a non-integer rank (1.5)', () => {
    const result = submitBallotSchema.safeParse({
      params: { id: VALID_UUID },
      body: {
        rankings: [{ competitorId: VALID_UUID, rank: 1.5 }],
      },
    });

    expect(result.success).toBe(false);
  });

  it('requires both params.id and body.rankings', () => {
    const missingParams = submitBallotSchema.safeParse({
      body: {
        rankings: [{ competitorId: VALID_UUID, rank: 1 }],
      },
    });

    const missingBody = submitBallotSchema.safeParse({
      params: { id: VALID_UUID },
    });

    const missingBoth = submitBallotSchema.safeParse({});

    expect(missingParams.success).toBe(false);
    expect(missingBody.success).toBe(false);
    expect(missingBoth.success).toBe(false);
  });
});
