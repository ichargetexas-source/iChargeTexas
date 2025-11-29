import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import app from "../backend/hono";
import { appRouter } from "../backend/trpc/app-router";
import { createContext } from "../backend/trpc/create-context";
import { ensureSeedReady } from "../backend/seed";

console.log("[API Route] Loading edge function");

export const config = {
  runtime: "edge",
};

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Tenant-Id",
  "Access-Control-Max-Age": "86400",
};

const withCors = (response: Response) => {
  const headers = new Headers(response.headers);
  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    headers.set(key, value);
  });
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};

const handleTrpcRequest = async (req: Request) => {
  console.log(`[API Route Handler] Direct tRPC handling for ${req.url}`);
  await ensureSeedReady();
  const response = await fetchRequestHandler({
  endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext,
    onError({ path, error }) {
      console.error("[API Route Handler] tRPC error", {
        path,
        message: error.message,
        code: error.code,
      });
    },
  });
  return withCors(response);
};

const handler = async (req: Request) => {
  const url = new URL(req.url);
  console.log(`[API Route Handler] ${req.method} ${url.pathname}`);
  console.log(`[API Route Handler] Full URL: ${req.url}`);
  console.log(`[API Route Handler] Headers:`, Object.fromEntries(req.headers.entries()));
  
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: CORS_HEADERS,
    });
  }

  if (url.pathname.startsWith("/api/trpc")) {
    return handleTrpcRequest(req);
  }
  
  try {
    const response = await app.fetch(req);
    console.log(`[API Route Handler] Response status: ${response.status}`);
    return withCors(response);
  } catch (error) {
    console.error("[API Route Handler] Error:", error);
    console.error("[API Route Handler] Error stack:", error instanceof Error ? error.stack : 'N/A');
    return new Response(JSON.stringify({ error: "Internal server error", message: String(error) }), {
      status: 500,
      headers: { 
        "Content-Type": "application/json",
        ...CORS_HEADERS,
      },
    });
  }
};

export default handler;
export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const PATCH = handler;
export const OPTIONS = handler;
export const HEAD = handler;
