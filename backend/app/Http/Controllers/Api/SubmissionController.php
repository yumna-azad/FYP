<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LocationFinderSubmission;
use Illuminate\Http\Request;

class SubmissionController extends Controller
{
    /**
     * Store a user's Location Finder input.
     * Admin side reads these via MySQL; the XGBoost inference service reads only
     * the body of the API call, not this table.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'business_type'  => 'required|string|max:255',
            'land_intent'    => 'required|in:rent,purchase',
            'budget'         => 'required|integer|min:0',
            'preferred_area' => 'nullable|string|max:255',
        ]);

        $submission = LocationFinderSubmission::create([
            'user_id'        => $request->user()?->id,
            'business_type'  => $validated['business_type'],
            'land_intent'    => $validated['land_intent'],
            'budget'         => $validated['budget'],
            'preferred_area' => $validated['preferred_area'] ?? null,
        ]);

        return response()->json(['data' => $submission, 'message' => 'Submission saved'], 201);
    }
}
