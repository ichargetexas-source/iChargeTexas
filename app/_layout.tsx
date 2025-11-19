import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useRef } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ServiceContext } from "@/constants/serviceContext";
import { UserContext } from "@/constants/userContext";
import { LanguageContext } from "@/constants/languageContext";
import { MessengerContext } from "@/constants/messengerContext";
import { AuthContext, useAuth } from "@/constants/authContext";
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import { Platform, LogBox } from "react-native";
import { trpc, trpcClient } from "@/lib/trpc";

SplashScreen.preventAutoHideAsync();

LogBox.ignoreLogs([
  'source.uri should not be an empty string',
]);

const queryClient = new QueryClient();

function RootLayoutNav() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.replace("/login");
      }
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      const subscription = Notifications.addNotificationResponseReceivedListener(response => {
        const data = response.notification.request.content.data;
        console.log('Notification tapped with data:', data);
        
        if (data?.category === 'message' || data?.category === 'admin_note') {
          if (data.requestId) {
            setTimeout(() => {
              router.push('/(tabs)/notes');
            }, 100);
          }
        }
      });

      return () => {
        subscription.remove();
      };
    }
  }, [router]);

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerBackTitle: "Back" }}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

        <Stack.Screen 
          name="user-management" 
          options={{ 
            title: "User Management",
            headerShown: false,
          }} 
        />
        <Stack.Screen 
          name="invoice-detail" 
          options={{ 
            title: "Invoice Details",
            headerShown: false,
          }} 
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const notificationListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    SplashScreen.hideAsync();

    if (Platform.OS !== 'web') {
      notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
        console.log('Notification received:', notification);
      });

      return () => {
        if (notificationListener.current) {
          notificationListener.current.remove();
        }
      };
    }
  }, []);

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <AuthContext>
          <LanguageContext>
            <UserContext>
              <ServiceContext>
                <MessengerContext>
                  <GestureHandlerRootView style={{ flex: 1 }}>
                    <RootLayoutNav />
                  </GestureHandlerRootView>
                </MessengerContext>
              </ServiceContext>
            </UserContext>
          </LanguageContext>
        </AuthContext>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
