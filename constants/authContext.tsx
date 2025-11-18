import createContextHook from "@nkzw/create-context-hook";
import { useState, useEffect, useMemo, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SystemUser, UserRole } from "./types";
import { trpc } from "@/lib/trpc";

const STORAGE_KEY_CURRENT_USER = "@current_user";



export const [AuthContext, useAuth] = createContextHook(() => {
  const [currentUser, setCurrentUser] = useState<SystemUser | null>(null);
  const [allUsers, setAllUsers] = useState<SystemUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  const getUsersQuery = trpc.auth.getUsers.useQuery();

  useEffect(() => {
    initializeAuth();
  }, []);

  useEffect(() => {
    if (getUsersQuery.data) {
      setAllUsers(getUsersQuery.data);
    }
  }, [getUsersQuery.data]);

  const initializeAuth = async () => {
    try {
      console.log("[Auth] Initializing authentication system...");
      
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

  const loginMutation = trpc.auth.login.useMutation();

  const login = useCallback(async (username: string, password: string): Promise<{ success: boolean; message: string; user?: SystemUser }> => {
    try {
      console.log("[Auth] Login attempt for:", username);
      
      const result = await loginMutation.mutateAsync({
        username,
        password,
      });
      
      if (result.success && result.user) {
        await AsyncStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(result.user));
        setCurrentUser(result.user);
        getUsersQuery.refetch();
      }
      
      return result;
    } catch (error) {
      console.error("[Auth] Error during login:", error);
      return { success: false, message: "An error occurred during login" };
    }
  }, [loginMutation, getUsersQuery]);

  const logout = useCallback(async () => {
    try {
      console.log("[Auth] Logging out user:", currentUser?.username);
      await AsyncStorage.removeItem(STORAGE_KEY_CURRENT_USER);
      setCurrentUser(null);
    } catch (error) {
      console.error("[Auth] Error during logout:", error);
    }
  }, [currentUser]);

  const createUserMutation = trpc.auth.createUser.useMutation();

  const createUser = useCallback(async (userData: Omit<SystemUser, "id" | "createdAt" | "createdBy">): Promise<{ success: boolean; message: string; user?: SystemUser }> => {
    try {
      if (!currentUser) {
        return { success: false, message: "You must be logged in to create users" };
      }
      
      if (!currentUser.permissions?.canManageUsers) {
        return { success: false, message: "You don't have permission to create users" };
      }
      
      const result = await createUserMutation.mutateAsync({
        username: userData.username,
        password: userData.password,
        fullName: userData.fullName,
        email: userData.email,
        phone: userData.phone,
        role: userData.role,
        isActive: userData.isActive,
        permissions: userData.permissions,
      });
      
      if (result.success) {
        getUsersQuery.refetch();
      }
      
      return result;
    } catch (error) {
      console.error("[Auth] Error creating user:", error);
      return { success: false, message: "Failed to create user" };
    }
  }, [currentUser, createUserMutation, getUsersQuery]);

  const updateUserMutation = trpc.auth.updateUser.useMutation();

  const updateUser = useCallback(async (userId: string, updates: Partial<SystemUser>): Promise<{ success: boolean; message: string }> => {
    try {
      if (!currentUser) {
        return { success: false, message: "You must be logged in to update users" };
      }
      
      if (!currentUser.permissions?.canManageUsers && currentUser.id !== userId) {
        return { success: false, message: "You don't have permission to update other users" };
      }
      
      const result = await updateUserMutation.mutateAsync({
        userId,
        updates,
      });
      
      if (result.success) {
        if (currentUser.id === userId) {
          const updatedCurrentUser = { ...currentUser, ...updates };
          await AsyncStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(updatedCurrentUser));
          setCurrentUser(updatedCurrentUser);
        }
        getUsersQuery.refetch();
      }
      
      return result;
    } catch (error) {
      console.error("[Auth] Error updating user:", error);
      return { success: false, message: "Failed to update user" };
    }
  }, [currentUser, updateUserMutation, getUsersQuery]);

  const deleteUserMutation = trpc.auth.deleteUser.useMutation();

  const deleteUser = useCallback(async (userId: string): Promise<{ success: boolean; message: string }> => {
    try {
      if (!currentUser) {
        return { success: false, message: "You must be logged in to delete users" };
      }
      
      if (!currentUser.permissions?.canManageUsers) {
        return { success: false, message: "You don't have permission to delete users" };
      }
      
      if (userId === currentUser.id) {
        return { success: false, message: "Cannot delete your own account" };
      }
      
      const result = await deleteUserMutation.mutateAsync({
        userId,
      });
      
      if (result.success) {
        getUsersQuery.refetch();
      }
      
      return result;
    } catch (error) {
      console.error("[Auth] Error deleting user:", error);
      return { success: false, message: "Failed to delete user" };
    }
  }, [currentUser, deleteUserMutation, getUsersQuery]);

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
