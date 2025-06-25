import { Ionicons } from "@expo/vector-icons";
import {
  collection,
  getFirestore,
  onSnapshot,
} from "@react-native-firebase/firestore";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { TableSkeleton } from "../components/SkeletonLoader";
import { useAuth } from "../contexts/AuthContext";

type Item = {
  id: string;
  name: string;
  description?: string;
  salePrice: number;
  purchasePrice: number;
  category?: string;
  unit?: string;
  itemCode?: string;
  hsnCode?: string;
  stockQuantity: number;
  minStockQuantity?: number;
  taxRate?: number;
  createdAt?: any;
  updatedAt?: any;
};

export default function ItemsManagement() {
  const { user } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  useEffect(() => {
    if (user?.role === "biller") {
      loadItems();
    }
  }, [user?.role]);

  const loadItems = () => {
    setLoading(true);
    setError(null);

    const db = getFirestore();
    const itemsCollectionRef = collection(db, "items");

    const unsubscribe = onSnapshot(
      itemsCollectionRef,
      (snapshot) => {
        if (snapshot && snapshot.docs) {
          const itemsData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Item[];
          setItems(itemsData);
          setLoading(false);
          setRefreshing(false);
        } else {
          setItems([]);
          setLoading(false);
          setRefreshing(false);
        }
      },
      (error) => {
        console.error("Error fetching items:", error);
        setError("Failed to load items. Please try again.");
        setLoading(false);
        setRefreshing(false);
      }
    );

    return unsubscribe;
  };
  const filterItems = useCallback(() => {
    let filtered = items;

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.itemCode?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredItems(filtered);
  }, [items, searchQuery]);

  useEffect(() => {
    filterItems();
  }, [filterItems]);
  const onRefresh = () => {
    setRefreshing(true);
    loadItems();
  };

  // Billers can only view items, no editing allowed
  const renderItem = ({ item }: { item: Item }) => {
    return (
      <View style={styles.itemCard}>
        {/* Header with item name */}
        <View style={styles.itemHeader}>
          <View style={styles.itemTitleSection}>
            <Text style={styles.itemName} numberOfLines={1}>
              {item.name} {item.itemCode && `[ ${item.itemCode} ]`}
            </Text>
          </View>
        </View>

        {/* Three column layout */}
        <View style={styles.itemDetailsRow}>
          <View style={styles.detailColumn}>
            <Text style={styles.detailLabel}>Sale Price</Text>
            <Text style={styles.detailValue}>
              ₹ {item.salePrice.toFixed(2)}
            </Text>
          </View>
          {/* <View style={styles.detailColumn}>
            <Text style={styles.detailLabel}>Purchase Price</Text>
            <Text style={styles.detailValue}>
              ₹ {(item.purchasePrice || 0).toFixed(2)}
            </Text>
          </View> */}
          <View style={styles.detailColumn}>
            <Text style={styles.detailLabel}>In Stock</Text>
            <Text style={[styles.detailValue, styles.stockValue]}>
              {item.stockQuantity.toFixed(1)}
            </Text>
          </View>
        </View>
      </View>
    );
  };
  if (loading) {
    return <TableSkeleton />;
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#FF3B30" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadItems}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }
  return (
    <View style={styles.container}>
      {/* Fixed Header and Tabs */}
      <View style={styles.fixedHeaderContainer}>
        <View style={styles.header}>
          <View style={styles.businessInfo}>
            <View style={styles.businessLogoContainer}>
              <Ionicons name="business" size={24} color="#0066CC" />
            </View>
            <View>
              <Text style={styles.businessName}>MAURYA ENTERPRISES</Text>
              <Text style={styles.welcomeText}>
                Welcome, {user?.username || "Biller"}
              </Text>
            </View>
          </View>
          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.headerIcon}>
              <Ionicons name="notifications-outline" size={24} color="#333" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerIcon}
              onPress={() => router.push("/biller/menu")}
            >
              <Ionicons name="settings-outline" size={24} color="#333" />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.tagContainer}>
          <Text style={styles.tag}>
            You are logged in as {user?.role || "Biller"}
          </Text>
        </View>
        <View style={styles.tabContainer}>
          <View style={styles.tabContent}>
            <Text style={styles.title}>Item Details</Text>
            <Text style={styles.subtitle}>
              {filteredItems.length} of {items.length} items
            </Text>
          </View>
        </View>
      </View>

      {/* Scrollable Content */}
      <ScrollView style={styles.scrollContainer}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#8E8E93" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search items..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#8E8E93"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={20} color="#8E8E93" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Items List */}
        {filteredItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="cube-outline" size={80} color="#C7C7CC" />
            <Text style={styles.emptyTitle}>
              {searchQuery ? "No items found" : "No items yet"}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? "Try adjusting your search"
                : "Contact admin to add items"}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredItems}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            scrollEnabled={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
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
    top: 25,
  },
  fixedHeaderContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
    marginBottom: 10,
    flexDirection: "column",
  },
  scrollContainer: {
    flex: 1,
    marginTop: 140,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },
  businessInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  businessLogoContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f0f5ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  businessName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  welcomeText: {
    fontSize: 13,
    color: "#666",
  },
  tagContainer: {
    paddingVertical: 2,
    paddingHorizontal: 16,
    backgroundColor: "#F0F5FF",
    borderRadius: 20,
    alignItems: "center",
  },
  tag: {
    fontSize: 12,
    color: "#06C565",
    fontStyle: "italic",
    marginTop: 2,
    textAlign: "center",
  },
  headerIcons: {
    flexDirection: "row",
  },
  headerIcon: {
    marginLeft: 16,
  },
  tabContainer: {
    backgroundColor: "#557D5D",
    borderRadius: 4,
    margin: 8,
    padding: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabContent: {
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: "#FFFFFF",
    marginTop: 4,
    fontWeight: "500",
  },
  searchContainer: {
    marginTop: 18,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 0,
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: "#1D1D1F",
    fontWeight: "400",
  },
  listContainer: {
    padding: 20,
    paddingTop: 8,
  },
  itemCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#F1F1F1",
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  itemTitleSection: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "400",
    color: "#1D1D1F",
    lineHeight: 20,
  },
  actionButton: {
    padding: 4,
  },
  itemDetailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  detailColumn: {
    flex: 1,
    alignItems: "flex-start",
  },
  detailLabel: {
    fontSize: 13,
    color: "#86868B",
    marginBottom: 4,
    fontWeight: "400",
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "400",
    color: "#1D1D1F",
  },
  stockValue: {
    color: "#30D158",
    fontWeight: "500",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
  },
  loadingText: {
    marginTop: 20,
    fontSize: 17,
    color: "#86868B",
    fontWeight: "500",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    padding: 24,
  },
  errorText: {
    fontSize: 17,
    color: "#86868B",
    textAlign: "center",
    marginTop: 20,
    marginBottom: 32,
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "600",
    color: "#86868B",
    marginTop: 20,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 17,
    color: "#C7C7CC",
    marginTop: 12,
    textAlign: "center",
    lineHeight: 24,
  },
  emptyAddButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 32,
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyAddButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "600",
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    backgroundColor: "#007AFF",
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});
