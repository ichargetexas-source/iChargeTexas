import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { ServiceRequest, JobAcceptanceLog } from "@/constants/types";

export const acceptJobProcedure = publicProcedure
  .input(
    z.object({
      requestId: z.string().min(1, "Request ID is required"),
      acceptorCoordinates: z.object({
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        accuracy: z.number().optional(),
      }),
      acceptedBy: z.object({
        id: z.string().optional(),
        name: z.string().optional(),
        role: z.enum(["super_admin", "admin", "worker", "user"]).optional(),
      }).optional(),
      platform: z.enum(["ios", "android", "web", "windows", "macos", "unknown"]).optional(),
      tenantId: z.string().optional(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    console.log(`[Accept Job] Accepting job ${input.requestId}`);

    const storageKey = input.tenantId
      ? `tenant:${input.tenantId}:requests`
      : "service_requests";

    const requests = (await ctx.kv.getJSON<ServiceRequest[]>(storageKey)) || [];
    const requestIndex = requests.findIndex((r) => r.id === input.requestId);

    if (requestIndex === -1) {
      console.error(`[Accept Job] Request ${input.requestId} not found`);
      throw new Error("Request not found");
    }

    const acceptanceLog: JobAcceptanceLog = {
      id: `acceptance-${Date.now()}`,
      acceptedAt: new Date().toISOString(),
      acceptedBy: input.acceptedBy,
      coordinates: {
        latitude: input.acceptorCoordinates.latitude,
        longitude: input.acceptorCoordinates.longitude,
        accuracy: input.acceptorCoordinates.accuracy || null,
      },
      platform: input.platform || "unknown",
    };

    if (!requests[requestIndex].acceptanceLogs) {
      requests[requestIndex].acceptanceLogs = [];
    }
    requests[requestIndex].acceptanceLogs!.push(acceptanceLog);
    requests[requestIndex].status = "scheduled";

    await ctx.kv.setJSON(storageKey, requests);

    console.log(`[Accept Job] ✅ Job accepted: ${input.requestId}`);

    return {
      success: true,
      request: requests[requestIndex],
      acceptanceLog,
    };
  });
