import { z } from "zod";
import { protectedProcedure } from "../../../create-context";
import { SystemUser } from "@/constants/types";

const USERS_STORAGE_KEY = "system_users";

export const updateUserProcedure = protectedProcedure
  .input(
    z.object({
      userId: z.string(),
      updates: z.object({
        username: z.string().optional(),
        password: z.string().optional(),
        fullName: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        role: z.enum(["super_admin", "admin", "worker", "user"]).optional(),
        isActive: z.boolean().optional(),
        permissions: z
          .object({
            canManageUsers: z.boolean(),
            canViewReports: z.boolean(),
            canHandleRequests: z.boolean(),
            canCreateInvoices: z.boolean(),
            canViewCustomerInfo: z.boolean(),
            canDeleteData: z.boolean(),
          })
          .optional(),
      }),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log("[Backend Auth] Updating user:", input.userId);

    const usersData = await ctx.kv.get(USERS_STORAGE_KEY);
    if (!usersData) {
      return {
        success: false,
        message: "No users found",
      };
    }

    const users: SystemUser[] = JSON.parse(usersData as string);
    const updatedUsers = users.map((user) =>
      user.id === input.userId ? { ...user, ...input.updates } : user
    );

    await ctx.kv.set(USERS_STORAGE_KEY, JSON.stringify(updatedUsers));

    console.log("[Backend Auth] User updated:", input.userId);

    return {
      success: true,
      message: "User updated successfully",
    };
  });

export default updateUserProcedure;
