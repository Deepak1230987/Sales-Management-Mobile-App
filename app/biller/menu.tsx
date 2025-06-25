import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../contexts/AuthContext";

export default function MenuSettings() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [settings, setSettings] = useState({
    notifications: true,
    darkMode: false,
    dataSync: true,
    allowUserRegistration: true,
  });

  const toggleSetting = (setting: keyof typeof settings) => {
    setSettings((prev) => ({
      ...prev,
      [setting]: !prev[setting],
    }));
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: "Check out our Sales Management System!",
        url: "https://example.com/sales-app",
        title: "Sales Management System",
      });
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  const handleLogout = () => {
    Alert.alert("Confirm Logout", "Are you sure you want to logout?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Logout",
        style: "destructive",
        onPress: logout,
      },
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.profileContainer}>
          <View style={styles.profileIcon}>
            <Text style={styles.profileInitial}>
              {user?.username ? user.username.charAt(0).toUpperCase() : "A"}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.username || "biller"}</Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
          </View>
        </View>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App Settings</Text>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Ionicons name="notifications" size={20} color="#0066CC" />
            <Text style={styles.settingText}>Notifications</Text>
          </View>
          <Switch
            value={settings.notifications}
            onValueChange={() => toggleSetting("notifications")}
            trackColor={{ false: "#CCCCCC", true: "#0066CC" }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Ionicons name="moon" size={20} color="#0066CC" />
            <Text style={styles.settingText}>Dark Mode</Text>
          </View>
          <Switch
            value={settings.darkMode}
            onValueChange={() => toggleSetting("darkMode")}
            trackColor={{ false: "#CCCCCC", true: "#0066CC" }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Ionicons name="sync" size={20} color="#0066CC" />
            <Text style={styles.settingText}>Data Synchronization</Text>
          </View>
          <Switch
            value={settings.dataSync}
            onValueChange={() => toggleSetting("dataSync")}
            trackColor={{ false: "#CCCCCC", true: "#0066CC" }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Ionicons name="person-add" size={20} color="#0066CC" />
            <Text style={styles.settingText}>Allow User Registration</Text>
          </View>
          <Switch
            value={settings.allowUserRegistration}
            onValueChange={() => toggleSetting("allowUserRegistration")}
            trackColor={{ false: "#CCCCCC", true: "#0066CC" }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Management</Text>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push("/biller/items")}
        >
          <View style={styles.menuItemContent}>
            <Ionicons name="cube" size={20} color="#0066CC" />
            <Text style={styles.menuItemText}>Items</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999999" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push("/biller/claims")}
        >
          <View style={styles.menuItemContent}>
            <Ionicons name="trophy" size={20} color="#0066CC" />
            <Text style={styles.menuItemText}>Claims & Rewards</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999999" />
        </TouchableOpacity>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>System</Text>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => Alert.alert("Information", "App Version: 1.0.0")}
        >
          <View style={styles.menuItemContent}>
            <Ionicons name="information-circle" size={20} color="#0066CC" />
            <Text style={styles.menuItemText}>About</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999999" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={handleShare}>
          <View style={styles.menuItemContent}>
            <Ionicons name="share" size={20} color="#0066CC" />
            <Text style={styles.menuItemText}>Share App</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999999" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() =>
            Alert.alert(
              "Help",
              "For assistance, please contact support@example.com"
            )
          }
        >
          <View style={styles.menuItemContent}>
            <Ionicons name="help-circle" size={20} color="#0066CC" />
            <Text style={styles.menuItemText}>Help & Support</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999999" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() =>
            Alert.alert("Information", "Privacy Policy and Terms of Service")
          }
        >
          <View style={styles.menuItemContent}>
            <Ionicons name="document-text" size={20} color="#0066CC" />
            <Text style={styles.menuItemText}>Privacy Policy</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999999" />
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out" size={20} color="#FFFFFF" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
      <View style={styles.footer}>
        <Text style={styles.footerText}>Sales Management System v1.0.0</Text>
        <Text style={styles.footerText}>© 2025 All Rights Reserved</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    top: 25,
  },
  header: {
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },
  profileContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  profileIcon: {
    width: 40,
    height: 40,
    borderRadius: 25,
    backgroundColor: "#0066CC",
    justifyContent: "center",
    alignItems: "center",
  },
  profileInitial: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  profileInfo: {
    marginLeft: 16,
  },
  profileName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333333",
  },
  profileEmail: {
    fontSize: 12,
    color: "#666666",
    marginTop: 2,
  },
  section: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    margin: 16,
    marginBottom: 0,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333333",
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },
  settingInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  settingText: {
    fontSize: 16,
    color: "#333333",
    marginLeft: 12,
  },
  menuItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },
  menuItemContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  menuItemText: {
    fontSize: 16,
    color: "#333333",
    marginLeft: 12,
  },
  logoutButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FF3B30",
    margin: 16,
    padding: 16,
    borderRadius: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginLeft: 8,
  },
  footer: {
    alignItems: "center",
    padding: 16,
    marginBottom: 16,
  },
  footerText: {
    fontSize: 12,
    color: "#999999",
    marginBottom: 4,
  },
});
