<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LocationFinderSubmission extends Model
{
    use HasFactory;

    protected $table = 'location_finder_submissions';

    protected $fillable = [
        'user_id',
        'business_type',
        'land_intent',
        'budget',
        'preferred_area',
    ];

    protected $casts = [
        'budget' => 'integer',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
