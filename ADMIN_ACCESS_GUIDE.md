# Admin Dashboard Access Guide

## How to Access Admin Dashboard

### Step 1: Login as Admin

1. **Navigate to Login Page**
   - Go to `http://localhost:5173/login`
   - Or click "Login" in the top navigation bar

2. **Enter Admin Credentials**
   - **Username/Email:** `yumna` or `yumna@smartloc.lk`
   - **Password:** `123456` or `yumna,123456` (either works)

3. **Click "Sign in"**

### Step 2: Access Admin Dashboard

After logging in with admin credentials, you will see:

1. **"Admin" link in the sidebar** (left side navigation)
   - Click on "Admin" to go to `/admin`
   - Or navigate directly to `http://localhost:5173/admin`

2. **Admin Dashboard Features:**
   - **Overview Stats:** Total users, business types, locations, active sessions
   - **User Management:** View, create, edit, delete users
   - **Business Types:** Manage business categories
   - **Locations:** Manage location data
   - **Subscription Plans:** Manage subscription tiers
   - **Analytics:** View charts, graphs, and system performance

## Admin Dashboard Features

### 1. Statistics Overview
- **Total Users:** Number of registered users
- **Business Types:** Number of business categories
- **Locations:** Number of locations in database
- **Active Sessions:** Currently active user sessions

### 2. User Management Tab
- **View all users** in a table
- **Create new users** with name, email, subscription plan, status
- **Edit existing users** (click edit icon)
- **Delete users** (click delete icon)
- **Search users** by name or email
- **Filter by subscription plan**

### 3. Business Types Tab
- **View all business types** (Cafe, Restaurant, Hotel, etc.)
- **Add new business types** with count and growth metrics
- **Edit business types**
- **Delete business types**

### 4. Locations Tab
- **View all locations** with addresses and scores
- **Add new locations** with name, address, type, score
- **Edit location details**
- **Delete locations**

### 5. Subscription Plans Tab
- **View all subscription plans** (Free, Pro, Enterprise)
- **Create new plans** with name, price, features
- **Edit plan details**
- **Delete plans**

### 6. Analytics Tab
- **User Growth Chart:** Bar chart showing user growth over last 6 months
- **Subscription Plans Distribution:** Visual breakdown of users by plan
- **Business Types Distribution:** Bar chart showing business type counts
- **Location Scores Distribution:** Visual representation of location scores
- **System Performance:** API response time, database load, cache hit rate, error rate
- **Recent Activity:** Timeline of recent system activities

## Backend Setup (For Full Functionality)

If you want to use the Laravel backend:

1. **Set up Laravel backend** (see `LARAVEL_BACKEND_SETUP.md`)
2. **Create admin user in database:**
   ```php
   php artisan tinker
   \App\Models\User::create([
       'name' => 'Yumna',
       'email' => 'yumna@smartloc.lk',
       'password' => bcrypt('123456'),
       'role' => 'admin',
   ]);
   ```
3. **Set frontend API URL:**
   - Create `.env` file in project root
   - Add: `VITE_API_URL=http://localhost:8000`
   - Restart dev server

## Mock Mode (Development)

If backend is not set up, the admin dashboard works in **mock mode**:
- Data is stored in `localStorage`
- All CRUD operations work locally
- Perfect for development and testing

## Security Notes

- **Admin routes are protected** - only users with `role: "admin"` can access
- **Admin link only appears** in sidebar for admin users
- **Direct URL access** to `/admin` redirects non-admin users
- **All admin API endpoints** require authentication and admin role

## Troubleshooting

**Can't see Admin link?**
- Make sure you logged in with admin credentials (`yumna` / `123456`)
- Check browser console for errors
- Clear localStorage and try again

**Admin page shows blank?**
- Check if you're authenticated
- Verify your user role is "admin"
- Check browser console for API errors

**Data not loading?**
- If using backend, ensure Laravel server is running
- Check API URL in `.env` file
- Verify database connection
