import { z } from "zod";
import { protectedProcedure } from "../../../create-context";
import { SystemUser } from "@/constants/types";

const USERS_STORAGE_KEY = "system_users";

export const deleteUserProcedure = protectedProcedure
  .input(
    z.object({
      userId: z.string(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log("[Backend Auth] Deleting user:", input.userId);

    const usersData = await ctx.kv.get(USERS_STORAGE_KEY);
    if (!usersData) {
      return {
        success: false,
        message: "No users found",
      };
    }

    const users: SystemUser[] = JSON.parse(usersData as string);

    const userToDelete = users.find((u) => u.id === input.userId);
    if (!userToDelete) {
      return {
        success: false,
        message: "User not found",
      };
    }

    if (userToDelete.role === "super_admin") {
      return {
        success: false,
        message: "Cannot delete super admin account",
      };
    }

    const updatedUsers = users.filter((user) => user.id !== input.userId);
    await ctx.kv.set(USERS_STORAGE_KEY, JSON.stringify(updatedUsers));

    console.log("[Backend Auth] User deleted:", input.userId);

    return {
      success: true,
      message: "User deleted successfully",
    };
  });

export default deleteUserProcedure;
