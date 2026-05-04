/**
 * Single source of truth for the FastAPI backend URL.
 * This is the only file in the codebase that reads NEXT_PUBLIC_API_URL.
 */

export const baseUrl =
  (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000") + "/api/v1";
