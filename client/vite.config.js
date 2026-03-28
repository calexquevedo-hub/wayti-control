import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { execSync } from "child_process";
var commitHash = execSync("git rev-parse --short HEAD").toString().trim();
export default defineConfig({
    plugins: [react()],
    define: {
        __APP_BUILD_TIME__: JSON.stringify(new Date().toISOString()),
        __APP_VERSION__: JSON.stringify(commitHash),
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    server: {
        port: 5174,
    },
});
