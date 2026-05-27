import { vitePlugin as remix } from "@remix-run/dev";
import { installGlobals } from "@remix-run/node";
import { defineConfig } from "vite";
import { vercelPreset } from "@vercel/remix/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";

installGlobals();

export default defineConfig({
  plugins: [
    remix({ presets: [vercelPreset()] }),
    tsconfigPaths(),
    tailwindcss(),
  ],
  server: {
    // devcontainer内から 127.0.0.1:54321 は不達のため、
    // ブラウザ→Vite dev server→supabase_kong とプロキシする
    proxy: {
      "/rest/v1": {
        target: "http://supabase_kong_drink-counter:8000",
        changeOrigin: true,
      },
      "/auth/v1": {
        target: "http://supabase_kong_drink-counter:8000",
        changeOrigin: true,
      },
      "/storage/v1": {
        target: "http://supabase_kong_drink-counter:8000",
        changeOrigin: true,
      },
      "/realtime/v1": {
        target: "ws://supabase_kong_drink-counter:8000",
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
