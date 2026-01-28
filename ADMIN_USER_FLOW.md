# Admin ↔ User Side: Logic and Data Flow

This document describes how admin-side management relates to user-side input and what is (or isn’t) wired end-to-end.

---

## What *is* logical and wired

### 1. User Inputs ↔ Location Finder

- **User:** Submits the Location Finder on the **Input dashboard** (business type, proximity, traffic, competition, internet, land intent, amount).
- **Admin:** Sees these in **User Inputs** when Laravel + MySQL are connected (`VITE_API_URL` set).
- **Flow:** `DashboardPage` calls `submitLocationFinder(payload)` → `POST /api/submissions` → admin loads via `GET /api/admin/submissions` and shows them in the User Inputs table.
- **Mock mode:** Without API, submissions are not stored; admin shows “Connect Laravel + MySQL…” and an empty table.

### 2. Add Location ↔ Dashboard map

- **Admin:** Adds/edits locations in **Add Location** (name, address, type, score, coordinates if your backend supports them).
- **User:** Sees those locations on the **Input dashboard** map when the API is connected.
- **Flow:** `DashboardPage` loads via `adminAPI.getLocations()` and passes them to the map. Mock mode uses default demo locations.

### 3. Add Business Type ↔ Location Finder dropdown

- **Admin:** Adds/edits business types in **Add Business Type** (e.g. Cafe, Restaurant, Hotel).
- **User:** Sees those types in the **Business Type** dropdown on the Input dashboard when the API is connected.
- **Flow:** `DashboardPage` loads via `adminAPI.getBusinessTypes()` and maps them to `{ value, label }` for the select. Mock mode uses a fixed list of 5 types.

### 4. Add User / Users

- **Admin:** Creates/edits/deletes users (accounts).
- **User:** Logs in; profile and permissions are driven by that user data.
- **Flow:** Admin uses User CRUD; auth and user state use the same user base (backend-dependent).

### 5. Schedule Meeting, Social Media, Mail

- **Admin:** Uses these for admin workflows (meetings, links, internal mail).
- **User:** Does not manage these; they are admin tools, not “user input management.”
- **Flow:** Purely admin-side; no direct user-input flow required.

---

## Partially logical (concept vs implementation)

### 6. Transaction History ↔ Subscribe to Pro

- **Concept:** Admin sees real transactions (subscriptions, renewals) from user **Subscribe to Pro** (Stripe).
- **Current:** Transaction History shows mock/localStorage data only. Real Stripe payments are not written to your backend or shown in admin.
- **To make it logical:** Backend must record payments (e.g. Stripe webhook → Laravel), store them in a `transactions` (or similar) table, and expose something like `GET /api/admin/transactions` so the admin UI can display real data.

---

## Not wired (by design or future work)

### 7. Recommendations page

- **User:** Sees ranked locations and metrics on **Recommendations** after submitting the Location Finder.
- **Current:** Recommendations use hardcoded demo data, not admin locations or an API.
- **Possible improvement:** Drive recommendations from admin locations + scoring logic or a dedicated API.

### 8. Explore page

- **User:** Uses **Explore** to filter and view locations on the map.
- **Current:** Uses its own dummy locations, not admin “Add Location” data.
- **Possible improvement:** Load locations from the same API as the dashboard map when the backend is connected.

### 9. Favorites / saved locations

- **User:** Saves locations (e.g. from Favorites or profile “Saved locations”).
- **Admin:** Has no view of “which users saved which locations.”
- **Status:** Optional product decision; add an admin view only if you need that insight.

---

## Summary

| Admin feature          | User-side counterpart      | Wired? | Notes                                                                 |
|------------------------|----------------------------|--------|-----------------------------------------------------------------------|
| User Inputs            | Location Finder submit     | Yes    | When `VITE_API_URL` is set and backend has submissions endpoint      |
| Add Location           | Dashboard map              | Yes    | Dashboard loads locations from API when not in mock                   |
| Add Business Type      | Location Finder dropdown   | Yes    | Dashboard loads business types from API when not in mock              |
| Add User / Users       | Login, profile             | Yes    | Depends on backend user CRUD and auth                                 |
| Transaction History    | Subscribe to Pro (Stripe)  | No     | Mock only; needs webhook + backend table + admin API                  |
| Schedule Meeting etc.  | —                          | N/A    | Admin-only tools                                                      |
| Recommendations/Explore| Recommendations/Explore   | No     | Use demo data today; can be connected to locations/business types API |

Overall, **User Inputs**, **Add Location**, and **Add Business Type** are aligned with user-side input and display. **Transaction History** is logically “admin sees user payments” but not yet tied to real subscriptions.
