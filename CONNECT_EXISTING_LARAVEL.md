# Connect This App to Your Existing Laravel + smartloc

You already have **Laravel** and the **smartloc** database. Use these steps to connect this React frontend to them.

---

## 1. Point the frontend at your Laravel API

In **this project** (the React app, `mokup`), create a `.env` file in the project root if you don’t have one:

```env
# Laravel API base URL (no trailing slash)
# When set, the app uses Laravel + MySQL smartloc. When empty, it uses mock/localStorage.
VITE_API_URL=http://localhost:8000
```

Replace `http://localhost:8000` with the URL where your Laravel app runs (e.g. `http://127.0.0.1:8000` or `http://smartloc-backend.test`).

**Windows (PowerShell):**
```powershell
cd "h:\3rd year\FYP\mokup"
echo "VITE_API_URL=http://localhost:8000" > .env
```

Then edit `.env` if your Laravel URL is different.

---

## 2. Laravel side (quick check)

In your **Laravel project** `.env` you should have:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=smartloc
DB_USERNAME=your_user
DB_PASSWORD=your_password
```

Ensure your Laravel app has the SmartLoc backend code and routes (migrations, controllers, `api.php` from this repo’s `backend/` folder). If you haven’t merged it yet, see [LARAVEL_BACKEND_SETUP.md](LARAVEL_BACKEND_SETUP.md) for what to copy.

Create tables if needed:

```bash
cd /path/to/your/laravel/project
php artisan migrate
```

---

## 3. Run both

**Terminal 1 – Laravel:**
```bash
cd /path/to/your/laravel/project
php artisan serve
```

**Terminal 2 – React (this project):**
```bash
cd "h:\3rd year\FYP\mokup"
npm run dev
```

Open the frontend URL (e.g. http://localhost:5173). With `VITE_API_URL` set, login, Location Finder, admin User Inputs, business types, and locations will use your Laravel API and the **smartloc** database.

---

## Summary

| What | Where |
|------|--------|
| Database | `smartloc` (already created) |
| Laravel `.env` | `DB_DATABASE=smartloc` |
| React `.env` | `VITE_API_URL=http://localhost:8000` (or your Laravel URL) |
| Tables | `php artisan migrate` in Laravel project if not done |

No other code changes are needed in the frontend; it already uses `VITE_API_URL` when present.
