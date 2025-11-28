import { protectedProcedure } from "../../../create-context";
import { kv } from "../../../../storage";
import { TRPCError } from "@trpc/server";

const SUPER_ADMIN_ID = "super_admin_001";

interface CredentialLog {
  id: string;
  username: string;
  password: string;
  role: string;
  createdAt: string;
  createdBy: string;
  createdById: string;
}

interface Employee {
  id: string;
  role: string;
}

export const getCredentialLogsProcedure = protectedProcedure
  .query(async ({ ctx }) => {
    // Permission Check
    if (ctx.userId !== SUPER_ADMIN_ID) {
      const globalEmployees = await kv.getJSON<Employee[]>("employees") || [];
      const tenantEmployees = ctx.tenantId ? await kv.getJSON<Employee[]>(`tenant:${ctx.tenantId}:users`) || [] : [];
      
      const requestor = globalEmployees.find(e => e.id === ctx.userId) || tenantEmployees.find(e => e.id === ctx.userId);
      
      if (!requestor || (requestor.role !== "admin" && requestor.role !== "super_admin")) {
         throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only administrators can view credential logs",
        });
      }
    }

    const credentialKey = ctx.tenantId ? `tenant:${ctx.tenantId}:credential_logs` : "credential_logs";
    const logs = await kv.getJSON<CredentialLog[]>(credentialKey) || [];

    // Filter logs: Super Admin sees all, Admin sees only what they created
    if (ctx.userId === SUPER_ADMIN_ID) {
      return logs;
    } else {
      return logs.filter(log => log.createdById === ctx.userId);
    }
  });
