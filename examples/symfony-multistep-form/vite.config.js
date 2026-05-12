import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import symfonyPlugin from "vite-plugin-symfony";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
    plugins: [react(), tailwindcss(), symfonyPlugin()],
    build: {
        rollupOptions: {
            input: {
                app: "./assets/app.tsx",
            },
        },
    },
});
