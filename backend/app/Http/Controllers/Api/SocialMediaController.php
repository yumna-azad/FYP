<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SocialMediaSetting;
use Illuminate\Http\Request;

class SocialMediaController extends Controller
{
    /**
     * Get social media links (public endpoint)
     */
    public function getSocialMedia()
    {
        try {
            // Try to fetch from database
            $settings = SocialMediaSetting::where('is_active', true)
                ->orderBy('sort_order')
                ->get();

            if ($settings->isEmpty()) {
                // Fallback to env/defaults
                return response()->json([
                    'data' => [
                        'instagram' => env('SOCIAL_INSTAGRAM', 'https://instagram.com/smartloc'),
                        'twitter' => env('SOCIAL_TWITTER', 'https://twitter.com/smartloc'),
                        'facebook' => env('SOCIAL_FACEBOOK', 'https://facebook.com/smartloc'),
                        'whatsapp' => env('SOCIAL_WHATSAPP', '0705292183'),
                        'phone' => env('CONTACT_PHONE', '+94 52 222 1234'),
                    ],
                ]);
            }

            // Format response from database
            $data = [];
            foreach ($settings as $setting) {
                if ($setting->platform === 'whatsapp' || $setting->platform === 'phone') {
                    $data[$setting->platform] = $setting->value ?? ($setting->platform === 'whatsapp' ? '0705292183' : '+94 52 222 1234');
                } else {
                    $data[$setting->platform] = $setting->url ?? '';
                }
            }

            return response()->json(['data' => $data]);
        } catch (\Exception $e) {
            // Fallback if database table doesn't exist yet
            return response()->json([
                'data' => [
                    'instagram' => env('SOCIAL_INSTAGRAM', 'https://instagram.com/smartloc'),
                    'twitter' => env('SOCIAL_TWITTER', 'https://twitter.com/smartloc'),
                    'facebook' => env('SOCIAL_FACEBOOK', 'https://facebook.com/smartloc'),
                    'whatsapp' => env('SOCIAL_WHATSAPP', '0705292183'),
                    'phone' => env('CONTACT_PHONE', '+94 52 222 1234'),
                ],
            ]);
        }
    }

    /**
     * Update social media links (admin only)
     */
    public function updateSocialMedia(Request $request)
    {
        $validated = $request->validate([
            'instagram' => 'sometimes|url',
            'twitter' => 'sometimes|url',
            'facebook' => 'sometimes|url',
            'whatsapp' => 'sometimes|string',
            'phone' => 'sometimes|string',
        ]);

        foreach ($validated as $platform => $value) {
            $setting = SocialMediaSetting::where('platform', $platform)->first();
            
            if ($setting) {
                if ($platform === 'whatsapp' || $platform === 'phone') {
                    $setting->update(['value' => $value]);
                } else {
                    $setting->update(['url' => $value]);
                }
            } else {
                // Create new setting
                SocialMediaSetting::create([
                    'platform' => $platform,
                    'url' => ($platform !== 'whatsapp' && $platform !== 'phone') ? $value : null,
                    'value' => ($platform === 'whatsapp' || $platform === 'phone') ? $value : null,
                    'is_active' => true,
                ]);
            }
        }

        return response()->json([
            'message' => 'Social media links updated successfully',
            'data' => $this->getSocialMedia()->getData()->data,
        ]);
    }
}
