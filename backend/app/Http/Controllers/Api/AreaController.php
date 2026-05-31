<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Area;

/**
 * Public read endpoint for the Nuwara Eliya neighbourhood data.
 *
 * FastAPI's ML service calls this at predict time (with a 5-minute TTL
 * cache on its side). Public so the ML service doesn't need an auth token
 * just to read reference data; admin CRUD lives on the admin controller.
 */
class AreaController extends Controller
{
    public function index()
    {
        $areas = Area::orderBy('id')->get()->map(function ($a) {
            return [
                'name'                => $a->name,
                'price_per_perch_lkr' => (int) $a->price_per_perch_lkr,
                'rent_indicative_lkr' => (int) $a->rent_indicative_lkr,
                'footfall_weight'     => (float) $a->footfall_weight,
                'competition_weight'  => (float) $a->competition_weight,
                'latitude'            => $a->latitude !== null ? (float) $a->latitude : null,
                'longitude'           => $a->longitude !== null ? (float) $a->longitude : null,
                'tags'                => $a->tags ?? [],
                'customer_types'      => $a->customer_types ?? [],
                'best_for'            => $a->best_for ?? [],
                'main_risk'           => $a->main_risk ?? '',
                'strategy'            => $a->strategy ?? '',
                'recommended_action'  => $a->recommended_action ?? '',
                'data_completeness'   => (int) $a->data_completeness,
            ];
        });

        return response()->json(['data' => $areas]);
    }
}
