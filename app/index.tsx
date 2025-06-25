import { useRouter } from "expo-router";
import { useEffect } from "react";
import { View } from "react-native";
import { SkeletonLoader } from "./components/SkeletonLoader";
import { useAuth } from "./contexts/AuthContext";

export default function Index() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
    } else {
      // Make sure role is defined before navigating
      const role = user.role || "user";

      switch (role) {
        case "admin":
          router.replace("/admin");
          break;
        case "biller":
          router.replace("/biller");
          break;
        case "user":
        default:
          router.replace("/user");
          break;
      }
    }
  }, [user, loading, router]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#F8F9FA",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
      }}
    >
      {/* App Logo Skeleton */}
      <View style={{ marginBottom: 40, alignItems: "center" }}>
        <SkeletonLoader
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            marginBottom: 16,
          }}
        />
        <SkeletonLoader
          style={{
            width: 150,
            height: 24,
            borderRadius: 4,
            marginBottom: 8,
          }}
        />
        <SkeletonLoader
          style={{
            width: 200,
            height: 16,
            borderRadius: 4,
          }}
        />
      </View>

      {/* Loading Indicator */}
      <View style={{ alignItems: "center" }}>
        <SkeletonLoader
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            marginBottom: 16,
          }}
        />
        <SkeletonLoader
          style={{
            width: 120,
            height: 16,
            borderRadius: 4,
          }}
        />
      </View>
    </View>
  );
}
