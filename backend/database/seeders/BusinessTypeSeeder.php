<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\BusinessType;

class BusinessTypeSeeder extends Seeder
{
    public function run(): void
    {
        $types = [
            ['name' => 'Cafe', 'count' => 164, 'growth' => '+12%'],
            ['name' => 'Hotel', 'count' => 1014, 'growth' => '+8%'],
            ['name' => 'Restaurant', 'count' => 163, 'growth' => '+10%'],
            ['name' => 'Retail Shop', 'count' => 97, 'growth' => '+5%'],
            ['name' => 'Wellness Center', 'count' => 70, 'growth' => '+15%'],
        ];

        foreach ($types as $type) {
            BusinessType::updateOrCreate(
                ['name' => $type['name']],
                $type
            );
        }
    }
}
