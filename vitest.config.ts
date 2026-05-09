import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        globals: true,
        environment: "jsdom",
        setupFiles: "./vitest.setup.ts",
        // ts-morph project initialisation in tests/GenerateWebTypes.test.ts can
        // exceed the 5s vitest default, especially under coverage instrumentation.
        testTimeout: 30000,
    },
});
