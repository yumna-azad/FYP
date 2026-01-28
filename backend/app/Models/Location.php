<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Location extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'address',
        'type',
        'score',
        'latitude',
        'longitude',
    ];

    protected $casts = [
        'score' => 'integer',
        'latitude' => 'decimal:8',
        'longitude' => 'decimal:8',
    ];
}
