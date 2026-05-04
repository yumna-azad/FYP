<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Nuwara Eliya neighbourhood. Mirrors the structure FastAPI expects so the
 * ML service can fetch this list at predict time and use it as input to
 * the per-area XGBoost feature substitution.
 */
class Area extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'price_per_perch_lkr',
        'rent_indicative_lkr',
        'footfall_weight',
        'competition_weight',
        'latitude',
        'longitude',
        'tags',
        'customer_types',
        'best_for',
        'main_risk',
        'strategy',
        'recommended_action',
        'data_completeness',
    ];

    protected $casts = [
        'price_per_perch_lkr' => 'integer',
        'rent_indicative_lkr' => 'integer',
        'footfall_weight'     => 'float',
        'competition_weight'  => 'float',
        'latitude'            => 'decimal:8',
        'longitude'           => 'decimal:8',
        'tags'                => 'array',
        'customer_types'      => 'array',
        'best_for'            => 'array',
        'data_completeness'   => 'integer',
    ];
}
