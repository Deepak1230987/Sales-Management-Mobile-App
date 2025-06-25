import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  addDoc,
  collection,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  serverTimestamp,
} from "@react-native-firebase/firestore";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
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

export default function AddSale() {
  const router = useRouter();
  const { fresh } = useLocalSearchParams();
  const { user } = useAuth();

  console.log("🚀 AddSale component initialized with fresh:", fresh);

  const [loading, setLoading] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState<number>(1);
  const [customerName, setCustomerName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [paymentType, setPaymentType] = useState("Credit");
  const [receivedAmount, setReceivedAmount] = useState("");
  const [isReceivedChecked, setIsReceivedChecked] = useState(false);

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
  // Get next invoice number
  const getNextInvoiceNumber = async () => {
    try {
      console.log("🔢 Getting next invoice number...");
      const db = getFirestore();
      const salesCollection = collection(db, "sales");
      const q = query(
        salesCollection,
        orderBy("invoiceNumber", "desc"),
        limit(1)
      );
      const querySnapshot = await getDocs(q);

      console.log("🔢 Query snapshot empty:", querySnapshot.empty);
      console.log("🔢 Query snapshot size:", querySnapshot.size);

      if (!querySnapshot.empty) {
        const lastSale = querySnapshot.docs[0].data();
        console.log("🔢 Last sale data:", lastSale);
        console.log("🔢 Last invoice number:", lastSale.invoiceNumber);
        const nextNumber = (lastSale.invoiceNumber || 0) + 1;
        console.log("🔢 Next invoice number will be:", nextNumber);
        return nextNumber;
      }
      console.log("🔢 No existing sales found, starting with invoice number 1");
      return 1;
    } catch (error) {
      console.error("❌ Error getting next invoice number:", error);
      return 1;
    }
  };

  useEffect(() => {
    const initializeInvoice = async () => {
      console.log("🎬 Initializing invoice number...");
      const nextNumber = await getNextInvoiceNumber();
      console.log("🎬 Setting invoice number to:", nextNumber);
      setInvoiceNumber(nextNumber);
      console.log("🎬 Invoice number state updated");
    };
    initializeInvoice();
  }, []); // Only run once on mount
  // Handle fresh start and form clearing
  useEffect(() => {
    const handleFreshStart = async () => {
      try {
        console.log("🔄 useEffect triggered with fresh:", fresh);
        if (fresh === "true") {
          console.log(
            "✅ Fresh start detected - clearing all form data and items"
          );
          // Clear AsyncStorage
          await AsyncStorage.removeItem("pendingItems");
          await AsyncStorage.removeItem("editingItem");

          // Reset all form fields (but NOT invoice number)
          setItems([]);
          setCustomerName("");
          setPhoneNumber("");
          setReceivedAmount("");
          setIsReceivedChecked(false);
          setPaymentType("Credit");

          console.log(
            "✅ Form cleared successfully for fresh start (keeping invoice number)"
          );
        } else {
          console.log("❌ Not a fresh start, fresh parameter:", fresh);
        }
      } catch (error) {
        console.error("❌ Error handling fresh start:", error);
      }
    };

    handleFreshStart();
  }, [fresh]);
  // Combined focus effect to handle both invoice refresh and item loading
  useFocusEffect(
    useCallback(() => {
      const handlePageFocus = async () => {
        try {
          console.log("🔍 Page focused with fresh:", fresh);

          // Always refresh invoice number when page is focused
          console.log("🔄 Refreshing invoice number...");
          const nextNumber = await getNextInvoiceNumber();
          console.log("🔄 Updated invoice number to:", nextNumber);
          setInvoiceNumber(nextNumber);

          // Handle form clearing and item loading based on fresh parameter
          if (fresh === "true") {
            console.log("✅ Fresh start - clearing all form fields");
            // Clear form fields for fresh start
            setItems([]);
            setCustomerName("");
            setPhoneNumber("");
            setReceivedAmount("");
            setIsReceivedChecked(false);
            setPaymentType("Credit");

            // Clear AsyncStorage
            await AsyncStorage.removeItem("pendingItems");
            await AsyncStorage.removeItem("editingItem");

            console.log("✅ Fresh start form clearing completed");
          } else {
            console.log(
              "📦 Not a fresh start - loading items from AsyncStorage..."
            );
            const savedItems = await AsyncStorage.getItem("pendingItems");
            console.log("📦 Saved items found:", savedItems);
            if (savedItems) {
              const parsedItems = JSON.parse(savedItems);
              setItems(parsedItems);
              console.log("📦 Items loaded:", parsedItems.length, "items");
            } else {
              console.log("📦 No saved items found");
            }
          }
        } catch (error) {
          console.error("❌ Error in handlePageFocus:", error);
        }
      };

      handlePageFocus();
    }, [fresh])
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
        // Assuming 18% GST if with tax
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
      // When checked, set received amount to total
      setReceivedAmount(calculateTotal().toString());
    } else {
      // When unchecked, clear received amount
      setReceivedAmount("");
    }
  };

  const getReceivedAmountValue = () => {
    return receivedAmount ? parseFloat(receivedAmount) : 0;
  };

  const getBalanceDue = () => {
    return calculateTotal() - getReceivedAmountValue();
  };
  const handleAddItems = async () => {
    try {
      // Only clear editing item if this is a completely fresh sale with no items
      if (fresh === "true" && items.length === 0) {
        await AsyncStorage.removeItem("editingItem");
        await AsyncStorage.removeItem("pendingItems");
      }
      router.push("/admin/add-items");
    } catch (error) {
      console.error("Error in handleAddItems:", error);
      router.push("/admin/add-items");
    }
  };
  const handleEditItem = async (item: Item, index: number) => {
    try {
      // Add null check for item
      if (!item) {
        console.error("Item is null or undefined");
        return;
      }

      console.log("EDIT-ITEM: Storing item for editing:", {
        ...item,
        editIndex: index,
      });

      // Store the item to edit in AsyncStorage
      await AsyncStorage.setItem(
        "editingItem",
        JSON.stringify({ ...item, editIndex: index })
      );

      console.log("EDIT-ITEM: Item stored, navigating to add-items");
      router.push("/admin/add-items");
    } catch (error) {
      console.error("Error storing item for editing:", error);
    }
  };

  const handleSave = async (isNewSale = false) => {
    try {
      if (!customerName.trim()) {
        Alert.alert("Error", "Customer name is required");
        return;
      }

      console.log("💾 Saving sale with invoice number:", invoiceNumber);
      setLoading(true);
      const db = getFirestore();
      const now = new Date();
      const { date, time } = getCurrentDateTime();
      const saleData = {
        invoiceNumber,
        paymentType,
        customerName: customerName.trim(),
        phoneNumber: phoneNumber.trim(),
        items,
        totalAmount: calculateTotal(),
        subtotal: calculateSubtotal(),
        totalTax: calculateTotalTax(),
        totalQuantity: calculateTotalQuantity(),
        totalCount: calculateTotalCount(),
        receivedAmount: getReceivedAmountValue(),
        balanceAmount: getBalanceDue(), // Store the calculated balance
        date: now, // Store as Date object instead of string
        dateString: date, // Keep string format for display
        timeString: time, // Keep string format for display
        createdBy: user?.uid,
        createdAt: serverTimestamp(),
      };

      console.log("💾 Sale data being saved:", saleData);
      await addDoc(collection(db, "sales"), saleData);

      // Clear the pending items from AsyncStorage after successful save
      await AsyncStorage.removeItem("pendingItems");
      if (isNewSale) {
        // Reset form for new sale
        console.log("💾 Resetting form for new sale...");
        const nextNumber = await getNextInvoiceNumber();
        console.log("💾 Got next invoice number for new sale:", nextNumber);
        setInvoiceNumber(nextNumber);
        setCustomerName("");
        setPhoneNumber("");
        setItems([]);
        setReceivedAmount("");
        setIsReceivedChecked(false);
        setPaymentType("Credit");

        // Also clear AsyncStorage to ensure clean state
        await AsyncStorage.removeItem("pendingItems");
        await AsyncStorage.removeItem("editingItem");
        Alert.alert("Success", "Sale saved successfully!");
      } else {
        // For regular save, clear form and navigate back
        console.log(
          "💾 Regular save completed, clearing form and navigating back"
        );

        // Clear AsyncStorage to ensure clean state
        await AsyncStorage.removeItem("pendingItems");
        await AsyncStorage.removeItem("editingItem");

        Alert.alert("Success", "Sale saved successfully!", [
          {
            text: "OK",
            onPress: () => {
              // Navigate back to admin home
              router.replace("/admin");
            },
          },
        ]);
      }
    } catch (error) {
      console.error("Error saving sale:", error);
      Alert.alert("Error", "Failed to save sale. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sale</Text>
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
          <TouchableOpacity>
            <Ionicons name="settings-outline" size={24} color="#333" />
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
                // Add null checks for item properties
                const rate = item.rate || 0;
                const quantity = item.quantity || 0;
                const itemSubtotal = rate * quantity;
                const itemTax =
                  item.taxType === "With Tax" ? itemSubtotal * 0.18 : 0;
                const itemDiscount = 0; // No discount for now

                return (
                  <TouchableOpacity
                    key={index}
                    style={styles.itemContainer}
                    onPress={() => handleEditItem(item, index)}
                  >
                    {/* Item Header */}
                    <View style={styles.itemRow}>
                      <Text style={styles.itemNumber}>#{index + 1}</Text>
                      <Text style={styles.itemName}>
                        {item.name || "Unknown Item"} ({item.unit || ""})
                      </Text>
                      <Text style={styles.itemAmount}>
                        ₹ {(item.amount || 0).toFixed(0)}
                      </Text>
                    </View>
                    {/* Item Details */}
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
          {/* Balance Due */}
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

      {/* Bottom Buttons */}
      <View style={styles.bottomButtons}>
        <TouchableOpacity
          style={styles.saveNewButton}
          onPress={() => handleSave(true)}
          disabled={loading}
        >
          <Text style={styles.saveNewButtonText}>Save & New</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={() => handleSave(false)}
          disabled={loading}
        >
          <Text style={styles.saveButtonText}>Save</Text>
          <Ionicons name="share-outline" size={16} color="#FFFFFF" />
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
  saveNewButton: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: "center",
    marginRight: 8,
  },
  saveNewButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  saveButton: {
    flex: 2,
    backgroundColor: "#007AFF",
    borderRadius: 8,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginRight: 8,
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
});
