import { setupServer } from "msw/node";
import { assetManagementHandlers } from "./asset-management-handlers";
import { attendanceHandlers } from "./attendance-handlers";
import { authHandlers } from "./auth-handlers";
import { coreModuleHandlers } from "./core-modules-handlers";
import { recruitmentHandlers } from "./recruitment-handlers";

export const authServer = setupServer(
    ...authHandlers,
    ...attendanceHandlers,
    ...recruitmentHandlers,
    ...assetManagementHandlers,
    ...coreModuleHandlers,
);
