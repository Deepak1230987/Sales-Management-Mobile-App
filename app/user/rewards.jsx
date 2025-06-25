import { Ionicons } from "@expo/vector-icons";
import {
  collection,
  getDocs,
  getFirestore,
  orderBy,
  query,
  where,
} from "@react-native-firebase/firestore";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../contexts/AuthContext";

export default function UserRewards() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [claims, setClaims] = useState([]);
  const [loadingClaims, setLoadingClaims] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!loading && user?.role !== "user") {
      router.replace("/login");
    }
  }, [user, loading, router]);
  const fetchUserClaims = useCallback(async () => {
    if (!user?.phoneNumber) {
      console.log("No user phone number available for claims");
      console.log("User object:", JSON.stringify(user, null, 2));
      setLoadingClaims(false);
      return;
    }

    console.log("User object:", JSON.stringify(user, null, 2));
    console.log("Fetching claims for user phone:", user.phoneNumber);

    try {
      const db = getFirestore();
      const claimsQuery = query(
        collection(db, "claims"),
        where("phoneNo", "==", user.phoneNumber),
        orderBy("timestamp", "desc")
      );

      console.log("Executing claims query...");
      const claimsSnapshot = await getDocs(claimsQuery);
      console.log("Claims snapshot size:", claimsSnapshot.size);

      const claimsData = claimsSnapshot.docs.map((doc) => {
        const data = doc.data();
        console.log("Claim document:", doc.id, data);
        return {
          id: doc.id,
          ...data,
        };
      });

      console.log("Final claims data:", claimsData);
      setClaims(claimsData);
    } catch (error) {
      console.error("Error fetching claims:", error);
      Alert.alert("Error", "Failed to fetch your rewards history");
    } finally {
      setLoadingClaims(false);
      setRefreshing(false);
    }
  }, [user]);
  useEffect(() => {
    if (user?.phoneNumber) {
      fetchUserClaims();
    }
  }, [user?.phoneNumber, fetchUserClaims]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchUserClaims();
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "approved":
        return "#34C759";
      case "pending":
        return "#FF9500";
      case "rejected":
        return "#FF3B30";
      default:
        return "#8E8E93";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "approved":
        return "checkmark-circle";
      case "pending":
        return "time";
      case "rejected":
        return "close-circle";
      default:
        return "help-circle";
    }
  };

  const renderClaimItem = ({ item }) => (
    <View style={styles.claimCard}>
      <View style={styles.claimHeader}>
        <View style={styles.prizeInfo}>
          <Text style={styles.prizeName}>{item.prizeName}</Text>
          <Text style={styles.prizeCategory}>{item.prizeCategory}</Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) },
          ]}
        >
          <Ionicons
            name={getStatusIcon(item.status)}
            size={14}
            color="#FFFFFF"
          />
          <Text style={styles.statusText}>
            {item.status
              ? item.status.charAt(0).toUpperCase() + item.status.slice(1)
              : "Unknown"}
          </Text>
        </View>
      </View>

      <View style={styles.claimDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Customer:</Text>
          <Text style={styles.detailValue}>{item.customerName}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Phone:</Text>
          <Text style={styles.detailValue}>{item.customerPhone}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Points Used:</Text>
          <Text style={styles.pointsUsed}>{item.prizePoints} pts</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Claimed On:</Text>
          <Text style={styles.detailValue}>
            {formatTimestamp(item.timestamp)}
          </Text>
        </View>
      </View>

      {item.status === "approved" && (
        <View style={styles.approvedSection}>
          <Ionicons name="gift" size={20} color="#34C759" />
          <Text style={styles.approvedText}>
            Reward approved! You can collect your prize.
          </Text>
        </View>
      )}

      {item.status === "pending" && (
        <View style={styles.pendingSection}>
          <Ionicons name="hourglass" size={20} color="#FF9500" />
          <Text style={styles.pendingText}>
            Your claim is being reviewed. Please wait for approval.
          </Text>
        </View>
      )}

      {item.status === "rejected" && (
        <View style={styles.rejectedSection}>
          <Ionicons name="warning" size={20} color="#FF3B30" />
          <Text style={styles.rejectedText}>
            This claim was rejected. Contact support for more information.
          </Text>
        </View>
      )}
    </View>
  );

  if (loading || loadingClaims) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading your rewards...</Text>
      </View>
    );
  }

  const totalPointsUsed = claims.reduce(
    (total, claim) => total + (claim.prizePoints || 0),
    0
  );
  const approvedClaims = claims.filter(
    (claim) => claim.status === "approved"
  ).length;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{claims.length}</Text>
            <Text style={styles.statLabel}>Total Claims</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{approvedClaims}</Text>
            <Text style={styles.statLabel}>Approved</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{totalPointsUsed}</Text>
            <Text style={styles.statLabel}>Points Used</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Rewards History</Text>
          <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
            <Ionicons name="refresh-outline" size={20} color="#007AFF" />
          </TouchableOpacity>
        </View>

        {claims.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="gift-outline" size={64} color="#8E8E93" />
            <Text style={styles.emptyTitle}>No Rewards Yet</Text>
            <Text style={styles.emptyText}>
              Your claimed rewards will appear here. Start earning points to
              claim your first reward!
            </Text>
          </View>
        ) : (
          <FlatList
            data={claims}
            renderItem={renderClaimItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
    paddingTop: 20,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#8E8E93",
  },
  content: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "700",
    color: "#007AFF",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: "#8E8E93",
    fontWeight: "500",
    textAlign: "center",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1D1D1F",
  },
  refreshButton: {
    padding: 8,
  },
  emptyContainer: {
    alignItems: "center",
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1D1D1F",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: "#8E8E93",
    textAlign: "center",
    lineHeight: 22,
  },
  claimCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  claimHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  prizeInfo: {
    flex: 1,
    marginRight: 12,
  },
  prizeName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1D1D1F",
    marginBottom: 2,
  },
  prizeCategory: {
    fontSize: 12,
    color: "#8E8E93",
    fontWeight: "500",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  claimDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  detailLabel: {
    fontSize: 14,
    color: "#8E8E93",
    fontWeight: "500",
  },
  detailValue: {
    fontSize: 14,
    color: "#1D1D1F",
    fontWeight: "500",
    textAlign: "right",
    flex: 1,
    marginLeft: 12,
  },
  pointsUsed: {
    fontSize: 14,
    color: "#FF9500",
    fontWeight: "600",
    textAlign: "right",
    flex: 1,
    marginLeft: 12,
  },
  approvedSection: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E8",
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  approvedText: {
    fontSize: 14,
    color: "#34C759",
    fontWeight: "500",
    flex: 1,
  },
  pendingSection: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF3E0",
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  pendingText: {
    fontSize: 14,
    color: "#FF9500",
    fontWeight: "500",
    flex: 1,
  },
  rejectedSection: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFE8E8",
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  rejectedText: {
    fontSize: 14,
    color: "#FF3B30",
    fontWeight: "500",
    flex: 1,
  },
});
