import React, { createContext, useContext, useState, useMemo } from "react";

const TOKEN_KEY = "smartloc_token";
const USER_KEY = "smartloc_user";
const PROFILE_PIC_KEY = "smartloc_profile_pic";
const REGISTERED_USERS_KEY = "smartloc_registered_users"; // Store registered users in mock mode

// Laravel API base. Set VITE_API_URL in .env (defaults to http://localhost:8000).
// If the env var is empty, the code falls back to mock mode (localStorage only).
const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUserState] = useState(() => {
    try {
      const s = localStorage.getItem(USER_KEY);
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  });
  const [profilePic, setProfilePic] = useState(() => localStorage.getItem(PROFILE_PIC_KEY) || null);

  const setAuth = (newToken, newUser) => {
    if (newToken) {
      localStorage.setItem(TOKEN_KEY, newToken);
      setTokenState(newToken);
    } else {
      localStorage.removeItem(TOKEN_KEY);
      setTokenState(null);
    }
    if (newUser) {
      localStorage.setItem(USER_KEY, JSON.stringify(newUser));
      setUserState(newUser);
    } else {
      localStorage.removeItem(USER_KEY);
      setUserState(null);
    }
  };

  const login = async (email, password) => {
    if (API_BASE) {
      const res = await fetch(`${API_BASE}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Invalid email or password. Please register first.");
      }
      const data = await res.json();
      setAuth(data.token, data.user);
      return data;
    }
    // Mock mode: Only allow login for registered users, or built-in admin
    await new Promise((r) => setTimeout(r, 600));
    const emailNorm = (email || "").toLowerCase().trim();
    const adminPasswords = ["123456", "yumna,123456"]; // accepted admin passwords
    const isAdminCreds = (emailNorm === "yumna" || emailNorm === "yumna@smartloc.lk") && adminPasswords.includes(String(password).trim());
    
    // Built-in admin: allow login with yumna / yumna,123456 (or 123456) without needing to register
    if (isAdminCreds) {
      const u = {
        id: "admin",
        name: "Yumna",
        email: emailNorm === "yumna" ? "yumna@smartloc.lk" : emailNorm,
        role: "admin",
      };
      setAuth("mock-jwt-" + Date.now(), u);
      return { token: "mock-jwt", user: u };
    }
    
    // Get registered users from localStorage
    const registeredUsersStr = localStorage.getItem(REGISTERED_USERS_KEY);
    const registeredUsers = registeredUsersStr ? JSON.parse(registeredUsersStr) : [];
    
    // Find the user in registered users
    const user = registeredUsers.find(
      (u) => u.email.toLowerCase().trim() === emailNorm && u.password === password
    );
    
    if (!user) {
      throw new Error("Invalid email or password. Please register first.");
    }
    
    // Check if admin (only for specific admin account)
    const isAdmin = (emailNorm === "yumna" || emailNorm === "yumna@smartloc.lk") && adminPasswords.includes(String(password).trim());
    
    const u = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: isAdmin ? "admin" : "Location planner",
    };
    setAuth("mock-jwt-" + Date.now(), u);
    return { token: "mock-jwt", user: u };
  };

  const register = async (name, email, password, contactNumber) => {
    if (API_BASE) {
      const res = await fetch(`${API_BASE}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({ name, email, password, contact_number: contactNumber || undefined }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Registration failed. Email may already be registered.");
      }
      const data = await res.json();
      setAuth(data.token, data.user);
      return data;
    }
    // Mock mode: Store registered users in localStorage
    await new Promise((r) => setTimeout(r, 600));
    const emailNorm = (email || "").toLowerCase().trim();
    
    // Get existing registered users
    const registeredUsersStr = localStorage.getItem(REGISTERED_USERS_KEY);
    const registeredUsers = registeredUsersStr ? JSON.parse(registeredUsersStr) : [];
    
    // Check if email already exists
    if (registeredUsers.some((u) => u.email.toLowerCase().trim() === emailNorm)) {
      throw new Error("Email already registered. Please login instead.");
    }
    
    // Create new user
    const newUser = {
      id: Date.now(),
      name: name || email.split("@")[0],
      email: email,
      password: password, // In mock mode, store plain password (not secure, but for demo)
      contactNumber: contactNumber || "",
      role: "Location planner",
    };
    
    // Save to localStorage
    registeredUsers.push(newUser);
    localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(registeredUsers));
    
    const u = { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role, contactNumber: newUser.contactNumber };
    setAuth("mock-jwt-" + Date.now(), u);
    return { token: "mock-jwt", user: u };
  };

  const logout = () => {
    setAuth(null, null);
    setProfilePic(null);
    localStorage.removeItem(PROFILE_PIC_KEY);
    if (typeof sessionStorage !== "undefined") sessionStorage.removeItem("smartloc_dashboard_submitted");
  };

  const updateProfile = (updates) => {
    if (updates.profilePic !== undefined) {
      if (updates.profilePic) {
        localStorage.setItem(PROFILE_PIC_KEY, updates.profilePic);
        setProfilePic(updates.profilePic);
      } else {
        localStorage.removeItem(PROFILE_PIC_KEY);
        setProfilePic(null);
      }
    }
    if (updates.name !== undefined && user) {
      const next = { ...user, name: updates.name };
      setUserState(next);
      localStorage.setItem(USER_KEY, JSON.stringify(next));
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    if (API_BASE) {
      const res = await fetch(`${API_BASE}/api/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to change password. Please check your current password.");
      }
      return { success: true };
    }
    // Mock mode: Update password in localStorage
    await new Promise((r) => setTimeout(r, 600));
    const emailNorm = (user?.email || "").toLowerCase().trim();
    
    // Get registered users
    const registeredUsersStr = localStorage.getItem(REGISTERED_USERS_KEY);
    const registeredUsers = registeredUsersStr ? JSON.parse(registeredUsersStr) : [];
    
    // Find the user
    const userIndex = registeredUsers.findIndex(
      (u) => u.email.toLowerCase().trim() === emailNorm && u.password === currentPassword
    );
    
    if (userIndex === -1) {
      throw new Error("Current password is incorrect.");
    }
    
    // Update password
    registeredUsers[userIndex].password = newPassword;
    localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(registeredUsers));
    
    return { success: true };
  };

  const isAuthenticated = !!token;
  const isAdmin = user?.role === "admin";

  const value = useMemo(
    () => ({
      token,
      user,
      profilePic,
      isAuthenticated,
      isAdmin,
      login,
      register,
      logout,
      updateProfile,
      changePassword,
    }),
    [token, user, profilePic, isAuthenticated, isAdmin]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
