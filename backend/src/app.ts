import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { categoriesRouter } from "./routes/categories.js";
import { healthRouter } from "./routes/health.js";
import { productsRouter } from "./routes/products.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendDist = path.resolve(here, "../../frontend/dist");

export function createApp() {
  const app = express();
  app.set("trust proxy", 1);
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'self'"],
          objectSrc: ["'none'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "blob:"],
          mediaSrc: ["'self'", "blob:"],
          workerSrc: ["'self'", "blob:"],
          connectSrc: ["'self'"],
        },
      },
    }),
  );
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || env.frontendOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(null, false);
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(
    rateLimit({
      windowMs: 60_000,
      max: 300,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        success: false,
        error: { message: "Çok fazla istek gönderildi. Lütfen biraz bekleyin.", code: "RATE_LIMIT" },
      },
    }),
  );
  app.use("/api/health", healthRouter);
  app.use("/api", (req, res, next) => {
    if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
      const origin = req.header("origin");
      const requestOrigin = `${req.protocol}://${req.get("host")}`;
      if (origin && !env.frontendOrigins.includes(origin) && origin !== requestOrigin) {
        res.status(403).json({
          success: false,
          error: { message: "İstek kaynağına izin verilmiyor.", code: "ORIGIN_FORBIDDEN" },
        });
        return;
      }
    }
    next();
  });
  app.use("/api/products", productsRouter);
  app.use("/api/categories", categoriesRouter);
  app.get("/health", (_req, res) => {
    res.json({ success: true, data: { api: true } });
  });
  if (env.nodeEnv === "production" && existsSync(frontendDist)) {
    app.use(express.static(frontendDist));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api")) {
        next();
        return;
      }
      res.sendFile(path.join(frontendDist, "index.html"));
    });
  }
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
