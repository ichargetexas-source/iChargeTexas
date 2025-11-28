import { z } from "zod";
import { protectedProcedure } from "../../../create-context";
import { kv } from "../../../../storage";
import { TRPCError } from "@trpc/server";

const SUPER_ADMIN_ID = "super_admin_001";

interface Employee {
  id: string;
  username: string;
  passwordHash: string;
  role: "admin" | "worker" | "employee";
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

export const updateEmployeeProcedure = protectedProcedure
  .input(
    z.object({
      employeeId: z.string(),
      username: z.string().min(3).optional(),
      password: z.string().min(8).optional(),
      fullName: z.string().optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      isActive: z.boolean().optional(),
      permissions: z.object({
        canManageUsers: z.boolean(),
        canViewReports: z.boolean(),
        canHandleRequests: z.boolean(),
        canCreateInvoices: z.boolean(),
        canViewCustomerInfo: z.boolean(),
        canDeleteData: z.boolean(),
      }).optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log("[updateEmployee] Starting user update", {
      employeeId: input.employeeId,
      requestUserId: ctx.userId,
      tenantId: ctx.tenantId,
    });

    const isSuperAdminRequest = ctx.userId === SUPER_ADMIN_ID;
    console.log("[updateEmployee] Is super admin request:", isSuperAdminRequest);
    
    let employees: Employee[];
    let storageKey: string;
    
    if (ctx.tenantId) {
      storageKey = `tenant:${ctx.tenantId}:users`;
      employees = await kv.getJSON<Employee[]>(storageKey) || [];
      console.log(`[updateEmployee] Loaded ${employees.length} employees from ${storageKey}`);
    } else {
      storageKey = "employees";
      employees = await kv.getJSON<Employee[]>(storageKey) || [];
      console.log(`[updateEmployee] Loaded ${employees.length} employees from ${storageKey}`);
    }
    
    const employeeToUpdate = employees.find((e) => e.id === input.employeeId);
    
    if (!employeeToUpdate) {
      console.log("[updateEmployee] NOT_FOUND: Employee not found");
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Employee not found",
      });
    }
    
    console.log("[updateEmployee] Employee to update:", {
      id: employeeToUpdate.id,
      username: employeeToUpdate.username,
      role: employeeToUpdate.role,
    });
    
    const requestingUser = employees.find((e) => e.id === ctx.userId);
    
    if (!isSuperAdminRequest) {
      if (!requestingUser || requestingUser.role !== "admin") {
        console.log("[updateEmployee] FORBIDDEN: Only admins can update users");
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only administrators can update users",
        });
      }
      
      if (employeeToUpdate.role === "admin") {
        console.log("[updateEmployee] FORBIDDEN: Cannot update admin accounts");
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You cannot update administrator accounts",
        });
      }
    }
    
    if (input.username && input.username !== employeeToUpdate.username) {
      const existingUser = employees.find((e) => e.username.toLowerCase() === input.username!.toLowerCase() && e.id !== input.employeeId);
      if (existingUser) {
        console.log("[updateEmployee] CONFLICT: Username already exists");
        throw new TRPCError({
          code: "CONFLICT",
          message: "Username already exists",
        });
      }
    }
    
    const updatedEmployee: Employee = {
      ...employeeToUpdate,
      username: input.username ?? employeeToUpdate.username,
      fullName: input.fullName ?? employeeToUpdate.fullName,
      email: input.email ?? employeeToUpdate.email,
      phone: input.phone ?? employeeToUpdate.phone,
      isActive: input.isActive ?? employeeToUpdate.isActive,
      permissions: input.permissions ?? employeeToUpdate.permissions,
    };
    
    if (input.password) {
      updatedEmployee.passwordHash = await hashPassword(input.password);
      console.log("[updateEmployee] Password updated");
    }
    
    console.log("[updateEmployee] Updated employee data:", {
      id: updatedEmployee.id,
      username: updatedEmployee.username,
      email: updatedEmployee.email,
      permissions: updatedEmployee.permissions,
    });
    
    const updatedEmployees = employees.map((e) => e.id === input.employeeId ? updatedEmployee : e);
    await kv.setJSON(storageKey, updatedEmployees);
    console.log(`[updateEmployee] Saved to ${storageKey}. Total users:`, updatedEmployees.length);
    
    await logAuditEntry({
      username: isSuperAdminRequest ? "super_admin" : requestingUser?.username || "system",
      action: "user_updated",
      userId: ctx.userId,
      details: `Updated ${employeeToUpdate.role} account for ${updatedEmployee.username}`,
    });
    
    const { passwordHash, ...employeeWithoutPassword } = updatedEmployee;
    console.log("[updateEmployee] SUCCESS: User updated successfully");
    return { success: true, employee: employeeWithoutPassword };
  });
