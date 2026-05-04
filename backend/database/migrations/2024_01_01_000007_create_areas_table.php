<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Nuwara Eliya neighbourhood data - moved out of features.py constants so
 * lecturers / admins can edit it through the admin panel and have FastAPI
 * pick up the changes without redeploying the ML service.
 *
 * Schema mirrors NUWARA_ELIYA_AREAS in backend/ml/features.py exactly. The
 * AreaSeeder backfills the 12 known areas; admins can add or modify rows
 * later. FastAPI fetches /api/areas with a 5-minute TTL cache.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('areas', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();

            // Real-estate signals
            $table->unsignedBigInteger('price_per_perch_lkr')->default(0);
            $table->unsignedBigInteger('rent_indicative_lkr')->default(0);

            // Demand / competition signals (0..1 scaled weights)
            $table->decimal('footfall_weight', 4, 2)->default(0.50);
            $table->decimal('competition_weight', 4, 2)->default(0.50);

            // Map coordinates (optional, used for the Leaflet pins)
            $table->decimal('latitude', 10, 8)->nullable();
            $table->decimal('longitude', 11, 8)->nullable();

            // Free-text descriptors and SME-advisory data (json arrays / strings)
            $table->json('tags')->nullable();
            $table->json('customer_types')->nullable();
            $table->json('best_for')->nullable();
            $table->text('main_risk')->nullable();
            $table->text('strategy')->nullable();
            $table->text('recommended_action')->nullable();

            // Confidence proxy (1..5). Drives the per-card "Confidence" label.
            $table->unsignedTinyInteger('data_completeness')->default(3);

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('areas');
    }
};
