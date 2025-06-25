import { Ionicons } from "@expo/vector-icons";
import {
  collection,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
} from "@react-native-firebase/firestore";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { TableSkeleton } from "../components/SkeletonLoader";

interface Prize {
  id: string;
  name: string;
  points: number;
  quantity: number;
  description?: string;
  category: string;
  isActive: boolean;
  createdAt: Date;
  [key: string]: any;
}

export default function PrizesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredPrizes, setFilteredPrizes] = useState<Prize[]>([]);

  // Fetch prizes
  useEffect(() => {
    const db = getFirestore();
    const prizesCollection = collection(db, "prizes");

    try {
      const q = query(prizesCollection, orderBy("createdAt", "desc"));

      const unsubscribe = onSnapshot(
        q,
        (querySnapshot) => {
          if (querySnapshot && querySnapshot.docs) {
            const prizesData = querySnapshot.docs.map((doc) => {
              const data = doc.data();
              let prizeDate = new Date();

              if (data.createdAt) {
                if (
                  data.createdAt.toDate &&
                  typeof data.createdAt.toDate === "function"
                ) {
                  try {
                    prizeDate = data.createdAt.toDate();
                  } catch (error) {
                    console.warn("Error converting createdAt:", error);
                    prizeDate = new Date();
                  }
                } else if (data.createdAt.seconds) {
                  prizeDate = new Date(data.createdAt.seconds * 1000);
                } else {
                  prizeDate = new Date();
                }
              } else {
                prizeDate = new Date();
              }
              return {
                id: doc.id,
                name: data.name || "Unknown Prize",
                points: data.points || 0,
                quantity: data.quantity || 1,
                description: data.description || "",
                category: data.category || "General",
                isActive: data.isActive !== false, // Default to true
                createdAt: prizeDate,
                ...data,
              };
            });

            setPrizes(prizesData);
          } else {
            setPrizes([]);
          }
          setLoading(false);
        },
        (error) => {
          console.error("Error fetching prizes:", error);
          setPrizes([]);
          setLoading(false);
        }
      );

      return unsubscribe;
    } catch (error) {
      console.error("Error setting up prizes listener:", error);
      setPrizes([]);
      setLoading(false);
    }
  }, []);

  // Filter prizes based on search query
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredPrizes(prizes);
    } else {
      const filtered = prizes.filter(
        (prize) =>
          prize.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          prize.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
          prize.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredPrizes(filtered);
    }
  }, [prizes, searchQuery]);

  const formatDate = (date: Date): string => {
    if (!date) {
      return new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "2-digit",
      });
    }

    if (!(date instanceof Date)) {
      try {
        date = new Date(date);
      } catch {
        return new Date().toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "2-digit",
        });
      }
    }

    if (isNaN(date.getTime())) {
      date = new Date();
    }
    try {
      const day = date.getDate().toString().padStart(2, "0");
      const month = date.toLocaleString("default", { month: "short" });
      const year = date.getFullYear().toString().substring(2);
      return `${day} ${month}, ${year}`;
    } catch {
      return new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "2-digit",
      });
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case "service":
        return "#007AFF";
      case "discount":
        return "#FF9800";
      case "product":
        return "#2196F3";
      case "maintenance":
        return "#9C27B0";
      default:
        return "#607D8B";
    }
  };

  const getCategoryBackgroundColor = (category: string) => {
    switch (category.toLowerCase()) {
      case "service":
        return "#E8F5E9";
      case "discount":
        return "#FFF3E0";
      case "product":
        return "#E3F2FD";
      case "maintenance":
        return "#F3E5F5";
      default:
        return "#ECEFF1";
    }
  };
  if (loading) {
    return <TableSkeleton />;
  }
  const renderPrizeItem = ({ item, index }: { item: Prize; index: number }) => (
    <View style={[styles.prizeItem, !item.isActive && styles.inactivePrize]}>
      {/* Header with prize name and status */}
      <View style={styles.prizeHeader}>
        <Text style={styles.prizeName}>{item.name}</Text>
        <View style={styles.statusContainer}>
          {!item.isActive && (
            <View style={styles.inactiveBadge}>
              <Text style={styles.inactiveText}>INACTIVE</Text>
            </View>
          )}
        </View>
      </View>
      {/* Prize details */}
      <View style={styles.prizeDetails}>
        <View style={styles.pointsSection}>
          <Text style={styles.pointsLabel}>Points Required</Text>
          <Text style={styles.pointsValue}>{item.points}</Text>
        </View>
        <View style={styles.quantitySection}>
          <Text style={styles.quantityLabel}>Available</Text>
          <Text style={styles.quantityValue}>{item.quantity}</Text>
        </View>
        <View
          style={[
            styles.categoryBadge,
            { backgroundColor: getCategoryBackgroundColor(item.category) },
          ]}
        >
          <Text
            style={[
              styles.categoryText,
              { color: getCategoryColor(item.category) },
            ]}
          >
            {item.category.toUpperCase()}
          </Text>
        </View>
      </View>
      {/* Description */}
      {item.description && (
        <View style={styles.descriptionSection}>
          <Text style={styles.description} numberOfLines={2}>
            {item.description}
          </Text>
        </View>
      )}
      {/* Footer with date only */}
      <View style={styles.prizeFooter}>
        <Text style={styles.prizeDate}>Added {formatDate(item.createdAt)}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Fixed Header */}
      <View style={styles.fixedHeaderContainer}>
        <View style={styles.header}>
          <View style={styles.headerPlaceholder}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.replace("/biller/claims")}
            >
              <Ionicons name="arrow-back" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Prize List</Text>
            <Text style={styles.headerSubtitle}>
              {filteredPrizes.length} prizes available
            </Text>
          </View>
          {/* <View style={styles.headerRight}>
            <TouchableOpacity style={styles.headerIcon}>
              <Ionicons name="filter-outline" size={24} color="#666" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerIcon}>
              <Ionicons name="settings-outline" size={24} color="#666" />
            </TouchableOpacity>
          </View> */}
        </View>
        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{prizes.length}</Text>
            <Text style={styles.statLabel}>Total Prizes</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {prizes.filter((p) => p.isActive).length}
            </Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {new Set(prizes.map((p) => p.category)).size}
            </Text>
            <Text style={styles.statLabel}>Categories</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {Math.min(...prizes.map((p) => p.points)) || 0}
            </Text>
            <Text style={styles.statLabel}>Min Points</Text>
          </View>
        </View>
      </View>

      {/* Scrollable Content */}
      <ScrollView style={styles.scrollContainer}>
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons
              name="search"
              size={20}
              color="#999"
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search prizes by name, category, description..."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <TouchableOpacity style={styles.filterButton}>
            <Ionicons name="options" size={22} color="#0066CC" />
          </TouchableOpacity>
        </View>

        <View style={styles.prizeListContainer}>
          <FlatList
            data={filteredPrizes}
            renderItem={renderPrizeItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            ListEmptyComponent={
              <View style={styles.emptyList}>
                <Ionicons name="gift-outline" size={48} color="#CCCCCC" />
                <Text style={styles.emptyListText}>No prizes found</Text>
                <Text style={styles.emptyListSubtext}>
                  Contact admin to add prizes
                </Text>
              </View>
            }
          />
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      {/* <View style={styles.fabContainer}>
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push("/biller/prize-form?fresh=true")}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
          <Text style={styles.fabText}>Add New Prize</Text>
        </TouchableOpacity>
      </View> */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
    top: 2,
  },
  fixedHeaderContainer: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
    marginTop: 25,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },
  backButton: {
    padding: 8,
    width: 40, // Ensure consistent width for back button
    alignItems: "center",
    justifyContent: "center",
  },
  headerPlaceholder: {
    padding: 0,
    width: 40, // Same width as back button for consistent layout
  },
  headerCenter: {
    flex: 1,
    justifyContent: "center",
    marginLeft: 16,
    alignItems: "flex-start",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  headerRight: {
    flexDirection: "row",
  },
  headerIcon: {
    marginLeft: 12,
    padding: 8,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 12,
    backgroundColor: "#F8F9FA",
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#007AFF",
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  scrollContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 12,
    height: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 14,
    color: "#333",
  },
  filterButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    marginLeft: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  prizeListContainer: {
    paddingHorizontal: 10,
    paddingBottom: 80,
  },
  emptyList: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  emptyListText: {
    marginTop: 12,
    fontSize: 16,
    color: "#999",
    fontWeight: "500",
  },
  emptyListSubtext: {
    marginTop: 4,
    fontSize: 14,
    color: "#CCC",
    textAlign: "center",
  },
  prizeItem: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  inactivePrize: {
    opacity: 0.6,
    backgroundColor: "#F5F5F5",
  },
  prizeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  prizeName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    flex: 1,
  },
  statusContainer: {
    flexDirection: "row",
  },
  inactiveBadge: {
    backgroundColor: "#FFE0E0",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  inactiveText: {
    fontSize: 10,
    color: "#D32F2F",
    fontWeight: "600",
  },
  prizeDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  pointsSection: {
    flex: 1,
  },
  pointsLabel: {
    fontSize: 12,
    color: "#888",
    marginBottom: 2,
  },
  pointsValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#007AFF",
  },
  quantitySection: {
    flex: 1,
    marginLeft: 16,
  },
  quantityLabel: {
    fontSize: 12,
    color: "#888",
    marginBottom: 2,
  },
  quantityValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#007AFF",
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: "600",
  },
  descriptionSection: {
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  prizeFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  prizeDate: {
    fontSize: 12,
    color: "#888",
  },
  prizeActions: {
    flexDirection: "row",
  },
  iconButton: {
    marginLeft: 12,
  },
  fabContainer: {
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 999,
  },
  fab: {
    flexDirection: "row",
    backgroundColor: "#007AFF",
    borderRadius: 30,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  fabText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    marginLeft: 8,
    fontSize: 16,
  },
});
