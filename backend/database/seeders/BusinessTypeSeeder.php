<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\BusinessType;

class BusinessTypeSeeder extends Seeder
{
    public function run(): void
    {
        $types = [
            ['name' => 'Cafe', 'slug' => 'cafe', 'competition_count' => 164],
            ['name' => 'Hotel', 'slug' => 'hotel', 'competition_count' => 1014],
            ['name' => 'Restaurant', 'slug' => 'restaurant', 'competition_count' => 163],
            ['name' => 'Retail Shop', 'slug' => 'retail', 'competition_count' => 97],
            ['name' => 'Wellness Center', 'slug' => 'wellness', 'competition_count' => 70],
        ];

        foreach ($types as $type) {
            BusinessType::updateOrCreate(
                ['slug' => $type['slug']],
                $type
            );
        }
    }
}
