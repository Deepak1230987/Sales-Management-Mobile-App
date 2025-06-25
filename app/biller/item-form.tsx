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
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const isEditMode = id !== "new";
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("Pricing");
  const [showUnitModal, setShowUnitModal] = useState(false);

  useEffect(() => {
    if (!user || user.role !== "biller") {
      router.replace("/login");
    }
  }, [user, router]);

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    itemCode: "",
    hsnCode: "",
    unit: "pcs",
    salePrice: "",
    purchasePrice: "",
    wholesalePrice: "",
    stockQuantity: "",
    minStockQuantity: "",
    taxRate: "",
    discountType: "Percentage",
    discountValue: "",
    category: "",
  });

  const units = ["pcs", "kg", "ltr", "box", "pack", "dozen"];
  const tabs = ["Pricing", "Stock", "Details"];

  const handleUnitSelect = (selectedUnit: string) => {
    setFormData((prev) => ({ ...prev, unit: selectedUnit }));
    setShowUnitModal(false);
  };

  const loadItemData = useCallback(async () => {
    try {
      setLoading(true);
      const db = getFirestore();
      const itemDoc = await getDoc(doc(db, "items", id as string));

      if (itemDoc.exists()) {
        const data = itemDoc.data();
        if (data) {
          setFormData({
            name: data.name || "",
            description: data.description || "",
            itemCode: data.itemCode || "",
            hsnCode: data.hsnCode || "",
            unit: data.unit || "pcs",
            salePrice: data.salePrice?.toString() || "",
            purchasePrice: data.purchasePrice?.toString() || "",
            wholesalePrice: data.wholesalePrice?.toString() || "",
            stockQuantity: data.stockQuantity?.toString() || "",
            minStockQuantity: data.minStockQuantity?.toString() || "",
            taxRate: data.taxRate?.toString() || "",
            discountType: data.discountType || "Percentage",
            discountValue: data.discountValue?.toString() || "",
            category: data.category || "",
          });
        }
      } else {
        Alert.alert("Error", "Item not found");
        router.back();
      }
    } catch (error) {
      console.error("Error loading item:", error);
      Alert.alert("Error", "Failed to load item data");
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    if (isEditMode && id) {
      loadItemData();
    }
  }, [isEditMode, id, loadItemData]);

  const updateFormData = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      Alert.alert("Error", "Please enter item name");
      return false;
    }
    if (!formData.salePrice || parseFloat(formData.salePrice) <= 0) {
      Alert.alert("Error", "Please enter a valid sale price");
      return false;
    }
    return true;
  };

  const saveItem = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const db = getFirestore();
      const itemData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        itemCode: formData.itemCode.trim(),
        hsnCode: formData.hsnCode.trim(),
        unit: formData.unit,
        salePrice: parseFloat(formData.salePrice) || 0,
        purchasePrice: parseFloat(formData.purchasePrice) || 0,
        wholesalePrice: parseFloat(formData.wholesalePrice) || 0,
        stockQuantity: parseInt(formData.stockQuantity) || 0,
        minStockQuantity: parseInt(formData.minStockQuantity) || 0,
        taxRate: parseFloat(formData.taxRate) || 0,
        discountType: formData.discountType,
        discountValue: parseFloat(formData.discountValue) || 0,
        category: formData.category.trim(),
        updatedAt: serverTimestamp(),
      };

      if (isEditMode) {
        await updateDoc(doc(db, "items", id as string), itemData);
        Alert.alert("Success", "Item updated successfully!");
      } else {
        await addDoc(collection(db, "items"), {
          ...itemData,
          createdAt: serverTimestamp(),
        });
        Alert.alert("Success", "Item added successfully!");
      }

      router.back();
    } catch (error) {
      console.error("Error saving item:", error);
      Alert.alert("Error", "Failed to save item. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!user || user.role !== "biller") {
    return null;
  }
  if (loading) {
    return <FormSkeleton />;
  }

  const renderPricingTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Sale Price *</Text>
        <TextInput
          style={styles.input}
          value={formData.salePrice}
          onChangeText={(text) => updateFormData("salePrice", text)}
          placeholder="0.00"
          placeholderTextColor="#999"
          keyboardType="numeric"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Purchase Price</Text>
        <TextInput
          style={styles.input}
          value={formData.purchasePrice}
          onChangeText={(text) => updateFormData("purchasePrice", text)}
          placeholder="0.00"
          placeholderTextColor="#999"
          keyboardType="numeric"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Wholesale Price</Text>
        <TextInput
          style={styles.input}
          value={formData.wholesalePrice}
          onChangeText={(text) => updateFormData("wholesalePrice", text)}
          placeholder="0.00"
          placeholderTextColor="#999"
          keyboardType="numeric"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Tax Rate (%)</Text>
        <TextInput
          style={styles.input}
          value={formData.taxRate}
          onChangeText={(text) => updateFormData("taxRate", text)}
          placeholder="0"
          placeholderTextColor="#999"
          keyboardType="numeric"
        />
      </View>
    </View>
  );

  const renderStockTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Current Stock</Text>
        <TextInput
          style={styles.input}
          value={formData.stockQuantity}
          onChangeText={(text) => updateFormData("stockQuantity", text)}
          placeholder="0"
          placeholderTextColor="#999"
          keyboardType="numeric"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Minimum Stock Alert</Text>
        <TextInput
          style={styles.input}
          value={formData.minStockQuantity}
          onChangeText={(text) => updateFormData("minStockQuantity", text)}
          placeholder="0"
          placeholderTextColor="#999"
          keyboardType="numeric"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Unit</Text>
        <TouchableOpacity
          style={styles.unitButton}
          onPress={() => setShowUnitModal(true)}
        >
          <Text style={styles.unitButtonText}>{formData.unit}</Text>
          <Ionicons name="chevron-down" size={20} color="#666" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderDetailsTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Item Code</Text>
        <TextInput
          style={styles.input}
          value={formData.itemCode}
          onChangeText={(text) => updateFormData("itemCode", text)}
          placeholder="Enter item code"
          placeholderTextColor="#999"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>HSN Code</Text>
        <TextInput
          style={styles.input}
          value={formData.hsnCode}
          onChangeText={(text) => updateFormData("hsnCode", text)}
          placeholder="Enter HSN code"
          placeholderTextColor="#999"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Category</Text>
        <TextInput
          style={styles.input}
          value={formData.category}
          onChangeText={(text) => updateFormData("category", text)}
          placeholder="Enter category"
          placeholderTextColor="#999"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={formData.description}
          onChangeText={(text) => updateFormData("description", text)}
          placeholder="Enter item description"
          placeholderTextColor="#999"
          multiline
          numberOfLines={4}
        />
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>
          {isEditMode ? "Edit Item" : "Add Item"}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.form}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Item Name *</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(text) => updateFormData("name", text)}
                placeholder="Enter item name"
                placeholderTextColor="#999"
              />
            </View>
          </View>

          <View style={styles.tabContainer}>
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, activeTab === tab && styles.activeTab]}
                onPress={() => setActiveTab(tab)}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === tab && styles.activeTabText,
                  ]}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {activeTab === "Pricing" && renderPricingTab()}
          {activeTab === "Stock" && renderStockTab()}
          {activeTab === "Details" && renderDetailsTab()}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={saveItem}
          disabled={saving}
        >
          {saving ? (
            <Text style={styles.saveButtonText}>Saving...</Text>
          ) : (
            <>
              <Ionicons name="save-outline" size={20} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>
                {isEditMode ? "Update" : "Save"} Item
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <Modal visible={showUnitModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Unit</Text>
              <TouchableOpacity onPress={() => setShowUnitModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            {units.map((unit) => (
              <TouchableOpacity
                key={unit}
                style={styles.unitOption}
                onPress={() => handleUnitSelect(unit)}
              >
                <Text style={styles.unitOptionText}>{unit}</Text>
                {formData.unit === unit && (
                  <Ionicons name="checkmark" size={20} color="#007AFF" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  form: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#333",
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
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
    color: "#666",
  },
  activeTabText: {
    color: "#FFFFFF",
  },
  tabContent: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 12,
  },
  unitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  unitButtonText: {
    fontSize: 16,
    color: "#333",
  },
  footer: {
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#007AFF",
    paddingVertical: 16,
    borderRadius: 12,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
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
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
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
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  unitOptionText: {
    fontSize: 16,
    color: "#333",
  },
});
