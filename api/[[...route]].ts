import app from "../backend/hono";

export const config = {
  runtime: "edge",
};

export default app.fetch;
