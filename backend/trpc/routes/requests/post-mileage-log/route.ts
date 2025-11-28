import { z } from "zod";
import { publicProcedure } from "../../../create-context";

function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

export const postMileageLogProcedure = publicProcedure
  .input(
    z.object({
      requestId: z.string().min(1, "Request ID is required"),
      jobName: z.string().min(1, "Job name is required"),
      referenceNumber: z.string().min(1, "Reference number is required"),
      acceptorCoordinates: z.object({
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
      }),
      isRoundTrip: z.boolean().default(true),
      tenantId: z.string().optional(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    console.log(
      `[Post Mileage Log] Creating mileage log for request ${input.requestId}`
    );

    const storageKey = input.tenantId
      ? `tenant:${input.tenantId}:requests`
      : "service_requests";

    const requests = (await ctx.kv.getJSON<any[]>(storageKey)) || [];
    const request = requests.find((r) => r.id === input.requestId);

    if (!request) {
      console.error(`[Post Mileage Log] Request ${input.requestId} not found`);
      throw new Error("Request not found");
    }

    if (
      !request.location ||
      typeof request.location.latitude !== "number" ||
      typeof request.location.longitude !== "number"
    ) {
      console.error(
        `[Post Mileage Log] Invalid request location for ${input.requestId}:`,
        request.location
      );
      throw new Error("Invalid request location data");
    }

    const oneWayDistanceInKm = calculateHaversineDistance(
      request.location.latitude,
      request.location.longitude,
      input.acceptorCoordinates.latitude,
      input.acceptorCoordinates.longitude
    );

    const distanceInKm = input.isRoundTrip
      ? oneWayDistanceInKm * 2
      : oneWayDistanceInKm;
    const distanceInMiles = distanceInKm * 0.621371;

    const mileageLogEntry = {
      id: `mileage-${Date.now()}`,
      requestId: input.requestId,
      jobName: input.jobName,
      referenceNumber: input.referenceNumber,
      requestLocation: {
        latitude: request.location.latitude,
        longitude: request.location.longitude,
        address: request.location.address,
      },
      acceptorLocation: {
        latitude: input.acceptorCoordinates.latitude,
        longitude: input.acceptorCoordinates.longitude,
      },
      distance: {
        kilometers: parseFloat(distanceInKm.toFixed(2)),
        miles: parseFloat(distanceInMiles.toFixed(2)),
      },
      isRoundTrip: input.isRoundTrip,
      createdAt: new Date().toISOString(),
    };

    const mileageLogsKey = input.tenantId
      ? `tenant:${input.tenantId}:mileage_logs`
      : "mileage_logs";

    const mileageLogs = (await ctx.kv.getJSON<any[]>(mileageLogsKey)) || [];
    mileageLogs.push(mileageLogEntry);
    await ctx.kv.setJSON(mileageLogsKey, mileageLogs);

    console.log(
      `[Post Mileage Log] ✅ Mileage log created: ${mileageLogEntry.id}`
    );
    console.log(
      `[Post Mileage Log] Distance: ${distanceInKm.toFixed(2)} km (${distanceInMiles.toFixed(2)} miles) - ${input.isRoundTrip ? "Round Trip" : "One Way"}`
    );

    return mileageLogEntry;
  });
