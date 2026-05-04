<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AreaController;
use App\Http\Controllers\Api\SocialMediaController;
use App\Http\Controllers\Api\SubmissionController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Public routes
Route::post('/login', [AuthController::class, 'login']);
Route::post('/register', [AuthController::class, 'register']);

// Protected user routes
Route::middleware(['auth:sanctum'])->post('/change-password', [AuthController::class, 'changePassword']);
Route::middleware(['auth:sanctum'])->put('/profile', [AuthController::class, 'updateProfile']);

// When user inputs Location Finder data, save to MySQL so admin sees it automatically
Route::middleware(['auth:sanctum'])->post('/submissions', [SubmissionController::class, 'store']);

// Public social media links
Route::get('/social-media', [SocialMediaController::class, 'getSocialMedia']);

// Public read of Nuwara Eliya neighbourhood data - FastAPI's ML service
// fetches from this endpoint. Public so the ML service doesn't need a token.
Route::get('/areas', [AreaController::class, 'index']);

// Admin: Update social media links
Route::middleware(['auth:sanctum', 'admin'])->put('/admin/social-media', [SocialMediaController::class, 'updateSocialMedia']);

// Protected admin routes
Route::middleware(['auth:sanctum', 'admin'])->prefix('admin')->group(function () {
    // Stats
    Route::get('/stats', [AdminController::class, 'getStats']);
    
    // Users
    Route::get('/users', [AdminController::class, 'getUsers']);
    Route::post('/users', [AdminController::class, 'createUser']);
    Route::put('/users/{id}', [AdminController::class, 'updateUser']);
    Route::delete('/users/{id}', [AdminController::class, 'deleteUser']);
    
    // Business Types
    Route::get('/business-types', [AdminController::class, 'getBusinessTypes']);
    Route::post('/business-types', [AdminController::class, 'createBusinessType']);
    Route::put('/business-types/{id}', [AdminController::class, 'updateBusinessType']);
    Route::delete('/business-types/{id}', [AdminController::class, 'deleteBusinessType']);
    
    // Locations
    Route::get('/locations', [AdminController::class, 'getLocations']);
    Route::post('/locations', [AdminController::class, 'createLocation']);
    Route::put('/locations/{id}', [AdminController::class, 'updateLocation']);
    Route::delete('/locations/{id}', [AdminController::class, 'deleteLocation']);
    
    // Subscription Plans
    Route::get('/plans', [AdminController::class, 'getPlans']);
    Route::post('/plans', [AdminController::class, 'createPlan']);
    Route::put('/plans/{id}', [AdminController::class, 'updatePlan']);
    Route::delete('/plans/{id}', [AdminController::class, 'deletePlan']);
    
    // Analytics
    Route::get('/analytics', [AdminController::class, 'getAnalytics']);

    // User inputs (Location Finder submissions) - auto-shown when user submits
    Route::get('/submissions', [AdminController::class, 'getSubmissions']);

    // Areas (Nuwara Eliya neighbourhoods) - admin can edit area data that
    // FastAPI uses for the per-area XGBoost feature substitution.
    Route::get('/areas', [AdminController::class, 'getAreas']);
    Route::post('/areas', [AdminController::class, 'createArea']);
    Route::put('/areas/{id}', [AdminController::class, 'updateArea']);
    Route::delete('/areas/{id}', [AdminController::class, 'deleteArea']);
});
