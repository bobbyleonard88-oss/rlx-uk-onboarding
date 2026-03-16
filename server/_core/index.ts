import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import multer from "multer";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { storagePut } from "../storage";
import { htmlToPdf } from "../pdfGenerator";
import { matchProgress as matchProgressEmitter } from "../matchProgress";

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
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // Logo upload endpoint (multipart/form-data)
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
  app.post("/api/upload-logo", upload.single("logo"), async (req, res) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "No file provided" });
        return;
      }
      const ext = req.file.originalname.split(".").pop() || "png";
      const safeName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
      const key = `sponsor-logos/${Date.now()}-${safeName}`;
      const { url } = await storagePut(key, req.file.buffer, req.file.mimetype);
      res.json({ url });
    } catch (err: any) {
      console.error("Logo upload error:", err);
      res.status(500).json({ error: err.message || "Upload failed" });
    }
  });

  // PDF generation endpoint — accepts HTML body, returns PDF file
  app.post("/api/generate-pdf", async (req, res) => {
    try {
      // Verify session cookie so only authenticated users can generate PDFs
      // Parse cookies manually since cookie-parser may not be registered
      const cookieHeader = req.headers.cookie || '';
      const hasSession = cookieHeader.includes('app_session_id=');
      if (!hasSession) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const { html, filename } = req.body as { html: string; filename?: string };
      if (!html) {
        res.status(400).json({ error: "html is required" });
        return;
      }
      const pdfBuffer = await htmlToPdf(html);
      const safeName = (filename || 'delegate-profile').replace(/[^a-zA-Z0-9_-]/g, '_');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${safeName}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.end(pdfBuffer);
    } catch (err: any) {
      console.error('PDF generation error:', err);
      res.status(500).json({ error: err.message || 'PDF generation failed' });
    }
  });

  // SSE endpoint for Match All Sponsors live progress
  // matchProgress is imported at the top of the file
  app.get('/api/match-progress', (req, res) => {
    // Verify session cookie — only authenticated users can subscribe
    const cookieHeader = req.headers.cookie || '';
    if (!cookieHeader.includes('app_session_id=')) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
    res.flushHeaders();

    // Send initial heartbeat
    res.write('data: {"type":"connected"}\n\n');

    const onProgress = (event: unknown) => {
      try {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      } catch (_) {}
    };

    matchProgressEmitter.on('progress', onProgress);

    // Keep alive ping every 15s
    const pingInterval = setInterval(() => {
      try { res.write(': ping\n\n'); } catch (_) { clearInterval(pingInterval); }
    }, 15000);

    req.on('close', () => {
      clearInterval(pingInterval);
      matchProgressEmitter.off('progress', onProgress);
    });
  });

  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
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
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
