import { z } from "zod";
import { protectedProcedure } from "../../../create-context";
import { kv } from "../../../../storage";

interface AuditLogEntry {
  id: string;
  timestamp: string;
  username: string;
  action: "login_success" | "login_failed" | "logout" | "user_created" | "user_updated" | "password_changed";
  ipAddress?: string;
  userAgent?: string;
  details?: string;
  userId?: string;
}

export const getAuditLogsProcedure = protectedProcedure
  .input(
    z.object({
      limit: z.number().optional().default(100),
      action: z.enum(["login_success", "login_failed", "logout", "user_created", "user_updated", "password_changed"]).optional(),
      username: z.string().optional(),
    })
  )
  .query(async ({ input }) => {
    const auditLogs = await kv.getJSON<AuditLogEntry[]>("audit_logs") || [];
    
    let filteredLogs = auditLogs;

    if (input.action) {
      filteredLogs = filteredLogs.filter((log) => log.action === input.action);
    }

    if (input.username) {
      filteredLogs = filteredLogs.filter((log) => 
        log.username.toLowerCase().includes(input.username!.toLowerCase())
      );
    }

    const sortedLogs = filteredLogs.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return sortedLogs.slice(0, input.limit);
  });
