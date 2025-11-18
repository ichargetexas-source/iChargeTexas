import createContextHook from "@nkzw/create-context-hook";
import { useState, useEffect, useMemo, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

type UserRole = "user" | "admin";

export const [UserContext, useUser] = createContextHook(() => {
  const [role, setRole] = useState<UserRole>("user");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadRole();
  }, []);

  const loadRole = async () => {
    try {
      const storedRole = await AsyncStorage.getItem("userRole");
      if (storedRole === "admin" || storedRole === "user") {
        setRole(storedRole);
      }
    } catch (error) {
      console.error("Error loading user role:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateRole = useCallback(async (newRole: UserRole) => {
    try {
      await AsyncStorage.setItem("userRole", newRole);
      setRole(newRole);
    } catch (error) {
      console.error("Error saving user role:", error);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await AsyncStorage.setItem("userRole", "user");
      setRole("user");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  }, []);

  return useMemo(() => ({
    role,
    isAdmin: role === "admin",
    isLoading,
    updateRole,
    logout,
  }), [role, isLoading, updateRole, logout]);
});
