import { describe, it, expect } from 'vitest';
import { getFriendlyErrorMessage, ApiError } from '@/lib/api/errors';

describe('Error Normalizer', () => {
  it('handles MICROSOFT_NOT_CONNECTED', () => {
    const error = new ApiError({
      status: "error",
      error: { code: "MICROSOFT_NOT_CONNECTED", message: "Raw message" }
    });
    expect(getFriendlyErrorMessage(error)).toBe("Connect Microsoft 365 to unlock Outlook, Calendar, and OneDrive data.");
  });

  it('handles UNAUTHENTICATED', () => {
    const error = new ApiError({
      status: "error",
      error: { code: "UNAUTHENTICATED", message: "Raw message" }
    });
    expect(getFriendlyErrorMessage(error)).toBe("Please sign in.");
  });

  it('falls back to error message', () => {
    const error = new ApiError({
      status: "error",
      error: { code: "UNKNOWN_CODE", message: "Custom failure" }
    });
    expect(getFriendlyErrorMessage(error)).toBe("Custom failure");
  });
});
