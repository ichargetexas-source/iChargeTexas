import { z } from "zod";
import { publicProcedure } from "../../../create-context";
import { ServiceRequest } from "@/constants/types";

export const createTestJobProcedure = publicProcedure
  .input(
    z.object({
      tenantId: z.string().optional(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    console.log(`[Create Test Job] Creating test job`);

    const storageKey = input.tenantId
      ? `tenant:${input.tenantId}:requests`
      : "service_requests";

    const requests = (await ctx.kv.getJSON<ServiceRequest[]>(storageKey)) || [];

    const testJob: ServiceRequest = {
      id: `test-job-${Date.now()}`,
      tenantId: input.tenantId,
      type: "roadside",
      name: "Test Customer",
      phone: "555-0123",
      email: "test@example.com",
      title: "Test Job - Tire Change",
      description: "Test job for mileage calculation",
      location: {
        latitude: 30.2672,
        longitude: -97.7431,
        address: "Austin, TX",
      },
      vehicleInfo: "2020 Toyota Camry",
      hasSpareTire: true,
      status: "pending",
      createdAt: new Date().toISOString(),
      acceptanceLogs: [],
    };

    requests.push(testJob);
    await ctx.kv.setJSON(storageKey, requests);

    console.log(`[Create Test Job] ✅ Test job created: ${testJob.id}`);

    return testJob;
  });
