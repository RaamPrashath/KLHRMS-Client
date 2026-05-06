export function getLeaveErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback;
  try {
    const parsed = JSON.parse(error.message) as { message?: string };
    return parsed.message || error.message || fallback;
  } catch {
    return error.message || fallback;
  }
}
