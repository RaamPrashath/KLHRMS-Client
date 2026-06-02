/**
 * Browser-facing FastAPI API root.
 */

import { getHrmsApiUrl } from "@/lib/deployment-env";

export const baseUrl = `${getHrmsApiUrl()}/api/v1`;
