<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Area;

/**
 * Seeds the 12 Nuwara Eliya neighbourhoods. Strings mirror the clean
 * plain English version in backend/ml/features.py: NUWARA_ELIYA_AREAS.
 * No dashes, em dashes, hyphens or non ASCII letters in any user facing
 * field. FastAPI prefers the DB version when reachable; features.py is
 * a fallback when Laravel is offline.
 */
class AreaSeeder extends Seeder
{
    public function run(): void
    {
        $areas = [
            [
                'name' => 'Town Centre',
                'price_per_perch_lkr' => 3_000_000, 'rent_indicative_lkr' => 110_000,
                'footfall_weight' => 0.95, 'competition_weight' => 0.95,
                'latitude' => 6.9497, 'longitude' => 80.7891,
                'tags' => ['high traffic', 'near bus stand'],
                'customer_types' => ['tourists', 'local workers', 'students', 'daily shoppers'],
                'best_for' => ['cafe', 'bakery', 'retail shop', 'small restaurant'],
                'main_risk' => 'High competition and rent pressure.',
                'strategy' => 'Use strong branding, visible signage, fast service, and Google Maps presence to stand out among many similar businesses.',
                'recommended_action' => 'Visit during morning, afternoon, evening, and weekend peak hours before signing a lease.',
                'data_completeness' => 5,
            ],
            [
                'name' => 'Gregory Lake Front',
                'price_per_perch_lkr' => 8_000_000, 'rent_indicative_lkr' => 220_000,
                'footfall_weight' => 1.00, 'competition_weight' => 0.70,
                'latitude' => 6.9571, 'longitude' => 80.7827,
                'tags' => ['tourist hub', 'premium'],
                'customer_types' => ['tourists', 'families', 'weekend visitors', 'couples'],
                'best_for' => ['cafe', 'souvenir shop', 'juice bar', 'boutique restaurant'],
                'main_risk' => 'Seasonal demand swings and premium rent.',
                'strategy' => 'Focus on tourist friendly products, photogenic presentation, and seasonal promotions tied to holiday peaks.',
                'recommended_action' => 'Compare visitor flow during peak months (April, August, December) and quiet weekdays before committing.',
                'data_completeness' => 5,
            ],
            [
                'name' => 'Hakgala Road',
                'price_per_perch_lkr' => 1_500_000, 'rent_indicative_lkr' => 80_000,
                'footfall_weight' => 0.65, 'competition_weight' => 0.40,
                'latitude' => 6.9405, 'longitude' => 80.8080,
                'tags' => ['tourist corridor', 'tea estate views'],
                'customer_types' => ['tourists in transit', 'day trippers', 'tea estate visitors'],
                'best_for' => ['roadside cafe', 'souvenir stall', 'viewing deck restaurant'],
                'main_risk' => 'Traffic dependent. Quiet outside tourism hours.',
                'strategy' => 'Position on the tourist circuit. Partner with tour operators and emphasise the scenic stop over experience.',
                'recommended_action' => 'Track vehicle counts at different times of day before choosing a roadside location.',
                'data_completeness' => 4,
            ],
            [
                'name' => 'Pedro Hill Club Area',
                'price_per_perch_lkr' => 2_000_000, 'rent_indicative_lkr' => 95_000,
                'footfall_weight' => 0.60, 'competition_weight' => 0.55,
                'latitude' => 6.9350, 'longitude' => 80.8200,
                'tags' => ['heritage', 'upscale'],
                'customer_types' => ['tourists', 'upscale residents', 'heritage enthusiasts'],
                'best_for' => ['boutique cafe', 'fine dining', 'antiques shop', 'wellness centre'],
                'main_risk' => 'Heritage zone restrictions limit signage and renovations.',
                'strategy' => 'Lean into the heritage character. Choose quality over quantity, and respect zoning rules in any signage or fit out.',
                'recommended_action' => 'Confirm UDA heritage zone restrictions on signage and exterior modifications before renting.',
                'data_completeness' => 4,
            ],
            [
                'name' => 'Nanu Oya',
                'price_per_perch_lkr' => 800_000, 'rent_indicative_lkr' => 45_000,
                'footfall_weight' => 0.50, 'competition_weight' => 0.30,
                'latitude' => 6.9360, 'longitude' => 80.7530,
                'tags' => ['train station', 'transit'],
                'customer_types' => ['travellers', 'transport users', 'nearby residents'],
                'best_for' => ['grocery shop', 'small food shop', 'transit friendly snack bar'],
                'main_risk' => 'Lower spend per customer compared to central areas.',
                'strategy' => 'Volume strategy with affordable pricing, quick service, and a focus on repeat local and transit customers.',
                'recommended_action' => 'Observe railway and bus passenger movement at peak departure times before choosing the exact location.',
                'data_completeness' => 4,
            ],
            [
                'name' => 'Ambewela',
                'price_per_perch_lkr' => 500_000, 'rent_indicative_lkr' => 30_000,
                'footfall_weight' => 0.35, 'competition_weight' => 0.15,
                'latitude' => 6.8680, 'longitude' => 80.7910,
                'tags' => ['rural scenic', 'dairy'],
                'customer_types' => ['agritourists', 'day trippers', 'school groups'],
                'best_for' => ['farm themed cafe', 'dairy products', 'agritourism experience'],
                'main_risk' => 'Very low walk in demand outside group visits.',
                'strategy' => 'Niche agritourism positioning. Partner with farm tours and emphasise the unique countryside experience.',
                'recommended_action' => 'Build relationships with local dairy farms and tour operators before opening. Relying on walk in customers alone is risky.',
                'data_completeness' => 3,
            ],
            [
                'name' => 'Kandapola',
                'price_per_perch_lkr' => 700_000, 'rent_indicative_lkr' => 40_000,
                'footfall_weight' => 0.40, 'competition_weight' => 0.20,
                'latitude' => 6.9680, 'longitude' => 80.8120,
                'tags' => ['tea country', 'niche tourism'],
                'customer_types' => ['tea tourism visitors', 'honeymooners', 'boutique stay guests'],
                'best_for' => ['boutique guesthouse cafe', 'tea tasting experience', 'small wellness centre'],
                'main_risk' => 'Highly seasonal. Demand collapses outside peak months.',
                'strategy' => 'Premium niche play with high margin per visit and low volume. Brand around tea country exclusivity.',
                'recommended_action' => 'Plan cash flow for a 4 month peak and 8 month quiet pattern before committing.',
                'data_completeness' => 3,
            ],
            [
                'name' => 'Glencairn',
                'price_per_perch_lkr' => 550_000, 'rent_indicative_lkr' => 35_000,
                'footfall_weight' => 0.30, 'competition_weight' => 0.15,
                'latitude' => 6.9180, 'longitude' => 80.8000,
                'tags' => ['rural', 'budget'],
                'customer_types' => ['local residents', 'occasional travellers'],
                'best_for' => ['essentials shop', 'small grocery', 'low cost services'],
                'main_risk' => 'Limited customer base. Mostly local residents only.',
                'strategy' => 'Serve daily essentials at affordable prices to build a loyal local customer base.',
                'recommended_action' => 'Survey nearby households about what they currently travel to Town Centre to buy, then fill that gap.',
                'data_completeness' => 2,
            ],
            [
                'name' => 'Hawa Eliya',
                'price_per_perch_lkr' => 1_650_000, 'rent_indicative_lkr' => 70_000,
                'footfall_weight' => 0.55, 'competition_weight' => 0.35,
                'latitude' => 6.9620, 'longitude' => 80.7830,
                'tags' => ['residential growth'],
                'customer_types' => ['new residents', 'young families', 'commuters'],
                'best_for' => ['neighbourhood grocery', 'casual dining', 'kids friendly cafe'],
                'main_risk' => 'Demand still ramping up. Early mover risk.',
                'strategy' => 'Target growing residential demand. Build relationships with new build apartments and housing developments.',
                'recommended_action' => 'Check upcoming residential construction permits in the area before estimating future demand.',
                'data_completeness' => 3,
            ],
            [
                'name' => 'Lovers Leap',
                'price_per_perch_lkr' => 1_200_000, 'rent_indicative_lkr' => 60_000,
                'footfall_weight' => 0.45, 'competition_weight' => 0.25,
                'latitude' => 6.9730, 'longitude' => 80.7925,
                'tags' => ['waterfall tourism'],
                'customer_types' => ['tourists', 'couples', 'trekkers'],
                'best_for' => ['viewing point cafe', 'souvenir stall', 'snack kiosk'],
                'main_risk' => 'Single attraction traffic. Visitors arrive, take photos, and leave quickly.',
                'strategy' => 'Quick serve grab and go format. Capture short visits with high margin small purchases.',
                'recommended_action' => 'Time the average visitor stay before sizing the kitchen or seating area.',
                'data_completeness' => 3,
            ],
            [
                'name' => 'Seetha Eliya',
                'price_per_perch_lkr' => 900_000, 'rent_indicative_lkr' => 50_000,
                'footfall_weight' => 0.40, 'competition_weight' => 0.20,
                'latitude' => 6.9170, 'longitude' => 80.8090,
                'tags' => ['temple tourism'],
                'customer_types' => ['pilgrims', 'religious tour groups', 'Indian tourists'],
                'best_for' => ['vegetarian restaurant', 'religious souvenir shop', 'rest stop'],
                'main_risk' => 'Niche audience tied to temple visits.',
                'strategy' => 'Religious tourism positioning with vegetarian only or pure veg offerings and multi language signage.',
                'recommended_action' => 'Coordinate with temple authorities on visitor schedules and acceptable signage near the site.',
                'data_completeness' => 3,
            ],
            [
                'name' => 'Tea estates belt',
                'price_per_perch_lkr' => 400_000, 'rent_indicative_lkr' => 25_000,
                'footfall_weight' => 0.30, 'competition_weight' => 0.10,
                'latitude' => 6.9000, 'longitude' => 80.8200,
                'tags' => ['tea estate', 'remote'],
                'customer_types' => ['tea workers', 'estate visitors', 'small day trip groups'],
                'best_for' => ['tea tasting venue', 'estate stay cafe', 'homestay'],
                'main_risk' => 'Very low walk in demand. Access can be difficult in monsoon.',
                'strategy' => 'Booking only model. Partner with estates and tour operators for guaranteed group visits.',
                'recommended_action' => 'Verify road access and reliability during monsoon months before committing.',
                'data_completeness' => 2,
            ],
        ];

        // updateOrCreate matches by name. Old rows whose name changed (e.g.
        // "Town Centre / Main Street" -> "Town Centre") will leave stale rows
        // in the table; the migrate:fresh path is safest.
        foreach ($areas as $a) {
            Area::updateOrCreate(['name' => $a['name']], $a);
        }
    }
}
