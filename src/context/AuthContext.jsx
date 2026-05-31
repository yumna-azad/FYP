import React, { createContext, useContext, useState, useMemo } from "react";

const TOKEN_KEY = "smartloc_token";
const USER_KEY = "smartloc_user";
const PROFILE_PIC_KEY = "smartloc_profile_pic";

// Laravel API base. Set VITE_API_URL in .env to enable real auth.
// If empty (e.g. hosted demo without Laravel), login/register throw a clear
// error instead of failing with "res is not defined".
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

  // Wrap fetch so network failures (Laravel not running, wrong port, CORS) become
  // a readable error instead of the generic browser "Failed to fetch".
  const safeFetch = async (url, init) => {
    try {
      return await fetch(url, init);
    } catch (e) {
      throw new Error(
        `Cannot reach the backend at ${API_BASE}. Make sure Laravel is running (npm run dev:laravel).`
      );
    }
  };

  // Demo-mode auth: when the Laravel backend isn't deployed (hosted Vercel
  // build with VITE_API_URL empty), fake a user and a token so visitors can
  // experience the full UX — dashboard, ML recommendations, profile, PDF
  // export — without registering for real. Persistence is localStorage only.
  const makeDemoUser = (email, name, contactNumber) => {
    const safeName = name || (email ? email.split("@")[0] : "Guest");
    return {
      id: `demo-${Date.now()}`,
      name: safeName,
      email: email || "guest@smartloc.demo",
      contact_number: contactNumber || null,
      role: "user",
      plan: "demo",
      is_demo: true,
    };
  };

  const login = async (email, password) => {
    if (!API_BASE) {
      // Demo mode — accept any non-empty email/password
      if (!email || !password) {
        throw new Error("Enter your email and password to continue.");
      }
      const demoUser = makeDemoUser(email);
      const demoToken = `demo-token-${Date.now()}`;
      setAuth(demoToken, demoUser);
      return { token: demoToken, user: demoUser };
    }
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
  };

  const register = async (name, email, password, contactNumber) => {
    if (!API_BASE) {
      // Demo mode — accept any non-empty fields
      if (!email || !password || !name) {
        throw new Error("Please fill in your name, email, and password.");
      }
      const demoUser = makeDemoUser(email, name, contactNumber);
      const demoToken = `demo-token-${Date.now()}`;
      setAuth(demoToken, demoUser);
      return { token: demoToken, user: demoUser };
    }
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
  };

  const logout = () => {
    setAuth(null, null);
    setProfilePic(null);
    localStorage.removeItem(PROFILE_PIC_KEY);
    if (typeof sessionStorage !== "undefined") sessionStorage.removeItem("smartloc_dashboard_submitted");
  };

  const updateProfile = async (updates) => {
    // Profile picture is browser-local (image data URL stored in localStorage).
    if (updates.profilePic !== undefined) {
      if (updates.profilePic) {
        localStorage.setItem(PROFILE_PIC_KEY, updates.profilePic);
        setProfilePic(updates.profilePic);
      } else {
        localStorage.removeItem(PROFILE_PIC_KEY);
        setProfilePic(null);
      }
    }

    // Name and contact number ARE persisted to the backend so the admin
    // user list reflects the change. Update local state on success.
    const backendKeys = ['name', 'contact_number', 'contactNumber'];
    const hasBackendUpdate = backendKeys.some(k => updates[k] !== undefined);
    if (hasBackendUpdate && user && token) {
      const body = {};
      if (updates.name !== undefined) body.name = updates.name;
      if (updates.contact_number !== undefined) body.contact_number = updates.contact_number;
      if (updates.contactNumber !== undefined) body.contact_number = updates.contactNumber;

      const res = await safeFetch(`${API_BASE}/api/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to update profile.');
      }
      const data = await res.json();
      const updatedUser = { ...user, ...(data.user || {}) };
      setUserState(updatedUser);
      localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
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
