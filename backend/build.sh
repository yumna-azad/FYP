#!/usr/bin/env bash
# Render build script for the Laravel API.
# Runs during every deploy — installs deps, prepares SQLite,
# migrates schema, seeds data.

set -e  # fail fast on any error

echo "==> Installing PHP dependencies"
composer install --no-dev --optimize-autoloader --no-interaction

echo "==> Caching framework config / routes / views"
php artisan config:cache
php artisan route:cache
php artisan view:cache

echo "==> Preparing SQLite database"
mkdir -p database
touch database/database.sqlite

echo "==> Running migrations + seeders"
php artisan migrate --force --seed

echo "==> Generating Sanctum personal-access-tokens table (if needed)"
php artisan storage:link || true

echo "==> Build complete"
