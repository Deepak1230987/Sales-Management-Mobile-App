import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { AuthProvider } from "./contexts/AuthContext";

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" backgroundColor="#ffffff" />
      <Stack>
        <Stack.Screen
          name="login"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="signup"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="index"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="admin"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="biller"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="user"
          options={{
            headerShown: false,
          }}
        />
      </Stack>
    </AuthProvider>
  );
}
