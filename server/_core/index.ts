import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerGmailRoutes } from "./gmail";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { setupSecurityMiddlewares } from "./security";
import { apiLimiter, authLimiter } from "./rateLimiting";
import { logger } from "./logger";
import { uploadRouter } from "../upload";
import { handleStripeWebhook } from "../services/stripeWebhook";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Trust proxy - necesario para deployments detrás de proxies reversos (Render, Vercel, etc.)
  app.set('trust proxy', 1);

  // Security middlewares (helmet, CORS, etc.)
  setupSecurityMiddlewares(app);

  // Stripe webhook needs the raw body for signature verification
  app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    try {
      const signature = req.headers["stripe-signature"];
      const payload = req.body as Buffer;
      const result = await handleStripeWebhook(payload, Array.isArray(signature) ? signature[0] : signature);
      res.status(200).json(result);
    } catch (error) {
      logger.error("[Stripe] Webhook error", error);
      res.status(400).json({ error: "Webhook Error" });
    }
  });

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.status(200).json({
      status: "ok",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
    });
  });

  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  registerGmailRoutes(app);

  // Upload routes (must be before tRPC to handle multipart/form-data)
  app.use("/api/upload", uploadRouter);

  // tRPC API with rate limiting
  app.use(
    "/api/trpc",
    apiLimiter, // Rate limit general para API
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    logger.warn(`Port ${preferredPort} is busy, using port ${port} instead`, { preferredPort, actualPort: port });
  }

  server.listen(port, () => {
    logger.info(`Server running on http://localhost:${port}/`, {
      port,
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
    });
  });
}

startServer().catch((error) => {
  logger.error('Failed to start server', error);
  process.exit(1);
});
