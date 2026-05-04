import React, { createContext, useContext, useState, useMemo } from "react";

const TOKEN_KEY = "smartloc_token";
const USER_KEY = "smartloc_user";
const PROFILE_PIC_KEY = "smartloc_profile_pic";

// Laravel API base. Set VITE_API_URL in .env (defaults to http://localhost:8000).
// Always required: there is no mock fallback — auth must hit the real Laravel backend.
const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/$/, "");

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

  const login = async (email, password) => {
    const res = await safeFetch(`${API_BASE}/api/login`, {
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
    const res = await safeFetch(`${API_BASE}/api/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ name, email, password, contact_number: contactNumber || undefined }),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      // Laravel returns 422 with { errors: { email: ["The email has already been taken."] } }
      const emailErr = errorData?.errors?.email?.[0];
      if (emailErr && /taken|already|exists/i.test(emailErr)) {
        throw new Error("Email already registered. Please login instead.");
      }
      throw new Error(errorData.message || emailErr || "Registration failed.");
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
    const res = await safeFetch(`${API_BASE}/api/change-password`, {
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
