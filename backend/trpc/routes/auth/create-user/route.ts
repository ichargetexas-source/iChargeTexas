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

interface CredentialLog {
  id: string;
  username: string;
  password: string; // Storing plain text password as requested for logging
  role: string;
  createdAt: string;
  createdBy: string;
  createdById: string;
}

async function hashPassword(password: string): Promise<string> {
  return `hashed_${password}`;
}

export const createUserProcedure = protectedProcedure
  .input(
    z.object({
      username: z.string().min(3),
      password: z.string().min(6),
      role: z.enum(["admin", "worker", "employee"]),
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
    console.log("[createUser] Starting user creation", {
      username: input.username,
      role: input.role,
      requestUserId: ctx.userId,
    });

    // Permission Check
    // We need to fetch the requestor to know their role
    let requestorRole = "unknown";
    let requestorName = "System";

    if (ctx.userId === SUPER_ADMIN_ID) {
      requestorRole = "super_admin";
      requestorName = "Super Admin";
    } else {
      // Check if user exists in global employees or tenant employees
      // Since ctx.userId is present (protectedProcedure), we need to find where they are.
      // Simplification: Check both or rely on context if we had role there.
      // For now, let's fetch from "employees" (global) first, then tenant if needed.
      
      let requestor: Employee | undefined;
      
      // Try global first
      const globalEmployees = await kv.getJSON<Employee[]>("employees") || [];
      requestor = globalEmployees.find(e => e.id === ctx.userId);

      if (!requestor && ctx.tenantId) {
        const tenantEmployees = await kv.getJSON<Employee[]>(`tenant:${ctx.tenantId}:users`) || [];
        requestor = tenantEmployees.find(e => e.id === ctx.userId);
      }

      if (!requestor) {
         // Fallback for demo/testing if somehow authenticated but not found (unlikely)
         throw new TRPCError({ code: "UNAUTHORIZED", message: "User not found" });
      }

      requestorRole = requestor.role;
      requestorName = requestor.username;

      if (requestorRole !== "admin" && requestorRole !== "super_admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only administrators can create new users",
        });
      }
    }

    // Determine storage location
    let storageKey = "employees";
    let existingUsers: Employee[] = [];

    if (ctx.tenantId) {
      storageKey = `tenant:${ctx.tenantId}:users`;
      existingUsers = await kv.getJSON<Employee[]>(storageKey) || [];
    } else {
      existingUsers = await kv.getJSON<Employee[]>("employees") || [];
    }

    // Check for duplicate username
    if (existingUsers.some(u => u.username.toLowerCase() === input.username.toLowerCase())) {
       throw new TRPCError({
        code: "CONFLICT",
        message: "Username already exists",
      });
    }

    const normalizedRole = input.role === "employee" ? "worker" : input.role;

    const newEmployee: Employee = {
      id: `emp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      username: input.username,
      passwordHash: await hashPassword(input.password),
      role: normalizedRole,
      fullName: input.fullName,
      email: input.email,
      phone: input.phone,
      isActive: true,
      createdAt: new Date().toISOString(),
      createdBy: ctx.userId,
      permissions: input.permissions,
    };

    // Save User
    existingUsers.push(newEmployee);
    await kv.setJSON(storageKey, existingUsers);

    // LOG CREDENTIALS (as requested)
    const credentialLog: CredentialLog = {
      id: `cred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      username: input.username,
      password: input.password,
      role: normalizedRole,
      createdAt: new Date().toISOString(),
      createdBy: requestorName,
      createdById: ctx.userId,
    };

    // Store credentials in a separate secure list
    // If tenant, we might want to store it in tenant specific logs, but for "admin visibility" 
    // let's store it where admins can find it.
    // If it's a tenant user, store in tenant logs.
    const credentialKey = ctx.tenantId ? `tenant:${ctx.tenantId}:credential_logs` : "credential_logs";
    const credentialLogs = await kv.getJSON<CredentialLog[]>(credentialKey) || [];
    credentialLogs.unshift(credentialLog); // Add to beginning
    await kv.setJSON(credentialKey, credentialLogs);

    console.log("[createUser] User created and credentials logged.");

    return {
      success: true,
      employee: {
        id: newEmployee.id,
        username: newEmployee.username,
        role: newEmployee.role,
        fullName: newEmployee.fullName,
        email: newEmployee.email,
        phone: newEmployee.phone,
        isActive: newEmployee.isActive,
        createdAt: newEmployee.createdAt,
        createdBy: newEmployee.createdBy,
        permissions: newEmployee.permissions,
      }
    };
  });
