import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "../create-context";
import { SystemUser, UserRole } from "@/constants/types";

const USERS_STORAGE_KEY = "system_users";

const DEFAULT_USERS: SystemUser[] = [
  {
    id: "super_admin_001",
    username: "superadmin",
    password: "Wowcows123!123!",
    role: "super_admin",
    fullName: "Super Administrator",
    email: "admin@ichargetexas.com",
    isActive: true,
    createdAt: new Date().toISOString(),
    createdBy: "system",
    permissions: {
      canManageUsers: true,
      canViewReports: true,
      canHandleRequests: true,
      canCreateInvoices: true,
      canViewCustomerInfo: true,
      canDeleteData: true,
    },
  },
  {
    id: "admin_vernon",
    username: "Vernon",
    password: "bacon",
    role: "admin",
    fullName: "Vernon",
    email: "vernon@ichargetexas.com",
    isActive: true,
    createdAt: new Date().toISOString(),
    createdBy: "system",
    permissions: {
      canManageUsers: true,
      canViewReports: true,
      canHandleRequests: true,
      canCreateInvoices: true,
      canViewCustomerInfo: true,
      canDeleteData: false,
    },
  },
  {
    id: "admin_cindi",
    username: "Cindi",
    password: "bacon",
    role: "admin",
    fullName: "Cindi",
    email: "cindi@ichargetexas.com",
    isActive: true,
    createdAt: new Date().toISOString(),
    createdBy: "system",
    permissions: {
      canManageUsers: true,
      canViewReports: true,
      canHandleRequests: true,
      canCreateInvoices: true,
      canViewCustomerInfo: true,
      canDeleteData: false,
    },
  },
  {
    id: "admin_mark",
    username: "Mark",
    password: "bacon",
    role: "admin",
    fullName: "Mark",
    email: "mark@ichargetexas.com",
    isActive: true,
    createdAt: new Date().toISOString(),
    createdBy: "system",
    permissions: {
      canManageUsers: true,
      canViewReports: true,
      canHandleRequests: true,
      canCreateInvoices: true,
      canViewCustomerInfo: true,
      canDeleteData: false,
    },
  },
  {
    id: "worker_dustin",
    username: "Dustin",
    password: "bacon",
    role: "worker",
    fullName: "Dustin",
    email: "dustin@ichargetexas.com",
    isActive: true,
    createdAt: new Date().toISOString(),
    createdBy: "system",
    permissions: {
      canManageUsers: false,
      canViewReports: false,
      canHandleRequests: true,
      canCreateInvoices: false,
      canViewCustomerInfo: true,
      canDeleteData: false,
    },
  },
];

export const authRouter = createTRPCRouter({
  login: publicProcedure
    .input(
      z.object({
        username: z.string(),
        password: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      console.log("[Backend Auth] Login attempt for:", input.username);

      const usersData = await ctx.kv.get(USERS_STORAGE_KEY);
      let users: SystemUser[] = [];

      if (!usersData) {
        console.log("[Backend Auth] No users found, creating default users");
        users = DEFAULT_USERS;
        await ctx.kv.set(USERS_STORAGE_KEY, JSON.stringify(users));
      } else {
        users = JSON.parse(usersData as string);
        
        // Check if default users exist, if not add them (simple migration for this session)
        const existingUsernames = users.map(u => u.username.toLowerCase());
        let addedNew = false;
        
        for (const defaultUser of DEFAULT_USERS) {
          if (!existingUsernames.includes(defaultUser.username.toLowerCase())) {
            users.push(defaultUser);
            addedNew = true;
          }
        }
        
        if (addedNew) {
          console.log("[Backend Auth] Added missing default users");
          await ctx.kv.set(USERS_STORAGE_KEY, JSON.stringify(users));
        }
      }

      const user = users.find(
        (u) => u.username.toLowerCase() === input.username.toLowerCase() && u.password === input.password
      );

      if (!user) {
        console.log("[Backend Auth] Invalid credentials for:", input.username);
        return {
          success: false,
          message: "Invalid username or password",
        };
      }

      if (!user.isActive) {
        console.log("[Backend Auth] User account is inactive:", input.username);
        return {
          success: false,
          message: "This account has been deactivated",
        };
      }

      const updatedUser: SystemUser = {
        ...user,
        lastLogin: new Date().toISOString(),
      };

      const updatedUsers = users.map((u) =>
        u.id === user.id ? updatedUser : u
      );
      await ctx.kv.set(USERS_STORAGE_KEY, JSON.stringify(updatedUsers));

      console.log(
        "[Backend Auth] Login successful for:",
        input.username,
        "role:",
        user.role
      );

      return {
        success: true,
        message: "Login successful",
        user: updatedUser,
      };
    }),

  getUsers: protectedProcedure.query(async ({ ctx }) => {
    console.log("[Backend Auth] Getting all users");

    const usersData = await ctx.kv.get(USERS_STORAGE_KEY);

    if (!usersData) {
      return [];
    }

    const users: SystemUser[] = JSON.parse(usersData as string);

    return users;
  }),

  createUser: protectedProcedure
    .input(
      z.object({
        username: z.string(),
        password: z.string(),
        fullName: z.string(),
        email: z.string().email(),
        phone: z.string().optional(),
        role: z.enum(["super_admin", "admin", "worker", "user"]),
        isActive: z.boolean(),
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
      })
    )
    .mutation(async ({ input, ctx }) => {
      console.log("[Backend Auth] Creating user:", input.username);

      const usersData = await ctx.kv.get(USERS_STORAGE_KEY);
      const users: SystemUser[] = usersData
        ? JSON.parse(usersData as string)
        : [];

      const existingUser = users.find((u) => u.username.toLowerCase() === input.username.toLowerCase());
      if (existingUser) {
        return {
          success: false,
          message: "Username already exists",
        };
      }

      const newUser: SystemUser = {
        id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        username: input.username,
        password: input.password,
        fullName: input.fullName,
        email: input.email,
        phone: input.phone,
        role: input.role as UserRole,
        isActive: input.isActive,
        createdAt: new Date().toISOString(),
        createdBy: ctx.userId || "system",
        permissions: input.permissions,
      };

      const updatedUsers = [...users, newUser];
      await ctx.kv.set(USERS_STORAGE_KEY, JSON.stringify(updatedUsers));

      console.log("[Backend Auth] User created:", newUser.username);

      return {
        success: true,
        message: "User created successfully",
        user: newUser,
      };
    }),

  updateUser: protectedProcedure
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
    }),

  deleteUser: protectedProcedure
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
    }),
});
