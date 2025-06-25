import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  collection,
  doc,
  getFirestore,
  increment,
  onSnapshot,
  updateDoc,
} from "@react-native-firebase/firestore";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

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

// Database Item type
type DatabaseItem = {
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

export default function AddItems() {
  const router = useRouter();
  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("Pcs");
  const [rate, setRate] = useState("");
  const [taxType, setTaxType] = useState("Without Tax");
  const [count, setCount] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingItem, setEditingItem] = useState<
    (Item & { editIndex: number }) | null
  >(null);
  const [showUnitPicker, setShowUnitPicker] = useState(false);
  // Item picker modal states
  const [showItemPicker, setShowItemPicker] = useState(false);
  const [databaseItems, setDatabaseItems] = useState<DatabaseItem[]>([]);
  const [filteredDatabaseItems, setFilteredDatabaseItems] = useState<
    DatabaseItem[]
  >([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingItems, setLoadingItems] = useState(false);

  const commonUnits = ["buc", "Pcs", "Ltr"];
  // Load item for editing if exists
  useEffect(() => {
    const loadEditingItem = async () => {
      try {
        const editingItemData = await AsyncStorage.getItem("editingItem");
        console.log("ADD-ITEMS: Loading editing item data:", editingItemData);

        if (editingItemData) {
          const item = JSON.parse(editingItemData);
          console.log("ADD-ITEMS: Parsed editing item:", item);
          setEditingItem(item);

          // Pre-populate the form with null checks
          setItemName(item.name || "");
          setQuantity(item.quantity ? item.quantity.toString() : "");
          setUnit(item.unit || "");
          setRate(item.rate ? item.rate.toString() : "");
          setTaxType(item.taxType || "Without Tax");
          setCount(item.count ? item.count.toString() : "");

          console.log("ADD-ITEMS: Form populated for editing");

          // Clear the editing item from storage
          await AsyncStorage.removeItem("editingItem");
        } else {
          console.log("ADD-ITEMS: No editing item found, starting fresh");
        }
      } catch (error) {
        console.error("Error loading editing item:", error);
      }
    };
    loadEditingItem();
  }, []);

  // Load items from database
  useEffect(() => {
    const loadDatabaseItems = () => {
      setLoadingItems(true);
      const db = getFirestore();
      const itemsCollectionRef = collection(db, "items");

      const unsubscribe = onSnapshot(
        itemsCollectionRef,
        (snapshot) => {
          if (snapshot && snapshot.docs) {
            const itemsData = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            })) as DatabaseItem[];
            setDatabaseItems(itemsData);
            setFilteredDatabaseItems(itemsData);
          } else {
            setDatabaseItems([]);
            setFilteredDatabaseItems([]);
          }
          setLoadingItems(false);
        },
        (error) => {
          console.error("Error fetching items:", error);
          setLoadingItems(false);
        }
      );

      return unsubscribe;
    };

    return loadDatabaseItems();
  }, []);

  // Filter database items based on search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredDatabaseItems(databaseItems);
    } else {
      const filtered = databaseItems.filter(
        (item) =>
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.itemCode?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredDatabaseItems(filtered);
    }
  }, [searchQuery, databaseItems]);
  // Handle selecting an item from database
  const handleSelectDatabaseItem = (item: DatabaseItem) => {
    // Check if there's enough stock
    if (item.stockQuantity <= 0) {
      Alert.alert("Out of Stock", `${item.name} is currently out of stock.`);
      return;
    }

    // Pre-fill form with only name and unit from database
    setItemName(item.name);
    setUnit(item.unit || "Pcs");

    // Clear other fields for user input
    setRate("");
    setTaxType("Without Tax");
    setQuantity("");
    setCount("");

    setShowItemPicker(false);
  };

  // Update stock quantity in database
  const updateItemStock = async (itemId: string, quantityUsed: number) => {
    try {
      const db = getFirestore();
      const itemRef = doc(db, "items", itemId);
      await updateDoc(itemRef, {
        stockQuantity: increment(-quantityUsed),
      });
    } catch (error) {
      console.error("Error updating stock:", error);
      // Don't show alert here as this is called during save
    }
  };

  // Find database item by name for stock management
  const findDatabaseItemByName = (itemName: string): DatabaseItem | null => {
    return (
      databaseItems.find(
        (item) =>
          item.name.toLowerCase().trim() === itemName.toLowerCase().trim()
      ) || null
    );
  };
  const calculateAmount = () => {
    const qty = parseFloat(quantity) || 0;
    const price = parseFloat(rate) || 0;
    let amount = qty * price;

    if (taxType === "With Tax") {
      // Add 18% GST if with tax
      amount = amount * 1.18;
    }

    return amount;
  };
  const clearForm = () => {
    setItemName("");
    setQuantity("");
    setRate("");
    setCount("");
    setTaxType("Without Tax");
    setUnit("Pcs");
    setEditingItem(null);
  };
  const handleSave = async (isNewItem = false) => {
    try {
      if (!itemName.trim()) {
        Alert.alert("Error", "Item name is required");
        return;
      }

      if (
        !quantity ||
        isNaN(parseFloat(quantity)) ||
        parseFloat(quantity) <= 0
      ) {
        Alert.alert("Error", "Please enter a valid quantity");
        return;
      }

      if (!rate || isNaN(parseFloat(rate)) || parseFloat(rate) <= 0) {
        Alert.alert("Error", "Please enter a valid rate");
        return;
      }
      const quantityValue = parseFloat(quantity);

      // Check stock availability for database items
      const dbItem = findDatabaseItemByName(itemName.trim());
      if (dbItem) {
        if (dbItem.stockQuantity < quantityValue) {
          Alert.alert(
            "Insufficient Stock",
            `Only ${dbItem.stockQuantity.toFixed(1)} ${
              dbItem.unit || "units"
            } available. You requested ${quantityValue}.`
          );
          return;
        }
      }

      setLoading(true);
      const newItem: Item = {
        id: editingItem ? editingItem.id : Date.now().toString(),
        name: itemName.trim(),
        quantity: quantityValue,
        unit,
        rate: parseFloat(rate),
        taxType,
        count: parseFloat(count) || 0,
        amount: calculateAmount(),
      };

      // Get existing items from AsyncStorage
      const existingItems = await AsyncStorage.getItem("pendingItems");
      let items: Item[] = existingItems ? JSON.parse(existingItems) : [];

      if (editingItem) {
        // Update existing item
        items[editingItem.editIndex] = newItem;
      } else {
        // Add new item
        items.push(newItem);
      } // Save back to AsyncStorage
      await AsyncStorage.setItem("pendingItems", JSON.stringify(items)); // Update stock in database
      const stockUpdateItem = findDatabaseItemByName(itemName.trim());
      if (stockUpdateItem) {
        await updateItemStock(stockUpdateItem.id, quantityValue);
      }

      if (isNewItem) {
        // Reset form for new item and stay on this page
        clearForm();
        Alert.alert(
          "Success",
          editingItem
            ? "Item updated successfully!"
            : "Item added successfully!"
        );
      } else {
        // Clear form and navigate back to add-sale page
        clearForm();
        router.replace("/admin/add-sale");
      }
    } catch (error) {
      console.error("Error saving item:", error);
      Alert.alert("Error", "Failed to save item. Please try again.");
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
      
        <TouchableOpacity onPress={() => router.replace("/biller/add-sale")}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {editingItem ? "Edit Item" : "Add Items to Sale"}
        </Text>
        <TouchableOpacity>
          <Ionicons name="settings-outline" size={24} color="#333" />
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Item Selection Button */}
        <TouchableOpacity
          style={styles.selectItemButton}
          onPress={() => setShowItemPicker(true)}
        >
          <Ionicons name="list-outline" size={20} color="#007AFF" />
          <Text style={styles.selectItemButtonText}>
            {itemName ? `Selected: ${itemName}` : "Select Item from Inventory"}
          </Text>
          <Ionicons name="chevron-forward" size={20} color="#007AFF" />
        </TouchableOpacity>
        {/* Item Name */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Item Name</Text>
          <TextInput
            style={[styles.textInput, styles.readOnlyInput]}
            value={itemName}
            placeholder="Select an item from inventory"
            placeholderTextColor="#999"
            editable={false}
          />
        </View>
        {/* Quantity and Unit Row */}
        <View style={styles.rowSection}>
          <View style={[styles.inputSection, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.inputLabel}>Quantity</Text>
            <TextInput
              style={styles.textInput}
              value={quantity}
              onChangeText={setQuantity}
              placeholder=""
              placeholderTextColor="#999"
              keyboardType="numeric"
            />
          </View>
          <View style={[styles.inputSection, { flex: 1, marginLeft: 8 }]}>
            <Text style={styles.inputLabel}>Unit</Text>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setShowUnitPicker(true)}
            >
              <Text style={styles.dropdownText}>{unit}</Text>
              <Ionicons name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>
          </View>
        </View>
        {/* Rate and Tax Type Row */}
        <View style={styles.rowSection}>
          <View style={[styles.inputSection, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.inputLabel}>Rate (Price/Unit)</Text>
            <TextInput
              style={styles.textInput}
              value={rate}
              onChangeText={setRate}
              placeholder=""
              placeholderTextColor="#999"
              keyboardType="numeric"
            />
          </View>
          <View style={[styles.inputSection, { flex: 1, marginLeft: 8 }]}>
            <Text style={styles.inputLabel}>Tax Type</Text>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => {
                setTaxType(
                  taxType === "Without Tax" ? "With Tax" : "Without Tax"
                );
              }}
            >
              <Text style={styles.dropdownText}>{taxType}</Text>
              <Ionicons name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>
          </View>
        </View>
        {/* Count */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Count</Text>
          <TextInput
            style={styles.textInput}
            value={count}
            onChangeText={setCount}
            placeholder=""
            placeholderTextColor="#999"
            keyboardType="numeric"
          />
        </View>
        {/* Amount Preview */}
        {quantity && rate && (
          <View style={styles.amountPreview}>
            <Text style={styles.amountLabel}>Amount Preview:</Text>
            <Text style={styles.amountValue}>
              ₹ {calculateAmount().toFixed(2)}
            </Text>
          </View>
        )}
        <View style={styles.spacer} />
      </ScrollView>
      {/* Unit Picker Modal */}
      <Modal
        visible={showUnitPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowUnitPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Unit</Text>
              <TouchableOpacity onPress={() => setShowUnitPicker(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={commonUnits}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.unitOption,
                    unit === item && styles.selectedUnitOption,
                  ]}
                  onPress={() => {
                    setUnit(item);
                    setShowUnitPicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.unitOptionText,
                      unit === item && styles.selectedUnitOptionText,
                    ]}
                  >
                    {item}
                  </Text>
                  {unit === item && (
                    <Ionicons name="checkmark" size={20} color="#007AFF" />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
      {/* Item Picker Modal */}
      <Modal
        visible={showItemPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowItemPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.itemPickerModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Item from Inventory</Text>
              <TouchableOpacity onPress={() => setShowItemPicker(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <Ionicons
                name="search"
                size={20}
                color="#666"
                style={styles.searchIcon}
              />
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search items..."
                placeholderTextColor="#999"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearchQuery("")}
                  style={styles.clearSearchButton}
                >
                  <Ionicons name="close-circle" size={20} color="#999" />
                </TouchableOpacity>
              )}
            </View>

            {/* Items List */}
            {loadingItems ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Loading items...</Text>
              </View>
            ) : (
              <FlatList
                data={filteredDatabaseItems}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.itemsList}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Ionicons name="cube-outline" size={48} color="#CCC" />
                    <Text style={styles.emptyText}>
                      {searchQuery
                        ? "No items found matching your search"
                        : "No items in inventory"}
                    </Text>
                    <Text style={styles.emptySubText}>
                      Please add items to inventory first
                    </Text>
                  </View>
                }
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.itemCard,
                      item.stockQuantity <= 0 && styles.outOfStockCard,
                      item.stockQuantity > 0 &&
                        item.stockQuantity <= (item.minStockQuantity || 5) &&
                        styles.lowStockCard,
                    ]}
                    onPress={() => handleSelectDatabaseItem(item)}
                    disabled={item.stockQuantity <= 0}
                  >
                    <View style={styles.itemHeader}>
                      <Text
                        style={[
                          styles.itemName,
                          item.stockQuantity <= 0 && styles.outOfStockText,
                        ]}
                      >
                        {item.name}
                      </Text>
                      <View
                        style={[
                          styles.stockBadge,
                          item.stockQuantity <= 0
                            ? styles.outOfStockBadge
                            : item.stockQuantity <= (item.minStockQuantity || 5)
                            ? styles.lowStockBadge
                            : styles.inStockBadge,
                        ]}
                      >
                        <Text
                          style={[
                            styles.stockText,
                            item.stockQuantity <= 0
                              ? styles.outOfStockBadgeText
                              : item.stockQuantity <=
                                (item.minStockQuantity || 5)
                              ? styles.lowStockBadgeText
                              : styles.inStockBadgeText,
                          ]}
                        >
                          {item.stockQuantity <= 0
                            ? "Out of Stock"
                            : item.stockQuantity <= (item.minStockQuantity || 5)
                            ? "Low Stock"
                            : "In Stock"}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.itemDetails}>
                      <View style={styles.itemDetailRow}>
                        <Text style={styles.itemDetailLabel}>Stock:</Text>
                        <Text
                          style={[
                            styles.itemDetailValue,
                            item.stockQuantity <= 0 && styles.outOfStockText,
                          ]}
                        >
                          {item.stockQuantity.toFixed(1)} {item.unit || "units"}
                        </Text>
                      </View>
                      <View style={styles.itemDetailRow}>
                        <Text style={styles.itemDetailLabel}>Price:</Text>
                        <Text style={styles.itemDetailValue}>
                          ₹{item.salePrice.toFixed(2)}
                        </Text>
                      </View>
                      {item.itemCode && (
                        <View style={styles.itemDetailRow}>
                          <Text style={styles.itemDetailLabel}>Code:</Text>
                          <Text style={styles.itemDetailValue}>
                            {item.itemCode}
                          </Text>
                        </View>
                      )}
                    </View>

                    {item.stockQuantity <= 0 && (
                      <View style={styles.outOfStockOverlay}>
                        <Ionicons
                          name="close-circle"
                          size={24}
                          color="#FF4444"
                        />
                      </View>
                    )}
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
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
  content: {
    flex: 1,
    padding: 16,
  },
  inputSection: {
    marginBottom: 20,
  },
  rowSection: {
    flexDirection: "row",
    marginBottom: 0,
  },
  inputLabel: {
    fontSize: 14,
    color: "#007AFF",
    marginBottom: 8,
    fontWeight: "500",
  },
  textInput: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: "#333",
    minHeight: 56,
  },
  dropdownButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 56,
  },
  dropdownText: {
    fontSize: 16,
    color: "#333",
  },
  selectItemButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#007AFF",
    borderRadius: 8,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  selectItemButtonText: {
    flex: 1,
    fontSize: 16,
    color: "#007AFF",
    fontWeight: "500",
    marginHorizontal: 12,
  },
  readOnlyInput: {
    backgroundColor: "#F8F9FA",
    color: "#666",
  },
  emptySubText: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    marginTop: 8,
  },
  amountPreview: {
    backgroundColor: "#E8F5E9",
    borderRadius: 8,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  amountLabel: {
    fontSize: 16,
    color: "#2E7D32",
    fontWeight: "500",
  },
  amountValue: {
    fontSize: 18,
    color: "#2E7D32",
    fontWeight: "bold",
  },
  spacer: {
    height: 40,
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
    alignItems: "center",
    marginLeft: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "60%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  unitOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  selectedUnitOption: {
    backgroundColor: "#F0F8FF",
  },
  unitOptionText: {
    fontSize: 16,
    color: "#333",
  },
  selectedUnitOptionText: {
    color: "#007AFF",
    fontWeight: "600",
  },
  // Item picker modal styles
  itemPickerModal: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "85%",
    minHeight: "60%",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    borderRadius: 10,
    margin: 16,
    paddingHorizontal: 12,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    height: "100%",
  },
  clearSearchButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  itemsList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginTop: 12,
    marginBottom: 20,
  },
  itemCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  outOfStockCard: {
    backgroundColor: "#F5F5F5",
    borderColor: "#FF4444",
    borderWidth: 1,
    opacity: 0.6,
  },
  lowStockCard: {
    borderColor: "#FF9500",
    borderWidth: 1,
    backgroundColor: "#FFF8F0",
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    flex: 1,
    marginRight: 12,
  },
  outOfStockText: {
    color: "#999",
  },
  stockBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  inStockBadge: {
    backgroundColor: "#E8F5E9",
  },
  lowStockBadge: {
    backgroundColor: "#FFF3E0",
  },
  outOfStockBadge: {
    backgroundColor: "#FFEBEE",
  },
  stockText: {
    fontSize: 12,
    fontWeight: "600",
  },
  inStockBadgeText: {
    color: "#2E7D32",
  },
  lowStockBadgeText: {
    color: "#F57C00",
  },
  outOfStockBadgeText: {
    color: "#D32F2F",
  },
  itemDetails: {
    gap: 8,
  },
  itemDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemDetailLabel: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  itemDetailValue: {
    fontSize: 14,
    color: "#333",
    fontWeight: "600",
  },
  outOfStockOverlay: {
    position: "absolute",
    top: 8,
    right: 8,
  },
});
