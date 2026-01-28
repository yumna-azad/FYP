# Connect to MySQL database "smartloc"

The **React frontend cannot connect to MySQL directly**. Only the **Laravel backend** talks to MySQL. This guide gets Laravel connected to a MySQL database named `smartloc`.

---

## 1. Create the MySQL database

In MySQL (command line, phpMyAdmin, or MySQL Workbench):

```sql
CREATE DATABASE smartloc CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Or if you already created it:

```sql
CREATE DATABASE smartloc;
```

---

## 2. Laravel project: set environment

If you **don’t have a Laravel project yet**, create one and copy the SmartLoc backend files:

```bash
composer create-project laravel/laravel smartloc-backend
cd smartloc-backend
```

Then copy everything from this repo’s `backend/` into the Laravel project as in [LARAVEL_BACKEND_SETUP.md](LARAVEL_BACKEND_SETUP.md).

In your **Laravel project root**, edit `.env` and set:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=smartloc
DB_USERNAME=root
DB_PASSWORD=your_mysql_password
```

Use your real MySQL username and password. A ready-to-copy block is in **`backend/env-smartloc-example.txt`**.

---

## 3. Test the connection

From the Laravel project root:

```bash
php artisan db:show
```

You should see `smartloc` as the database. Then run migrations to create SmartLoc tables:

```bash
php artisan migrate
```

If that runs without errors, Laravel is connected to MySQL `smartloc`.

---

## 4. Optional: seed and run API

```bash
php artisan db:seed --class=SubscriptionPlanSeeder
php artisan serve
```

Use the frontend with `VITE_API_URL=http://localhost:8000` so the app talks to this Laravel backend, which is now using the `smartloc` database.

---

## Quick reference

| Item        | Value                          |
|------------|----------------------------------|
| Database   | `smartloc`                       |
| Laravel env| `DB_DATABASE=smartloc` in `.env` |
| Test       | `php artisan db:show` then `php artisan migrate` |

If `php artisan migrate` fails, check:

- MySQL is running.
- `DB_USERNAME` / `DB_PASSWORD` in `.env` are correct.
- The `smartloc` database exists.
- `DB_HOST` / `DB_PORT` match your MySQL server (e.g. `127.0.0.1:3306`).
