import { Ionicons } from "@expo/vector-icons";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getFirestore,
  increment,
  onSnapshot,
  updateDoc,
} from "@react-native-firebase/firestore";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { FormSkeleton } from "../components/SkeletonLoader";

interface Item {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  rate: number;
  taxType: string;
  count: number;
  amount: number;
}

interface SaleData {
  id: string;
  invoiceNumber: number;
  customerName: string;
  phoneNumber: string;
  paymentType: string;
  items: Item[];
  totalAmount: number;
  subtotal: number;
  totalTax: number;
  totalQuantity: number;
  totalCount: number;
  receivedAmount: number;
  balanceAmount: number;
  dateString: string;
  timeString: string;
  createdAt: any;
}

export default function SaleDetails() {
  const router = useRouter();
  const { saleId } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [saleData, setSaleData] = useState<SaleData | null>(null);

  // Database Item type for inventory management
  type DatabaseItem = {
    id: string;
    name: string;
    salePrice: number;
    stockQuantity: number;
    unit?: string;
  };

  // Helper function to restore stock for an item
  const restoreItemStock = async (
    itemName: string,
    quantityToRestore: number
  ) => {
    try {
      const db = getFirestore();
      const itemsCollectionRef = collection(db, "items");

      // Find the item by name
      return new Promise<boolean>((resolve) => {
        const unsubscribe = onSnapshot(
          itemsCollectionRef,
          (snapshot) => {
            if (snapshot && snapshot.docs) {
              const databaseItem = snapshot.docs.find((doc) => {
                const data = doc.data() as DatabaseItem;
                return (
                  data.name.toLowerCase().trim() ===
                  itemName.toLowerCase().trim()
                );
              });

              if (databaseItem) {
                // Restore stock
                updateDoc(doc(db, "items", databaseItem.id), {
                  stockQuantity: increment(quantityToRestore),
                })
                  .then(() => {
                    console.log(
                      `✅ Restored ${quantityToRestore} units of ${itemName}`
                    );
                    resolve(true);
                  })
                  .catch((error) => {
                    console.error(
                      `❌ Error restoring stock for ${itemName}:`,
                      error
                    );
                    resolve(false);
                  });
              } else {
                console.log(
                  `⚠️ Item ${itemName} not found in inventory - may be manually entered`
                );
                resolve(true); // Not an error for manual items
              }
            } else {
              resolve(false);
            }
            unsubscribe();
          },
          (error) => {
            console.error("Error fetching items for stock restoration:", error);
            resolve(false);
            unsubscribe();
          }
        );
      });
    } catch (error) {
      console.error(`Error restoring stock for ${itemName}:`, error);
      return false;
    }
  };

  // Helper function to restore stock for all items in a sale
  const restoreStockForSale = async (items: Item[]) => {
    console.log("🔄 Starting stock restoration for sale items...");
    const restorationPromises = items.map((item) =>
      restoreItemStock(item.name, item.quantity)
    );

    try {
      const results = await Promise.all(restorationPromises);
      const successCount = results.filter((result) => result).length;
      console.log(
        `✅ Stock restoration completed: ${successCount}/${items.length} items processed`
      );
      return successCount === items.length;
    } catch (error) {
      console.error("❌ Error in stock restoration:", error);
      return false;
    }
  };

  // Fetch sale details
  useEffect(() => {
    const fetchSaleDetails = async () => {
      try {
        if (!saleId || typeof saleId !== "string") {
          Alert.alert("Error", "Invalid sale ID");
          router.back();
          return;
        }

        const db = getFirestore();
        const saleDoc = await getDoc(doc(db, "sales", saleId));
        if (saleDoc.exists()) {
          const data = saleDoc.data();
          if (data) {
            setSaleData({
              id: saleDoc.id,
              invoiceNumber: data.invoiceNumber || 0,
              customerName: data.customerName || "",
              phoneNumber: data.phoneNumber || "",
              paymentType: data.paymentType || "Cash",
              items: data.items || [],
              totalAmount: data.totalAmount || 0,
              subtotal: data.subtotal || 0,
              totalTax: data.totalTax || 0,
              totalQuantity: data.totalQuantity || 0,
              totalCount: data.totalCount || 0,
              receivedAmount: data.receivedAmount || 0,
              balanceAmount: data.balanceAmount || 0,
              dateString: data.dateString || "",
              timeString: data.timeString || "",
              createdAt: data.createdAt,
            });
          } else {
            Alert.alert("Error", "Sale data not found");
            router.back();
          }
        } else {
          Alert.alert("Error", "Sale not found");
          router.back();
        }
      } catch (error) {
        console.error("Error fetching sale details:", error);
        Alert.alert("Error", "Failed to load sale details");
        router.back();
      } finally {
        setLoading(false);
      }
    };
    fetchSaleDetails();
  }, [saleId, router]);

  const handleDelete = () => {
    Alert.alert(
      "Delete Sale",
      "Are you sure you want to delete this sale? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: confirmDelete,
        },
      ]
    );
  };
  const confirmDelete = async () => {
    try {
      setDeleting(true);

      if (!saleData) {
        Alert.alert("Error", "Sale data not found");
        return;
      }

      console.log("🗑️ Starting sale deletion with stock restoration...");

      // First restore stock for all items in the sale
      const stockRestored = await restoreStockForSale(saleData.items);

      if (!stockRestored) {
        Alert.alert(
          "Warning",
          "Some items could not be restored to inventory. Sale will still be deleted. Continue?",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Delete Anyway",
              style: "destructive",
              onPress: async () => {
                // Delete the sale even if stock restoration failed
                const db = getFirestore();
                await deleteDoc(doc(db, "sales", saleId as string));
                Alert.alert("Success", "Sale deleted successfully", [
                  {
                    text: "OK",
                    onPress: () => router.replace("/admin"),
                  },
                ]);
              },
            },
          ]
        );
        return;
      }

      // If stock restoration was successful, delete the sale
      const db = getFirestore();
      await deleteDoc(doc(db, "sales", saleId as string));

      Alert.alert(
        "Success",
        "Sale deleted and inventory restored successfully",
        [
          {
            text: "OK",
            onPress: () => router.replace("/admin"),
          },
        ]
      );
    } catch (error) {
      console.error("Error deleting sale:", error);
      Alert.alert("Error", "Failed to delete sale. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  const handleEdit = () => {
    // Navigate to edit mode
    router.push(`/admin/edit-sale?saleId=${saleId}`);
  };
  if (loading) {
    return <FormSkeleton />;
  }

  if (!saleData) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Sale not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sale</Text>
        <TouchableOpacity>
          <Ionicons name="share-outline" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Invoice Details */}
        <View style={styles.invoiceSection}>
          <View style={styles.invoiceRow}>
            <View style={styles.invoiceItem}>
              <Text style={styles.invoiceLabel}>Invoice No.</Text>
              <View style={styles.invoiceValueContainer}>
                <Text style={styles.invoiceValue}>
                  {saleData.invoiceNumber}
                </Text>
              </View>
            </View>
            <View style={styles.invoiceItem}>
              <Text style={styles.invoiceLabel}>Date</Text>
              <View style={styles.invoiceValueContainer}>
                <Text style={styles.invoiceValue}>{saleData.dateString}</Text>
              </View>
            </View>
            <View style={styles.invoiceItem}>
              <Text style={styles.invoiceLabel}>Time</Text>
              <View style={styles.invoiceValueContainer}>
                <Text style={styles.invoiceValue}>{saleData.timeString}</Text>
              </View>
            </View>
          </View>
        </View>
        {/* Party Balance */}
        <View style={styles.partyBalanceSection}>
          <Text style={styles.partyBalanceLabel}>Party Balance:</Text>
          <Text
            style={[
              styles.partyBalanceValue,
              saleData.balanceAmount > 0
                ? styles.balanceDue
                : styles.balancePaid,
            ]}
          >
            ₹ {saleData.balanceAmount.toFixed(2)}
          </Text>
        </View>
        {/* Customer Details */}
        <View style={styles.customerSection}>
          <View style={styles.customerNameContainer}>
            <Text style={styles.customerLabel}>Customer Name *</Text>
            <View style={styles.customerNameBox}>
              <Text style={styles.customerName}>{saleData.customerName}</Text>
            </View>
          </View>

          <View style={styles.phoneContainer}>
            <View style={styles.phoneBox}>
              <Text style={styles.phoneNumber}>
                {saleData.phoneNumber || "Phone Number"}
              </Text>
            </View>
          </View>
        </View>
        {/* Items Section */}
        <View style={styles.itemsSection}>
          <View style={styles.itemsHeader}>
            <Text style={styles.itemsHeaderText}>🛒 Billed Items</Text>
            <Text style={styles.rateExclTax}>Rate excl. tax</Text>
          </View>

          {saleData.items.map((item, index) => {
            const itemSubtotal = (item.rate || 0) * (item.quantity || 0);
            const itemTax =
              item.taxType === "With Tax" ? itemSubtotal * 0.18 : 0;

            return (
              <View key={index} style={styles.itemContainer}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemNumber}>#{index + 1}</Text>
                  <Text style={styles.itemName}>
                    {item.name} ({item.unit})
                  </Text>
                  <Text style={styles.itemAmount}>
                    ₹ {item.amount.toFixed(0)}
                  </Text>
                </View>

                <View style={styles.itemDetails}>
                  <View style={styles.itemDetailRow}>
                    <Text style={styles.itemDetailLabel}>Item Subtotal</Text>
                    <Text style={styles.itemDetailValue}>
                      {item.quantity} {item.unit} x {item.rate} = ₹
                      {itemSubtotal.toFixed(0)}
                    </Text>
                  </View>
                  <View style={styles.itemDetailRow}>
                    <Text style={styles.itemDetailLabel}>Discount (%): 0</Text>
                    <Text style={styles.itemDetailValue}>₹ 0</Text>
                  </View>
                  <View style={styles.itemDetailRow}>
                    <Text style={styles.itemDetailLabel}>
                      Tax: {item.taxType === "With Tax" ? "18" : "0"}%
                    </Text>
                    <Text style={styles.itemDetailValue}>
                      ₹ {itemTax.toFixed(0)}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}

          {/* Totals */}
          <View style={styles.totalsSection}>
            <Text style={styles.totalCount}>
              Total Count: {saleData.totalCount}
            </Text>
          </View>
        </View>
        {/* Total Amount */}
        <View style={styles.totalSection}>
          <Text style={styles.totalLabel}>Total Amount</Text>
          <Text style={styles.totalValue}>
            ₹ {saleData.totalAmount.toFixed(2)}
          </Text>
        </View>
        {/* Received Amount */}
        <View style={styles.receivedSection}>
          <View style={styles.receivedRow}>
            <View style={styles.receivedCheckbox}>
              {saleData.receivedAmount > 0 && (
                <View style={styles.checkboxInner} />
              )}
            </View>
            <Text style={styles.receivedLabel}>Received</Text>
            <Text style={styles.receivedValue}>
              ₹ {saleData.receivedAmount.toFixed(2)}
            </Text>
          </View>

          <View style={styles.balanceRow}>
            <Text style={styles.balanceLabel}>Balance Due</Text>
            <Text
              style={[
                styles.balanceValue,
                saleData.balanceAmount > 0
                  ? styles.balanceDue
                  : styles.balancePaid,
              ]}
            >
              ₹ {saleData.balanceAmount.toFixed(2)}
            </Text>
          </View>
        </View>
        {/* Payment Type */}
        <View style={styles.paymentSection}>
          <Text style={styles.paymentLabel}>Payment Type</Text>
          <View style={styles.paymentTypeContainer}>
            <View
              style={[
                styles.paymentTypeBadge,
                saleData.paymentType === "Cash"
                  ? styles.cashBadge
                  : styles.creditBadge,
              ]}
            >
              <Text
                style={[
                  styles.paymentTypeText,
                  saleData.paymentType === "Cash"
                    ? styles.cashText
                    : styles.creditText,
                ]}
              >
                {saleData.paymentType}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.spacer} />
      </ScrollView>

      {/* Bottom Buttons */}
      <View style={styles.bottomButtons}>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDelete}
          disabled={deleting}
        >
          {deleting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.deleteButtonText}>Delete</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
  },
  errorText: {
    fontSize: 16,
    color: "#F44336",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  invoiceSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  invoiceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  invoiceItem: {
    alignItems: "center",
    flex: 1,
  },
  invoiceLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  invoiceValueContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  invoiceValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginRight: 4,
  },
  dropdown: {
    fontSize: 12,
    color: "#666",
  },
  partyBalanceSection: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  partyBalanceLabel: {
    fontSize: 14,
    color: "#666",
    marginRight: 8,
  },
  partyBalanceValue: {
    fontSize: 16,
    fontWeight: "600",
  },
  balanceDue: {
    color: "#F44336",
  },
  balancePaid: {
    color: "#4CAF50",
  },
  customerSection: {
    marginBottom: 16,
  },
  customerNameContainer: {
    marginBottom: 8,
  },
  customerLabel: {
    fontSize: 14,
    color: "#007AFF",
    marginBottom: 8,
    fontWeight: "500",
  },
  customerNameBox: {
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#007AFF",
    borderRadius: 8,
    padding: 12,
    minHeight: 48,
    justifyContent: "center",
  },
  customerName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  phoneContainer: {
    marginBottom: 0,
  },
  phoneBox: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    padding: 12,
    minHeight: 48,
    justifyContent: "center",
  },
  phoneNumber: {
    fontSize: 16,
    color: "#333",
  },
  itemsSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    marginBottom: 16,
    overflow: "hidden",
  },
  itemsHeader: {
    backgroundColor: "#E3F2FD",
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemsHeaderText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1976D2",
  },
  rateExclTax: {
    fontSize: 12,
    color: "#666",
  },
  itemContainer: {
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#F8F9FA",
  },
  itemNumber: {
    fontSize: 12,
    color: "#666",
    width: 30,
  },
  itemName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginLeft: 8,
  },
  itemAmount: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  itemDetails: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
  },
  itemDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  itemDetailLabel: {
    fontSize: 13,
    color: "#F57C00",
    fontWeight: "500",
  },
  itemDetailValue: {
    fontSize: 13,
    color: "#333",
  },
  totalsSection: {
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  totalCount: {
    fontSize: 12,
    color: "#666",
  },
  totalSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  receivedSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  receivedRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  receivedCheckbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: "#007AFF",
    borderRadius: 4,
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxInner: {
    width: 12,
    height: 12,
    backgroundColor: "#007AFF",
    borderRadius: 2,
  },
  receivedLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    flex: 1,
  },
  receivedValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  balanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  balanceLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  balanceValue: {
    fontSize: 18,
    fontWeight: "bold",
  },
  paymentSection: {
    marginBottom: 16,
  },
  paymentLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  paymentTypeContainer: {
    flexDirection: "row",
  },
  paymentTypeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  cashBadge: {
    backgroundColor: "#4CAF50",
  },
  creditBadge: {
    backgroundColor: "#FF9800",
  },
  paymentTypeText: {
    fontSize: 14,
    fontWeight: "500",
  },
  cashText: {
    color: "#FFFFFF",
  },
  creditText: {
    color: "#FFFFFF",
  },
  spacer: {
    height: 80,
  },
  bottomButtons: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  deleteButton: {
    flex: 1,
    backgroundColor: "#F44336",
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: "center",
    marginRight: 8,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  editButton: {
    flex: 2,
    backgroundColor: "#007AFF",
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: "center",
    marginLeft: 8,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
