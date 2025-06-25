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
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface PrizeFormData {
  name: string;
  points: number;
  quantity: number;
  description: string;
  category: string;
  isActive: boolean;
}

interface PrizeFormErrors {
  name?: string;
  points?: string;
  quantity?: string;
  description?: string;
  category?: string;
}

const CATEGORY_OPTIONS = [
  { label: "Service", value: "service" },
  { label: "Discount", value: "discount" },
  { label: "Product", value: "product" },
  { label: "Maintenance", value: "maintenance" },
  { label: "General", value: "general" },
  { label: "Custom", value: "custom" },
];

const PRESET_PRIZES = [
  {
    name: "Free Oil Change",
    points: 500,
    quantity: 10,
    category: "service",
    description: "Complete engine oil change with filter replacement",
  },
  {
    name: "10% Discount Coupon",
    points: 300,
    quantity: 50,
    category: "discount",
    description: "10% discount on next service",
  },
  {
    name: "20% Discount Coupon",
    points: 600,
    quantity: 25,
    category: "discount",
    description: "20% discount on next service",
  },
  {
    name: "Free Car Wash",
    points: 250,
    quantity: 20,
    category: "service",
    description: "Complete exterior and interior car wash",
  },
  {
    name: "Engine Cleaning",
    points: 800,
    quantity: 5,
    category: "maintenance",
    description: "Professional engine bay cleaning",
  },
  {
    name: "Tire Check & Balance",
    points: 400,
    quantity: 15,
    category: "maintenance",
    description: "Tire pressure check and wheel balancing",
  },
  {
    name: "AC Service",
    points: 700,
    quantity: 8,
    category: "service",
    description: "Air conditioning system service and gas refill",
  },
  {
    name: "Free Air Freshener",
    points: 100,
    quantity: 100,
    category: "product",
    description: "Premium car air freshener",
  },
];

