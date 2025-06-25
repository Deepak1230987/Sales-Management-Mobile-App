// app/login.tsx
import { Ionicons } from "@expo/vector-icons";
import { doc, getDoc, getFirestore } from "@react-native-firebase/firestore";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "./contexts/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [secureTextEntry, setSecureTextEntry] = useState(true);
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    try {
      setIsLoading(true);
      // Sign in with Firebase
      const credential = await login(email, password);

      // Initialize Firestore
      const db = getFirestore();

      // Immediately fetch user data and role after login
      const userDocRef = doc(db, "users", credential.user.uid);
      const userDocSnap = await getDoc(userDocRef);

      // Redirect based on role immediately
      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        switch (userData.role) {
          case "admin":
            router.replace("/admin");
            break;
          case "biller":
            router.replace("/biller");
            break;
          case "user":
          default:
            router.replace("/user");
            break;
        }
      } else {
        // Default redirect if no user document exists
        router.replace("/user");
      }
    } catch (e) {
      setIsLoading(false);
      Alert.alert("Login failed", e.message);
    }
  };

  const toggleSecureTextEntry = () => {
    setSecureTextEntry(!secureTextEntry);
  };
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardContainer}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          
          {/* Header Section */}
          <View style={styles.headerSection}>
            <View style={styles.logoContainer}>
              <View style={styles.logoWrapper}>
                <Ionicons name="storefront" size={60} color="#007AFF" />
              </View>
              <Text style={styles.appTitle}>Sales System</Text>
              <Text style={styles.appSubtitle}>
                Professional Billing & Inventory
              </Text>
            </View>
          </View>
          {/* Form Section */}
          <View style={styles.formSection}>
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>Welcome Back</Text>
              <Text style={styles.formSubtitle}>Sign in to your account</Text>
              {/* Email Input */}
              <View style={styles.inputContainer}>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="mail-outline"
                    size={20}
                    color="#8E8E93"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Email address"
                    placeholderTextColor="#8E8E93"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoComplete="email"
                  />
                </View>
              </View>
              {/* Password Input */}
              <View style={styles.inputContainer}>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color="#8E8E93"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor="#8E8E93"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={secureTextEntry}
                    autoComplete="password"
                  />
                  <TouchableOpacity
                    onPress={toggleSecureTextEntry}
                    style={styles.eyeButton}
                  >
                    <Ionicons
                      name={secureTextEntry ? "eye-outline" : "eye-off-outline"}
                      size={20}
                      color="#8E8E93"
                    />
                  </TouchableOpacity>
                </View>
              </View>
              {/* Forgot Password */}
              <TouchableOpacity
                onPress={() =>
                  Alert.alert(
                    "Password Reset",
                    "Password reset functionality will be implemented soon."
                  )
                }
                style={styles.forgotPasswordButton}
              >
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>
              {/* Login Button */}
              <View>
                <TouchableOpacity
                  style={[
                    styles.loginButton,
                    isLoading && styles.loginButtonDisabled,
                  ]}
                  onPress={handleLogin}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.loginButtonText}>Sign In</Text>
                  )}
                </TouchableOpacity>
              </View>
              {/* Sign Up Link */}
              <TouchableOpacity
                onPress={() => router.push("/signup")}
                style={styles.signupLinkButton}
              >
                <Text style={styles.signupLinkText}>
                  Don&apos;t have an account?
                  <Text style={styles.signupLinkTextBold}>Sign Up</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  headerSection: {
    alignItems: "center",
    marginBottom: 40,
  },
  logoContainer: {
    alignItems: "center",
  },
  logoWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: "700",
    color: "#1D1D1F",
    marginBottom: 8,
    textAlign: "center",
  },
  appSubtitle: {
    fontSize: 16,
    color: "#8E8E93",
    textAlign: "center",
    fontWeight: "400",
  },
  formSection: {
    flex: 1,
    justifyContent: "center",
  },
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: "600",
    color: "#1D1D1F",
    textAlign: "center",
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 16,
    color: "#8E8E93",
    textAlign: "center",
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: "#1D1D1F",
    fontWeight: "400",
  },
  eyeButton: {
    padding: 4,
  },
  forgotPasswordButton: {
    alignSelf: "flex-end",
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "500",
  },
  loginButton: {
    backgroundColor: "#007AFF",
    borderRadius: 12,
    height: 52,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  signupLinkButton: {
    alignItems: "center",
    paddingVertical: 12,
  },
  signupLinkText: {
    fontSize: 14,
    color: "#8E8E93",
  },
  signupLinkTextBold: {
    color: "#007AFF",
    fontWeight: "600",
  },
});

export const options = {
  title: "Sales System",
  headerStyle: {
    backgroundColor: "#007AFF",
  },
  headerTintColor: "#fff",
  headerTitleStyle: {
    fontWeight: "bold",
    fontSize: 20,
  },
  headerTitleAlign: "center",
};
