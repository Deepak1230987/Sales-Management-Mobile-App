import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "@react-native-firebase/auth";
import {
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  setDoc,
} from "@react-native-firebase/firestore";
import React, { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext();
// Hook for easy usage
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const auth = getAuth();
  const db = getFirestore(); // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (usr) => {
      if (usr) {
        // Fetch extra user data from Firestore
        const userDocRef = doc(db, "users", usr.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          setUser({ uid: usr.uid, email: usr.email, ...userDocSnap.data() });
        } else {
          setUser({ uid: usr.uid, email: usr.email });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe; // unsubscribe on unmount
  }, [auth, db]); // Signup
  const signUp = async (email, password, username, phoneNumber) => {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    const userDocRef = doc(db, "users", userCredential.user.uid);
    await setDoc(userDocRef, {
      username,
      email,
      phoneNumber,
      role: "user", // default role
      createdAt: serverTimestamp(),
    });
  };
  // Login
  const login = (email, password) =>
    signInWithEmailAndPassword(auth, email, password);

  // Logout
  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider value={{ user, loading, login, signUp, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
