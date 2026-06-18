import { afterEach, describe, expect, it, vi } from "vitest";

import { getHrmsApiUrl } from "@/lib/deployment-env";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getHrmsApiUrl", () => {
  it("uses the public browser API URL when present", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("HRMS_API_URL", "http://server-only.example.test");
    vi.stubEnv("NEXT_PUBLIC_HRMS_API_URL", "http://localhost:8000/");

    expect(getHrmsApiUrl()).toBe("http://localhost:8000");
  });

  it("does not silently fall back to a deployed API in browser production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("HRMS_API_URL", "http://server-only.example.test");
    vi.stubEnv("NEXT_PUBLIC_HRMS_API_URL", "");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "");

    expect(() => getHrmsApiUrl()).toThrow("NEXT_PUBLIC_HRMS_API_URL");
  });
});
