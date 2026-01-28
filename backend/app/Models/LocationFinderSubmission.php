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
        'proximity',
        'traffic',
        'competition',
        'internet_coverage',
        'land_intent',
        'amount',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
