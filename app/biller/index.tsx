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
import { DashboardSkeleton } from "../components/SkeletonLoader";
import { useAuth } from "../contexts/AuthContext";

interface TransactionItem {
  id: string;
  transactionId: string;
  amount: number;
  balance: number;
  date: any;
  type: string;
  customerName: string;
  paymentType: string;
  phoneNumber: string;
  invoiceNumber: number;
  [key: string]: any;
}

export default function BillerDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [claims, setClaims] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("Transaction Details");
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [transactionSearchQuery, setTransactionSearchQuery] = useState("");
  const [filteredUserTransactions, setFilteredUserTransactions] = useState<
    any[]
  >([]);
  const [filteredTransactions, setFilteredTransactions] = useState<any[]>([]);
  // Fetch transactions
  useEffect(() => {
    // Only fetch if user is authenticated
    if (!user) {
      setLoading(false);
      return;
    }

    const db = getFirestore();
    const salesCollection = collection(db, "sales");

    try {
      const q = query(salesCollection);

      const unsubscribe = onSnapshot(
        q,
        (querySnapshot) => {
          if (querySnapshot && querySnapshot.docs) {
            const transactionData = querySnapshot.docs
              .map((doc) => {
                const data = doc.data();
                return {
                  id: doc.id,
                  transactionId:
                    data.invoiceNumber?.toString() || doc.id.substring(0, 8),
                  amount: data.totalAmount || 0,
                  balance: data.balanceAmount || 0, // Use stored balance amount
                  date: data.date || data.createdAt,
                  type: "SALE",
                  customerName: data.customerName || "Unknown Customer",
                  paymentType: data.paymentType || "Cash",
                  phoneNumber: data.phoneNumber || "",
                  items: data.items || [],
                  invoiceNumber: data.invoiceNumber || 0,
                  ...data,
                };
              })
              .sort((a, b) => {
                // Sort by invoice number descending (latest invoice first)
                const invoiceA = a.invoiceNumber || 0;
                const invoiceB = b.invoiceNumber || 0;
                return invoiceB - invoiceA;
              });

            setTransactions(transactionData);
          } else {
            setTransactions([]);
          }
          setLoading(false);
        },
        (error) => {
          console.error("Error fetching transactions:", error);
          // Only set empty transactions if it's not a permission error during logout
          if (
            !(error as any)?.code ||
            (error as any).code !== "firestore/permission-denied"
          ) {
            setTransactions([]);
          }
          setLoading(false);
        }
      );

      return unsubscribe;
    } catch (error) {
      console.error("Error setting up sales listener:", error);
      setTransactions([]);
      setLoading(false);
    }
  }, [user]);
  // Fetch claims
  useEffect(() => {
    // Only fetch if user is authenticated
    if (!user) {
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
            const claimsData = querySnapshot.docs.map((doc) => {
              const data = doc.data();
              return {
                id: doc.id,
                customerName: data.customerName || "Unknown Customer",
                phoneNo: data.phoneNo || "",
                claimedPoints: data.claimedPoints || 0,
                ...data,
              };
            });
            setClaims(claimsData);
          } else {
            setClaims([]);
          }
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
        }
      );

      return unsubscribe;
    } catch (error) {
      console.error("Error setting up claims listener:", error);
      setClaims([]);
    }
  }, [user]);
  // Filter user transactions based on search query
  useEffect(() => {
    if (userSearchQuery.trim() === "") {
      setFilteredUserTransactions([]);
    } else {
      const filtered = transactions.filter(
        (transaction) =>
          transaction.customerName
            .toLowerCase()
            .includes(userSearchQuery.toLowerCase()) ||
          transaction.phoneNumber
            .toLowerCase()
            .includes(userSearchQuery.toLowerCase())
      );
      setFilteredUserTransactions(filtered);
    }
  }, [transactions, userSearchQuery]);

  // Filter transactions based on search query for Transaction Details tab
  useEffect(() => {
    if (transactionSearchQuery.trim() === "") {
      setFilteredTransactions(transactions);
    } else {
      const filtered = transactions.filter(
        (transaction) =>
          transaction.customerName
            .toLowerCase()
            .includes(transactionSearchQuery.toLowerCase()) ||
          transaction.phoneNumber
            .toLowerCase()
            .includes(transactionSearchQuery.toLowerCase()) ||
          transaction.invoiceNumber
            .toString()
            .includes(transactionSearchQuery.toLowerCase()) ||
          transaction.transactionId
            .toLowerCase()
            .includes(transactionSearchQuery.toLowerCase())
      );
      setFilteredTransactions(filtered);
    }
  }, [transactions, transactionSearchQuery]);

  // Calculate points for a user
  const calculateUserPoints = (customerName: string, phoneNumber: string) => {
    // Get all transactions for this user
    const userTransactions = transactions.filter(
      (transaction) =>
        transaction.customerName.toLowerCase() === customerName.toLowerCase() ||
        transaction.phoneNumber === phoneNumber
    );

    // Calculate total earned points
    let totalEarnedPoints = 0;
    userTransactions.forEach((transaction) => {
      if (transaction.items && Array.isArray(transaction.items)) {
        transaction.items.forEach((item: any) => {
          if (item.unit === "buc" || item.unit === "pcs") {
            totalEarnedPoints += 20;
          } else if (item.unit === "Ltr") {
            totalEarnedPoints += item.quantity || 0;
          }
        });
      }
    });

    // Get all claims for this user
    const userClaims = claims.filter(
      (claim) =>
        claim.customerName.toLowerCase() === customerName.toLowerCase() ||
        claim.phoneNo === phoneNumber
    );

    // Calculate total claimed points
    const totalClaimedPoints = userClaims.reduce(
      (total, claim) => total + (claim.claimedPoints || 0),
      0
    );

    // Calculate remaining points
    const remainingPoints = totalEarnedPoints - totalClaimedPoints;

    return {
      totalEarnedPoints,
      totalClaimedPoints,
      remainingPoints,
      userTransactions,
      userClaims,
    };
  }; // Format date to show day, month format (e.g., "02 Jun, 25")
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
  if (loading) {
    return <DashboardSkeleton />;
  }
  const renderTransactionItem = ({
    item,
    index,
  }: {
    item: TransactionItem;
    index: number;
  }) => (
    <TouchableOpacity
      style={styles.transactionItem}
      onPress={() => router.push(`/biller/sale-details?saleId=${item.id}`)}
    >
      {/* Header with customer name and invoice number */}
      <View style={styles.transactionHeader}>
        <Text style={styles.customerName}>
          {item.customerName || item.transactionId.toUpperCase()}
        </Text>
        <Text style={styles.invoiceNumber}>#{item.invoiceNumber || "000"}</Text>
      </View>
      {/* Sale tag and date */}
      <View style={styles.saleTagRow}>
        <View style={styles.salesTag}>
          <Text style={styles.salesTagText}>SALE</Text>
        </View>
        <Text style={styles.transactionDate}>{formatDate(item.date)}</Text>
      </View>
      {/* Amount details and actions */}
      <View style={styles.transactionDetails}>
        <View style={styles.amountSection}>
          <View style={styles.amountItem}>
            <Text style={styles.detailLabel}>Total</Text>
            <Text style={styles.detailAmount}>₹ {item.amount.toFixed(2)}</Text>
          </View>
          <View style={styles.amountItem}>
            <Text style={styles.detailLabel}>Balance</Text>
            <Text
              style={[
                styles.detailAmount,
                item.balance > 0 ? styles.balanceDue : styles.balancePaid,
              ]}
            >
              ₹ {item.balance.toFixed(2)}
            </Text>
          </View>
        </View>
        <View style={styles.transactionActions}>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="print-outline" size={20} color="#888" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="share-outline" size={20} color="#888" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="ellipsis-vertical" size={20} color="#888" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

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
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === "Transaction Details" && styles.activeTabButton,
            ]}
            onPress={() => setActiveTab("Transaction Details")}
          >
            <Text
              style={[
                styles.tabButtonText,
                activeTab === "Transaction Details" &&
                  styles.activeTabButtonText,
              ]}
            >
              Transaction Details
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === "Party Details" && styles.activeTabButton,
            ]}
            onPress={() => setActiveTab("Party Details")}
          >
            <Text
              style={[
                styles.tabButtonText,
                activeTab === "Party Details" && styles.activeTabButtonText,
              ]}
            >
              Party Details
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      {/* Scrollable Content */}
      <ScrollView style={styles.scrollContainer}>
        {activeTab === "Transaction Details" ? (
          <>
            {/* <View style={styles.quickLinksContainer}>
              <Text style={styles.sectionTitle}>Quick Links</Text>
              <View style={styles.quickLinks}>
                 
                <TouchableOpacity
                  style={styles.quickLink}
                  onPress={() => router.push("/biller/add-sale?fresh=true")}
                >
                  <View
                    style={[styles.quickLinkIcon, { backgroundColor: "#FF6B6B" }]}
                  >
                    <Ionicons name="add" size={24} color="#FFFFFF" />
                  </View>
                  <Text style={styles.quickLinkText}>Add Txn</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.quickLink}>
                  <View
                    style={[styles.quickLinkIcon, { backgroundColor: "#4ECDC4" }]}
                  >
                    <Ionicons name="document-text" size={24} color="#FFFFFF" />
                  </View>
                  <Text style={styles.quickLinkText}>Sale Report</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.quickLink}>
                  <View
                    style={[styles.quickLinkIcon, { backgroundColor: "#45B7D1" }]}
                  >
                    <Ionicons name="settings" size={24} color="#FFFFFF" />
                  </View>
                  <Text style={styles.quickLinkText}>Txn Settings</Text>
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
            </View> */}
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
                  placeholder="Search for a transaction"
                  placeholderTextColor="#999"
                  value={transactionSearchQuery}
                  onChangeText={setTransactionSearchQuery}
                />
                {transactionSearchQuery.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setTransactionSearchQuery("")}
                    style={{ marginLeft: 8 }}
                  >
                    <Ionicons name="close-circle" size={20} color="#999" />
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity
                style={styles.filterButton}
                onPress={() => setTransactionSearchQuery("")}
              >
                <Ionicons name="refresh" size={22} color="#0066CC" />
              </TouchableOpacity>
            </View>
            <View style={styles.transactionListContainer}>
              <FlatList
                data={filteredTransactions}
                renderItem={renderTransactionItem}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                ListEmptyComponent={
                  <View style={styles.emptyList}>
                    <Ionicons
                      name="document-text-outline"
                      size={48}
                      color="#CCCCCC"
                    />
                    <Text style={styles.emptyListText}>
                      {transactionSearchQuery.trim() !== ""
                        ? "No transactions found"
                        : "No transactions yet"}
                    </Text>
                    {transactionSearchQuery.trim() !== "" && (
                      <Text style={styles.emptyListSubtext}>
                        Try adjusting your search criteria
                      </Text>
                    )}
                  </View>
                }
              />
            </View>
          </>
        ) : (
          <View style={styles.transactionListContainer}>
            {/* Party Details Content */}
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
                  placeholder="Search by customer name or phone number"
                  placeholderTextColor="#999"
                  value={userSearchQuery}
                  onChangeText={setUserSearchQuery}
                />
              </View>

              <TouchableOpacity
                style={styles.refreshButton}
                onPress={() => {
                  setUserSearchQuery("");
                  setFilteredUserTransactions([]);
                }}
              >
                <Ionicons name="refresh" size={22} color="#E91E63" />
              </TouchableOpacity>
            </View>
            {filteredUserTransactions.length > 0 && (
              <View style={styles.userDetailsContainer}>
                {(() => {
                  const firstTransaction = filteredUserTransactions[0];
                  const pointsData = calculateUserPoints(
                    firstTransaction.customerName,
                    firstTransaction.phoneNumber
                  );

                  return (
                    <>
                      {/* User Summary */}
                      <View style={styles.userSummary}>
                        <Text style={styles.userSummaryTitle}>
                          {firstTransaction.customerName}
                        </Text>
                        <Text style={styles.userSummaryPhone}>
                          Phone: {firstTransaction.phoneNumber}
                        </Text>

                        {/* Points Summary */}
                        <View style={styles.pointsContainer}>
                          <View style={styles.pointsCard}>
                            <Text style={styles.pointsLabel}>
                              Points Earned
                            </Text>
                            <Text style={styles.pointsValue}>
                              {pointsData.totalEarnedPoints}
                            </Text>
                          </View>
                          <View style={styles.pointsCard}>
                            <Text style={styles.pointsLabel}>
                              Points Claimed
                            </Text>
                            <Text style={styles.pointsValue}>
                              {pointsData.totalClaimedPoints}
                            </Text>
                          </View>
                          <View style={styles.pointsCard}>
                            <Text style={styles.pointsLabel}>
                              Remaining Points
                            </Text>
                            <Text
                              style={[styles.pointsValue, { color: "#007AFF" }]}
                            >
                              {pointsData.remainingPoints}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* User Sales List */}
                      <View style={styles.userTransactionsContainer}>
                        <Text style={styles.sectionTitle}>Sales History</Text>
                        <FlatList
                          data={filteredUserTransactions}
                          renderItem={renderTransactionItem}
                          keyExtractor={(item) => item.id}
                          scrollEnabled={false}
                        />
                      </View>
                    </>
                  );
                })()}
              </View>
            )}
            {userSearchQuery.trim() !== "" &&
              filteredUserTransactions.length === 0 && (
                <View style={styles.emptyList}>
                  <Ionicons name="person-outline" size={48} color="#CCCCCC" />
                  <Text style={styles.emptyListText}>No customer found</Text>
                  <Text style={styles.emptyListSubtext}>
                    Try searching with a different name or phone number
                  </Text>
                </View>
              )}
            {userSearchQuery.trim() === "" && (
              <View style={styles.emptyList}>
                <Ionicons name="search-outline" size={48} color="#CCCCCC" />
                <Text style={styles.emptyListText}>Search for a customer</Text>
                <Text style={styles.emptyListSubtext}>
                  Enter customer name or phone number to view their details and
                  transaction history
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
      {/* Floating Action Button */}
      <View style={styles.fabContainer}>
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push("/biller/add-sale?fresh=true")}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
          <Text style={styles.fabText}>Add New Sale</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
    top: 15,
  },
  fixedHeaderContainer: {
    backgroundColor: "#FFFFFF",
    position: "absolute",
    top: 10,
    left: 0,
    right: 0,
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
    marginBottom: 10, // Space for the tabs.
    flexDirection: "column",
  },
  scrollContainer: {
    flex: 1,
    marginTop: 170, // Add space for the fixed header and tabs
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
    backgroundColor: "#007AFF",
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
    marginTop: 25,
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
    fontSize: 13,
    color: "#333",
    textAlign: "center",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 10,
    gap: 4,
  },
  refreshButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
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
  transactionListContainer: {
    paddingHorizontal: 10,
    paddingBottom: 80, // Extra padding for FAB
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
  },
  emptyListSubtext: {
    marginTop: 4,
    fontSize: 14,
    color: "#CCC",
    textAlign: "center",
  },
  userDetailsContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    margin: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  userSummary: {
    marginBottom: 16,
  },
  userSummaryTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  userSummaryPhone: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
  },
  pointsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  pointsCard: {
    flex: 1,
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  pointsLabel: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    marginBottom: 4,
  },
  pointsValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  userTransactionsContainer: {
    marginTop: 16,
  },
  transactionItem: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 14,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#EEEEEE",
  },
  transactionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  customerName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  invoiceNumber: {
    fontSize: 14,
    color: "#888",
    fontWeight: "500",
  },
  saleTagRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  salesTag: {
    alignSelf: "flex-start",
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  salesTagText: {
    fontSize: 10,
    color: "#43A047",
    fontWeight: "600",
  },

  transactionDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  amountSection: {
    flexDirection: "row",
    flex: 1,
    gap: 30,
  },
  amountItem: {
    marginRight: 20,
  },
  detailLabel: {
    fontSize: 12,
    color: "#888",
    marginBottom: 2,
  },
  detailAmount: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#333",
  },
  balanceDue: {
    color: "#FF6B6B", // Red for outstanding balance
  },
  balancePaid: {
    color: "#007AFF", // Blue for paid/no balance
  },
  transactionDate: {
    fontSize: 12,
    color: "#888",
  },
  transactionActions: {
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
