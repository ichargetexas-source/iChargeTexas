import { Tabs, useRouter } from "expo-router";
import { Home, Plus, History, Shield, MessageSquare, Users as UsersIcon, LogIn, MessageCircle } from "lucide-react-native";
import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import colors from "@/constants/colors";
import { useUser } from "@/constants/userContext";
import { useAuth } from "@/constants/authContext";
import { useService } from "@/constants/serviceContext";

export default function TabLayout() {
  const { isAdmin } = useUser();
  const { isAuthenticated, currentUser } = useAuth();
  const { requests } = useService();
  const router = useRouter();
  

  
  const pendingRequests = requests.filter((r) => r.status === "pending");
  const hasPendingRequests = pendingRequests.length > 0;
  
  const unreadMessagesCount = pendingRequests.reduce((count, req) => {
    const messages = req.messages || [];
    const adminMessages = messages.filter(m => m.sender === "admin");
    return count + adminMessages.length;
  }, 0);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        headerShown: true,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
        },
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontWeight: "700" as const,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          headerTitle: "iChargeTexas",
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="request"
        options={{
          title: "New Request",
          headerTitle: "Create Request",
          tabBarIcon: ({ color, size }) => <Plus color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          headerTitle: "Service History",
          tabBarIcon: ({ color, size }) => <History color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="login"
        options={{
          title: isAuthenticated ? (currentUser?.role || "Admin") : "Staff",
          headerTitle: isAuthenticated ? "Admin Dashboard" : "Business Login",
          tabBarIcon: ({ color, size }) => 
            isAuthenticated ? <Shield color={color} size={size} /> : <LogIn color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="notes"
        options={{
          title: "Messages",
          headerTitle: "Messages",
          tabBarIcon: ({ color, size }) => (
            <View>
              <MessageSquare color={color} size={size} />
              {!isAdmin && unreadMessagesCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                  </Text>
                </View>
              )}
            </View>
          ),
          href: null,
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          title: "Admin",
          headerTitle: "Admin Tab",
          tabBarIcon: ({ color, size }) => <Shield color={color} size={size} />,
          href: null,
        }}
      />
      <Tabs.Screen
        name="users"
        options={{
          title: "Users",
          headerTitle: "User Management",
          tabBarIcon: ({ color, size }) => <UsersIcon color={color} size={size} />,
          href: null,
        }}
      />
      <Tabs.Screen
        name="messenger"
        options={{
          title: "Messenger",
          headerTitle: "Staff Messenger",
          tabBarIcon: ({ color, size }) => <MessageCircle color={color} size={size} />,
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: "absolute" as const,
    top: -4,
    right: -8,
    backgroundColor: colors.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.surface,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: colors.white,
  },
});
