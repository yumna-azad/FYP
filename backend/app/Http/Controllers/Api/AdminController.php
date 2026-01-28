<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\BusinessType;
use App\Models\Location;
use App\Models\SubscriptionPlan;
use App\Models\LocationFinderSubmission;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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

        // Active sessions (mock - replace with actual session tracking)
        $activeSessions = DB::table('sessions')
            ->where('last_activity', '>=', now()->subMinutes(30)->timestamp)
            ->count();
        $sessionsLastMonth = 0; // Mock
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
                'subscription_plan_id' => $user->subscription_plan_id,
                'status' => $user->status ?? 'Active',
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
            'subscription_plan_id' => 'nullable|exists:subscription_plans,id',
            'status' => 'in:Active,Inactive',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => bcrypt('password'), // Set default password
            'subscription_plan_id' => $validated['subscription_plan_id'] ?? null,
            'status' => $validated['status'] ?? 'Active',
            'role' => 'Location planner',
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
            'subscription_plan_id' => 'nullable|exists:subscription_plans,id',
            'status' => 'sometimes|in:Active,Inactive',
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
                    'proximity' => $s->proximity,
                    'traffic' => $s->traffic,
                    'competition' => $s->competition,
                    'internet_coverage' => $s->internet_coverage,
                    'land_intent' => $s->land_intent,
                    'amount' => $s->amount,
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
}
