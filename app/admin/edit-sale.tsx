import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  collection,
  doc,
  getDoc,
  getFirestore,
  increment,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from "@react-native-firebase/firestore";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../contexts/AuthContext";

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

export default function EditSale() {
  const router = useRouter();
  const { saleId } = useLocalSearchParams();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [originalSaleData, setOriginalSaleData] = useState<any>(null);

  // Form states
  const [invoiceNumber, setInvoiceNumber] = useState<number>(1);
  const [customerName, setCustomerName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [paymentType, setPaymentType] = useState("Credit");
  const [receivedAmount, setReceivedAmount] = useState("");
  const [isReceivedChecked, setIsReceivedChecked] = useState(false);

  // Database Item type for inventory management
  type DatabaseItem = {
    id: string;
    name: string;
    salePrice: number;
    stockQuantity: number;
    unit?: string;
  };

  // Helper function to adjust stock for an item
  const adjustItemStock = async (
    itemName: string,
    quantityDifference: number
  ) => {
    try {
      if (quantityDifference === 0) return true;

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
                // Adjust stock (negative value reduces stock, positive value increases)
                updateDoc(doc(db, "items", databaseItem.id), {
                  stockQuantity: increment(-quantityDifference),
                })
                  .then(() => {
                    const action =
                      quantityDifference > 0 ? "reduced" : "increased";
                    console.log(
                      `✅ Stock ${action} by ${Math.abs(
                        quantityDifference
                      )} units for ${itemName}`
                    );
                    resolve(true);
                  })
                  .catch((error) => {
                    console.error(
                      `❌ Error adjusting stock for ${itemName}:`,
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
            console.error("Error fetching items for stock adjustment:", error);
            resolve(false);
            unsubscribe();
          }
        );
      });
    } catch (error) {
      console.error(`Error adjusting stock for ${itemName}:`, error);
      return false;
    }
  };

  // Helper function to calculate and apply stock adjustments
  const adjustStockForEditedSale = async (
    originalItems: Item[],
    newItems: Item[]
  ) => {
    console.log("🔄 Calculating stock adjustments for edited sale...");

    // Create maps for easier comparison
    const originalItemsMap = new Map<string, number>();
    const newItemsMap = new Map<string, number>();

    originalItems.forEach((item) => {
      const existing = originalItemsMap.get(item.name) || 0;
      originalItemsMap.set(item.name, existing + item.quantity);
    });

    newItems.forEach((item) => {
      const existing = newItemsMap.get(item.name) || 0;
      newItemsMap.set(item.name, existing + item.quantity);
    });

    // Find all unique item names
    const allItemNames = new Set([
      ...originalItemsMap.keys(),
      ...newItemsMap.keys(),
    ]);

    // Calculate adjustments needed
    const adjustments: { name: string; difference: number }[] = [];

    for (const itemName of allItemNames) {
      const originalQty = originalItemsMap.get(itemName) || 0;
      const newQty = newItemsMap.get(itemName) || 0;
      const difference = newQty - originalQty; // Positive = more used, Negative = less used

      if (difference !== 0) {
        adjustments.push({ name: itemName, difference });
        console.log(
          `📊 ${itemName}: ${originalQty} → ${newQty} (${
            difference > 0 ? "+" : ""
          }${difference})`
        );
      }
    }

    if (adjustments.length === 0) {
      console.log("✅ No stock adjustments needed");
      return true;
    }

    // Apply all adjustments
    const adjustmentPromises = adjustments.map((adj) =>
      adjustItemStock(adj.name, adj.difference)
    );

    try {
      const results = await Promise.all(adjustmentPromises);
      const successCount = results.filter((result) => result).length;
      console.log(
        `✅ Stock adjustments completed: ${successCount}/${adjustments.length} items processed`
      );
      return successCount === adjustments.length;
    } catch (error) {
      console.error("❌ Error in stock adjustments:", error);
      return false;
    }
  };

  // Generate current date and time
  const getCurrentDateTime = () => {
    const now = new Date();
    const date = now.toLocaleDateString("en-GB"); // DD/MM/YYYY format
    const time = now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    return { date, time };
  };

  // Load sale data for editing
  useEffect(() => {
    const loadSaleData = async () => {
      try {
        if (!saleId || typeof saleId !== "string") {
          Alert.alert("Error", "Invalid sale ID");
          router.push("/admin");
          return;
        }

        const db = getFirestore();
        const saleDoc = await getDoc(doc(db, "sales", saleId));
        if (saleDoc.exists()) {
          const data = saleDoc.data();
          if (data) {
            // Store original data for reference
            setOriginalSaleData(data);

            console.log("🔍 Debug: Loading sale data for editing:");
            console.log("Original customerName:", data.customerName);
            console.log("Original phoneNumber:", data.phoneNumber);

            // Set form states
            setInvoiceNumber(data.invoiceNumber || 1);
            setCustomerName(data.customerName || "");
            setPhoneNumber(data.phoneNumber || "");
            setItems(data.items || []);
            setPaymentType(data.paymentType || "Credit");
            setReceivedAmount(
              data.receivedAmount ? data.receivedAmount.toString() : ""
            );
            setIsReceivedChecked(data.receivedAmount > 0);

            console.log("🔍 Debug: Form state after setting:");
            console.log("customerName state:", data.customerName || "");
            console.log("phoneNumber state:", data.phoneNumber || "");

            // Store items in AsyncStorage for editing workflow
            if (data.items && data.items.length > 0) {
              await AsyncStorage.setItem(
                "pendingItems",
                JSON.stringify(data.items)
              );
            }
          } else {
            Alert.alert("Error", "Sale data not found");
            router.push("/admin");
          }
        } else {
          Alert.alert("Error", "Sale not found");
          router.push("/admin");
        }
      } catch (error) {
        console.error("Error loading sale data:", error);
        Alert.alert("Error", "Failed to load sale data");
        router.push("/admin");
      } finally {
        setLoading(false);
      }
    };
    loadSaleData();
  }, [saleId, router]);
  // Load items from AsyncStorage when returning from add-items
  useFocusEffect(
    useCallback(() => {
      const loadItems = async () => {
        try {
          console.log(
            "🔍 Debug: useFocusEffect triggered - checking form state:"
          );
          console.log("Current customerName:", customerName);
          console.log("Current phoneNumber:", phoneNumber);

          const savedItems = await AsyncStorage.getItem("pendingItems");
          if (savedItems) {
            const parsedItems = JSON.parse(savedItems);
            setItems(parsedItems);
            console.log(
              "🔍 Debug: Items loaded from AsyncStorage:",
              parsedItems.length
            );
          }

          console.log("🔍 Debug: Form state after loading items:");
          console.log("customerName after item load:", customerName);
          console.log("phoneNumber after item load:", phoneNumber);
        } catch (error) {
          console.error("Error loading items:", error);
        }
      };

      loadItems();
    }, [customerName, phoneNumber]) // Add dependencies to track changes
  );

  const calculateTotal = () => {
    if (!items || items.length === 0) return 0;
    return items.reduce((total, item) => {
      if (!item) return total;
      return total + (item.amount || 0);
    }, 0);
  };

  const calculateSubtotal = () => {
    if (!items || items.length === 0) return 0;
    return items.reduce((total, item) => {
      if (!item) return total;
      return total + (item.rate || 0) * (item.quantity || 0);
    }, 0);
  };

  const calculateTotalTax = () => {
    if (!items || items.length === 0) return 0;
    return items.reduce((total, item) => {
      if (!item) return total;
      if (item.taxType === "With Tax") {
        return total + (item.rate || 0) * (item.quantity || 0) * 0.18;
      }
      return total;
    }, 0);
  };

  const calculateTotalQuantity = () => {
    if (!items || items.length === 0) return 0;
    return items.reduce((total, item) => {
      if (!item) return total;
      return total + (item.quantity || 0);
    }, 0);
  };

  const calculateTotalCount = () => {
    if (!items || items.length === 0) return 0;
    return items.reduce((total, item) => {
      if (!item) return total;
      return total + (item.count || 0);
    }, 0);
  };

  const handleReceivedCheckbox = () => {
    const newCheckedState = !isReceivedChecked;
    setIsReceivedChecked(newCheckedState);

    if (newCheckedState) {
      setReceivedAmount(calculateTotal().toString());
    } else {
      setReceivedAmount("");
    }
  };

  const getReceivedAmountValue = () => {
    return receivedAmount ? parseFloat(receivedAmount) : 0;
  };

  const getBalanceDue = () => {
    return calculateTotal() - getReceivedAmountValue();
  };

  const handleAddItems = () => {
    router.push("/admin/add-items");
  };

  const handleEditItem = async (item: Item, index: number) => {
    try {
      if (!item) {
        console.error("Item is null or undefined");
        return;
      }

      await AsyncStorage.setItem(
        "editingItem",
        JSON.stringify({ ...item, editIndex: index })
      );

      router.push("/admin/add-items");
    } catch (error) {
      console.error("Error storing item for editing:", error);
    }
  };
  const handleSave = async () => {
    try {
      if (!customerName.trim()) {
        Alert.alert("Error", "Customer name is required");
        return;
      }

      console.log("🔍 Debug: Current form state before save:");
      console.log("customerName:", customerName);
      console.log("phoneNumber:", phoneNumber);
      console.log(
        "originalSaleData customerName:",
        originalSaleData?.customerName
      );
      console.log(
        "originalSaleData phoneNumber:",
        originalSaleData?.phoneNumber
      );

      setSaving(true);
      const db = getFirestore();
      const { date, time } = getCurrentDateTime();

      const updatedSaleData = {
        // Keep original creation data first
        ...originalSaleData,
        // Override with updated data - only update if values are not empty
        invoiceNumber,
        paymentType,
        customerName:
          customerName.trim() || originalSaleData?.customerName || "",
        phoneNumber: phoneNumber.trim() || originalSaleData?.phoneNumber || "",
        items,
        totalAmount: calculateTotal(),
        subtotal: calculateSubtotal(),
        totalTax: calculateTotalTax(),
        totalQuantity: calculateTotalQuantity(),
        totalCount: calculateTotalCount(),
        receivedAmount: getReceivedAmountValue(),
        balanceAmount: getBalanceDue(),
        dateString: date,
        timeString: time,
        updatedBy: user?.uid,
        updatedAt: serverTimestamp(),
      };
      console.log("🔍 Debug: Final sale data to be saved:");
      console.log("customerName:", updatedSaleData.customerName);
      console.log("phoneNumber:", updatedSaleData.phoneNumber);

      // Adjust stock based on changes in items
      if (originalSaleData?.items) {
        console.log("🔄 Adjusting inventory for edited sale...");
        const stockAdjusted = await adjustStockForEditedSale(
          originalSaleData.items,
          items
        );

        if (!stockAdjusted) {
          Alert.alert(
            "Warning",
            "Some inventory adjustments failed. Sale will still be updated. Continue?",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Update Anyway",
                onPress: async () => {
                  await updateDoc(
                    doc(db, "sales", saleId as string),
                    updatedSaleData
                  );

                  // Clear AsyncStorage
                  await AsyncStorage.removeItem("pendingItems");
                  await AsyncStorage.removeItem("editingItem");
                  Alert.alert("Success", "Sale updated successfully!", [
                    {
                      text: "OK",
                      onPress: () =>
                        router.push(`/admin/sale-details?saleId=${saleId}`),
                    },
                  ]);
                },
              },
            ]
          );
          return;
        }
      }

      await updateDoc(doc(db, "sales", saleId as string), updatedSaleData);

      // Clear AsyncStorage
      await AsyncStorage.removeItem("pendingItems");
      await AsyncStorage.removeItem("editingItem");
      Alert.alert("Success", "Sale updated successfully!", [
        {
          text: "OK",
          onPress: () => router.push(`/admin/sale-details?saleId=${saleId}`),
        },
      ]);
    } catch (error) {
      console.error("Error updating sale:", error);
      Alert.alert("Error", "Failed to update sale. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading sale data...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.push(`/admin/sale-details?saleId=${saleId}`)}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Sale</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[
              styles.paymentButton,
              paymentType === "Credit" && styles.activePaymentButton,
            ]}
            onPress={() => setPaymentType("Credit")}
          >
            <Text
              style={[
                styles.paymentButtonText,
                paymentType === "Credit" && styles.activePaymentButtonText,
              ]}
            >
              Credit
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.paymentButton,
              paymentType === "Cash" && styles.activePaymentButton,
            ]}
            onPress={() => setPaymentType("Cash")}
          >
            <Text
              style={[
                styles.paymentButtonText,
                paymentType === "Cash" && styles.activePaymentButtonText,
              ]}
            >
              Cash
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      <ScrollView style={styles.content}>
        {/* Invoice Details */}
        <View style={styles.invoiceSection}>
          <View style={styles.invoiceRow}>
            <View style={styles.invoiceItem}>
              <Text style={styles.invoiceLabel}>Invoice No.</Text>
              <Text style={styles.invoiceValue}>{invoiceNumber}</Text>
            </View>
            <View style={styles.invoiceItem}>
              <Text style={styles.invoiceLabel}>Date</Text>
              <Text style={styles.invoiceValue}>
                {getCurrentDateTime().date}
              </Text>
            </View>
            <View style={styles.invoiceItem}>
              <Text style={styles.invoiceLabel}>Time</Text>
              <Text style={styles.invoiceValue}>
                {getCurrentDateTime().time}
              </Text>
            </View>
          </View>
        </View>

        {/* Customer Section */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Customer *</Text>
          <TextInput
            style={styles.textInput}
            value={customerName}
            onChangeText={setCustomerName}
            placeholder=""
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.inputSection}>
          <TextInput
            style={styles.textInput}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder="Phone Number"
            placeholderTextColor="#999"
            keyboardType="phone-pad"
          />
        </View>

        {/* Items Section */}
        {items.length > 0 ? (
          <View style={styles.itemsSection}>
            <View style={styles.itemsHeader}>
              <Text style={styles.itemsHeaderText}>🛒 Billed Items</Text>
            </View>

            {items
              .filter((item) => item != null)
              .map((item, index) => {
                const rate = item.rate || 0;
                const quantity = item.quantity || 0;
                const itemSubtotal = rate * quantity;
                const itemTax =
                  item.taxType === "With Tax" ? itemSubtotal * 0.18 : 0;
                const itemDiscount = 0;

                return (
                  <TouchableOpacity
                    key={index}
                    style={styles.itemContainer}
                    onPress={() => handleEditItem(item, index)}
                  >
                    <View style={styles.itemRow}>
                      <Text style={styles.itemNumber}>#{index + 1}</Text>
                      <Text style={styles.itemName}>
                        {item.name || "Unknown Item"} ({item.unit || ""})
                      </Text>
                      <Text style={styles.itemAmount}>
                        ₹ {(item.amount || 0).toFixed(0)}
                      </Text>
                    </View>

                    <View style={styles.itemDetails}>
                      <View style={styles.itemDetailRow}>
                        <Text style={styles.itemDetailLabel}>
                          Item Subtotal
                        </Text>
                        <Text style={styles.itemDetailValue}>
                          {quantity} {item.unit || ""} x {rate} = ₹
                          {itemSubtotal.toFixed(0)}
                        </Text>
                      </View>
                      <View style={styles.itemDetailRow}>
                        <Text style={styles.itemDetailLabel}>
                          Discount (%): 0
                        </Text>
                        <Text style={styles.itemDetailValue}>
                          ₹ {itemDiscount}
                        </Text>
                      </View>
                      <View style={styles.itemDetailRow}>
                        <Text style={styles.itemDetailLabel}>
                          Tax : {item.taxType === "With Tax" ? "18" : "0"}%
                        </Text>
                        <Text style={styles.itemDetailValue}>
                          ₹ {itemTax.toFixed(0)}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}

            <View style={styles.totalsSection}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total Disc: 0.0</Text>
                <Text style={styles.totalLabel}>
                  Total Tax Amt: {calculateTotalTax().toFixed(1)}
                </Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>
                  Total Qty: {calculateTotalQuantity().toFixed(1)}
                </Text>
                <Text style={styles.totalLabel}>
                  Subtotal: {calculateSubtotal().toFixed(2)}
                </Text>
              </View>
              <Text style={styles.totalCount}>
                Total Count: {calculateTotalCount()}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Add Items Button */}
        <TouchableOpacity
          style={styles.addItemsButton}
          onPress={handleAddItems}
        >
          <Ionicons name="add-circle" size={24} color="#007AFF" />
          <Text style={styles.addItemsText}>Add Items</Text>
        </TouchableOpacity>

        {/* Total Amount */}
        <View style={styles.totalAmountSection}>
          <Text style={styles.totalAmountLabel}>Total Amount</Text>
          <Text style={styles.totalAmountValue}>
            ₹ {calculateTotal().toFixed(2)}
          </Text>
        </View>

        {/* Received Amount */}
        <View style={styles.receivedSection}>
          <View style={styles.receivedRow}>
            <TouchableOpacity
              style={styles.checkbox}
              onPress={handleReceivedCheckbox}
            >
              {isReceivedChecked && <View style={styles.checkboxInner} />}
            </TouchableOpacity>
            <Text style={styles.receivedLabel}>Received</Text>
            <Text style={styles.receivedCurrency}>₹</Text>
            <TextInput
              style={styles.receivedInput}
              value={receivedAmount}
              onChangeText={setReceivedAmount}
              placeholder="0.00"
              keyboardType="numeric"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.balanceRow}>
            <Text style={styles.balanceLabel}>Balance Due</Text>
            <Text
              style={[
                styles.balanceValue,
                getBalanceDue() > 0
                  ? styles.balancePositive
                  : styles.balanceZero,
              ]}
            >
              ₹ {getBalanceDue().toFixed(2)}
            </Text>
          </View>
        </View>

        <View style={styles.spacer} />
      </ScrollView>
      {/* Bottom Button */}
      <View style={styles.bottomButtons}>
        <TouchableOpacity
          style={styles.updateButton}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.updateButtonText}>Update Sale</Text>
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  paymentButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#F0F0F0",
  },
  activePaymentButton: {
    backgroundColor: "#4CAF50",
  },
  paymentButtonText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  activePaymentButtonText: {
    color: "#FFFFFF",
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
  },
  invoiceLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  invoiceValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  inputSection: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: "#007AFF",
    marginBottom: 8,
    fontWeight: "500",
  },
  textInput: {
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#007AFF",
    borderRadius: 8,
    padding: 12,
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
    alignItems: "center",
  },
  itemsHeaderText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1976D2",
  },
  itemContainer: {
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  itemRow: {
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
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  totalLabel: {
    fontSize: 12,
    color: "#666",
  },
  totalCount: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  addItemsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#007AFF",
    borderStyle: "dashed",
    borderRadius: 8,
    paddingVertical: 16,
    marginBottom: 16,
  },
  addItemsText: {
    fontSize: 16,
    color: "#007AFF",
    fontWeight: "500",
    marginLeft: 8,
  },
  totalAmountSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  totalAmountLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  totalAmountValue: {
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
  checkbox: {
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
    marginRight: 8,
  },
  receivedCurrency: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginRight: 8,
  },
  receivedInput: {
    flex: 1,
    backgroundColor: "#F8F9FA",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#333",
    textAlign: "right",
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
  balancePositive: {
    color: "#F44336",
  },
  balanceZero: {
    color: "#4CAF50",
  },
  spacer: {
    height: 80,
  },
  bottomButtons: {
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  updateButton: {
    backgroundColor: "#4CAF50",
    borderRadius: 8,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  updateButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginRight: 8,
  },
});
