import "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll } from "vitest";
import { cleanup } from "@testing-library/react";
import { authServer } from "./src/test/msw/server";

beforeAll(() => {
    authServer.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
    authServer.resetHandlers();
    cleanup();
});

afterAll(() => {
    authServer.close();
});
