import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { trpc } from "@/lib/trpc";
import colors from "@/constants/colors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeft,
  MapPin,
  Navigation,
  CheckCircle,
  XCircle,
  Truck,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

interface TestResult {
  step: string;
  status: "pending" | "success" | "error";
  message: string;
  data?: any;
}

export default function TestMileageScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const createTestJobMutation = trpc.requests.createTestJob.useMutation();
  const acceptJobMutation = trpc.requests.acceptJob.useMutation();
  const calculateRoundTripMutation = trpc.requests.calculateRoundTrip.useMutation();
  const postMileageLogMutation = trpc.requests.postMileageLog.useMutation();

  const addResult = (result: TestResult) => {
    setTestResults((prev) => [...prev, result]);
  };

  const runTest = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setIsRunning(true);
    setTestResults([]);

    try {
      addResult({
        step: "Step 1: Creating Test Job",
        status: "pending",
        message: "Creating a test job request...",
      });

      const testJob = await createTestJobMutation.mutateAsync({});

      addResult({
        step: "Step 1: Creating Test Job",
        status: "success",
        message: `Test job created successfully!`,
        data: {
          jobId: testJob.id,
          jobName: testJob.title,
          location: `${testJob.location.latitude.toFixed(6)}, ${testJob.location.longitude.toFixed(6)}`,
          address: testJob.location.address,
        },
      });

      const acceptorCoordinates = {
        latitude: 30.2500,
        longitude: -97.7500,
        accuracy: 10,
      };

      addResult({
        step: "Step 2: Accepting Job",
        status: "pending",
        message: "Worker accepting the job...",
      });

      const acceptance = await acceptJobMutation.mutateAsync({
        requestId: testJob.id,
        acceptorCoordinates,
        acceptedBy: {
          id: "test-worker-1",
          name: "Test Worker",
          role: "worker",
        },
        platform: Platform.OS as any,
      });

      addResult({
        step: "Step 2: Accepting Job",
        status: "success",
        message: `Job accepted successfully!`,
        data: {
          acceptedAt: new Date(acceptance.acceptanceLog.acceptedAt).toLocaleString(),
          workerLocation: `${acceptorCoordinates.latitude.toFixed(6)}, ${acceptorCoordinates.longitude.toFixed(6)}`,
        },
      });

      addResult({
        step: "Step 3: Calculating Round Trip Distance",
        status: "pending",
        message: "Calculating round trip distance...",
      });

      const roundTrip = await calculateRoundTripMutation.mutateAsync({
        requestId: testJob.id,
        acceptorCoordinates,
      });

      addResult({
        step: "Step 3: Calculating Round Trip Distance",
        status: "success",
        message: `Distance calculated successfully!`,
        data: {
          oneWayKm: roundTrip.oneWayDistance.kilometers,
          oneWayMiles: roundTrip.oneWayDistance.miles,
          roundTripKm: roundTrip.roundTripDistance.kilometers,
          roundTripMiles: roundTrip.roundTripDistance.miles,
        },
      });

      addResult({
        step: "Step 4: Posting to Mileage Log",
        status: "pending",
        message: "Posting mileage data to log...",
      });

      const mileageLog = await postMileageLogMutation.mutateAsync({
        requestId: testJob.id,
        jobName: testJob.title,
        referenceNumber: testJob.id,
        acceptorCoordinates,
        isRoundTrip: true,
      });

      addResult({
        step: "Step 4: Posting to Mileage Log",
        status: "success",
        message: `Mileage log posted successfully!`,
        data: {
          logId: mileageLog.id,
          jobName: mileageLog.jobName,
          referenceNumber: mileageLog.referenceNumber,
          distance: `${mileageLog.distance.miles} miles (${mileageLog.distance.kilometers} km)`,
          isRoundTrip: mileageLog.isRoundTrip ? "Yes" : "No",
        },
      });

      addResult({
        step: "Test Complete",
        status: "success",
        message: "All steps completed successfully! ✅",
      });

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error: any) {
      console.error("[Test] Error:", error);
      addResult({
        step: "Test Failed",
        status: "error",
        message: error.message || "An error occurred during the test",
      });

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setIsRunning(false);
    }
  };

  const resetTest = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setTestResults([]);
  };

  const getStatusIcon = (status: TestResult["status"]) => {
    switch (status) {
      case "pending":
        return <ActivityIndicator size="small" color={colors.warning} />;
      case "success":
        return <CheckCircle color={colors.success} size={20} />;
      case "error":
        return <XCircle color={colors.error} size={20} />;
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[colors.background, colors.surface]} style={styles.gradient}>
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft color={colors.text} size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Test Mileage System</Text>
          <View style={styles.backButton} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
        >
          <View style={styles.infoCard}>
            <Truck color={colors.primary} size={32} />
            <Text style={styles.infoTitle}>Mileage Log Test</Text>
            <Text style={styles.infoDescription}>
              This test will create a job, accept it from a worker&apos;s location, calculate the round
              trip distance, and post it to the mileage log.
            </Text>
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton, isRunning && styles.buttonDisabled]}
              onPress={runTest}
              disabled={isRunning}
            >
              {isRunning ? (
                <>
                  <ActivityIndicator size="small" color={colors.white} />
                  <Text style={styles.buttonText}>Running Test...</Text>
                </>
              ) : (
                <>
                  <Navigation color={colors.white} size={20} />
                  <Text style={styles.buttonText}>Run Test</Text>
                </>
              )}
            </TouchableOpacity>

            {testResults.length > 0 && !isRunning && (
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={resetTest}
              >
                <Text style={styles.secondaryButtonText}>Clear Results</Text>
              </TouchableOpacity>
            )}
          </View>

          {testResults.length > 0 && (
            <View style={styles.resultsContainer}>
              <Text style={styles.resultsTitle}>Test Results</Text>

              {testResults.map((result, index) => (
                <View
                  key={index}
                  style={[
                    styles.resultCard,
                    result.status === "error" && styles.resultCardError,
                  ]}
                >
                  <View style={styles.resultHeader}>
                    {getStatusIcon(result.status)}
                    <Text style={styles.resultStep}>{result.step}</Text>
                  </View>

                  <Text
                    style={[
                      styles.resultMessage,
                      result.status === "error" && styles.resultMessageError,
                    ]}
                  >
                    {result.message}
                  </Text>

                  {result.data && (
                    <View style={styles.resultData}>
                      {Object.entries(result.data).map(([key, value]) => (
                        <View key={key} style={styles.dataRow}>
                          <Text style={styles.dataLabel}>
                            {key.replace(/([A-Z])/g, " $1").trim()}:
                          </Text>
                          <Text style={styles.dataValue}>{String(value)}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          {testResults.length > 0 && !isRunning && (
            <TouchableOpacity
              style={styles.viewLogsButton}
              onPress={() => router.push("/mileage-logs")}
            >
              <MapPin color={colors.white} size={20} />
              <Text style={styles.viewLogsButtonText}>View Mileage Logs</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </LinearGradient>
    </View>
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
  header: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  backButton: {
    padding: 8,
    width: 40,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: colors.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    gap: 20,
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: "center" as const,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  infoTitle: {
    fontSize: 22,
    fontWeight: "700" as const,
    color: colors.text,
  },
  infoDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center" as const,
    lineHeight: 20,
  },
  actionButtons: {
    gap: 12,
  },
  button: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 10,
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  secondaryButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: colors.white,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: colors.text,
  },
  resultsContainer: {
    gap: 16,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: colors.text,
  },
  resultCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  resultCardError: {
    borderColor: colors.error,
    backgroundColor: colors.error + "10",
  },
  resultHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
  },
  resultStep: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: colors.text,
    flex: 1,
  },
  resultMessage: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  resultMessageError: {
    color: colors.error,
  },
  resultData: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    gap: 8,
    marginTop: 4,
  },
  dataRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    gap: 12,
  },
  dataLabel: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: colors.textSecondary,
    textTransform: "capitalize" as const,
    flex: 1,
  },
  dataValue: {
    fontSize: 12,
    color: colors.text,
    fontWeight: "500" as const,
    flex: 2,
    textAlign: "right" as const,
  },
  viewLogsButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: colors.success,
    gap: 10,
  },
  viewLogsButtonText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: colors.white,
  },
});
