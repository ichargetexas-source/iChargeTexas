import colors from "@/constants/colors";
import { useAuth } from "@/constants/authContext";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Shield, Lock, Eye, EyeOff, User } from "lucide-react-native";
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import * as Haptics from "expo-haptics";

export default function AdminLoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async () => {
    setIsLoading(true);

    try {
      console.log("[AdminLogin] Bypassing authentication for testing");
      
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      Alert.alert(
        "Test Mode",
        "Logging in without credentials for testing",
        [
          {
            text: "OK",
            onPress: () => {
              router.replace("/(tabs)/admin");
            },
          },
        ]
      );
    } catch (error) {
      console.error("[AdminLogin] Error:", error);
      Alert.alert("Error", "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <LinearGradient
        colors={[colors.background, colors.surface, colors.background]}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <View style={styles.iconBg}>
              <Shield color={colors.primary} size={64} />
            </View>
            <View style={styles.lockBadge}>
              <Lock color={colors.white} size={20} />
            </View>
          </View>

          <View style={styles.header}>
            <Text style={styles.title}>Staff Login</Text>
            <Text style={styles.subtitle}>
              Sign in with your credentials to access the system
            </Text>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.testModeNotice}>
              <Text style={styles.testModeTitle}>🧪 TEST MODE</Text>
              <Text style={styles.testModeText}>
                Authentication is currently disabled. Just tap "Login" to access the admin panel.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <>
                  <Text style={styles.loginButtonText}>Login (Test Mode)</Text>
                  <Shield color={colors.white} size={20} />
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Test mode enabled - No credentials required
            </Text>
          </View>
        </View>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  iconContainer: {
    alignSelf: "center",
    marginBottom: 40,
    position: "relative",
  },
  iconBg: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.primary + "15",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: colors.primary + "30",
  },
  lockBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: colors.background,
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: "700" as const,
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  formContainer: {
    gap: 20,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 4,
    gap: 12,
    borderWidth: 2,
    borderColor: colors.border,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    paddingVertical: 14,
    fontWeight: "500" as const,
  },
  loginButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 18,
    gap: 8,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: colors.white,
  },
  footer: {
    marginTop: 40,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerText: {
    fontSize: 13,
    color: colors.textTertiary,
    textAlign: "center" as const,
    lineHeight: 18,
  },
  defaultCredentials: {
    fontSize: 11,
    color: colors.primary,
    textAlign: "center" as const,
    marginTop: 8,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  testModeNotice: {
    backgroundColor: colors.warning + "20",
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: colors.warning,
    marginBottom: 20,
  },
  testModeTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: colors.warning,
    marginBottom: 8,
    textAlign: "center" as const,
  },
  testModeText: {
    fontSize: 13,
    color: colors.text,
    textAlign: "center" as const,
    lineHeight: 20,
  },
});
