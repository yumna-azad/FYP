<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\SubscriptionPlan;

class SubscriptionPlanSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $plans = [
            [
                'name' => 'Free',
                'slug' => 'free',
                'price' => null,
                'billing_period' => 'monthly',
                'description' => 'Basic features for getting started',
                'features' => ['3 free analyses', 'Basic recommendations'],
                'is_active' => true,
                'sort_order' => 1,
            ],
            [
                'name' => 'Pro',
                'slug' => 'pro',
                'price' => 9.99,
                'billing_period' => 'monthly',
                'description' => 'Unlimited analyses and advanced features',
                'features' => ['Unlimited analyses', 'Advanced recommendations', 'Priority support'],
                'is_active' => true,
                'sort_order' => 2,
            ],
            [
                'name' => 'Enterprise',
                'slug' => 'enterprise',
                'price' => 29.99,
                'billing_period' => 'monthly',
                'description' => 'Full access with custom features',
                'features' => ['Everything in Pro', 'Custom integrations', 'Dedicated support'],
                'is_active' => true,
                'sort_order' => 3,
            ],
        ];

        foreach ($plans as $plan) {
            SubscriptionPlan::create($plan);
        }
    }
}
