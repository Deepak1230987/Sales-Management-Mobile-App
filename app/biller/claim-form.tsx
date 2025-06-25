import { Ionicons } from "@expo/vector-icons";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "@react-native-firebase/firestore";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
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

interface Prize {
  id: string;
  name: string;
  points: number;
  quantity: number;
  description?: string;
  category: string;
  isActive: boolean;
  createdAt: Date;
  [key: string]: any;
}

interface ClaimFormData {
  customerName: string;
  vehicleNo: string;
  phoneNo: string;
  prizeName: string;
  claimedPoints: number;
  status: "claimed" | "pending" | "processed";
  isCustomPrize: boolean;
}

interface ClaimFormErrors {
  customerName?: string;
  vehicleNo?: string;
  phoneNo?: string;
  prizeName?: string;
  claimedPoints?: string;
  status?: string;
}

const STATUS_OPTIONS = [
  { label: "Claimed", value: "claimed" },
  { label: "Pending", value: "pending" },
  { label: "Processed", value: "processed" },
];

export default function ClaimForm() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showPrizeModal, setShowPrizeModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [prizesLoading, setPrizesLoading] = useState(true);
  const [formData, setFormData] = useState<ClaimFormData>({
    customerName: "",
    vehicleNo: "",
    phoneNo: "",
    prizeName: "",
    claimedPoints: 0,
    status: "pending",
    isCustomPrize: false,
  });

  const [errors, setErrors] = useState<ClaimFormErrors>({});

  // Load prizes from database
  useEffect(() => {
    const db = getFirestore();
    const prizesCollection = collection(db, "prizes");

    try {
      setPrizesLoading(true);
      const q = query(
        prizesCollection,
        where("isActive", "==", true),
        orderBy("createdAt", "desc")
      );

      const unsubscribe = onSnapshot(
        q,
        (querySnapshot) => {
          const loadedPrizes: Prize[] = [];
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            loadedPrizes.push({
              id: doc.id,
              name: data.name || "",
              points: data.points || 0,
              quantity: data.quantity || 1,
              description: data.description || "",
              category: data.category || "",
              isActive: data.isActive !== false,
              createdAt: data.createdAt?.toDate() || new Date(),
              ...data,
            });
          });
          setPrizes(loadedPrizes);
          setPrizesLoading(false);
        },
        (error) => {
          console.error("Error loading prizes:", error);
          setPrizesLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (error) {
      console.error("Error setting up prizes listener:", error);
      setPrizesLoading(false);
    }
  }, []);
  const loadClaimData = useCallback(
    async (claimId: string) => {
      try {
        console.log("Loading claim data for ID:", claimId);
        setLoading(true);
        const db = getFirestore();
        const claimDoc = await getDoc(doc(db, "claims", claimId));

        if (claimDoc.exists()) {
          const data = claimDoc.data();
          console.log("Loaded claim data:", data);
          if (data) {
            setFormData({
              customerName: data.customerName || "",
              vehicleNo: data.vehicleNo || "",
              phoneNo: data.phoneNo || "",
              prizeName: data.prizeName || "",
              claimedPoints: data.claimedPoints || 0,
              status: data.status || "pending",
              isCustomPrize: data.isCustomPrize || false,
            });
          }
        } else {
          console.error("Claim document not found for ID:", claimId);
          Alert.alert("Error", "Claim not found");
          router.back();
        }
      } catch (error) {
        console.error("Error loading claim:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        console.error("Error details:", {
          code: (error as any)?.code,
          message: errorMessage,
          claimId: claimId,
        });
        Alert.alert("Error", `Failed to load claim data: ${errorMessage}`);
        router.back();
      } finally {
        setLoading(false);
      }
    },
    [router]
  );
  // Load claim data if editing, or reset form if new
  useEffect(() => {
    const claimId = params.claimId as string;
    if (claimId && claimId !== "new") {
      setIsEditing(true);
      loadClaimData(claimId);
    } else {
      // Reset form for new claim
      setIsEditing(false);
      setFormData({
        customerName: "",
        vehicleNo: "",
        phoneNo: "",
        prizeName: "",
        claimedPoints: 0,
        status: "pending",
        isCustomPrize: false,
      });
      setErrors({});
    }
  }, [params.claimId, loadClaimData]);
  const validateForm = (): boolean => {
    const newErrors: ClaimFormErrors = {};

    if (!formData.customerName.trim()) {
      newErrors.customerName = "Customer name is required";
    }

    if (!formData.phoneNo.trim()) {
      newErrors.phoneNo = "Phone number is required";
    } else if (!/^\d{10}$/.test(formData.phoneNo.replace(/\D/g, ""))) {
      newErrors.phoneNo = "Please enter a valid 10-digit phone number";
    }
    if (!formData.prizeName.trim()) {
      newErrors.prizeName = "Prize name is required";
    } else if (!isEditing && !formData.isCustomPrize) {
      // Check prize availability for new claims
      const selectedPrize = prizes.find(
        (prize) => prize.name === formData.prizeName
      );
      if (selectedPrize && selectedPrize.quantity <= 0) {
        newErrors.prizeName = "This prize is currently out of stock";
      }
    }

    if (formData.claimedPoints <= 0) {
      newErrors.claimedPoints = "Points must be greater than 0";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const handleSave = async () => {
    if (!validateForm()) {
      Alert.alert("Validation Error", "Please fix the errors before saving.");
      return;
    }

    // Find the selected prize and check availability for new claims
    const selectedPrize = prizes.find(
      (prize) => prize.name === formData.prizeName
    );
    if (
      !isEditing &&
      selectedPrize &&
      selectedPrize.quantity <= 0 &&
      !formData.isCustomPrize
    ) {
      Alert.alert("Error", "This prize is currently out of stock.");
      return;
    }

    setLoading(true);
    try {
      const db = getFirestore();

      if (isEditing) {
        const claimId = params.claimId as string;
        console.log("Attempting to update claim with ID:", claimId);

        // First check if the document exists
        const claimDocRef = doc(db, "claims", claimId);
        const claimDoc = await getDoc(claimDocRef);

        if (!claimDoc.exists()) {
          console.error("Document not found for ID:", claimId);
          Alert.alert(
            "Error",
            "The claim you're trying to update no longer exists."
          );
          router.back();
          return;
        }

        // For updates, only set updatedAt and preserve the original createdAt
        const claimData = {
          ...formData,
          updatedAt: serverTimestamp(),
        };

        await updateDoc(claimDocRef, claimData);
        Alert.alert("Success", "Claim updated successfully!", [
          { text: "OK", onPress: () => router.back() },
        ]);
      } else {
        console.log("Creating new claim with data:", formData);

        // For new claims, check prize availability and adjust quantity
        const selectedPrize = prizes.find(
          (prize) => prize.name === formData.prizeName
        );

        if (selectedPrize && !formData.isCustomPrize) {
          // Check current prize quantity before claiming
          const prizeDocRef = doc(db, "prizes", selectedPrize.id);
          const currentPrizeDoc = await getDoc(prizeDocRef);

          if (!currentPrizeDoc.exists()) {
            Alert.alert("Error", "Selected prize no longer exists.");
            return;
          }

          const currentPrizeData = currentPrizeDoc.data();
          const currentQuantity = currentPrizeData?.quantity || 0;

          if (currentQuantity <= 0) {
            Alert.alert("Error", "This prize is currently out of stock.");
            return;
          }

          // Create the claim first
          const now = serverTimestamp();
          await addDoc(collection(db, "claims"), {
            ...formData,
            createdAt: now,
            updatedAt: now,
          });

          // Then adjust the prize quantity
          const newQuantity = currentQuantity - 1;
          const updateData: any = {
            quantity: newQuantity,
            updatedAt: serverTimestamp(),
          };

          // If quantity reaches 0, deactivate the prize
          if (newQuantity <= 0) {
            updateData.isActive = false;
          }

          await updateDoc(prizeDocRef, updateData);
        } else {
          // For custom prizes or if prize not found, just create the claim
          const now = serverTimestamp();
          await addDoc(collection(db, "claims"), {
            ...formData,
            createdAt: now,
            updatedAt: now,
          });
        }

        Alert.alert("Success", "Claim added successfully!", [
          { text: "OK", onPress: () => router.back() },
        ]);
      }
    } catch (error) {
      console.error("Error saving claim:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Error details:", {
        code: (error as any)?.code,
        message: errorMessage,
        stack: (error as any)?.stack,
      });
      Alert.alert("Error", `Failed to save claim: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };
  const handlePrizeSelect = (prize: Prize) => {
    const isCustom = prize.name === "Custom Prize";
    setFormData((prev) => ({
      ...prev,
      prizeName: isCustom ? "" : prize.name,
      claimedPoints: isCustom ? 0 : prize.points,
      isCustomPrize: isCustom,
    }));
    setShowPrizeModal(false);
  };

  const handleStatusSelect = (status: "claimed" | "pending" | "processed") => {
    setFormData((prev) => ({
      ...prev,
      status,
    }));
    setShowStatusModal(false);
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
          onPress={() => router.replace("/biller/claims")}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditing ? "Edit Claim" : "Add New Claim"}
        </Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerIcon}>
            <Ionicons name="camera-outline" size={24} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIcon}>
            <Ionicons name="settings-outline" size={24} color="#666" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollContainer}>
        {/* Basic Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Information</Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Customer Name *</Text>
            <TextInput
              style={[styles.input, errors.customerName && styles.inputError]}
              value={formData.customerName}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, customerName: text }))
              }
              placeholder="Enter customer name"
              placeholderTextColor="#999"
            />
            {errors.customerName && (
              <Text style={styles.errorText}>{errors.customerName}</Text>
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Vehicle Number</Text>
            <TextInput
              style={styles.input}
              value={formData.vehicleNo}
              onChangeText={(text) =>
                setFormData((prev) => ({
                  ...prev,
                  vehicleNo: text.toUpperCase(),
                }))
              }
              placeholder="Enter vehicle number (optional)"
              placeholderTextColor="#999"
              autoCapitalize="characters"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Phone Number *</Text>
            <TextInput
              style={[styles.input, errors.phoneNo && styles.inputError]}
              value={formData.phoneNo}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, phoneNo: text }))
              }
              placeholder="Enter phone number"
              placeholderTextColor="#999"
              keyboardType="phone-pad"
              maxLength={15}
            />
            {errors.phoneNo && (
              <Text style={styles.errorText}>{errors.phoneNo}</Text>
            )}
          </View>
        </View>

        {/* Prize Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Prize Information</Text>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Prize Name *</Text>
            {formData.isCustomPrize ? (
              <TextInput
                style={[styles.input, errors.prizeName && styles.inputError]}
                value={formData.prizeName}
                onChangeText={(text) =>
                  setFormData((prev) => ({ ...prev, prizeName: text }))
                }
                placeholder="Enter custom prize name"
                placeholderTextColor="#999"
              />
            ) : (
              <TouchableOpacity
                style={[
                  styles.selectInput,
                  errors.prizeName && styles.inputError,
                ]}
                onPress={() => setShowPrizeModal(true)}
              >
                <Text
                  style={[
                    styles.selectText,
                    !formData.prizeName && styles.placeholderText,
                  ]}
                >
                  {formData.prizeName || "Select a prize"}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#666" />
              </TouchableOpacity>
            )}
            {formData.isCustomPrize && (
              <TouchableOpacity
                style={styles.changeSelectionButton}
                onPress={() => setShowPrizeModal(true)}
              >
                <Text style={styles.changeSelectionText}>
                  Choose from preset prizes
                </Text>
              </TouchableOpacity>
            )}
            {errors.prizeName && (
              <Text style={styles.errorText}>{errors.prizeName}</Text>
            )}
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Claimed Points *</Text>
            <TextInput
              style={[styles.input, errors.claimedPoints && styles.inputError]}
              value={formData.claimedPoints.toString()}
              onChangeText={(text) => {
                const points = parseInt(text) || 0;
                setFormData((prev) => ({ ...prev, claimedPoints: points }));
              }}
              placeholder="Enter points"
              placeholderTextColor="#999"
              keyboardType="numeric"
            />
            {errors.claimedPoints && (
              <Text style={styles.errorText}>{errors.claimedPoints}</Text>
            )}
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Status</Text>
            <TouchableOpacity
              style={styles.selectInput}
              onPress={() => setShowStatusModal(true)}
            >
              <Text style={styles.selectText}>
                {STATUS_OPTIONS.find((s) => s.value === formData.status)
                  ?.label || "Select status"}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Buttons */}
      <View style={styles.bottomButtons}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => router.back()}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.saveButton, loading && styles.disabledButton]}
          onPress={handleSave}
          disabled={loading}
        >
          <Text style={styles.saveButtonText}>
            {loading ? "Saving..." : "Save Claim"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Prize Selection Modal */}
      <Modal
        visible={showPrizeModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPrizeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Prize</Text>
              <TouchableOpacity
                onPress={() => setShowPrizeModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              {prizesLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#007AFF" />
                  <Text style={styles.loadingText}>Loading prizes...</Text>
                </View>
              ) : (
                <>
                  {prizes.map((prize) => (
                    <TouchableOpacity
                      key={prize.id}
                      style={[
                        styles.modalOption,
                        prize.quantity <= 0 && styles.modalOptionDisabled,
                      ]}
                      onPress={() =>
                        prize.quantity > 0 && handlePrizeSelect(prize)
                      }
                      disabled={prize.quantity <= 0}
                    >
                      <View style={styles.prizeOption}>
                        <View style={styles.prizeOptionHeader}>
                          <Text
                            style={[
                              styles.prizeOptionName,
                              prize.quantity <= 0 &&
                                styles.prizeOptionNameDisabled,
                            ]}
                          >
                            {prize.name}
                          </Text>
                          <Text
                            style={[
                              styles.prizeQuantity,
                              prize.quantity <= 0 && styles.prizeQuantityEmpty,
                            ]}
                          >
                            {prize.quantity > 0
                              ? `${prize.quantity} available`
                              : "Out of stock"}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.prizeOptionPoints,
                            prize.quantity <= 0 &&
                              styles.prizeOptionPointsDisabled,
                          ]}
                        >
                          {prize.points} points
                        </Text>
                        {prize.category && (
                          <Text style={styles.prizeCategory}>
                            {prize.category}
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                  {/* Custom Prize Option */}
                  <TouchableOpacity
                    style={styles.modalOption}
                    onPress={() =>
                      handlePrizeSelect({
                        id: "custom",
                        name: "Custom Prize",
                        points: 0,
                        quantity: 1,
                        category: "Custom",
                        isActive: true,
                        createdAt: new Date(),
                      })
                    }
                  >
                    <View style={styles.prizeOption}>
                      <View style={styles.prizeOptionHeader}>
                        <Text style={styles.prizeOptionName}>Custom Prize</Text>
                        <Text style={styles.prizeQuantity}>
                          Always available
                        </Text>
                      </View>
                      <Text style={styles.prizeOptionPoints}>
                        Enter custom points
                      </Text>
                      <Text style={styles.prizeCategory}>Custom</Text>
                    </View>
                  </TouchableOpacity>
                  {prizes.length === 0 && !prizesLoading && (
                    <View style={styles.emptyPrizes}>
                      <Text style={styles.emptyPrizesText}>
                        No prizes available
                      </Text>
                    </View>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Status Selection Modal */}
      <Modal
        visible={showStatusModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowStatusModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Status</Text>
              <TouchableOpacity
                onPress={() => setShowStatusModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalContent}>
              {STATUS_OPTIONS.map((status, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.modalOption}
                  onPress={() =>
                    handleStatusSelect(
                      status.value as "claimed" | "pending" | "processed"
                    )
                  }
                >
                  <Text style={styles.statusOptionText}>{status.label}</Text>
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
    top: 25,
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
  placeholderText: {
    color: "#999",
  },
  bottomButtons: {
    flexDirection: "row",
    padding: 14,
    marginBottom: 18,
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
    backgroundColor: "#007AFF",
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
  },
  prizeOption: {
    flex: 1,
  },
  prizeOptionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  prizeOptionName: {
    fontSize: 16,
    color: "#333",
    flex: 1,
    fontWeight: "500",
  },
  prizeOptionNameDisabled: {
    color: "#999",
  },
  prizeQuantity: {
    fontSize: 12,
    color: "#007AFF",
    fontWeight: "500",
  },
  prizeQuantityEmpty: {
    color: "#FF6B6B",
  },
  prizeOptionPoints: {
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "600",
  },
  prizeOptionPointsDisabled: {
    color: "#999",
  },
  prizeCategory: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  modalOptionDisabled: {
    opacity: 0.5,
  },
  emptyPrizes: {
    padding: 20,
    alignItems: "center",
  },
  emptyPrizesText: {
    fontSize: 16,
    color: "#999",
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
    marginTop: 12,
  },
  statusOptionText: {
    fontSize: 16,
    color: "#333",
  },
  changeSelectionButton: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#F0F8FF",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#007AFF",
    alignItems: "center",
  },
  changeSelectionText: {
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "500",
  },
});
