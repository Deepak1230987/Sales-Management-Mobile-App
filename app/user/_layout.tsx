import { Ionicons } from "@expo/vector-icons";
import { Tabs, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";

export default function UserLayout() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Protect user routes
  useEffect(() => {
    if (!loading && user?.role !== "user") {
      router.replace("/");
    }
  }, [user, loading, router]);

  if (loading) {
    return null; // Or a loading spinner
  }

  return (
    <>
      <StatusBar style="dark" backgroundColor="#ffffff" />
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: "#000000",
          tabBarInactiveTintColor: "#888888",
          tabBarLabelStyle: { fontSize: 12 },
          tabBarStyle: { borderTopWidth: 1, borderTopColor: "#EEEEEE" },
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="rewards"
          options={{
            title: "Rewards",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="gift" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </>
  );
}
