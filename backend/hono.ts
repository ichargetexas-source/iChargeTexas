import { Hono } from "hono";
import { trpcServer } from "@hono/trpc-server";
import { cors } from "hono/cors";
import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";
import { ensureSeedReady } from "./seed";

const app = new Hono();

app.use("*", cors({
  origin: "*",
  allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization", "X-Tenant-Id"],
  exposeHeaders: ["Content-Length"],
  maxAge: 86400,
  credentials: true,
}));

// Log all incoming requests for debugging
app.use("*", async (c, next) => {
  console.log(`[Hono Incoming] ${c.req.method} ${c.req.path}`);
  console.log(`[Hono Incoming] Full URL: ${c.req.url}`);
  await next();
});

// Middleware to ensure seed runs before requests
app.use("*", async (c, next) => {
  try {
    await ensureSeedReady();
  } catch (err) {
    console.error("[Seed] Failed to seed data", err);
  }
  return next();
});

app.onError((err, c) => {
  console.error("[Hono Error]", err);
  return c.json(
    {
      error: err.message || "Internal server error",
      success: false,
    },
    500
  );
});

console.log("[Hono] Setting up tRPC middleware");
console.log("[Hono] AppRouter loaded with routes:", Object.keys(appRouter._def?.procedures || {}));

const procedures = appRouter._def.procedures as any;
for (const [key, value] of Object.entries(procedures)) {
  if (value && typeof value === 'object' && '_def' in value) {
    const router = value as any;
    if (router._def && router._def.procedures) {
      console.log(`[Hono] Router '${key}' has procedures:`, Object.keys(router._def.procedures));
      
      for (const procKey of Object.keys(router._def.procedures)) {
        const proc = router._def.procedures[procKey];
        console.log(`[Hono]   - ${key}.${procKey}: type=${proc?._def?.type}, exists=${!!proc}`);
      }
    }
  }
}

console.log("[Hono] Checking specific auth procedures:");
if (procedures.auth && procedures.auth._def && procedures.auth._def.procedures) {
  console.log("[Hono] auth.getEmployees exists:", !!procedures.auth._def.procedures.getEmployees);
  console.log("[Hono] auth.getCredentialLogs exists:", !!procedures.auth._def.procedures.getCredentialLogs);
  console.log("[Hono] auth.createEmployee exists:", !!procedures.auth._def.procedures.createEmployee);
}

// Handle tRPC requests at /api/trpc with both POST and GET
const trpcHandler = trpcServer({
  router: appRouter,
  createContext,
  onError({ error, type, path, input, ctx, req }) {
    console.error("[tRPC Error]", {
      type,
      path,
      error: error.message,
      code: error.code,
      stack: error.stack,
    });
  },
});

app.use("/api/trpc/*", async (c, next) => {
  console.log(`[tRPC Middleware] Handling request: ${c.req.method} ${c.req.path}`);
  console.log(`[tRPC Middleware] Full URL: ${c.req.url}`);
  console.log(`[tRPC Middleware] Content-Type: ${c.req.header('content-type')}`);
  return trpcHandler(c, next);
});

console.log("[Hono] tRPC middleware configured at /api/trpc/*");

app.get("/", (c) => {
  return c.json({ 
    status: "ok", 
    message: "Service Management API is running",
    timestamp: new Date().toISOString(),
    version: "1.0.1",
    build: "2025-01-29-fix",
    routes: {
      auth: Object.keys((appRouter._def.procedures as any).auth?._def?.procedures || {}),
      example: Object.keys((appRouter._def.procedures as any).example?._def?.procedures || {}),
      stripe: Object.keys((appRouter._def.procedures as any).stripe?._def?.procedures || {}),
    }
  });
});

app.get("/api/health", (c) => {
  return c.json({ 
    status: "healthy", 
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/debug/routes", (c) => {
  const procedures = appRouter._def.procedures as any;
  const debugInfo: Record<string, any> = {
    status: "ok",
    timestamp: new Date().toISOString(),
    routes: {},
    rawKeys: Object.keys(procedures || {}),
  };
  
  for (const [key, value] of Object.entries(procedures)) {
    if (value && typeof value === 'object' && '_def' in value) {
      const router = value as any;
      if (router._def && router._def.procedures) {
        debugInfo.routes[key] = Object.keys(router._def.procedures);
      }
    }
  }
  
  console.log("[Debug Routes] Returning:", JSON.stringify(debugInfo, null, 2));
  return c.json(debugInfo);
});

app.notFound((c) => {
  console.log(`[Hono 404] Route not found: ${c.req.method} ${c.req.path}`);
  return c.json({ error: "Not found", success: false, path: c.req.path }, 404);
});

export default app;
