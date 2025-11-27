import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { useAuth } from "@/constants/authContext";
import { trpc } from "@/lib/trpc";
import colors from "@/constants/colors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, CheckCircle, XCircle, Filter, Shield, UserPlus, Key } from "lucide-react-native";

type ActionFilter = "all" | "login_success" | "login_failed" | "logout" | "user_created" | "user_updated" | "password_changed";

export default function AuditLogsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const [actionFilter, setActionFilter] = useState<ActionFilter>("all");

  React.useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, router]);

  const { data: auditLogs, isLoading, refetch, error } = trpc.auth.getAuditLogs.useQuery({
    limit: 100,
    action: actionFilter === "all" ? undefined : actionFilter,
  });

  const getActionIcon = (action: string) => {
    switch (action) {
      case "login_success":
        return <CheckCircle color={colors.success} size={18} />;
      case "login_failed":
        return <XCircle color={colors.error} size={18} />;
      case "logout":
        return <ArrowLeft color={colors.warning} size={18} />;
      case "user_created":
        return <UserPlus color={colors.primary} size={18} />;
      case "user_updated":
        return <Shield color={colors.charging} size={18} />;
      case "password_changed":
        return <Key color={colors.roadside} size={18} />;
      default:
        return null;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "login_success":
        return colors.success;
      case "login_failed":
        return colors.error;
      case "logout":
        return colors.warning;
      case "user_created":
        return colors.primary;
      case "user_updated":
        return colors.charging;
      case "password_changed":
        return colors.roadside;
      default:
        return colors.textSecondary;
    }
  };

  const formatAction = (action: string) => {
    return action
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft color={colors.white} size={24} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Audit Logs</Text>
          <Text style={styles.headerSubtitle}>Authentication events & user actions</Text>
        </View>
      </View>

      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {[
            { key: "all" as const, label: "All" },
            { key: "login_success" as const, label: "Login Success" },
            { key: "login_failed" as const, label: "Login Failed" },
            { key: "logout" as const, label: "Logout" },
            { key: "user_created" as const, label: "User Created" },
            { key: "user_updated" as const, label: "User Updated" },
            { key: "password_changed" as const, label: "Password Changed" },
          ].map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterButton,
                actionFilter === filter.key && styles.filterButtonActive,
              ]}
              onPress={() => setActionFilter(filter.key)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  actionFilter === filter.key && styles.filterButtonTextActive,
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading audit logs...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <XCircle color={colors.error} size={48} />
          <Text style={styles.errorTitle}>Error Loading Logs</Text>
          <Text style={styles.errorMessage}>{error.message}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : !auditLogs || auditLogs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Filter color={colors.textTertiary} size={48} />
          <Text style={styles.emptyTitle}>No Audit Logs</Text>
          <Text style={styles.emptyMessage}>
            {actionFilter === "all"
              ? "No authentication events have been logged yet"
              : `No "${formatAction(actionFilter)}" events found`}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={() => refetch()}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          {auditLogs.map((log) => (
            <View key={log.id} style={styles.logCard}>
              <View style={styles.logHeader}>
                <View style={styles.logIcon}>{getActionIcon(log.action)}</View>
                <View style={styles.logHeaderText}>
                  <Text style={styles.logUsername}>{log.username}</Text>
                  <Text style={[styles.logAction, { color: getActionColor(log.action) }]}>
                    {formatAction(log.action)}
                  </Text>
                </View>
                <Text style={styles.logTime}>
                  {new Date(log.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>

              <View style={styles.logBody}>
                <Text style={styles.logTimestamp}>
                  {new Date(log.timestamp).toLocaleDateString()} at{" "}
                  {new Date(log.timestamp).toLocaleTimeString()}
                </Text>
                {log.details && (
                  <View style={styles.logDetails}>
                    <Text style={styles.logDetailsText}>{log.details}</Text>
                  </View>
                )}
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
  },
  backButton: {
    padding: 8,
  },
  headerContent: {
    flex: 1,
    gap: 2,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: colors.white,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.white + "CC",
  },
  filterContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  filterScroll: {
    flexDirection: "row" as const,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.background,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: colors.textSecondary,
  },
  filterButtonTextActive: {
    color: colors.white,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    padding: 40,
    gap: 12,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: colors.text,
  },
  errorMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center" as const,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.primary,
    borderRadius: 10,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: colors.white,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    padding: 40,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: colors.text,
  },
  emptyMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center" as const,
    lineHeight: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  logCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  logHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
  },
  logIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceLight,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  logHeaderText: {
    flex: 1,
    gap: 2,
  },
  logUsername: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: colors.text,
  },
  logAction: {
    fontSize: 12,
    fontWeight: "600" as const,
    textTransform: "uppercase" as const,
  },
  logTime: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  logBody: {
    paddingLeft: 48,
    gap: 8,
  },
  logTimestamp: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  logDetails: {
    backgroundColor: colors.surfaceLight,
    padding: 10,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  logDetailsText: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
});
