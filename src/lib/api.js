/**
 * API service layer for Laravel backend communication
 * Database: smartloc
 */

const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

/**
 * Get auth token from localStorage
 */
function getToken() {
  return localStorage.getItem("smartloc_token");
}

/**
 * Make API request with auth header
 */
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const token = getToken();

  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `API error: ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error("API request failed:", error);
    throw error;
  }
}

/**
 * Admin API endpoints
 */
export const adminAPI = {
  // Get all stats
  getStats: () => apiRequest("/api/admin/stats"),

  // Users CRUD
  getUsers: () => apiRequest("/api/admin/users"),
  createUser: (userData) => apiRequest("/api/admin/users", { method: "POST", body: JSON.stringify(userData) }),
  updateUser: (id, userData) => apiRequest(`/api/admin/users/${id}`, { method: "PUT", body: JSON.stringify(userData) }),
  deleteUser: (id) => apiRequest(`/api/admin/users/${id}`, { method: "DELETE" }),

  // Business Types CRUD
  getBusinessTypes: () => apiRequest("/api/admin/business-types"),
  createBusinessType: (data) => apiRequest("/api/admin/business-types", { method: "POST", body: JSON.stringify(data) }),
  updateBusinessType: (id, data) => apiRequest(`/api/admin/business-types/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteBusinessType: (id) => apiRequest(`/api/admin/business-types/${id}`, { method: "DELETE" }),

  // Locations CRUD
  getLocations: () => apiRequest("/api/admin/locations"),
  createLocation: (data) => apiRequest("/api/admin/locations", { method: "POST", body: JSON.stringify(data) }),
  updateLocation: (id, data) => apiRequest(`/api/admin/locations/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteLocation: (id) => apiRequest(`/api/admin/locations/${id}`, { method: "DELETE" }),

  // Subscription Plans (dynamic)
  getPlans: () => apiRequest("/api/admin/plans"),
  createPlan: (data) => apiRequest("/api/admin/plans", { method: "POST", body: JSON.stringify(data) }),
  updatePlan: (id, data) => apiRequest(`/api/admin/plans/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deletePlan: (id) => apiRequest(`/api/admin/plans/${id}`, { method: "DELETE" }),

  // Analytics
  getAnalytics: () => apiRequest("/api/admin/analytics"),

  // User inputs (Location Finder submissions) – when user inputs something, admin sees it via MySQL/Laravel
  getSubmissions: () => apiRequest("/api/admin/submissions"),
};

/**
 * Submit user's Location Finder input to Laravel/MySQL so admin side shows it automatically
 */
export async function submitLocationFinder(payload) {
  const body = {
    business_type: payload.businessType,
    proximity: payload.proximity,
    traffic: payload.traffic,
    competition: payload.competition,
    internet_coverage: payload.internetCoverage,
    land_intent: payload.landIntent,
    amount: String(payload.amount),
  };
  return apiRequest("/api/submissions", { method: "POST", body: JSON.stringify(body) });
}

/**
 * Fallback to localStorage if API is not available (for development)
 */
export function useMockData() {
  return !API_BASE;
}
