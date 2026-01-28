<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LocationFinderSubmission;
use Illuminate\Http\Request;

class SubmissionController extends Controller
{
    /**
     * Store a user's Location Finder input (from dashboard).
     * When user has input something, admin side automatically shows it via MySQL.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'business_type' => 'required|string|max:255',
            'proximity' => 'required|string|max:255',
            'traffic' => 'required|string|max:255',
            'competition' => 'required|string|max:255',
            'internet_coverage' => 'required|string|max:255',
            'land_intent' => 'required|in:rent,purchase',
            'amount' => 'required|string|max:50',
        ]);

        $submission = LocationFinderSubmission::create([
            'user_id' => $request->user()?->id,
            'business_type' => $validated['business_type'],
            'proximity' => $validated['proximity'],
            'traffic' => $validated['traffic'],
            'competition' => $validated['competition'],
            'internet_coverage' => $validated['internet_coverage'],
            'land_intent' => $validated['land_intent'],
            'amount' => $validated['amount'],
        ]);

        return response()->json(['data' => $submission, 'message' => 'Submission saved'], 201);
    }
}
