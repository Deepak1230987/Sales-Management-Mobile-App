import { Ionicons } from "@expo/vector-icons";
import {
  collection,
  doc,
  getFirestore,
  onSnapshot,
  updateDoc,
} from "@react-native-firebase/firestore";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../contexts/AuthContext";

// Skeleton loader component with shimmer effect
const SkeletonLoader = ({ style }: { style: any }) => {
  const shimmerValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmerAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false,
        }),
        Animated.timing(shimmerValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: false,
        }),
      ])
    );
    shimmerAnimation.start();

    return () => shimmerAnimation.stop();
  }, [shimmerValue]);

  const shimmerColor = shimmerValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["#E5E5EA", "#F2F2F7"],
  });

  return (
    <Animated.View
      style={[
        style,
        {
          backgroundColor: shimmerColor,
        },
      ]}
    />
  );
};

export default function UsersManagement() {
  const { user } = useAuth();
  const router = useRouter();

  type User = {
    id: string;
    username?: string;
    email?: string;
    role?: string;
    phoneNumber?: string;
    createdAt?: any;
    [key: string]: any;
  };

  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState("all");
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    // Only fetch if user is authenticated and is admin
    if (!user || user.role !== "admin") {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const db = getFirestore();
    const usersCollectionRef = collection(db, "users");

    const unsubscribe = onSnapshot(
      usersCollectionRef,
      (snapshot) => {
        if (snapshot && snapshot.docs) {
          const usersData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setUsers(usersData);
          setLoading(false);
        } else {
          console.warn("No documents found or snapshot is null");
          setUsers([]);
          setLoading(false);
        }
      },
      (error) => {
        console.error("Error fetching users:", error);
        // Only set error if it's not a permission error during logout
        if (
          !(error as any)?.code ||
          (error as any).code !== "firestore/permission-denied"
        ) {
          setError("Failed to load users. Please try again.");
        }
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [user]);

  // Filter users based on search query and role
  useEffect(() => {
    let filtered = users;

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(
        (user) =>
          user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.phoneNumber?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by role
    if (selectedRole !== "all") {
      filtered = filtered.filter((user) => user.role === selectedRole);
    }

    setFilteredUsers(filtered);
  }, [users, searchQuery, selectedRole]);

  const updateRole = async (userId: string, newRole: string) => {
    try {
      const db = getFirestore();
      const userDocRef = doc(db, "users", userId);
      await updateDoc(userDocRef, { role: newRole });
      Alert.alert("Success", "User role updated successfully!");
      setShowRoleModal(false);
      setSelectedUser(null);
    } catch (error) {
      console.error("Error updating user role:", error);
      Alert.alert("Error", "Failed to update user role. Please try again.");
    }
  };

  const handleRoleChange = (user: User) => {
    setSelectedUser(user);
    setShowRoleModal(true);
  };

  const formatDate = (timestamp: any): string => {
    try {
      let date: Date;

      if (timestamp && typeof timestamp.toDate === "function") {
        date = timestamp.toDate();
      } else if (timestamp instanceof Date) {
        date = timestamp;
      } else if (timestamp && timestamp.seconds) {
        date = new Date(timestamp.seconds * 1000);
      } else {
        return "N/A";
      }

      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "N/A";
    }
  };

  const getRoleStats = () => {
    const stats = {
      total: users.length,
      admin: users.filter((u) => u.role === "admin").length,
      biller: users.filter((u) => u.role === "biller").length,
      user: users.filter((u) => u.role === "user" || !u.role).length,
    };
    return stats;
  };
  if (loading) {
    return (
      <View style={styles.container}>
        {/* Fixed Header */}
        <View style={styles.fixedHeaderContainer}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.replace("/admin/menu")}
            >
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>User Management</Text>
            <View style={styles.headerRight}>
              <TouchableOpacity style={styles.headerIcon}>
                <Ionicons name="notifications-outline" size={24} color="#333" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerIcon}
                onPress={() => router.push("/admin/menu")}
              >
                <Ionicons name="settings-outline" size={24} color="#333" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <ScrollView
          style={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Skeleton Stats Cards */}
          <View style={styles.statsContainer}>
            {[1, 2, 3, 4].map((index) => (
              <View key={index} style={styles.statCard}>
                <SkeletonLoader
                  style={[styles.statIconContainer, styles.skeletonIcon]}
                />
                <SkeletonLoader
                  style={[styles.skeletonText, styles.skeletonNumber]}
                />
                <SkeletonLoader
                  style={[styles.skeletonText, styles.skeletonLabel]}
                />
              </View>
            ))}
          </View>
          {/* Skeleton Search and Filter */}
          <View style={styles.searchFilterContainer}>
            <View style={[styles.searchBar, styles.skeletonSearchBar]}>
              <SkeletonLoader style={styles.skeletonSearchInput} />
            </View>

            <View style={styles.filterContainer}>
              <SkeletonLoader
                style={[styles.skeletonText, styles.skeletonFilterLabel]}
              />
              <View style={styles.roleFilterButtons}>
                {[1, 2, 3, 4].map((index) => (
                  <SkeletonLoader
                    key={index}
                    style={[styles.filterButton, styles.skeletonButton]}
                  />
                ))}
              </View>
            </View>
          </View>
          {/* Skeleton Users List */}
          <View style={styles.usersContainer}>
            <View style={styles.sectionHeader}>
              <SkeletonLoader
                style={[styles.skeletonText, styles.skeletonSectionTitle]}
              />
              <SkeletonLoader style={styles.skeletonRefreshButton} />
            </View>

            {[1, 2, 3, 4, 5].map((index) => (
              <View key={index} style={styles.userCard}>
                <View style={styles.userHeader}>
                  <SkeletonLoader
                    style={[styles.avatarContainer, styles.skeletonAvatar]}
                  />
                  <View style={styles.userBasicInfo}>
                    <SkeletonLoader
                      style={[styles.skeletonText, styles.skeletonUsername]}
                    />
                    <SkeletonLoader
                      style={[styles.skeletonText, styles.skeletonEmail]}
                    />
                    <SkeletonLoader
                      style={[styles.skeletonText, styles.skeletonPhone]}
                    />
                  </View>
                  <View style={styles.userActions}>
                    <SkeletonLoader
                      style={[styles.roleBadge, styles.skeletonRoleBadge]}
                    />
                    <SkeletonLoader style={styles.skeletonEditButton} />
                  </View>
                </View>

                <View style={styles.userFooter}>
                  <View style={styles.userMeta}>
                    <SkeletonLoader
                      style={[styles.skeletonText, styles.skeletonMeta]}
                    />
                  </View>
                  <View style={styles.userMeta}>
                    <SkeletonLoader
                      style={[styles.skeletonText, styles.skeletonMeta]}
                    />
                  </View>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#FF3B30" />
        <Text style={styles.errorTitle}>Oops! Something went wrong</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            setLoading(true);
            setError(null);
          }}
        >
          <Ionicons name="refresh" size={20} color="#FFFFFF" />
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const stats = getRoleStats();

  return (
    <View style={styles.container}>
      {/* Fixed Header */}
      <View style={styles.fixedHeaderContainer}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.replace("/admin/menu")}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>User Management</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.headerIcon}>
              <Ionicons name="notifications-outline" size={24} color="#333" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerIcon}
              onPress={() => router.push("/admin/menu")}
            >
              <Ionicons name="settings-outline" size={24} color="#333" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Ionicons name="people" size={24} color="#007AFF" />
            </View>
            <Text style={styles.statNumber}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total Users</Text>
          </View>
          <View style={styles.statCard}>
            <View
              style={[styles.statIconContainer, { backgroundColor: "#FFE5E5" }]}
            >
              <Ionicons name="shield-checkmark" size={20} color="#FF3B30" />
            </View>
            <Text style={styles.statNumber}>{stats.admin}</Text>
            <Text style={styles.statLabel}>Admins</Text>
          </View>
          <View style={styles.statCard}>
            <View
              style={[styles.statIconContainer, { backgroundColor: "#E5F3FF" }]}
            >
              <Ionicons name="receipt" size={20} color="#007AFF" />
            </View>
            <Text style={styles.statNumber}>{stats.biller}</Text>
            <Text style={styles.statLabel}>Billers</Text>
          </View>
          <View style={styles.statCard}>
            <View
              style={[styles.statIconContainer, { backgroundColor: "#F0E5FF" }]}
            >
              <Ionicons name="person" size={20} color="#5856D6" />
            </View>
            <Text style={styles.statNumber}>{stats.user}</Text>
            <Text style={styles.statLabel}>Users</Text>
          </View>
        </View>

        {/* Search and Filter */}
        <View style={styles.searchFilterContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#8E8E93" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search users..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#8E8E93"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={20} color="#8E8E93" />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.filterContainer}>
            <Text style={styles.filterLabel}>Filter by role:</Text>
            <View style={styles.roleFilterButtons}>
              {["all", "admin", "biller", "user"].map((role) => (
                <TouchableOpacity
                  key={role}
                  style={[
                    styles.filterButton,
                    selectedRole === role && styles.activeFilterButton,
                  ]}
                  onPress={() => setSelectedRole(role)}
                >
                  <Text
                    style={[
                      styles.filterButtonText,
                      selectedRole === role && styles.activeFilterButtonText,
                    ]}
                  >
                    {role === "all"
                      ? "All"
                      : role.charAt(0).toUpperCase() + role.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Users List */}
        <View style={styles.usersContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {filteredUsers.length}
              {filteredUsers.length === 1 ? "User" : "Users"}
            </Text>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={() => {
                setSearchQuery("");
                setSelectedRole("all");
              }}
            >
              <Ionicons name="refresh" size={20} color="#007AFF" />
            </TouchableOpacity>
          </View>

          {filteredUsers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={64} color="#C7C7CC" />
              <Text style={styles.emptyTitle}>
                {searchQuery || selectedRole !== "all"
                  ? "No users found"
                  : "No users yet"}
              </Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery || selectedRole !== "all"
                  ? "Try adjusting your search or filter"
                  : "Users will appear here once they sign up"}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredUsers}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <View style={styles.userCard}>
                  <View style={styles.userHeader}>
                    <View style={styles.avatarContainer}>
                      <Text style={styles.avatarText}>
                        {item.username
                          ? item.username.charAt(0).toUpperCase()
                          : "U"}
                      </Text>
                    </View>
                    <View style={styles.userBasicInfo}>
                      <Text style={styles.username}>
                        {item.username || "Unknown User"}
                      </Text>
                      <Text style={styles.email}>{item.email}</Text>
                      {item.phoneNumber && (
                        <Text style={styles.phone}>{item.phoneNumber}</Text>
                      )}
                    </View>
                    <View style={styles.userActions}>
                      <View
                        style={[styles.roleBadge, getRoleBadgeStyle(item.role)]}
                      >
                        <Text
                          style={[
                            styles.roleBadgeText,
                            getRoleTextStyle(item.role),
                          ]}
                        >
                          {(item.role || "user").toUpperCase()}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => handleRoleChange(item)}
                      >
                        <Ionicons
                          name="create-outline"
                          size={20}
                          color="#007AFF"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.userFooter}>
                    <View style={styles.userMeta}>
                      <Ionicons
                        name="calendar-outline"
                        size={14}
                        color="#8E8E93"
                      />
                      <Text style={styles.metaText}>
                        Joined {formatDate(item.createdAt)}
                      </Text>
                    </View>
                    <View style={styles.userMeta}>
                      <Ionicons
                        name="shield-outline"
                        size={14}
                        color="#8E8E93"
                      />
                      <Text style={styles.metaText}>
                        {item.role === "admin"
                          ? "Full Access"
                          : item.role === "biller"
                          ? "Billing Access"
                          : "Limited Access"}
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            />
          )}
        </View>
      </ScrollView>

      {/* Role Change Modal */}
      <Modal
        visible={showRoleModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowRoleModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change User Role</Text>
              <TouchableOpacity
                onPress={() => setShowRoleModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            {selectedUser && (
              <View style={styles.modalContent}>
                <View style={styles.userPreview}>
                  <View style={styles.previewAvatar}>
                    <Text style={styles.previewAvatarText}>
                      {selectedUser.username
                        ? selectedUser.username.charAt(0).toUpperCase()
                        : "U"}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.previewName}>
                      {selectedUser.username || "Unknown User"}
                    </Text>
                    <Text style={styles.previewEmail}>
                      {selectedUser.email}
                    </Text>
                  </View>
                </View>

                <Text style={styles.currentRoleLabel}>Current Role:</Text>
                <View
                  style={[
                    styles.currentRoleBadge,
                    getRoleBadgeStyle(selectedUser.role),
                  ]}
                >
                  <Text
                    style={[
                      styles.currentRoleText,
                      getRoleTextStyle(selectedUser.role),
                    ]}
                  >
                    {(selectedUser.role || "user").toUpperCase()}
                  </Text>
                </View>

                <Text style={styles.newRoleLabel}>Select New Role:</Text>
                <View style={styles.roleOptions}>
                  {[
                    {
                      value: "user",
                      label: "User",
                      description: "Basic access to user features",
                      icon: "person",
                    },
                    {
                      value: "biller",
                      label: "Biller",
                      description: "Access to billing and sales",
                      icon: "receipt",
                    },
                    {
                      value: "admin",
                      label: "Admin",
                      description: "Full administrative access",
                      icon: "shield-checkmark",
                    },
                  ].map((role) => (
                    <TouchableOpacity
                      key={role.value}
                      style={[
                        styles.roleOption,
                        selectedUser.role === role.value &&
                          styles.currentRoleOption,
                      ]}
                      onPress={() => updateRole(selectedUser.id, role.value)}
                      disabled={selectedUser.role === role.value}
                    >
                      <View style={styles.roleOptionLeft}>
                        <View
                          style={[
                            styles.roleOptionIcon,
                            getRoleBadgeStyle(role.value),
                          ]}
                        >
                          <Ionicons
                            name={role.icon as any}
                            size={20}
                            color={getRoleIconColor(role.value)}
                          />
                        </View>
                        <View>
                          <Text style={styles.roleOptionTitle}>
                            {role.label}
                          </Text>
                          <Text style={styles.roleOptionDescription}>
                            {role.description}
                          </Text>
                        </View>
                      </View>
                      {selectedUser.role === role.value && (
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color="#30D158"
                        />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const getRoleBadgeStyle = (role?: string) => {
  switch (role) {
    case "admin":
      return styles.adminBadge;
    case "biller":
      return styles.billerBadge;
    default:
      return styles.userBadge;
  }
};

const getRoleTextStyle = (role?: string) => {
  switch (role) {
    case "admin":
      return styles.adminText;
    case "biller":
      return styles.billerText;
    default:
      return styles.userText;
  }
};

const getRoleIconColor = (role: string) => {
  switch (role) {
    case "admin":
      return "#FF3B30";
    case "biller":
      return "#007AFF";
    default:
      return "#5856D6";
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  fixedHeaderContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
    paddingTop: 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1D1D1F",
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
    marginTop: 95,
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
    fontWeight: "500",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    padding: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1D1D1F",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  errorText: {
    fontSize: 16,
    color: "#8E8E93",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#007AFF",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },

  // Stats Cards
  statsContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E5F3FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1D1D1F",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#8E8E93",
    fontWeight: "500",
    textAlign: "center",
  },

  // Search and Filter
  searchFilterContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E5EA",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: "#1D1D1F",
    fontWeight: "400",
  },
  filterContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E5EA",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1D1D1F",
    marginBottom: 12,
  },
  roleFilterButtons: {
    flexDirection: "row",
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#F2F2F7",
    alignItems: "center",
  },
  activeFilterButton: {
    backgroundColor: "#007AFF",
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#8E8E93",
  },
  activeFilterButtonText: {
    color: "#FFFFFF",
  },

  // Users List
  usersContainer: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1D1D1F",
  },
  refreshButton: {
    padding: 8,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#8E8E93",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#C7C7CC",
    textAlign: "center",
    lineHeight: 20,
  },

  // User Cards
  userCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F1F1F1",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  userHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  userBasicInfo: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1D1D1F",
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: "#8E8E93",
    marginBottom: 2,
  },
  phone: {
    fontSize: 13,
    color: "#8E8E93",
  },
  userActions: {
    alignItems: "flex-end",
    gap: 8,
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  adminBadge: {
    backgroundColor: "#FFE5E5",
  },
  billerBadge: {
    backgroundColor: "#E5F3FF",
  },
  userBadge: {
    backgroundColor: "#F0E5FF",
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  adminText: {
    color: "#FF3B30",
  },
  billerText: {
    color: "#007AFF",
  },
  userText: {
    color: "#5856D6",
  },
  editButton: {
    padding: 4,
  },
  userFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F1F1",
  },
  userMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: "#8E8E93",
    fontWeight: "400",
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F1F1",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1D1D1F",
  },
  modalCloseButton: {
    padding: 4,
  },
  modalContent: {
    padding: 16,
  },
  userPreview: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  previewAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  previewAvatarText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  previewName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1D1D1F",
    marginBottom: 2,
  },
  previewEmail: {
    fontSize: 14,
    color: "#8E8E93",
  },
  currentRoleLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1D1D1F",
    marginBottom: 8,
  },
  currentRoleBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 20,
  },
  currentRoleText: {
    fontSize: 12,
    fontWeight: "600",
  },
  newRoleLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1D1D1F",
    marginBottom: 12,
  },
  roleOptions: {
    gap: 12,
  },
  roleOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "transparent",
  },
  currentRoleOption: {
    backgroundColor: "#E8F5E8",
    borderColor: "#30D158",
  },
  roleOptionLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  roleOptionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  roleOptionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1D1D1F",
    marginBottom: 2,
  },
  roleOptionDescription: {
    fontSize: 13,
    color: "#8E8E93",
  },

  // Skeleton Loading Styles
  skeletonIcon: {
    backgroundColor: "#E5E5EA",
  },
  skeletonText: {
    backgroundColor: "#E5E5EA",
    borderRadius: 4,
  },
  skeletonNumber: {
    width: 30,
    height: 24,
    marginBottom: 4,
  },
  skeletonLabel: {
    width: 60,
    height: 12,
  },
  skeletonSearchBar: {
    justifyContent: "center",
  },
  skeletonSearchInput: {
    flex: 1,
    height: 16,
    backgroundColor: "#E5E5EA",
    borderRadius: 4,
    marginHorizontal: 44,
  },
  skeletonFilterLabel: {
    width: 100,
    height: 14,
    marginBottom: 12,
  },
  skeletonButton: {
    backgroundColor: "#E5E5EA",
  },
  skeletonSectionTitle: {
    width: 120,
    height: 18,
  },
  skeletonRefreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E5E5EA",
  },
  skeletonAvatar: {
    backgroundColor: "#E5E5EA",
  },
  skeletonUsername: {
    width: 140,
    height: 16,
    marginBottom: 4,
  },
  skeletonEmail: {
    width: 180,
    height: 14,
    marginBottom: 2,
  },
  skeletonPhone: {
    width: 120,
    height: 13,
  },
  skeletonRoleBadge: {
    width: 60,
    height: 24,
    backgroundColor: "#E5E5EA",
  },
  skeletonEditButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#E5E5EA",
  },
  skeletonMeta: {
    width: 100,
    height: 12,
  },
});
