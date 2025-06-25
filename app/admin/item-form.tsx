import { Ionicons } from "@expo/vector-icons";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  updateDoc,
} from "@react-native-firebase/firestore";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { FormSkeleton } from "../components/SkeletonLoader";
import { useAuth } from "../contexts/AuthContext";

export default function AddEditItem() {
  const router = useRouter();
  const { itemId } = useLocalSearchParams();
  const { user } = useAuth();
  const isEditMode = !!itemId;
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("Pricing");
  const [showUnitModal, setShowUnitModal] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    itemCode: "",
    hsnCode: "",
    unit: "buc",
    salePrice: "",
    purchasePrice: "",
    wholesalePrice: "",
    stockQuantity: "",
    minStockQuantity: "",
    taxRate: "",
    discountType: "Percentage",
    discountValue: "",
  });
  const units = ["Pcs", "buc", "Ltr"];
  const tabs = ["Pricing", "Stock", "Online Store"];

  const handleUnitSelect = (selectedUnit: string) => {
    setFormData((prev) => ({ ...prev, unit: selectedUnit }));
    setShowUnitModal(false);
  };

  const loadItemData = useCallback(async () => {
    try {
      setLoading(true);
      const db = getFirestore();
      const itemDoc = await getDoc(doc(db, "items", itemId as string));

      if (itemDoc.exists()) {
        const data = itemDoc.data();
        if (data) {
          setFormData({
            name: data.name || "",
            description: data.description || "",
            itemCode: data.itemCode || "",
            hsnCode: data.hsnCode || "",
            unit: data.unit || "Pcs",
            salePrice: data.salePrice?.toString() || "",
            purchasePrice: data.purchasePrice?.toString() || "",
            wholesalePrice: data.wholesalePrice?.toString() || "",
            stockQuantity: data.stockQuantity?.toString() || "",
            minStockQuantity: data.minStockQuantity?.toString() || "",
            taxRate: data.taxRate?.toString() || "",
            discountType: data.discountType || "Percentage",
            discountValue: data.discountValue?.toString() || "",
          });
        }
      } else {
        Alert.alert("Error", "Item not found");
        router.replace("/admin/items");
      }
    } catch (error) {
      console.error("Error loading item:", error);
      Alert.alert("Error", "Failed to load item data");
      router.replace("/admin/items");
    } finally {
      setLoading(false);
    }
  }, [itemId, router]);

  useEffect(() => {
    if (isEditMode && itemId) {
      loadItemData();
    }
  }, [itemId, isEditMode, loadItemData]);

  const handleSave = async () => {
    try {
      // Validation
      if (!formData.name.trim()) {
        Alert.alert("Validation Error", "Item name is required");
        return;
      }

      if (!formData.salePrice || isNaN(parseFloat(formData.salePrice))) {
        Alert.alert("Validation Error", "Valid sale price is required");
        return;
      }

      if (
        !formData.stockQuantity ||
        isNaN(parseFloat(formData.stockQuantity))
      ) {
        Alert.alert("Validation Error", "Valid stock quantity is required");
        return;
      }
      setSaving(true);
      const db = getFirestore();
      const itemData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        itemCode: formData.itemCode.trim(),
        hsnCode: formData.hsnCode.trim(),
        unit: formData.unit,
        salePrice: parseFloat(formData.salePrice),
        purchasePrice: parseFloat(formData.purchasePrice) || 0,
        wholesalePrice: parseFloat(formData.wholesalePrice) || 0,
        stockQuantity: parseFloat(formData.stockQuantity),
        minStockQuantity: parseFloat(formData.minStockQuantity) || 0,
        taxRate: parseFloat(formData.taxRate) || 0,
        discountType: formData.discountType,
        discountValue: parseFloat(formData.discountValue) || 0,
        updatedAt: serverTimestamp(),
        updatedBy: user?.uid,
      };

      if (isEditMode) {
        await updateDoc(doc(db, "items", itemId as string), itemData);
        Alert.alert("Success", "Item updated successfully!", [
          { text: "OK", onPress: () => router.replace("/admin/items") },
        ]);
      } else {
        await addDoc(collection(db, "items"), {
          ...itemData,
          createdAt: serverTimestamp(),
          createdBy: user?.uid,
        });
        Alert.alert("Success", "Item added successfully!", [
          { text: "OK", onPress: () => router.replace("/admin/items") },
        ]);
      }
    } catch (error) {
      console.error("Error saving item:", error);
      Alert.alert("Error", "Failed to save item. Please try again.");
    } finally {
      setSaving(false);
    }
  };
  const updateFormData = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };
  const renderInput = (
    label: string,
    field: string,
    placeholder: string,
    keyboardType: any = "default",
    multiline: boolean = false
  ) => (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.textArea]}
        value={formData[field as keyof typeof formData]}
        onChangeText={(value) => updateFormData(field, value)}
        placeholder={placeholder}
        keyboardType={keyboardType}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        placeholderTextColor="#8E8E93"
      />
    </View>
  );

  const renderTabs = () => (
    <View style={styles.tabContainer}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab}
          style={[styles.tab, activeTab === tab && styles.activeTab]}
          onPress={() => setActiveTab(tab)}
        >
          <Text
            style={[styles.tabText, activeTab === tab && styles.activeTabText]}
          >
            {tab}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
  const renderPricingTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Sale Price</Text>

      {renderInput(
        "Sale Price",
        "salePrice",
        "Enter sale price",
        "decimal-pad"
      )}

      {renderInput(
        "Disc. On Sale Price (%)",
        "discountValue",
        "Enter discount percentage",
        "decimal-pad"
      )}

      <Text style={styles.sectionTitle}>Purchase Price</Text>

      {renderInput(
        "Purchase Price",
        "purchasePrice",
        "Enter purchase price",
        "decimal-pad"
      )}

      <Text style={styles.sectionTitle}>Taxes</Text>

      {renderInput("Tax Rate (%)", "taxRate", "Enter tax rate", "decimal-pad")}
    </View>
  );

  const renderStockTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Stock Management</Text>

      {renderInput(
        "Current Stock",
        "stockQuantity",
        "Enter current stock",
        "numeric"
      )}

      {renderInput(
        "Minimum Stock",
        "minStockQuantity",
        "Enter minimum stock level",
        "numeric"
      )}
    </View>
  );

  const renderOnlineStoreTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Online Store Settings</Text>
      <Text style={styles.comingSoonText}>Coming Soon...</Text>
    </View>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case "Pricing":
        return renderPricingTab();
      case "Stock":
        return renderStockTab();
      case "Online Store":
        return renderOnlineStoreTab();
      default:
        return renderPricingTab();
    }
  };
  if (loading) {
    return <FormSkeleton />;
  }
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.replace("/admin/items")}
        >
          <Ionicons name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditMode ? "Edit Item" : "Add New Item"}
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerIconButton}>
            <Ionicons name="camera-outline" size={24} color="#000000" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconButton}>
            <Ionicons name="settings-outline" size={24} color="#000000" />
          </TouchableOpacity>
        </View>
      </View>
      <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
        {/* Basic Information Section */}
        <View style={styles.basicInfoSection}>
          <View style={styles.basicInfoContainer}>
            <View style={styles.leftColumn}>
              {renderInput("Item Name", "name", "Item Name")}
              {renderInput("Item Code", "itemCode", "Item Code")}
              {renderInput("HSN Code", "hsnCode", "HSN Code")}
            </View>
            <View style={styles.rightColumn}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => setShowUnitModal(true)}
              >
                <Text style={styles.actionButtonText}>
                  {formData.unit || "Select Unit"}
                </Text>
                <Ionicons name="chevron-down" size={16} color="#007AFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
        {/* Tab Navigation */}
        {renderTabs()}
        {/* Tab Content */}
        {renderTabContent()}
        {/* Bottom spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
      {/* Bottom Action Buttons */}
      <View style={styles.bottomButtons}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => router.replace("/admin/items")}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>
      {/* Unit Selection Modal */}
      <Modal
        visible={showUnitModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowUnitModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Unit</Text>
              <TouchableOpacity onPress={() => setShowUnitModal(false)}>
                <Ionicons name="close" size={24} color="#8E8E93" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.unitList}>
              {units.map((unit) => (
                <TouchableOpacity
                  key={unit}
                  style={[
                    styles.unitOption,
                    formData.unit === unit && styles.selectedUnitOption,
                  ]}
                  onPress={() => handleUnitSelect(unit)}
                >
                  <Text
                    style={[
                      styles.unitOptionText,
                      formData.unit === unit && styles.selectedUnitOptionText,
                    ]}
                  >
                    {unit}
                  </Text>
                  {formData.unit === unit && (
                    <Ionicons name="checkmark" size={20} color="#007AFF" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
    top: 25,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000000",
    flex: 1,
    textAlign: "center",
    marginHorizontal: 16,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerIconButton: {
    padding: 8,
  },
  form: {
    flex: 1,
  },
  basicInfoSection: {
    backgroundColor: "#FFFFFF",
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  basicInfoContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  leftColumn: {
    flex: 1,
    marginRight: 1,
  },
  rightColumn: {
    width: 80,
    marginTop: 25,
    justifyContent: "flex-start",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8F9FA",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  actionButtonText: {
    fontSize: 12,
    color: "#007AFF",
    fontWeight: "500",
    flex: 1,
  },
  manufacturingButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8F9FA",
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E5EA",
    gap: 8,
  },
  manufacturingButtonText: {
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "500",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: "#007AFF",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#8E8E93",
  },
  activeTabText: {
    color: "#FFFFFF",
  },
  tabContent: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#000000",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: "#000000",
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8F9FA",
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E5EA",
    gap: 8,
    marginBottom: 24,
  },
  addButtonText: {
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "500",
  },
  comingSoonText: {
    fontSize: 16,
    color: "#8E8E93",
    textAlign: "center",
    fontStyle: "italic",
    marginTop: 32,
  },
  bottomButtons: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E5EA",
    gap: 12,
    marginBottom: 16,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 8,
    backgroundColor: "#F8F9FA",
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#8E8E93",
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    borderRadius: 8,
    backgroundColor: "#007AFF",
  },
  saveButtonDisabled: {
    backgroundColor: "#C7C7CC",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
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
  bottomSpacing: {
    height: 32,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000000",
  },
  unitList: {
    maxHeight: 300,
  },
  unitOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F1F1",
  },
  selectedUnitOption: {
    backgroundColor: "#F0F8FF",
  },
  unitOptionText: {
    fontSize: 16,
    color: "#000000",
  },
  selectedUnitOptionText: {
    color: "#007AFF",
    fontWeight: "500",
  },
});
