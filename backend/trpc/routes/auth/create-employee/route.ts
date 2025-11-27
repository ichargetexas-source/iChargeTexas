import { z } from "zod";
import { protectedProcedure } from "../../../create-context";
import { kv } from "../../../../storage";
import { TRPCError } from "@trpc/server";

interface Employee {
  id: string;
  username: string;
  passwordHash: string;
  role: "admin" | "employee";
  fullName: string;
  email: string;
  phone: string;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
  createdBy: string;
  permissions: {
    canManageUsers: boolean;
    canViewReports: boolean;
    canHandleRequests: boolean;
    canCreateInvoices: boolean;
    canViewCustomerInfo: boolean;
    canDeleteData: boolean;
  };
}

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

async function logAuditEntry(entry: Omit<AuditLogEntry, "id" | "timestamp">) {
  const auditEntry: AuditLogEntry = {
    id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    ...entry,
  };

  const existingLogs = await kv.getJSON<AuditLogEntry[]>("audit_logs") || [];
  existingLogs.push(auditEntry);
  
  const last1000Logs = existingLogs.slice(-1000);
  await kv.setJSON("audit_logs", last1000Logs);
  
  console.log(`[Audit Log] ${auditEntry.action} - ${auditEntry.username} at ${auditEntry.timestamp}`);
}

async function hashPassword(password: string): Promise<string> {
  return `hashed_${password}`;
}

export const createEmployeeProcedure = protectedProcedure
  .input(
    z.object({
      username: z.string().min(3),
      password: z.string().min(8),
      role: z.enum(["admin", "employee"]),
      fullName: z.string(),
      email: z.string().email(),
      phone: z.string(),
      permissions: z.object({
        canManageUsers: z.boolean(),
        canViewReports: z.boolean(),
        canHandleRequests: z.boolean(),
        canCreateInvoices: z.boolean(),
        canViewCustomerInfo: z.boolean(),
        canDeleteData: z.boolean(),
      }),
    })
  )
  .mutation(async ({ input, ctx }) => {
    const employees = await kv.getJSON<Employee[]>("employees") || [];

    const existingUser = employees.find((e) => e.username === input.username);
    if (existingUser) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Username already exists",
      });
    }

    const newEmployee: Employee = {
      id: `emp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      username: input.username,
      passwordHash: await hashPassword(input.password),
      role: input.role,
      fullName: input.fullName,
      email: input.email,
      phone: input.phone,
      isActive: true,
      createdAt: new Date().toISOString(),
      createdBy: ctx.userId || "system",
      permissions: input.permissions,
    };

    employees.push(newEmployee);
    await kv.setJSON("employees", employees);

    await logAuditEntry({
      username: "admin",
      action: "user_created",
      userId: ctx.userId,
      details: `Created ${input.role} account for ${input.username}`,
    });

    const { passwordHash, ...employeeWithoutPassword } = newEmployee;
    return { success: true, employee: employeeWithoutPassword };
  });
