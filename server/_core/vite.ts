import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  // Intentamos varias rutas comunes para dist/public según dónde se ejecute el bundle
  const candidatePaths = [
    // Expected cuando se ejecuta dist/index.js (dirname = dist)
    path.resolve(import.meta.dirname, "public"),
    // Por si el cwd es la raíz del repo sin /src
    path.resolve(process.cwd(), "dist", "public"),
    // Por si el cwd incluye /src
    path.resolve(process.cwd(), "src", "dist", "public"),
  ];

  const distPath = candidatePaths.find((p) => fs.existsSync(p));

  if (!distPath) {
    console.error(
      `[Static] Could not find the build directory in any of: ${candidatePaths.join(
        ", "
      )}. Did you run "pnpm build" before starting the server?`
    );
    // fallback to first candidate to avoid crash; responses will 404
    candidatePaths[0] && app.use(express.static(candidatePaths[0]));
    app.use("*", (_req, res) => res.status(500).send("Build not found"));
    return;
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
