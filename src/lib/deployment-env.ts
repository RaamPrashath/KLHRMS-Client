const LOCAL_API_URL = "http://localhost:8000";
const DEPLOYED_API_URL = "https://klhrms-server.onrender.com";

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function withProtocol(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function getHrmsApiUrl(): string {
  const configured =
    process.env.HRMS_API_URL ||
    process.env.NEXT_PUBLIC_HRMS_API_URL ||
    process.env.NEXT_PUBLIC_API_URL;

  return stripTrailingSlash(
    configured || (process.env.NODE_ENV === "production" ? DEPLOYED_API_URL : LOCAL_API_URL),
  );
}

export function getPublicAppUrl(): string {
  const configured =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.BETTER_AUTH_URL ||
    withProtocol(process.env.VERCEL_PROJECT_PRODUCTION_URL) ||
    withProtocol(process.env.VERCEL_URL);

  return stripTrailingSlash(
    configured || (process.env.NODE_ENV === "production" ? "https://klhrms.vercel.app" : "http://localhost:3000"),
  );
}

export function getAuthAllowedHosts(): string[] {
  const configured = process.env.BETTER_AUTH_ALLOWED_HOSTS?.split(",") ?? [];
  return Array.from(
    new Set(
      [
        "localhost:3000",
        "localhost",
        "127.0.0.1:3000",
        "127.0.0.1",
        "*.vercel.app",
        "klhrms.vercel.app",
        ...configured,
      ]
        .map((host) => host.trim())
        .filter(Boolean),
    ),
  );
}

export function getTrustedOrigins(): string[] {
  const configured =
    process.env.BETTER_AUTH_TRUSTED_ORIGINS ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.BETTER_AUTH_URL ||
    "";

  return Array.from(
    new Set(
      [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://*.vercel.app",
        "https://klhrms.vercel.app",
        ...configured.split(","),
      ]
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),
  );
}