export default function PrizeForm() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [formData, setFormData] = useState<PrizeFormData>({
    name: "",
    points: 0,
    quantity: 0,
    description: "",
    category: "general",
    isActive: true,
  });
  const [errors, setErrors] = useState<PrizeFormErrors>({});

  const loadPrizeData = useCallback(
    async (prizeId: string) => {
      try {
        setLoading(true);
        const db = getFirestore();
        const prizeDoc = await getDoc(doc(db, "prizes", prizeId));

        if (prizeDoc.exists()) {
          const data = prizeDoc.data();
          if (data) {
            setFormData({
              name: data.name || "",
              points: data.points || 0,
              quantity: data.quantity || 1,
              description: data.description || "",
              category: data.category || "general",
              isActive: data.isActive !== false,
            });
          }
        } else {
          Alert.alert("Error", "Prize not found");
          router.replace("/admin/prizes");
        }
      } catch (error) {
        console.error("Error loading prize:", error);
        Alert.alert("Error", "Failed to load prize data");
        router.replace("/admin/prizes");
      } finally {
        setLoading(false);
      }
    },
    [router]
  );
  // Load prize data if editing or reset form for new prize
  useEffect(() => {
    const prizeId = params.prizeId as string;
    if (prizeId && prizeId !== "fresh") {
      setIsEditing(true);
      loadPrizeData(prizeId);
    } else {
      // Reset form for new prize
      setIsEditing(false);
      setFormData({
        name: "",
        points: 0,
        quantity: 0,
        description: "",
        category: "general",
        isActive: true,
      });
      setErrors({});
    }
  }, [params.prizeId, loadPrizeData]);
  const validateForm = (): boolean => {
    const newErrors: PrizeFormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Prize name is required";
    }

    if (formData.points <= 0) {
      newErrors.points = "Points must be greater than 0";
    }

    if (formData.quantity <= 0) {
      newErrors.quantity = "Quantity must be greater than 0";
    }

    if (!formData.category.trim()) {
      newErrors.category = "Category is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      Alert.alert("Validation Error", "Please fix the errors before saving.");
      return;
    }

    setLoading(true);

    try {
      const db = getFirestore();
      const prizeData = {
        ...formData,
        updatedAt: serverTimestamp(),
      };

      if (isEditing) {
        const prizeId = params.prizeId as string;
        await updateDoc(doc(db, "prizes", prizeId), prizeData);
        Alert.alert("Success", "Prize updated successfully!", [
          { text: "OK", onPress: () => router.replace("/admin/prizes") },
        ]);
      } else {
        await addDoc(collection(db, "prizes"), {
          ...prizeData,
          createdAt: serverTimestamp(),
        });
        Alert.alert("Success", "Prize added successfully!", [
          { text: "OK", onPress: () => router.replace("/admin/prizes") },
        ]);
      }
    } catch (error) {
      console.error("Error saving prize:", error);
      Alert.alert("Error", "Failed to save prize. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  const handlePresetSelect = (preset: (typeof PRESET_PRIZES)[0]) => {
    setFormData((prev) => ({
      ...prev,
      name: preset.name,
      points: preset.points,
      quantity: preset.quantity,
      category: preset.category,
      description: preset.description,
    }));
    setShowPresetModal(false);
  };

  const handleCategorySelect = (category: string) => {
    setFormData((prev) => ({
      ...prev,
      category,
    }));
    setShowCategoryModal(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.replace("/admin/prizes")}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditing ? "Edit Prize" : "Add New Prize"}
        </Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerIcon}
            onPress={() => setShowPresetModal(true)}
          >
            <Ionicons name="library-outline" size={24} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIcon}>
            <Ionicons name="settings-outline" size={24} color="#666" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollContainer}>
        {/* Quick Presets */}
        {/* {!isEditing && (
          <TouchableOpacity
            style={styles.presetButton}
            onPress={() => setShowPresetModal(true)}
          >
            <Ionicons name="flash" size={20} color="#E91E63" />
            <Text style={styles.presetButtonText}>Use Preset Prize</Text>
            <Ionicons name="chevron-forward" size={20} color="#E91E63" />
          </TouchableOpacity>
        )} */}

        {/* Basic Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Prize Information</Text>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Prize Name *</Text>
            <TextInput
              style={[styles.input, errors.name && styles.inputError]}
              value={formData.name}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, name: text }))
              }
              placeholder="Enter prize name"
              placeholderTextColor="#999"
            />
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Points Required *</Text>
            <TextInput
              style={[styles.input, errors.points && styles.inputError]}
              value={formData.points > 0 ? formData.points.toString() : ""}
              onChangeText={(text) => {
                const points = parseInt(text) || 0;
                setFormData((prev) => ({ ...prev, points }));
              }}
              placeholder="Enter points required"
              placeholderTextColor="#999"
              keyboardType="numeric"
            />
            {errors.points && (
              <Text style={styles.errorText}>{errors.points}</Text>
            )}
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Quantity Available *</Text>
            <TextInput
              style={[styles.input, errors.quantity && styles.inputError]}
              value={formData.quantity > 0 ? formData.quantity.toString() : ""}
              onChangeText={(text) => {
                const quantity = parseInt(text) || 0;
                setFormData((prev) => ({ ...prev, quantity }));
              }}
              placeholder="Enter quantity available"
              placeholderTextColor="#999"
              keyboardType="numeric"
            />
            {errors.quantity && (
              <Text style={styles.errorText}>{errors.quantity}</Text>
            )}
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Category *</Text>
            <TouchableOpacity
              style={[styles.selectInput, errors.category && styles.inputError]}
              onPress={() => setShowCategoryModal(true)}
            >
              <Text style={styles.selectText}>
                {CATEGORY_OPTIONS.find((c) => c.value === formData.category)
                  ?.label || "Select category"}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>
            {errors.category && (
              <Text style={styles.errorText}>{errors.category}</Text>
            )}
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.textArea]}
              value={formData.description}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, description: text }))
              }
              placeholder="Enter prize description (optional)"
              placeholderTextColor="#999"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
          <View style={styles.formGroup}>
            <View style={styles.switchContainer}>
              <View style={styles.switchInfo}>
                <Text style={styles.switchLabel}>Active Prize</Text>
                <Text style={styles.switchDescription}>
                  Prize will be available for redemption
                </Text>
              </View>
              <Switch
                value={formData.isActive}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, isActive: value }))
                }
                trackColor={{ false: "#CCCCCC", true: "#E91E63" }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </View>

        {/* Preview Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preview</Text>
          <View style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewName}>
                {formData.name || "Prize Name"}
              </Text>
              <View style={styles.previewBadge}>
                <Text style={styles.previewCategory}>
                  {(
                    CATEGORY_OPTIONS.find((c) => c.value === formData.category)
                      ?.label || "CATEGORY"
                  ).toUpperCase()}
                </Text>
              </View>
            </View>
            <View style={styles.previewDetails}>
              <Text style={styles.previewPoints}>
                {formData.points > 0 ? `${formData.points} Points` : "0 Points"}
              </Text>
              <Text style={styles.previewQuantity}>
                Qty: {formData.quantity > 0 ? formData.quantity : 0}
              </Text>
              {!formData.isActive && (
                <View style={styles.previewInactive}>
                  <Text style={styles.previewInactiveText}>INACTIVE</Text>
                </View>
              )}
            </View>
            {formData.description && (
              <Text style={styles.previewDescription} numberOfLines={2}>
                {formData.description}
              </Text>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Bottom Buttons */}
      <View style={styles.bottomButtons}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => router.replace("/admin/prizes")}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.saveButton, loading && styles.disabledButton]}
          onPress={handleSave}
          disabled={loading}
        >
          <Text style={styles.saveButtonText}>
            {loading ? "Saving..." : isEditing ? "Update Prize" : "Save Prize"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Preset Selection Modal */}
      <Modal
        visible={showPresetModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPresetModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Preset Prize</Text>
              <TouchableOpacity
                onPress={() => setShowPresetModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              {PRESET_PRIZES.map((preset, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.modalOption}
                  onPress={() => handlePresetSelect(preset)}
                >
                  <View style={styles.presetOption}>
                    <View style={styles.presetInfo}>
                      <Text style={styles.presetName}>{preset.name}</Text>
                      <Text style={styles.presetDescription} numberOfLines={1}>
                        {preset.description}
                      </Text>
                    </View>
                    <View style={styles.presetMeta}>
                      <Text style={styles.presetPoints}>
                        {preset.points} pts
                      </Text>
                      <Text style={styles.presetCategory}>
                        {preset.category}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Category Selection Modal */}
      <Modal
        visible={showCategoryModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Category</Text>
              <TouchableOpacity
                onPress={() => setShowCategoryModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalContent}>
              {CATEGORY_OPTIONS.map((category, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.modalOption}
                  onPress={() => handleCategorySelect(category.value)}
                >
                  <Text style={styles.categoryOptionText}>
                    {category.label}
                  </Text>
                  {formData.category === category.value && (
                    <Ionicons name="checkmark" size={20} color="#E91E63" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
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
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
    marginTop: 40,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    flex: 1,
    textAlign: "center",
    marginHorizontal: 16,
  },
  headerRight: {
    flexDirection: "row",
  },
  headerIcon: {
    marginLeft: 12,
    padding: 8,
  },
  scrollContainer: {
    flex: 1,
    padding: 16,
  },
  presetButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF0F5",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E91E63",
  },
  presetButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#E91E63",
    marginHorizontal: 8,
  },
  section: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: "#333",
    backgroundColor: "#FFFFFF",
  },
  textArea: {
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: "#333",
    backgroundColor: "#FFFFFF",
    minHeight: 80,
  },
  inputError: {
    borderColor: "#FF6B6B",
  },
  errorText: {
    fontSize: 12,
    color: "#FF6B6B",
    marginTop: 4,
  },
  selectInput: {
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  selectText: {
    fontSize: 16,
    color: "#333",
  },
  switchContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  switchInfo: {
    flex: 1,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
  },
  switchDescription: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  previewCard: {
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EEEEEE",
  },
  previewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  previewName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    flex: 1,
  },
  previewBadge: {
    backgroundColor: "#E3F2FD",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  previewCategory: {
    fontSize: 10,
    fontWeight: "600",
    color: "#2196F3",
  },
  previewDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  previewPoints: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#E91E63",
  },
  previewQuantity: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
  },
  previewInactive: {
    backgroundColor: "#FFE0E0",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  previewInactiveText: {
    fontSize: 10,
    color: "#D32F2F",
    fontWeight: "600",
  },
  previewDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  bottomButtons: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#EEEEEE",
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    marginRight: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#DDD",
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    marginLeft: 8,
    borderRadius: 8,
    backgroundColor: "#E91E63",
    alignItems: "center",
  },
  saveButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  disabledButton: {
    backgroundColor: "#CCC",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  modalCloseButton: {
    padding: 4,
  },
  modalContent: {
    maxHeight: 400,
  },
  modalOption: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  presetOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flex: 1,
  },
  presetInfo: {
    flex: 1,
    marginRight: 12,
  },
  presetName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    marginBottom: 2,
  },
  presetDescription: {
    fontSize: 12,
    color: "#666",
  },
  presetMeta: {
    alignItems: "flex-end",
  },
  presetPoints: {
    fontSize: 14,
    fontWeight: "600",
    color: "#E91E63",
  },
  presetCategory: {
    fontSize: 10,
    color: "#888",
    textTransform: "uppercase",
    marginTop: 2,
  },
  categoryOptionText: {
    fontSize: 16,
    color: "#333",
  },
});
