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
import { useEffect, useState } from "react";
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

export default function UserHome() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [sales, setSales] = useState([]);
  const [loadingSales, setLoadingSales] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  useEffect(() => {
    if (!loading && user?.role !== "user") {
      router.replace("/login");
    }
  }, [user, loading, router]);
  useEffect(() => {
    const fetchUserSales = async () => {
      if (!user?.phoneNumber) {
        console.log("No user phone number available");
        console.log("User object:", JSON.stringify(user, null, 2));
        setLoadingSales(false);
        return;
      }

      console.log("=== DEBUGGING SALES FETCH ===");
      console.log("User object:", JSON.stringify(user, null, 2));
      console.log("Fetching sales for user phone:", user.phoneNumber);
      console.log("User phone number type:", typeof user.phoneNumber);

      try {
        const db = getFirestore();

        // First, let's check if there are any sales documents at all
        console.log("Checking all sales in collection...");
        const allSalesQuery = query(
          collection(db, "sales"),
          orderBy("timestamp", "desc")
        );
        const allSalesSnapshot = await getDocs(allSalesQuery);
        console.log("Total sales in collection:", allSalesSnapshot.size);

        // Log first few sales to see their structure
        allSalesSnapshot.docs.slice(0, 3).forEach((doc, index) => {
          const data = doc.data();
          console.log(`Sample sale ${index + 1}:`, doc.id, data);
          console.log(`Fields in sale ${index + 1}:`, Object.keys(data));
          if (data.phoneNumber)
            console.log(`phoneNumber field: "${data.phoneNumber}"`);
          if (data.customerPhone)
            console.log(`customerPhone field: "${data.customerPhone}"`);
        });

        const salesQuery = query(
          collection(db, "sales"),
          orderBy("timestamp", "desc"),
          where("phoneNumber", "==", user.phoneNumber)
        );

        console.log("Executing sales query...");
        const salesSnapshot = await getDocs(salesQuery);
        console.log("Sales snapshot size:", salesSnapshot.size);

        const salesData = salesSnapshot.docs.map((doc) => {
          const data = doc.data();
          console.log("Sale document:", doc.id, data);
          return {
            id: doc.id,
            ...data,
          };
        });

        console.log("Final sales data:", salesData);
        setSales(salesData);
      } catch (error) {
        console.error("Error fetching sales:", error);
        Alert.alert("Error", "Failed to fetch your sales history");
      } finally {
        setLoadingSales(false);
        setRefreshing(false);
      }
    };

    if (user?.phoneNumber) {
      fetchUserSales();
    }
  }, [user?.phoneNumber]);

  const onRefresh = async () => {
    if (!user?.phoneNumber) {
      console.log("No user phone number available for refresh");
      return;
    }

    setRefreshing(true);

    try {
      const db = getFirestore();

      const salesQuery = query(
        collection(db, "sales"),
        orderBy("timestamp", "desc"),
        where("phoneNumber", "==", user.phoneNumber)
      );

      console.log("Refreshing sales query...");
      const salesSnapshot = await getDocs(salesQuery);
      console.log("Refresh sales snapshot size:", salesSnapshot.size);

      const salesData = salesSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
        };
      });

      setSales(salesData);
    } catch (error) {
      console.error("Error refreshing sales:", error);
      Alert.alert("Error", "Failed to refresh your sales history");
    } finally {
      setRefreshing(false);
    }
  };

  const calculateTotalPoints = (items) => {
    return items.reduce((total, item) => {
      if (item.unit === "Ltr") {
        return total + parseFloat(item.quantity || 0);
      } else {
        return total + 20; // 20 points for buc/pcs items
      }
    }, 0);
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  const renderSaleItem = ({ item }) => (
    <View style={styles.saleCard}>
      <View style={styles.saleHeader}>
        <Text style={styles.saleId}>Sale #{item.id.slice(-6)}</Text>
        <Text style={styles.saleDate}>{formatTimestamp(item.timestamp)}</Text>
      </View>

      <View style={styles.customerInfo}>
        <Text style={styles.customerName}>{item.customerName}</Text>
        <Text style={styles.customerPhone}>{item.customerPhone}</Text>
      </View>

      <View style={styles.itemsList}>
        {item.items?.map((saleItem, index) => (
          <View key={index} style={styles.itemRow}>
            <Text style={styles.itemName}>{saleItem.name}</Text>
            <Text style={styles.itemDetails}>
              {saleItem.quantity} {saleItem.unit}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.saleFooter}>
        <View style={styles.pointsContainer}>
          <Ionicons name="star" size={16} color="#FFD700" />
          <Text style={styles.pointsText}>
            {calculateTotalPoints(item.items || [])} Points Earned
          </Text>
        </View>
        <Text style={styles.totalAmount}>₹{item.totalAmount}</Text>
      </View>
    </View>
  );

  if (loading || loadingSales) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading your sales...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.userName}>{user?.username}</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={24} color="#FF3B30" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{sales.length}</Text>
            <Text style={styles.statLabel}>Total Purchases</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {sales.reduce(
                (total, sale) => total + calculateTotalPoints(sale.items || []),
                0
              )}
            </Text>
            <Text style={styles.statLabel}>Points Earned</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Purchase History</Text>
          <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
            <Ionicons name="refresh-outline" size={20} color="#007AFF" />
          </TouchableOpacity>
        </View>

        {sales.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={64} color="#8E8E93" />
            <Text style={styles.emptyTitle}>No Purchases Yet</Text>
            <Text style={styles.emptyText}>
              Your purchase history will appear here once you make your first
              purchase.
            </Text>
          </View>
        ) : (
          <FlatList
            data={sales}
            renderItem={renderSaleItem}
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
    paddingTop: 20, // Adjust for status bar height
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  userInfo: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 14,
    color: "#8E8E93",
    fontWeight: "400",
  },
  userName: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1D1D1F",
    marginTop: 2,
  },
  logoutButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
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
    fontSize: 24,
    fontWeight: "700",
    color: "#007AFF",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
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
  saleCard: {
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
  saleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  saleId: {
    fontSize: 16,
    fontWeight: "600",
    color: "#007AFF",
  },
  saleDate: {
    fontSize: 12,
    color: "#8E8E93",
  },
  customerInfo: {
    marginBottom: 12,
  },
  customerName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1D1D1F",
    marginBottom: 2,
  },
  customerPhone: {
    fontSize: 14,
    color: "#8E8E93",
  },
  itemsList: {
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  itemName: {
    fontSize: 14,
    color: "#1D1D1F",
    flex: 1,
  },
  itemDetails: {
    fontSize: 14,
    color: "#8E8E93",
    fontWeight: "500",
  },
  saleFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E5EA",
  },
  pointsContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  pointsText: {
    fontSize: 14,
    color: "#8E8E93",
    marginLeft: 4,
    fontWeight: "500",
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: "600",
    color: "#34C759",
  },
});
