import { protectedProcedure } from "../../../create-context";
import { SystemUser } from "@/constants/types";

const USERS_STORAGE_KEY = "system_users";

export const getUsersProcedure = protectedProcedure.query(async ({ ctx }) => {
  console.log("[Backend Auth] Getting all users");

  const usersData = await ctx.kv.get(USERS_STORAGE_KEY);

  if (!usersData) {
    return [];
  }

  const users: SystemUser[] = JSON.parse(usersData as string);

  return users;
});

export default getUsersProcedure;
