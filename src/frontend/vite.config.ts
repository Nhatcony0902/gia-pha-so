import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, "..", "");
  const apiPort = env.API_PORT ?? "3000";

  return {
    envDir: "..",
    plugins: [tailwindcss(), react()],
    server: {
      port: Number(env.WEB_PORT ?? 5173),
      proxy: {
        "/api": `http://localhost:${apiPort}`,
      },
    },
  };
});
