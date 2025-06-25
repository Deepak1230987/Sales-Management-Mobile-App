// app/signup.tsx
import { Ionicons } from "@expo/vector-icons";
import { getAuth } from "@react-native-firebase/auth";
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

export default function SignupScreen() {
  const { signUp } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [secureTextEntry, setSecureTextEntry] = useState(true);

  const toggleSecureTextEntry = () => {
    setSecureTextEntry(!secureTextEntry);
  };
  const handleSignup = async () => {
    if (!username || !email || !phoneNumber || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    try {
      setIsLoading(true);
      // Call the signUp function with phone number
      await signUp(email, password, username, phoneNumber);

      // Wait for auth state to be fully updated and retry if needed
      let currentUser = null;
      let retries = 0;
      const maxRetries = 5;

      while (!currentUser && retries < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        const auth = getAuth();
        currentUser = auth.currentUser;
        retries++;
      }

      if (currentUser) {
        // Fetch the user document to get the role
        const db = getFirestore();
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          // Redirect based on role immediately
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
          // Default to user role if document doesn't exist
          router.replace("/user");
        }
      } else {
        // Fallback if user is not available after retries
        router.replace("/user");
      }
    } catch (error) {
      setIsLoading(false);
      Alert.alert("Signup failed", error.message);
    }
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
                <Ionicons name="storefront" size={60} color="#34C759" />
              </View>
              <Text style={styles.appTitle}>Join Sales System</Text>
              <Text style={styles.appSubtitle}>
                Create your professional account
              </Text>
            </View>
          </View>
          {/* Form Section */}
          <View style={styles.formSection}>
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>Create Account</Text>
              <Text style={styles.formSubtitle}>
                Join us and start managing your business
              </Text>
              {/* Username Input */}
              <View style={styles.inputContainer}>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="person-outline"
                    size={20}
                    color="#8E8E93"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Full name"
                    placeholderTextColor="#8E8E93"
                    value={username}
                    onChangeText={setUsername}
                    autoComplete="name"
                  />
                </View>
              </View>
              {/* Phone Number Input */}
              <View style={styles.inputContainer}>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="call-outline"
                    size={20}
                    color="#8E8E93"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Phone number"
                    placeholderTextColor="#8E8E93"
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    keyboardType="phone-pad"
                    autoComplete="tel"
                  />
                </View>
              </View>
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
                    autoComplete="password-new"
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
              {/* Password Requirements */}
              <View style={styles.passwordRequirements}>
                <Text style={styles.requirementsText}>
                  Password should be at least 6 characters long
                </Text>
              </View>
              {/* Sign Up Button */}
              <View>
                <TouchableOpacity
                  style={[
                    styles.signupButton,
                    isLoading && styles.signupButtonDisabled,
                  ]}
                  onPress={handleSignup}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.signupButtonText}>Create Account</Text>
                  )}
                </TouchableOpacity>
              </View>
              {/* Login Link */}
              <TouchableOpacity
                onPress={() => router.push("/login")}
                style={styles.loginLinkButton}
              >
                <Text style={styles.loginLinkText}>
                  Already have an account?
                  <Text style={styles.loginLinkTextBold}>Sign In</Text>
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
  passwordRequirements: {
    marginBottom: 24,
  },
  requirementsText: {
    fontSize: 12,
    color: "#8E8E93",
    textAlign: "center",
  },
  signupButton: {
    backgroundColor: "#34C759",
    borderRadius: 12,
    height: 52,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#34C759",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  signupButtonDisabled: {
    opacity: 0.7,
  },
  signupButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  loginLinkButton: {
    alignItems: "center",
    paddingVertical: 12,
  },
  loginLinkText: {
    fontSize: 14,
    color: "#8E8E93",
  },
  loginLinkTextBold: {
    color: "#34C759",
    fontWeight: "600",
  },
});
