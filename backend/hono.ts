import { Hono } from "hono";
import { trpcServer } from "@hono/trpc-server";
import { cors } from "hono/cors";
import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";

const app = new Hono();

app.use("*", cors());

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

app.use(
  "/api/trpc/*",
  trpcServer({
    router: appRouter,
    createContext,
    endpoint: "/api/trpc",
    onError({ error, type, path, input, ctx, req }) {
      console.error("[tRPC Error]", {
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
  return c.json({ error: "Not found", success: false }, 404);
});

export default app;
