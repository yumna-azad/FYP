# Laravel Backend Setup for SmartLoc

This document provides instructions for setting up the Laravel backend with MySQL database named `smartloc`.

## Prerequisites

- PHP >= 8.1
- Composer
- MySQL
- Laravel 10+

## Setup Steps

### 1. Create Laravel Project

```bash
composer create-project laravel/laravel smartloc-backend
cd smartloc-backend
```

### 2. Configure Database

Edit `.env`:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=smartloc
DB_USERNAME=your_username
DB_PASSWORD=your_password
```

Create the database:

```sql
CREATE DATABASE smartloc;
```

### 3. Install Sanctum (for API authentication)

```bash
composer require laravel/sanctum
php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"
php artisan migrate
```

### 4. Copy Files

Copy the following files from `backend/` directory to your Laravel project:

- `database/migrations/*` → `database/migrations/`
- `app/Models/*` → `app/Models/`
- `app/Http/Controllers/Api/*` → `app/Http/Controllers/Api/`
- `app/Http/Middleware/AdminMiddleware.php` → `app/Http/Middleware/`
- `routes/api.php` → `routes/api.php` (merge with existing)
- `database/seeders/SubscriptionPlanSeeder.php` → `database/seeders/`

### 5. Register Middleware

In `app/Http/Kernel.php`, add to `$middlewareAliases`:

```php
'admin' => \App\Http\Middleware\AdminMiddleware::class,
```

### 6. Update User Model

In `app/Models/User.php`, add:

```php
protected $fillable = [
    'name',
    'email',
    'password',
    'role',
    'subscription_plan_id',
    'status',
    'last_active_at',
];

protected $casts = [
    'last_active_at' => 'datetime',
];

public function subscriptionPlan()
{
    return $this->belongsTo(SubscriptionPlan::class);
}
```

### 7. Run Migrations

```bash
php artisan migrate
php artisan db:seed --class=SubscriptionPlanSeeder
```

### 8. Configure CORS

In `config/cors.php`:

```php
'allowed_origins' => ['http://localhost:5173', 'http://127.0.0.1:5173'],
'supports_credentials' => true,
```

### 9. Create Admin User

```bash
php artisan tinker
```

```php
$user = \App\Models\User::create([
    'name' => 'Yumna',
    'email' => 'yumna@smartloc.lk',
    'password' => bcrypt('123456'),
    'role' => 'admin',
]);
```

### 10. Frontend Configuration

In your React frontend `.env`:

```env
VITE_API_URL=http://localhost:8000
```

## API Endpoints

All admin endpoints require authentication (`Bearer` token) and admin role.

### User inputs (auto-show on admin when user submits)

When a user submits the Location Finder (dashboard), their input is saved to MySQL so the admin sees it automatically:

- `POST /api/submissions` - Store Location Finder input (requires `auth:sanctum`)
- `GET /api/admin/submissions` - List all user inputs (admin only)

### Admin Endpoints

- `GET /api/admin/stats` - Get dashboard statistics
- `GET /api/admin/submissions` - Get all user inputs (Location Finder submissions)
- `GET /api/admin/users` - Get all users
- `POST /api/admin/users` - Create user
- `PUT /api/admin/users/{id}` - Update user
- `DELETE /api/admin/users/{id}` - Delete user
- `GET /api/admin/business-types` - Get business types
- `POST /api/admin/business-types` - Create business type
- `PUT /api/admin/business-types/{id}` - Update business type
- `DELETE /api/admin/business-types/{id}` - Delete business type
- `GET /api/admin/locations` - Get locations
- `POST /api/admin/locations` - Create location
- `PUT /api/admin/locations/{id}` - Update location
- `DELETE /api/admin/locations/{id}` - Delete location
- `GET /api/admin/plans` - Get subscription plans
- `POST /api/admin/plans` - Create plan
- `PUT /api/admin/plans/{id}` - Update plan
- `DELETE /api/admin/plans/{id}` - Delete plan
- `GET /api/admin/analytics` - Get analytics data

## Database Schema

### subscription_plans
- id, name, slug, price, billing_period, description, features (JSON), is_active, sort_order, timestamps

### users (extended)
- subscription_plan_id (FK), last_active_at

### business_types
- id, name, count, growth, timestamps

### locations
- id, name, address, type, score, latitude, longitude, timestamps

### location_finder_submissions
- id, user_id (FK, nullable), business_type, proximity, traffic, competition, internet_coverage, land_intent, amount, timestamps

## User inputs → Admin automatically

1. Set `VITE_API_URL=http://localhost:8000` in the frontend `.env` and run Laravel with MySQL.
2. Run `php artisan migrate` so the `location_finder_submissions` table exists.
3. When a user is logged in and submits the Location Finder (dashboard), the frontend calls `POST /api/submissions` and Laravel saves to MySQL.
4. Admin dashboard → **User Inputs** tab fetches `GET /api/admin/submissions` and shows all submissions. No extra step needed.

## Notes

- Subscription plans are now dynamic - no hardcoded "Pro" or "Free tier"
- All admin data is fetched from MySQL database
- Frontend falls back to localStorage if API is not available (for development)
