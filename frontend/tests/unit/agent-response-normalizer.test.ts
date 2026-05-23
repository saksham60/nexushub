import { describe, it, expect } from 'vitest';
import { normalizeAgentResponse } from '@/features/agent/types';

describe('Agent Response Normalizer', () => {
  it('passes through valid responses', () => {
    const raw = { type: "connect_required", provider: "microsoft", connect_url: "/url", message: "msg" };
    const normalized = normalizeAgentResponse(raw);
    expect(normalized).toEqual(raw);
  });
});
