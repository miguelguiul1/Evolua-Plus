import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const supabaseHost = (() => {
    try {
      const value = loadEnv(mode, process.cwd(), "").VITE_SUPABASE_URL;
      return value ? new URL(value).hostname : null;
    } catch {
      return null;
    }
  })();

  return {
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
    },
    base: "./",
    plugins: [
      react(),
      mode === "development" && componentTagger(),
      supabaseHost
        ? {
            name: "preconnect:supabase",
            transformIndexHtml(html: string) {
              return html.replace(
                "</head>",
                `    <link rel="preconnect" href="https://${supabaseHost}" />\n  </head>`
              );
            },
          }
        : null,
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["favicon.ico", "favicon.png", "robots.txt", "apple-touch-icon.png"],
        manifestFilename: "manifest.json",
        manifest: {
          name: "Evolua Plus",
          short_name: "Evolua+",
          description:
            "Receba um plano alimentar personalizado em menos de 2 minutos. IA que adapta refeições ao seu objetivo, restrições e rotina.",
          lang: "pt-BR",
          theme_color: "#2D6A4F",
          background_color: "#2D6A4F",
          display: "standalone",
          start_url: "/",
          scope: "/",
          icons: [
            { src: "pwa-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
            { src: "pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
            {
              src: "maskable-icon-512x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
        },
        workbox: {
          // Shell do app (HTML/JS/CSS/imagens/fonts do build): fica disponível offline após a 1ª visita.
          globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,woff,woff2}"],
          navigateFallback: "/index.html",
          // Supabase (auth/rest/edge functions) nunca deve ser servido do cache.
          // Precisa ser RegExp literal (não uma closure sobre `supabaseHost`): o workbox
          // serializa este valor como texto dentro do service worker, onde a variável
          // do vite.config.ts não existe.
          runtimeCaching: supabaseHost
            ? [
                {
                  urlPattern: new RegExp(`^https://${supabaseHost}/`),
                  handler: "NetworkOnly",
                },
              ]
            : [],
        },
      }),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ["react", "react-dom", "react-router-dom", "@tanstack/react-query", "lucide-react"],
          },
        },
      },
    },
  };
});
