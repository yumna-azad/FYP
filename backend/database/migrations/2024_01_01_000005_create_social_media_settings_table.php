<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('social_media_settings', function (Blueprint $table) {
            $table->id();
            $table->string('platform')->unique(); // instagram, twitter, facebook, whatsapp
            $table->string('url')->nullable(); // URL for social media platforms
            $table->string('value')->nullable(); // Phone number for WhatsApp
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });

        // Insert default values
        DB::table('social_media_settings')->insert([
            [
                'platform' => 'instagram',
                'url' => 'https://instagram.com/smartloc',
                'value' => null,
                'is_active' => true,
                'sort_order' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'platform' => 'twitter',
                'url' => 'https://twitter.com/smartloc',
                'value' => null,
                'is_active' => true,
                'sort_order' => 2,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'platform' => 'facebook',
                'url' => 'https://facebook.com/smartloc',
                'value' => null,
                'is_active' => true,
                'sort_order' => 3,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'platform' => 'whatsapp',
                'url' => null,
                'value' => '0705292183',
                'is_active' => true,
                'sort_order' => 4,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'platform' => 'phone',
                'url' => null,
                'value' => '+94 52 222 1234',
                'is_active' => true,
                'sort_order' => 5,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('social_media_settings');
    }
};
