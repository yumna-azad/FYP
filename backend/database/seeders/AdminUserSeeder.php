<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'yumna@smartloc.lk'],
            [
                'name' => 'Yumna',
                'password' => Hash::make('123456'),
                'role' => 'admin',
            ]
        );
    }
}
