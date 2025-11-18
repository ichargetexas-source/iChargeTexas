import createContextHook from "@nkzw/create-context-hook";
import { useState, useEffect, useMemo, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SystemUser, UserRole } from "./types";

const STORAGE_KEY_USERS = "@system_users";
const STORAGE_KEY_CURRENT_USER = "@current_user";

const DEFAULT_SUPER_ADMIN: SystemUser = {
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
};

export const [AuthContext, useAuth] = createContextHook(() => {
  const [currentUser, setCurrentUser] = useState<SystemUser | null>(null);
  const [allUsers, setAllUsers] = useState<SystemUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      console.log("[Auth] Initializing authentication system...");
      
      const storedUsers = await AsyncStorage.getItem(STORAGE_KEY_USERS);
      let users: SystemUser[] = [];
      
      if (!storedUsers || storedUsers === "null" || storedUsers === "undefined") {
        console.log("[Auth] No users found, creating default super admin");
        users = [DEFAULT_SUPER_ADMIN];
        await AsyncStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
      } else {
        try {
          users = JSON.parse(storedUsers);
          console.log("[Auth] Loaded", users.length, "users from storage");
        } catch (parseError) {
          console.error("[Auth] Error parsing stored users, resetting to default:", parseError);
          users = [DEFAULT_SUPER_ADMIN];
          await AsyncStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
        }
      }
      
      setAllUsers(users);
      
      const storedCurrentUser = await AsyncStorage.getItem(STORAGE_KEY_CURRENT_USER);
      if (storedCurrentUser && storedCurrentUser !== "null" && storedCurrentUser !== "undefined") {
        try {
          const user = JSON.parse(storedCurrentUser);
          console.log("[Auth] Restoring session for:", user.username, "role:", user.role);
          setCurrentUser(user);
        } catch (parseError) {
          console.error("[Auth] Error parsing stored current user:", parseError);
          await AsyncStorage.removeItem(STORAGE_KEY_CURRENT_USER);
        }
      }
      
      setIsInitialized(true);
    } catch (error) {
      console.error("[Auth] Error initializing auth:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = useCallback(async (username: string, password: string): Promise<{ success: boolean; message: string; user?: SystemUser }> => {
    try {
      console.log("[Auth] Login attempt for:", username);
      
      const storedUsers = await AsyncStorage.getItem(STORAGE_KEY_USERS);
      if (!storedUsers) {
        console.log("[Auth] No users found in storage");
        return { success: false, message: "Invalid username or password" };
      }
      
      const users: SystemUser[] = JSON.parse(storedUsers);
      console.log("[Auth] Found", users.length, "users in storage");
      console.log("[Auth] Looking for username:", username);
      
      const user = users.find(u => u.username === username && u.password === password);
      
      if (!user) {
        console.log("[Auth] Invalid credentials for:", username);
        console.log("[Auth] Available usernames:", users.map(u => u.username));
        return { success: false, message: "Invalid username or password" };
      }
      
      if (!user.isActive) {
        console.log("[Auth] User account is inactive:", username);
        return { success: false, message: "This account has been deactivated" };
      }
      
      const updatedUser: SystemUser = {
        ...user,
        lastLogin: new Date().toISOString(),
      };
      
      const updatedUsers = users.map(u => u.id === user.id ? updatedUser : u);
      await AsyncStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(updatedUsers));
      await AsyncStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(updatedUser));
      
      setAllUsers(updatedUsers);
      setCurrentUser(updatedUser);
      
      console.log("[Auth] Login successful for:", username, "role:", user.role);
      return { success: true, message: "Login successful", user: updatedUser };
    } catch (error) {
      console.error("[Auth] Error during login:", error);
      return { success: false, message: "An error occurred during login" };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      console.log("[Auth] Logging out user:", currentUser?.username);
      await AsyncStorage.removeItem(STORAGE_KEY_CURRENT_USER);
      setCurrentUser(null);
    } catch (error) {
      console.error("[Auth] Error during logout:", error);
    }
  }, [currentUser]);

  const createUser = useCallback(async (userData: Omit<SystemUser, "id" | "createdAt" | "createdBy">): Promise<{ success: boolean; message: string; user?: SystemUser }> => {
    try {
      if (!currentUser) {
        return { success: false, message: "You must be logged in to create users" };
      }
      
      if (!currentUser.permissions?.canManageUsers) {
        return { success: false, message: "You don't have permission to create users" };
      }
      
      const existingUser = allUsers.find(u => u.username === userData.username);
      if (existingUser) {
        return { success: false, message: "Username already exists" };
      }
      
      const newUser: SystemUser = {
        ...userData,
        id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString(),
        createdBy: currentUser.id,
      };
      
      const updatedUsers = [...allUsers, newUser];
      await AsyncStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(updatedUsers));
      setAllUsers(updatedUsers);
      
      console.log("[Auth] User created:", newUser.username, "by:", currentUser.username);
      return { success: true, message: "User created successfully", user: newUser };
    } catch (error) {
      console.error("[Auth] Error creating user:", error);
      return { success: false, message: "Failed to create user" };
    }
  }, [currentUser, allUsers]);

  const updateUser = useCallback(async (userId: string, updates: Partial<SystemUser>): Promise<{ success: boolean; message: string }> => {
    try {
      if (!currentUser) {
        return { success: false, message: "You must be logged in to update users" };
      }
      
      if (!currentUser.permissions?.canManageUsers && currentUser.id !== userId) {
        return { success: false, message: "You don't have permission to update other users" };
      }
      
      const updatedUsers = allUsers.map(user => 
        user.id === userId ? { ...user, ...updates } : user
      );
      
      await AsyncStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(updatedUsers));
      setAllUsers(updatedUsers);
      
      if (currentUser.id === userId) {
        const updatedCurrentUser = { ...currentUser, ...updates };
        await AsyncStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(updatedCurrentUser));
        setCurrentUser(updatedCurrentUser);
      }
      
      console.log("[Auth] User updated:", userId);
      return { success: true, message: "User updated successfully" };
    } catch (error) {
      console.error("[Auth] Error updating user:", error);
      return { success: false, message: "Failed to update user" };
    }
  }, [currentUser, allUsers]);

  const deleteUser = useCallback(async (userId: string): Promise<{ success: boolean; message: string }> => {
    try {
      if (!currentUser) {
        return { success: false, message: "You must be logged in to delete users" };
      }
      
      if (!currentUser.permissions?.canManageUsers) {
        return { success: false, message: "You don't have permission to delete users" };
      }
      
      const userToDelete = allUsers.find(u => u.id === userId);
      if (!userToDelete) {
        return { success: false, message: "User not found" };
      }
      
      if (userToDelete.role === "super_admin") {
        return { success: false, message: "Cannot delete super admin account" };
      }
      
      if (userId === currentUser.id) {
        return { success: false, message: "Cannot delete your own account" };
      }
      
      const updatedUsers = allUsers.filter(user => user.id !== userId);
      await AsyncStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(updatedUsers));
      setAllUsers(updatedUsers);
      
      console.log("[Auth] User deleted:", userId);
      return { success: true, message: "User deleted successfully" };
    } catch (error) {
      console.error("[Auth] Error deleting user:", error);
      return { success: false, message: "Failed to delete user" };
    }
  }, [currentUser, allUsers]);

  const getRoleDisplayName = useCallback((role: UserRole): string => {
    switch (role) {
      case "super_admin": return "Super Admin";
      case "admin": return "Administrator";
      case "worker": return "Worker";
      case "user": return "User";
      default: return role;
    }
  }, []);

  const hasPermission = useCallback((permission: keyof NonNullable<SystemUser["permissions"]>): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === "super_admin") return true;
    return currentUser.permissions?.[permission] || false;
  }, [currentUser]);

  return useMemo(() => ({
    currentUser,
    allUsers,
    isLoading,
    isInitialized,
    isAuthenticated: !!currentUser,
    isSuperAdmin: currentUser?.role === "super_admin",
    isAdmin: currentUser?.role === "admin" || currentUser?.role === "super_admin",
    isWorker: currentUser?.role === "worker",
    login,
    logout,
    createUser,
    updateUser,
    deleteUser,
    getRoleDisplayName,
    hasPermission,
  }), [
    currentUser, 
    allUsers, 
    isLoading, 
    isInitialized,
    login, 
    logout, 
    createUser, 
    updateUser, 
    deleteUser,
    getRoleDisplayName,
    hasPermission,
  ]);
});
