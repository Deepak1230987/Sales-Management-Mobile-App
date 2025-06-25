import { Ionicons } from "@expo/vector-icons";
import {
  collection,
  getFirestore,
  onSnapshot,
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
import { useAuth } from "../contexts/AuthContext";

interface Claim {
  id: string;
  customerName: string;
  vehicleNo: string;
  phoneNo: string;
  prizeName: string;
  claimedPoints: number;
  date: any;
  status: "claimed" | "pending" | "processed";
  [key: string]: any;
}

export default function ClaimsManagement() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [activeTab, setActiveTab] = useState("User Claims");
  const [searchQuery, setSearchQuery] = useState("");
  const [userSearchQuery, setUserSearchQuery] = useState("");
  // Fetch claims
  useEffect(() => {
    // Only fetch if user is authenticated
    if (!user) {
      setLoading(false);
      return;
    }

    const db = getFirestore();
    const claimsCollection = collection(db, "claims");

    try {
      const q = query(claimsCollection);

      const unsubscribe = onSnapshot(
        q,
        (querySnapshot) => {
          if (querySnapshot && querySnapshot.docs) {
            const claimsData = querySnapshot.docs
              .map((doc) => {
                const data = doc.data();
                return {
                  id: doc.id,
                  customerName: data.customerName || "Unknown Customer",
                  vehicleNo: data.vehicleNo || "",
                  phoneNo: data.phoneNo || "",
                  prizeName: data.prizeName || "",
                  claimedPoints: data.claimedPoints || 0,
                  date: data.createdAt || data.date,
                  status: data.status || "claimed",
                  ...data,
                };
              })
              .sort((a, b) => {
                // Sort by timestamp
                const aTime = a.date?.seconds || 0;
                const bTime = b.date?.seconds || 0;
                return bTime - aTime;
              });

            setClaims(claimsData);
          } else {
            setClaims([]);
          }
          setLoading(false);
        },
        (error) => {
          console.error("Error fetching claims:", error);
          // Only set empty claims if it's not a permission error during logout
          if (
            !(error as any)?.code ||
            (error as any).code !== "firestore/permission-denied"
          ) {
            setClaims([]);
          }
          setLoading(false);
        }
      );

      return unsubscribe;
    } catch (error) {
      console.error("Error setting up claims listener:", error);
      setClaims([]);
      setLoading(false);
    }
  }, [user]);
  // Format date to show day, month format (e.g., "02 Jun, 25")
  const formatDate = (timestamp: any): string => {
    try {
      let date: Date;

      // Handle Firestore timestamp
      if (timestamp && typeof timestamp.toDate === "function") {
        date = timestamp.toDate();
      } else if (timestamp instanceof Date) {
        date = timestamp;
      } else if (timestamp && timestamp.seconds) {
        date = new Date(timestamp.seconds * 1000);
      } else {
        date = new Date();
      }

      if (isNaN(date.getTime())) {
        date = new Date();
      }

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
  // Filter claims based on search query
  const filteredClaims = claims.filter((claim) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      claim.customerName.toLowerCase().includes(query) ||
      claim.vehicleNo.toLowerCase().includes(query) ||
      claim.phoneNo.toLowerCase().includes(query) ||
      claim.prizeName.toLowerCase().includes(query)
    );
  });

  // Filter user claims based on vehicle number or phone number
  const filteredUserClaims = claims.filter((claim) => {
    if (!userSearchQuery.trim()) return [];
    const query = userSearchQuery.toLowerCase();
    return (
      claim.vehicleNo.toLowerCase().includes(query) ||
      claim.phoneNo.toLowerCase().includes(query)
    );
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "claimed":
        return "#30D158";
      case "pending":
        return "#FF9500";
      case "processed":
        return "#007AFF";
      default:
        return "#8E8E93";
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case "claimed":
        return "#E8F5E8";
      case "pending":
        return "#FFF4E6";
      case "processed":
        return "#E6F2FF";
      default:
        return "#F1F1F1";
    }
  };
  const handleClaimPress = (claimId: string) => {
    router.push(`/admin/claim-details?claimId=${claimId}`);
  };

  const renderClaimItem = ({ item }: { item: Claim }) => (
    <TouchableOpacity
      style={styles.claimCard}
      onPress={() => handleClaimPress(item.id)}
    >
      <View style={styles.claimHeader}>
        <View style={styles.claimInfo}>
          <Text style={styles.customerName}>{item.customerName}</Text>
          <Text style={styles.vehicleNo}>Vehicle: {item.vehicleNo}</Text>
          <Text style={styles.phoneNo}>Phone: {item.phoneNo}</Text>
        </View>
        <View style={styles.claimStatus}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusBgColor(item.status) },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                { color: getStatusColor(item.status) },
              ]}
            >
              {item.status.toUpperCase()}
            </Text>
          </View>
          <Text style={styles.claimDate}>{formatDate(item.date)}</Text>
        </View>
      </View>
      <View style={styles.claimDetails}>
        <View style={styles.prizeInfo}>
          <Text style={styles.prizeLabel}>Prize</Text>
          <Text style={styles.prizeName}>{item.prizeName}</Text>
        </View>
        <View style={styles.pointsInfo}>
          <Text style={styles.pointsLabel}>Points</Text>
          <Text style={styles.claimedPoints}>{item.claimedPoints}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
  if (loading) {
    return <TableSkeleton />;
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
                Welcome, {user?.username || "Admin"}
              </Text>
            </View>
          </View>
          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.headerIcon}>
              <Ionicons name="notifications-outline" size={24} color="#333" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerIcon}
              onPress={() => router.push("/admin/menu")}
            >
              <Ionicons name="settings-outline" size={24} color="#333" />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.tagContainer}>
          <Text style={styles.tag}>
            You are logged in as {user?.role || "Admin"}
          </Text>
        </View>
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === "Claimed Rewards" && styles.activeTabButton,
            ]}
            onPress={() => setActiveTab("Claimed Rewards")}
          >
            <Text
              style={[
                styles.tabButtonText,
                activeTab === "Claimed Rewards" && styles.activeTabButtonText,
              ]}
            >
              Claimed Rewards
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === "User Claims" && styles.activeTabButton,
            ]}
            onPress={() => setActiveTab("User Claims")}
          >
            <Text
              style={[
                styles.tabButtonText,
                activeTab === "User Claims" && styles.activeTabButtonText,
              ]}
            >
              User Claims
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      {/* Scrollable Content */}
      <ScrollView style={styles.scrollContainer}>
        <View style={styles.quickLinksContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickLinks}>
            <TouchableOpacity
              style={styles.quickLink}
              onPress={() => router.push("/admin/claim-form?claimId=new")}
            >
              <View
                style={[styles.quickLinkIcon, { backgroundColor: "#FF6B6B" }]}
              >
                <Ionicons name="add" size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.quickLinkText}>Add New Claim</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickLink}
              onPress={() => router.push("/admin/prizes")}
            >
              <View
                style={[styles.quickLinkIcon, { backgroundColor: "#4ECDC4" }]}
              >
                <Ionicons name="trophy" size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.quickLinkText}>Prize List</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickLink}>
              <View
                style={[styles.quickLinkIcon, { backgroundColor: "#45B7D1" }]}
              >
                <Ionicons name="analytics" size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.quickLinkText}>Reports</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickLink}>
              <View
                style={[styles.quickLinkIcon, { backgroundColor: "#5D9CEC" }]}
              >
                <Ionicons
                  name="chevron-forward-circle"
                  size={24}
                  color="#FFFFFF"
                />
              </View>
              <Text style={styles.quickLinkText}>Show All</Text>
            </TouchableOpacity>
          </View>
        </View>
        {activeTab === "Claimed Rewards" ? (
          <>
            <View style={styles.searchContainer}>
              <View style={styles.searchBar}>
                <Ionicons name="search" size={20} color="#8E8E93" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search claims..."
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
              <TouchableOpacity
                style={styles.refreshButton}
                onPress={() => setSearchQuery("")}
              >
                <Ionicons name="refresh" size={22} color="#E91E63" />
              </TouchableOpacity>
            </View>

            <View style={styles.claimsContainer}>
              <Text style={styles.sectionTitle}>Recent Claims</Text>
              {filteredClaims.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="trophy-outline" size={80} color="#C7C7CC" />
                  <Text style={styles.emptyTitle}>
                    {searchQuery ? "No claims found" : "No claims yet"}
                  </Text>
                  <Text style={styles.emptySubtitle}>
                    {searchQuery
                      ? "Try adjusting your search"
                      : "Add your first claim to get started"}
                  </Text>
                  {!searchQuery && (
                    <TouchableOpacity
                      style={styles.emptyAddButton}
                      onPress={() =>
                        router.push("/admin/claim-form?claimId=new")
                      }
                    >
                      <Text style={styles.emptyAddButtonText}>
                        Add New Claim
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <FlatList
                  data={filteredClaims}
                  keyExtractor={(item) => item.id}
                  renderItem={renderClaimItem}
                  showsVerticalScrollIndicator={false}
                  scrollEnabled={false}
                />
              )}
            </View>
          </>
        ) : (
          <>
            <View style={styles.searchContainer}>
              <View style={styles.searchBar}>
                <Ionicons name="search" size={20} color="#8E8E93" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by vehicle number or phone number..."
                  value={userSearchQuery}
                  onChangeText={setUserSearchQuery}
                  placeholderTextColor="#8E8E93"
                />
                {userSearchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setUserSearchQuery("")}>
                    <Ionicons name="close-circle" size={20} color="#8E8E93" />
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity
                style={styles.refreshButton}
                onPress={() => setUserSearchQuery("")}
              >
                <Ionicons name="refresh" size={22} color="#E91E63" />
              </TouchableOpacity>
            </View>

            <View style={styles.claimsContainer}>
              <Text style={styles.sectionTitle}>User Claims History</Text>
              {userSearchQuery.trim() === "" ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="person-outline" size={80} color="#C7C7CC" />
                  <Text style={styles.emptyTitle}>Search for User Claims</Text>
                  <Text style={styles.emptySubtitle}>
                    Enter a vehicle number or phone number to see all claims for
                    that user
                  </Text>
                </View>
              ) : filteredUserClaims.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="search-outline" size={80} color="#C7C7CC" />
                  <Text style={styles.emptyTitle}>No claims found</Text>
                  <Text style={styles.emptySubtitle}>
                    No claims found for the entered vehicle number or phone
                    number
                  </Text>
                </View>
              ) : (
                <>
                  <View style={styles.userSummary}>
                    <Text style={styles.userSummaryTitle}>
                      Found {filteredUserClaims.length} claim
                      {filteredUserClaims.length > 1 ? "s" : ""} for this user
                    </Text>
                    <Text style={styles.userSummarySubtitle}>
                      Total Points Claimed:
                      {filteredUserClaims.reduce(
                        (sum, claim) => sum + claim.claimedPoints,
                        0
                      )}
                    </Text>
                  </View>
                  <FlatList
                    data={filteredUserClaims}
                    keyExtractor={(item) => item.id}
                    renderItem={renderClaimItem}
                    showsVerticalScrollIndicator={false}
                    scrollEnabled={false}
                  />
                </>
              )}
            </View>
          </>
        )}
      </ScrollView>
      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push("/admin/claim-form?claimId=new")}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
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
    marginTop: 170,
  },
  loadingContainer: {
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
    flexDirection: "row",
    backgroundColor: "#FFF",
    borderRadius: 25,
    margin: 8,
    padding: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 20,
  },
  activeTabButton: {
    backgroundColor: "#E91E63",
  },
  tabButtonText: {
    color: "#666",
    fontWeight: "500",
  },
  activeTabButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  quickLinksContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    margin: 12,
    marginTop: 0,
    padding: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  quickLinks: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  quickLink: {
    alignItems: "center",
    width: "23%",
  },
  quickLinkIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  quickLinkText: {
    fontSize: 12,
    color: "#333",
    textAlign: "center",
    fontWeight: "500",
  },
  searchContainer: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 0,
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  refreshButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#E5E5EA",
    justifyContent: "center",
    alignItems: "center",
  },
  searchInput: {
    flex: 1,
    marginLeft: 5,
    fontSize: 16,
    color: "#1D1D1F",
    fontWeight: "400",
  },
  claimsContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    margin: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  claimCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F1F1F1",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  claimHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  claimInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1D1D1F",
    marginBottom: 4,
  },
  vehicleNo: {
    fontSize: 14,
    color: "#86868B",
    marginBottom: 2,
  },
  phoneNo: {
    fontSize: 14,
    color: "#86868B",
  },
  claimStatus: {
    alignItems: "flex-end",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  claimDate: {
    fontSize: 12,
    color: "#86868B",
  },
  claimDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F1F1",
  },
  prizeInfo: {
    flex: 1,
  },
  prizeLabel: {
    fontSize: 12,
    color: "#86868B",
    marginBottom: 2,
  },
  prizeName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1D1D1F",
  },
  pointsInfo: {
    alignItems: "flex-end",
  },
  pointsLabel: {
    fontSize: 12,
    color: "#86868B",
    marginBottom: 2,
    marginRight: 25,
  },
  claimedPoints: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FF6B6B",
    marginRight: 25,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#8E8E93",
    marginTop: 16,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#C7C7CC",
    marginTop: 8,
    textAlign: "center",
    lineHeight: 20,
  },
  emptyAddButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 24,
  },
  emptyAddButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  userSummary: {
    backgroundColor: "#F0F5FF",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#007AFF",
  },
  userSummaryTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1D1D1F",
    marginBottom: 4,
  },
  userSummarySubtitle: {
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "500",
  },
  fab: {
    position: "absolute",
    bottom: 26,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 28,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});
