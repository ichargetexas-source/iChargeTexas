import { Hono } from "hono";
import { trpcServer } from "@hono/trpc-server";
import { cors } from "hono/cors";
import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";

const app = new Hono();

app.use("*", cors());

// Log all incoming requests for debugging
app.use("*", async (c, next) => {
  console.log(`[Hono Incoming] ${c.req.method} ${c.req.url}`);
  await next();
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

// Support standard path with /api prefix
app.use(
  "/api/trpc/*",
  trpcServer({
    router: appRouter,
    createContext,
    endpoint: "/api/trpc",
    onError({ error, type, path, input, ctx, req }) {
      console.error("[tRPC Error /api/trpc]", {
        type,
        path,
        error: error.message,
        code: error.code,
      });
    },
  })
);

// Support path without /api prefix (in case host strips it)
app.use(
  "/trpc/*",
  trpcServer({
    router: appRouter,
    createContext,
    endpoint: "/trpc",
    onError({ error, type, path, input, ctx, req }) {
      console.error("[tRPC Error /trpc]", {
        type,
        path,
        error: error.message,
        code: error.code,
      });
    },
  })
);

app.get("/", (c) => {
  return c.json({ status: "ok", message: "API is running" });
});

app.notFound((c) => {
  console.log(`[Hono 404] Route not found: ${c.req.method} ${c.req.url}`);
  return c.json({ error: "Not found", success: false }, 404);
});

export default app;
