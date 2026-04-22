<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Simplified submissions schema matching the current Dashboard form:
     *   Business Type (required) · Land (rent/purchase) · Budget (LKR) · Preferred Area (optional)
     */
    public function up(): void
    {
        Schema::create('location_finder_submissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('business_type');
            $table->string('land_intent'); // rent | purchase
            $table->unsignedBigInteger('budget');
            $table->string('preferred_area')->nullable();
            $table->timestamps();

            $table->index('user_id');
            $table->index(['business_type', 'land_intent']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('location_finder_submissions');
    }
};
