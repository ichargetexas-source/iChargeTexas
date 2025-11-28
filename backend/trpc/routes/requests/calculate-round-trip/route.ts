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

export const calculateRoundTripProcedure = publicProcedure
  .input(
    z.object({
      requestId: z.string().min(1, "Request ID is required"),
      acceptorCoordinates: z.object({
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
      }),
      tenantId: z.string().optional(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    console.log(
      `[Calculate Round Trip] Processing for request ${input.requestId}`
    );
    console.log(
      `[Calculate Round Trip] Acceptor coordinates: ${input.acceptorCoordinates.latitude.toFixed(6)}, ${input.acceptorCoordinates.longitude.toFixed(6)}`
    );

    const storageKey = input.tenantId
      ? `tenant:${input.tenantId}:requests`
      : "service_requests";

    console.log(`[Calculate Round Trip] Fetching from storage key: ${storageKey}`);
    const requests = (await ctx.kv.getJSON<any[]>(storageKey)) || [];
    const request = requests.find((r) => r.id === input.requestId);

    if (!request) {
      console.error(`[Calculate Round Trip] Request ${input.requestId} not found in ${requests.length} requests`);
      throw new Error("Request not found");
    }

    if (!request.location || typeof request.location.latitude !== "number" || typeof request.location.longitude !== "number") {
      console.error(
        `[Calculate Round Trip] Invalid request location for ${input.requestId}:`,
        request.location
      );
      throw new Error("Invalid request location data");
    }

    if (
      Math.abs(request.location.latitude) > 90 ||
      Math.abs(request.location.longitude) > 180
    ) {
      console.error(
        `[Calculate Round Trip] Request coordinates out of range: ${request.location.latitude}, ${request.location.longitude}`
      );
      throw new Error("Request coordinates are out of valid range");
    }

    console.log(
      `[Calculate Round Trip] Request location: ${request.location.latitude.toFixed(6)}, ${request.location.longitude.toFixed(6)}`
    );

    const oneWayDistanceInKm = calculateHaversineDistance(
      request.location.latitude,
      request.location.longitude,
      input.acceptorCoordinates.latitude,
      input.acceptorCoordinates.longitude
    );

    const roundTripDistanceInKm = oneWayDistanceInKm * 2;
    const oneWayDistanceInMiles = oneWayDistanceInKm * 0.621371;
    const roundTripDistanceInMiles = roundTripDistanceInKm * 0.621371;

    console.log(
      `[Calculate Round Trip] ✅ One-way distance: ${oneWayDistanceInKm.toFixed(2)} km (${oneWayDistanceInMiles.toFixed(2)} miles)`
    );
    console.log(
      `[Calculate Round Trip] ✅ Round trip distance: ${roundTripDistanceInKm.toFixed(2)} km (${roundTripDistanceInMiles.toFixed(2)} miles)`
    );

    return {
      requestId: input.requestId,
      requestLocation: {
        latitude: request.location.latitude,
        longitude: request.location.longitude,
        address: request.location.address,
      },
      acceptorLocation: {
        latitude: input.acceptorCoordinates.latitude,
        longitude: input.acceptorCoordinates.longitude,
      },
      oneWayDistance: {
        kilometers: parseFloat(oneWayDistanceInKm.toFixed(2)),
        miles: parseFloat(oneWayDistanceInMiles.toFixed(2)),
      },
      roundTripDistance: {
        kilometers: parseFloat(roundTripDistanceInKm.toFixed(2)),
        miles: parseFloat(roundTripDistanceInMiles.toFixed(2)),
      },
    };
  });
