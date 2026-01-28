<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Stores user inputs from the Location Finder so admin can see them.
     */
    public function up(): void
    {
        Schema::create('location_finder_submissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('business_type');
            $table->string('proximity');
            $table->string('traffic');
            $table->string('competition');
            $table->string('internet_coverage');
            $table->string('land_intent'); // rent | purchase
            $table->string('amount');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('location_finder_submissions');
    }
};
