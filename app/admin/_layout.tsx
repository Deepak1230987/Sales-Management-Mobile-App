import { Tabs, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";

import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../contexts/AuthContext";

export default function AdminLayout() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Protect admin routes
  useEffect(() => {
    if (!loading && user?.role !== "admin") {
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
          tabBarActiveTintColor: "#0DCFAC",
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
          name="users"
          options={{
           href: null, // This hides it from the tab bar
          }}
        />
        <Tabs.Screen
          name="items"
          options={{
            title: "Items",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="cube" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="claims"
          options={{
            title: "Claims",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="trophy" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="menu"
          options={{
            title: "Menu",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="menu" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="add-sale"
          options={{
            href: null, // This hides it from the tab bar
          }}
        />
        <Tabs.Screen
          name="add-items"
          options={{
            href: null, // This hides it from the tab bar
          }}
        />
        <Tabs.Screen
          name="edit-sale"
          options={{
            href: null, // This hides it from the tab bar
          }}
        />
        <Tabs.Screen
          name="sale-details"
          options={{
            href: null,
          }} // This hides it from the tab bar        }}
        />
        <Tabs.Screen
          name="item-form"
          options={{
            href: null,
          }} // This hides it from the tab bar        }}
        />
        <Tabs.Screen
          name="claim-form"
          options={{
            href: null,
          }} // This hides it from the tab bar        }}
        />
        <Tabs.Screen
          name="prizes"
          options={{
            href: null,
          }} // This hides it from the tab bar        }}
        />
        <Tabs.Screen
          name="prize-form"
          options={{
            href: null,
          }} // This hides it from the tab bar        }}
        />
        <Tabs.Screen
          name="claim-details"
          options={{
           href: null, // This hides it from the tab bar
          }}
        />
      </Tabs>
    </>
  );
}
