import app from "../backend/hono";

console.log("[API Route] Loading edge function");

export const config = {
  runtime: "edge",
};

const handler = app.fetch;

export default handler;
export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const PATCH = handler;
export const OPTIONS = handler;
