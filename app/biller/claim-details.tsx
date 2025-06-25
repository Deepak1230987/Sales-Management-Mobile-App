import { Ionicons } from "@expo/vector-icons";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  serverTimestamp,
  updateDoc,
} from "@react-native-firebase/firestore";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface ClaimDetails {
  id: string;
  customerName: string;
  vehicleNo: string;
  phoneNo: string;
  prizeName: string;
  claimedPoints: number;
  status: "claimed" | "pending" | "processed";
  createdAt: any; // Allow raw Firestore timestamp
  updatedAt?: any; // Allow raw Firestore timestamp
  [key: string]: any;
}

export default function ClaimDetailsPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [claim, setClaim] = useState<ClaimDetails | null>(null);

  const loadClaimDetails = useCallback(
    async (claimId: string) => {
      try {
        setLoading(true);
        const db = getFirestore();
        const claimDoc = await getDoc(doc(db, "claims", claimId));
        if (claimDoc.exists()) {
          const data = claimDoc.data();
          if (data) {
            // Add debugging for raw data
            console.log("=== RAW CLAIM DATA DEBUG ===");
            console.log("createdAt raw:", data.createdAt);
            console.log("createdAt type:", typeof data.createdAt);
            console.log("updatedAt raw:", data.updatedAt);
            console.log("updatedAt type:", typeof data.updatedAt);

            setClaim({
              id: claimDoc.id,
              customerName: data.customerName || "Unknown Customer",
              vehicleNo: data.vehicleNo || "",
              phoneNo: data.phoneNo || "",
              prizeName: data.prizeName || "",
              claimedPoints: data.claimedPoints || 0,
              status: data.status || "claimed",
              createdAt: data.createdAt, // Store raw timestamp
              updatedAt: data.updatedAt, // Store raw timestamp
              ...data,
            });
          }
        } else {
          Alert.alert("Error", "Claim not found", [
            { text: "OK", onPress: () => router.back() },
          ]);
        }
      } catch (error) {
        console.error("Error loading claim details:", error);
        Alert.alert("Error", "Failed to load claim details", [
          { text: "OK", onPress: () => router.back() },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [router]
  );

  useEffect(() => {
    const claimId = params.claimId as string;
    if (claimId) {
      loadClaimDetails(claimId);
    }
  }, [params.claimId, loadClaimDetails]);
  function formatFirestoreTimestamp(timestamp: {
    seconds: number;
    nanoseconds: number;
  }): string {
    // Convert seconds and nanoseconds to milliseconds
    const milliseconds =
      timestamp.seconds * 1000 + Math.floor(timestamp.nanoseconds / 1000000);
    const date = new Date(milliseconds);
    // Format date to readable string, example:
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  const formatDate = (timestamp: any): string => {
    try {
      console.log("📅 formatDate called with:", {
        timestamp: timestamp,
        type: typeof timestamp,
        hasSeconds: timestamp?.seconds !== undefined,
        hasToDate: typeof timestamp?.toDate === "function",
      });

      // Check for null or undefined
      if (!timestamp) {
        console.log("✅ Timestamp is null/undefined, showing 'Not available'");
        return "Not available";
      }

      // If it's a Firestore timestamp with toDate method
      if (typeof timestamp.toDate === "function") {
        try {
          const date = timestamp.toDate();
          return date.toLocaleString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          });
        } catch (error) {
          console.warn("❌ Error using toDate():", error);
        }
      }

      // If it's a Firestore timestamp with seconds/nanoseconds
      if (timestamp.seconds !== undefined) {
        return formatFirestoreTimestamp(timestamp);
      }

      // If it's already a Date object
      if (timestamp instanceof Date && !isNaN(timestamp.getTime())) {
        return timestamp.toLocaleString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
      }

      console.warn("❌ Unsupported timestamp format:", timestamp);
      return "Not available";
    } catch (error) {
      console.error("❌ Error in formatDate:", error);
      return "Not available";
    }
  };

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

  const handleEdit = () => {
    router.push(`/biller/claim-form?claimId=${claim?.id}`);
  };

  const handleDelete = () => {
    if (!claim) return;

    Alert.alert(
      "Delete Claim",
      `Are you sure you want to delete the claim for ${claim.customerName}?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const db = getFirestore();

              // First, check if we need to restore prize quantity
              if (claim && claim.prizeName && !claim.isCustomPrize) {
                // Find the prize in the database
                const prizesCollection = collection(db, "prizes");
                const prizesSnapshot = await getDocs(prizesCollection);

                const prizeDoc = prizesSnapshot.docs.find(
                  (doc) => doc.data().name === claim.prizeName
                );

                if (prizeDoc) {
                  const currentPrizeData = prizeDoc.data();
                  const currentQuantity = currentPrizeData.quantity || 0;

                  // Restore the prize quantity and reactivate if it was inactive due to stock
                  const updateData: any = {
                    quantity: currentQuantity + 1,
                    updatedAt: serverTimestamp(),
                  };

                  // If the prize was inactive and now has quantity, reactivate it
                  if (!currentPrizeData.isActive && currentQuantity === 0) {
                    updateData.isActive = true;
                  }

                  await updateDoc(doc(db, "prizes", prizeDoc.id), updateData);
                }
              }

              // Then delete the claim
              await deleteDoc(doc(db, "claims", claim.id));
              Alert.alert("Success", "Claim deleted successfully", [
                { text: "OK", onPress: () => router.replace("/biller/claims") },
              ]);
            } catch (error) {
              console.error("Error deleting claim:", error);
              Alert.alert("Error", "Failed to delete claim. Please try again.");
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading claim details...</Text>
      </View>
    );
  }

  if (!claim) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={80} color="#FF3B30" />
        <Text style={styles.errorTitle}>Claim Not Found</Text>
        <Text style={styles.errorSubtitle}>
          The claim you&apos;re looking for doesn&apos;t exist or has been
          deleted.
        </Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.replace("/biller/claims")}
        >
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Claim Details</Text>
      </View>

      <ScrollView style={styles.scrollContainer}>
        {/* Customer Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Information</Text>
          <View style={styles.card}>
            <View style={styles.detailRow}>
              <Text style={styles.label}>Customer Name</Text>
              <Text style={styles.value}>{claim.customerName}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.label}>Vehicle Number</Text>
              <Text style={styles.value}>
                {claim.vehicleNo || "Not provided"}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.label}>Phone Number</Text>
              <Text style={styles.value}>{claim.phoneNo}</Text>
            </View>
          </View>
        </View>

        {/* Prize Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Prize Information</Text>
          <View style={styles.card}>
            <View style={styles.detailRow}>
              <Text style={styles.label}>Prize Name</Text>
              <Text style={styles.value}>{claim.prizeName}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.label}>Points Claimed</Text>
              <Text style={[styles.value, styles.pointsValue]}>
                {claim.claimedPoints}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.label}>Status</Text>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusBgColor(claim.status) },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    { color: getStatusColor(claim.status) },
                  ]}
                >
                  {claim.status.toUpperCase()}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Timestamp Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Timestamp Information</Text>
          <View style={styles.card}>
            <View style={styles.detailRow}>
              <Text style={styles.label}>Created At</Text>
              <Text style={styles.value}>{formatDate(claim.createdAt)}</Text>
            </View>
            {claim.updatedAt && (
              <View style={styles.detailRow}>
                <Text style={styles.label}>Last Updated</Text>
                <Text style={styles.value}>{formatDate(claim.updatedAt)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <Ionicons name="trash" size={20} color="#FFFFFF" />
            <Text style={styles.deleteButtonText}>Delete Claim</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
            <Ionicons name="pencil" size={20} color="#FFFFFF" />
            <Text style={styles.editButtonText}>Edit Claim</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
    marginTop: 25,
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
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    padding: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FF3B30",
    marginTop: 16,
    textAlign: "center",
  },
  errorSubtitle: {
    fontSize: 16,
    color: "#8E8E93",
    marginTop: 8,
    textAlign: "center",
    lineHeight: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",

    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 6,
    paddingTop: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    marginLeft: 16,
    fontWeight: "bold",
    color: "#1D1D1F",
    textAlign: "center",
  },

  scrollContainer: {
    flex: 1,
  },
  section: {
    margin: 16,
    marginBottom: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1D1D1F",
    marginBottom: 12,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F1F1",
  },
  label: {
    fontSize: 16,
    color: "#86868B",
    flex: 1,
  },
  value: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1D1D1F",
    flex: 1,
    textAlign: "right",
  },
  pointsValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FF6B6B",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  actionSection: {
    margin: 16,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#007AFF",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  editButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF3B30",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    paddingHorizontal: 24,
  },
  deleteButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  backButtonText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
