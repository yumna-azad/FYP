<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Area;
use App\Models\BusinessType;
use App\Models\Location;
use App\Models\SubscriptionPlan;
use App\Models\LocationFinderSubmission;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AdminController extends Controller
{
    /**
     * Get admin dashboard statistics
     */
    public function getStats()
    {
        $totalUsers = User::count();
        $usersLastMonth = User::where('created_at', '>=', now()->subMonth())->count();
        $usersChange = $totalUsers > 0 ? round(($usersLastMonth / max($totalUsers - $usersLastMonth, 1)) * 100) : 0;

        $totalBusinessTypes = BusinessType::count();
        $businessTypesLastMonth = BusinessType::where('created_at', '>=', now()->subMonth())->count();
        $businessTypesChange = '+' . ($businessTypesLastMonth);

        $totalLocations = Location::count();
        $locationsLastMonth = Location::where('created_at', '>=', now()->subMonth())->count();
        $locationsChange = '+' . ($locationsLastMonth);

        // Active sessions. The `sessions` table only exists when Laravel is
        // configured with the database session driver. We use Sanctum tokens,
        // not Laravel sessions, so the table isn't present. Fall back to
        // counting recent users by `last_active_at` and don't 500 the dashboard
        // if either path fails.
        $activeSessions = 0;
        try {
            if (Schema::hasTable('sessions')) {
                $activeSessions = DB::table('sessions')
                    ->where('last_activity', '>=', now()->subMinutes(30)->timestamp)
                    ->count();
            } else {
                $activeSessions = User::where('last_active_at', '>=', now()->subMinutes(30))->count();
            }
        } catch (\Throwable $e) {
            $activeSessions = 0;
        }
        $sessionsLastMonth = 0;
        $sessionsChange = $activeSessions > 0 ? '+' . round(($activeSessions / max($activeSessions - $sessionsLastMonth, 1)) * 100) . '%' : '+0%';

        return response()->json([
            'totalUsers' => (string) $totalUsers,
            'businessTypes' => (string) $totalBusinessTypes,
            'locations' => (string) $totalLocations,
            'activeSessions' => (string) $activeSessions,
            'usersChange' => '+' . $usersChange . '%',
            'businessTypesChange' => $businessTypesChange,
            'locationsChange' => $locationsChange,
            'sessionsChange' => $sessionsChange,
        ]);
    }

    /**
     * Get all users
     */
    public function getUsers()
    {
        $users = User::with('subscriptionPlan')->get()->map(function ($user) {
            return [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'contact_number' => $user->contact_number,
                'subscription_plan_id' => $user->subscription_plan_id,
                'created_at' => $user->created_at?->toIso8601String(),
                'lastActive' => $user->last_active_at ? $user->last_active_at->diffForHumans() : 'Never',
            ];
        });

        return response()->json(['data' => $users]);
    }

    /**
     * Create a new user
     */
    public function createUser(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users',
            'password' => 'required|string|min:6',
            'contact_number' => 'nullable|string|max:32',
            'subscription_plan_id' => 'nullable|exists:subscription_plans,id',
            'role' => 'sometimes|string',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => bcrypt($validated['password']),
            'contact_number' => $validated['contact_number'] ?? null,
            'subscription_plan_id' => $validated['subscription_plan_id'] ?? null,
            'role' => $validated['role'] ?? 'Location planner',
        ]);

        return response()->json(['data' => $user], 201);
    }

    /**
     * Update a user
     */
    public function updateUser(Request $request, $id)
    {
        $user = User::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:users,email,' . $id,
            'contact_number' => 'nullable|string|max:32',
            'subscription_plan_id' => 'nullable|exists:subscription_plans,id',
            'role' => 'sometimes|string',
        ]);

        $user->update($validated);

        return response()->json(['data' => $user]);
    }

    /**
     * Delete a user
     */
    public function deleteUser($id)
    {
        $user = User::findOrFail($id);
        $user->delete();

        return response()->json(['message' => 'User deleted successfully']);
    }

    /**
     * Get all business types
     */
    public function getBusinessTypes()
    {
        $types = BusinessType::all();
        return response()->json(['data' => $types]);
    }

    /**
     * Create a business type
     */
    public function createBusinessType(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|unique:business_types',
            'count' => 'sometimes|integer|min:0',
            'growth' => 'sometimes|string',
        ]);

        $type = BusinessType::create($validated);
        return response()->json(['data' => $type], 201);
    }

    /**
     * Update a business type
     */
    public function updateBusinessType(Request $request, $id)
    {
        $type = BusinessType::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|unique:business_types,name,' . $id,
            'count' => 'sometimes|integer|min:0',
            'growth' => 'sometimes|string',
        ]);

        $type->update($validated);
        return response()->json(['data' => $type]);
    }

    /**
     * Delete a business type
     */
    public function deleteBusinessType($id)
    {
        $type = BusinessType::findOrFail($id);
        $type->delete();

        return response()->json(['message' => 'Business type deleted successfully']);
    }

    /**
     * Get all locations
     */
    public function getLocations()
    {
        $locations = Location::all();
        return response()->json(['data' => $locations]);
    }

    /**
     * Create a location
     */
    public function createLocation(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string',
            'address' => 'required|string',
            'type' => 'nullable|string',
            'score' => 'sometimes|integer|min:0|max:100',
            'latitude' => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
        ]);

        $location = Location::create($validated);
        return response()->json(['data' => $location], 201);
    }

    /**
     * Update a location
     */
    public function updateLocation(Request $request, $id)
    {
        $location = Location::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string',
            'address' => 'sometimes|string',
            'type' => 'nullable|string',
            'score' => 'sometimes|integer|min:0|max:100',
            'latitude' => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
        ]);

        $location->update($validated);
        return response()->json(['data' => $location]);
    }

    /**
     * Delete a location
     */
    public function deleteLocation($id)
    {
        $location = Location::findOrFail($id);
        $location->delete();

        return response()->json(['message' => 'Location deleted successfully']);
    }

    /**
     * Get all subscription plans
     */
    public function getPlans()
    {
        $plans = SubscriptionPlan::where('is_active', true)->orderBy('sort_order')->get();
        return response()->json(['data' => $plans]);
    }

    /**
     * Create a subscription plan
     */
    public function createPlan(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string',
            'slug' => 'required|string|unique:subscription_plans',
            'price' => 'nullable|numeric|min:0',
            'billing_period' => 'sometimes|in:monthly,yearly',
            'description' => 'nullable|string',
            'features' => 'nullable|array',
            'is_active' => 'sometimes|boolean',
            'sort_order' => 'sometimes|integer',
        ]);

        $plan = SubscriptionPlan::create($validated);
        return response()->json(['data' => $plan], 201);
    }

    /**
     * Update a subscription plan
     */
    public function updatePlan(Request $request, $id)
    {
        $plan = SubscriptionPlan::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string',
            'slug' => 'sometimes|string|unique:subscription_plans,slug,' . $id,
            'price' => 'nullable|numeric|min:0',
            'billing_period' => 'sometimes|in:monthly,yearly',
            'description' => 'nullable|string',
            'features' => 'nullable|array',
            'is_active' => 'sometimes|boolean',
            'sort_order' => 'sometimes|integer',
        ]);

        $plan->update($validated);
        return response()->json(['data' => $plan]);
    }

    /**
     * Delete a subscription plan
     */
    public function deletePlan($id)
    {
        $plan = SubscriptionPlan::findOrFail($id);
        $plan->delete();

        return response()->json(['message' => 'Subscription plan deleted successfully']);
    }

    /**
     * Get all user inputs (Location Finder submissions) from MySQL.
     * When user inputs something, admin side automatically shows it.
     */
    public function getSubmissions()
    {
        $submissions = LocationFinderSubmission::with('user:id,name,email')
            ->orderByDesc('created_at')
            ->get()
            ->map(function ($s) {
                return [
                    'id' => $s->id,
                    'user_id' => $s->user_id,
                    'user_name' => $s->user?->name,
                    'user_email' => $s->user?->email,
                    'business_type' => $s->business_type,
                    'land_intent' => $s->land_intent,
                    'budget' => $s->budget,
                    'preferred_area' => $s->preferred_area,
                    'created_at' => $s->created_at?->toIso8601String(),
                ];
            });

        return response()->json(['data' => $submissions]);
    }

    /**
     * Get analytics data
     */
    public function getAnalytics()
    {
        // Return analytics data (can be expanded)
        return response()->json([
            'system_performance' => [
                ['label' => 'API Response Time', 'value' => '45ms', 'status' => 'Excellent'],
                ['label' => 'Database Load', 'value' => '23%', 'status' => 'Normal'],
                ['label' => 'Cache Hit Rate', 'value' => '94%', 'status' => 'Excellent'],
                ['label' => 'Error Rate', 'value' => '0.02%', 'status' => 'Excellent'],
            ],
            'recent_activity' => [],
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Areas (Nuwara Eliya neighbourhoods) . admin CRUD.
    //
    // After every successful write we ping FastAPI's /api/ml/refresh_areas
    // endpoint as a best-effort cache invalidation. Failures are swallowed
    // (the FastAPI 5-minute TTL is the safety net).
    // ─────────────────────────────────────────────────────────────────────

    private function refreshMlCache(): void
    {
        try {
            Http::timeout(2)->post('http://127.0.0.1:8001/api/ml/refresh_areas');
        } catch (\Throwable $e) {
            Log::info('Areas refresh ping to FastAPI failed (non-fatal): ' . $e->getMessage());
        }
    }

    public function getAreas()
    {
        $areas = Area::orderBy('id')->get();
        return response()->json(['data' => $areas]);
    }

    public function createArea(Request $request)
    {
        $validated = $request->validate([
            'name'                => 'required|string|unique:areas,name',
            'price_per_perch_lkr' => 'required|integer|min:0',
            'rent_indicative_lkr' => 'required|integer|min:0',
            'footfall_weight'     => 'required|numeric|min:0|max:1',
            'competition_weight'  => 'required|numeric|min:0|max:1',
            'latitude'            => 'nullable|numeric',
            'longitude'           => 'nullable|numeric',
            'tags'                => 'nullable|array',
            'customer_types'      => 'nullable|array',
            'best_for'            => 'nullable|array',
            'main_risk'           => 'nullable|string',
            'strategy'            => 'nullable|string',
            'recommended_action'  => 'nullable|string',
            'data_completeness'   => 'sometimes|integer|min:1|max:5',
        ]);

        $area = Area::create($validated);
        $this->refreshMlCache();
        return response()->json(['data' => $area], 201);
    }

    public function updateArea(Request $request, $id)
    {
        $area = Area::findOrFail($id);
        $validated = $request->validate([
            'name'                => 'sometimes|string|unique:areas,name,' . $id,
            'price_per_perch_lkr' => 'sometimes|integer|min:0',
            'rent_indicative_lkr' => 'sometimes|integer|min:0',
            'footfall_weight'     => 'sometimes|numeric|min:0|max:1',
            'competition_weight'  => 'sometimes|numeric|min:0|max:1',
            'latitude'            => 'nullable|numeric',
            'longitude'           => 'nullable|numeric',
            'tags'                => 'nullable|array',
            'customer_types'      => 'nullable|array',
            'best_for'            => 'nullable|array',
            'main_risk'           => 'nullable|string',
            'strategy'            => 'nullable|string',
            'recommended_action'  => 'nullable|string',
            'data_completeness'   => 'sometimes|integer|min:1|max:5',
        ]);

        $area->update($validated);
        $this->refreshMlCache();
        return response()->json(['data' => $area]);
    }

    public function deleteArea($id)
    {
        $area = Area::findOrFail($id);
        $area->delete();
        $this->refreshMlCache();
        return response()->json(['message' => 'Area deleted successfully']);
    }
}
