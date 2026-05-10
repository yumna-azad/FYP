<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

/**
 * Live property listings — scraped from ikman.lk's public search results.
 *
 * Cached for 1 hour to be polite to ikman.lk and to keep responses snappy.
 * Returns at most 6 listings per request. The frontend always shows the
 * search URL too so users can see all current listings on ikman.lk if they
 * want more than what we display.
 */
class ListingsController extends Controller
{
    public function index(Request $request)
    {
        $area = trim((string) $request->query('area', ''));
        $intent = $request->query('intent') === 'purchase' ? 'sale' : 'rent';
        $budget = (float) $request->query('budget', 0);
        $businessType = trim((string) $request->query('business_type', ''));
        $areaSpecific = $request->query('area_specific') === '1';
        if (!$area) {
            return response()->json([
                'listings' => [],
                'source' => null,
                'live' => false,
                'message' => 'area query parameter is required',
            ], 422);
        }

        $cacheKey = 'listings.' . md5($area . '|' . $intent . '|' . $budget . '|' . $businessType . '|' . ($areaSpecific ? '1' : '0'));
        $payload = Cache::remember($cacheKey, 3600, function () use ($area, $intent, $budget, $businessType, $areaSpecific) {
            $result = $this->fetchFromIkman($area, $intent, $budget, $businessType);

            // Tri-state availability detection for the per-card banner.
            //   GREEN  : area-specific listings WITHIN budget exist
            //   AMBER  : area-specific listings exist but ALL above budget
            //   RED    : no listings whose title mentions this area at all
            if ($areaSpecific) {
                $fullPool = $result['_full_pool'] ?? [];
                $allInArea = $this->filterByAreaInTitle($fullPool, $area);
                $result['area_total_any_budget'] = count($allInArea);
                if (count($allInArea) > 0) {
                    $prices = array_filter(array_map(fn($L) => $this->parsePriceLkr($L['price'] ?? null), $allInArea));
                    if (count($prices) > 0) {
                        $result['area_min_price_lkr'] = min($prices);
                        $result['area_max_price_lkr'] = max($prices);
                    }
                }

                // Filter the (already budget-filtered) listings by area-in-title.
                if (!empty($result['listings']) && ($result['broadened'] ?? false)) {
                    $filtered = $this->filterByAreaInTitle($result['listings'], $area);
                    $result['area_filtered_count'] = count($filtered);
                    if (count($filtered) > 0) {
                        $result['listings'] = $filtered;
                        $result['count'] = count($filtered);
                        $result['area_match'] = true;
                    } else {
                        $result['listings'] = [];
                        $result['count'] = 0;
                        $result['area_match'] = false;
                    }
                }

                // Always also surface a broader Nuwara Eliya commercial pool
                // (no area filter, no budget filter) so even a RED card shows
                // the user that properties for their business type DO exist
                // somewhere in the city. Capped at 6 for display.
                $broaderPool = $fullPool ?? [];
                $broaderPool = array_slice($broaderPool, 0, 6);
                $result['broader_pool'] = $broaderPool;
                $result['broader_pool_total'] = count($fullPool ?? []);
            }
            // Strip the internal _full_pool before returning to the client.
            unset($result['_full_pool']);
            return $result;
        });
        return response()->json($payload);
    }

    /**
     * Known aliases per Nuwara Eliya area for title-text matching. Listings
     * on ikman.lk often don't use the formal area name in their titles, so
     * we accept a broader set of identifying keywords per neighbourhood.
     */
    private function areaAliases(string $area): array
    {
        $key = strtolower(trim($area));
        $map = [
            'town centre' => ['town centre', 'town center', 'main street', 'town', 'central'],
            'town centre / main street' => ['town centre', 'town center', 'main street', 'town'],
            'gregory lake front' => ['gregory', 'lake gregory', 'lake front', 'lakefront', 'lake'],
            'hakgala road' => ['hakgala'],
            'pedro / hill club area' => ['pedro', 'hill club'],
            'pedro' => ['pedro', 'hill club'],
            'nanu oya' => ['nanu oya', 'nanuoya'],
            'ambewela' => ['ambewela'],
            'kandapola' => ['kandapola'],
            'glencairn' => ['glencairn'],
            'hawa eliya' => ['hawa eliya', 'hawaeliya'],
            'lover\'s leap' => ['lover', 'lovers leap', 'leap'],
            'lovers leap' => ['lover', 'lovers leap', 'leap'],
            'seetha eliya' => ['seetha', 'sita eliya', 'sitha eliya'],
            'tea estates belt' => ['tea estate', 'tea-estate', 'estate'],
        ];
        if (isset($map[$key])) {
            return $map[$key];
        }
        // Fallback: split the area name on punctuation/whitespace and use the tokens
        $tokens = preg_split('/[\s\/,\-]+/', $key);
        $tokens = array_filter($tokens, fn($t) => strlen($t) >= 3);
        return array_values($tokens);
    }

    private function filterByAreaInTitle(array $listings, string $area): array
    {
        $aliases = $this->areaAliases($area);
        if (empty($aliases)) return $listings;

        $matches = [];
        foreach ($listings as $L) {
            $title = strtolower($L['title'] ?? '');
            foreach ($aliases as $alias) {
                if ($alias && str_contains($title, $alias)) {
                    $matches[] = $L;
                    break;
                }
            }
        }
        return $matches;
    }

    private function fetchFromIkman(string $area, string $intent, float $budget, string $businessType): array
    {
        $verb = $intent === 'sale' ? 'sale' : 'rent';

        // ikman.lk dedicated commercial categories — these exclude residential
        // bungalows / rooms / annexes by construction, so the listings are
        // already business-suitable. We hit these FIRST.
        $commercialCategoryPath = $intent === 'sale'
            ? '/en/ads/sri-lanka/commercial-properties-for-sale'
            : '/en/ads/sri-lanka/commercial-property-rentals';

        $bizHint = $this->businessSearchHint($businessType);
        $areaWithNE = $this->withNuwaraEliya($area);

        // Priority list of (path, query) pairs. Earlier entries are more
        // specific; later entries are progressively broader fallbacks.
        $attempts = [];
        // 1) Commercial category + area + Nuwara Eliya
        $attempts[] = [$commercialCategoryPath, $areaWithNE];
        // 2) Commercial category + Nuwara Eliya only (when area-specific is too narrow)
        $attempts[] = [$commercialCategoryPath, 'Nuwara Eliya'];
        // 3) Commercial category, no query (whole NE area in this category)
        $attempts[] = [$commercialCategoryPath, ''];
        // 4) Generic property category with business-type bias (fallback when
        //    commercial category is empty for the area, e.g. retail rentals).
        if ($bizHint) {
            $attempts[] = ['/en/ads/sri-lanka/property', "$areaWithNE $bizHint $verb"];
            $attempts[] = ['/en/ads/sri-lanka/property', "Nuwara Eliya $bizHint $verb"];
        }
        // 5) Generic property category broad fallback
        $attempts[] = ['/en/ads/sri-lanka/property', "Nuwara Eliya $verb"];

        $lastUrl = '';
        try {
            foreach ($attempts as $i => [$path, $q]) {
                $url = 'https://ikman.lk' . $path . ($q !== '' ? '?query=' . urlencode($q) : '');
                $lastUrl = $url;

                $html = $this->httpFetch($url, 8);
                if ($html === null) {
                    continue;
                }
                $allListings = $this->parseIkmanListings($html);
                // Drop residential-only titles (bungalow/villa/room/annex) for
                // non-hotel business types — they're not realistic SME spaces.
                $allListings = $this->dropResidentialIfBusiness($allListings, $businessType);
                if (count($allListings) === 0) {
                    continue;
                }

                [$filtered, $budgetWidth] = $this->budgetFilter($allListings, $budget);

                return [
                    'listings' => array_slice($filtered, 0, 6),
                    // _full_pool is the unfiltered pool (pre-budget, pre-cap)
                    // for downstream area-in-title scanning. Stripped from
                    // the JSON response before sending to the client.
                    '_full_pool' => $allListings,
                    'source' => 'ikman.lk',
                    'live' => true,
                    'search_url' => $url,
                    'query' => $q,
                    'category' => str_contains($path, 'commercial') ? 'commercial' : 'general',
                    'broadened' => $i > 0,
                    'fetched_at' => now()->toIso8601String(),
                    'count' => count($filtered),
                    'total_before_budget_filter' => count($allListings),
                    'budget_filter' => $budgetWidth,
                    'user_budget_lkr' => $budget > 0 ? (int) $budget : null,
                ];
            }
            return $this->errorPayload($lastUrl, 'no_results');
        } catch (\Throwable $e) {
            return $this->errorPayload($lastUrl, $e->getMessage());
        }
    }

    /**
     * For non-hotel commercial businesses (cafe, restaurant, retail, wellness),
     * drop listings whose titles scream "residential only" — bungalow, villa,
     * room, annex, holiday. Hotel buyers actually want these, so leave them
     * alone for hotel business type.
     */
    private function dropResidentialIfBusiness(array $listings, string $businessType): array
    {
        $key = strtolower(trim(str_replace('_', ' ', $businessType)));
        if ($key === '' || $key === 'hotel') {
            return $listings;
        }
        $blocked = '/\b(bungalow|villa|holiday|annex|room|guest|guesthouse|cabana)\b/i';
        $kept = array_filter($listings, fn($L) => !preg_match($blocked, $L['title'] ?? ''));
        // If filter removes everything, return original — better to show
        // something with honest framing than nothing at all.
        return count($kept) > 0 ? array_values($kept) : $listings;
    }

    private function withNuwaraEliya(string $area): string
    {
        return stripos($area, 'nuwara eliya') !== false ? $area : "$area Nuwara Eliya";
    }

    /**
     * Map a SmartLoc business type to an ikman.lk-friendly search hint
     * that biases toward commercial / business-suitable listings.
     */
    private function businessSearchHint(string $businessType): string
    {
        $key = strtolower(trim(str_replace('_', ' ', $businessType)));
        return match (true) {
            $key === 'cafe' || $key === 'restaurant' => 'commercial shop',
            $key === 'retail shop' => 'commercial shop',
            $key === 'wellness center' => 'commercial',
            $key === 'hotel' => 'hotel',
            $key !== ''                                => 'commercial',
            default                                     => '',
        };
    }

    /**
     * Filter listings by the user's budget. Tiered fallback so the user
     * always sees something:
     *   - 'tight': within +/-50% of budget
     *   - 'wide' : within budget*0.25 to budget*2.0
     *   - 'none' : budget unknown or no priced listings; return all
     * Returns [listings, widthLabel].
     */
    private function budgetFilter(array $listings, float $budget): array
    {
        if ($budget <= 0) {
            return [$listings, 'none'];
        }

        $withPrice = [];
        foreach ($listings as $L) {
            $p = $this->parsePriceLkr($L['price'] ?? null);
            if ($p !== null) {
                $L['price_lkr'] = $p;
                $withPrice[] = $L;
            }
        }

        if (count($withPrice) === 0) {
            return [$listings, 'none'];
        }

        // Tier 1: tight band, +/- 50%
        $tightLow = $budget * 0.5;
        $tightHigh = $budget * 1.5;
        $tight = array_filter($withPrice, fn($L) => $L['price_lkr'] >= $tightLow && $L['price_lkr'] <= $tightHigh);
        if (count($tight) > 0) {
            return [array_values($tight), 'tight'];
        }

        // Tier 2: wide band, 0.25x .. 2x
        $wideLow = $budget * 0.25;
        $wideHigh = $budget * 2.0;
        $wide = array_filter($withPrice, fn($L) => $L['price_lkr'] >= $wideLow && $L['price_lkr'] <= $wideHigh);
        if (count($wide) > 0) {
            return [array_values($wide), 'wide'];
        }

        // Nothing matched the budget — return everything (with prices first)
        return [array_merge($withPrice, array_values(array_diff_key($listings, $withPrice))), 'none'];
    }

    private function parsePriceLkr(?string $priceStr): ?int
    {
        if (!$priceStr) return null;
        if (!preg_match('/[\d,]+/', $priceStr, $m)) return null;
        $clean = (int) str_replace(',', '', $m[0]);
        return $clean > 0 ? $clean : null;
    }

    /**
     * Plain cURL fetch — avoids the Guzzle dependency. Returns body string
     * on 2xx, null otherwise.
     */
    private function httpFetch(string $url, int $timeoutSeconds): ?string
    {
        if (!function_exists('curl_init')) {
            return null;
        }
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_TIMEOUT => $timeoutSeconds,
            CURLOPT_CONNECTTIMEOUT => 4,
            CURLOPT_SSL_VERIFYPEER => false, // dev only; prod should pin a CA bundle
            CURLOPT_HTTPHEADER => [
                'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language: en-US,en;q=0.9',
            ],
        ]);
        $body = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($body === false || $code < 200 || $code >= 300) {
            return null;
        }
        return $body;
    }

    private function errorPayload(string $url, string $reason): array
    {
        return [
            'listings' => [],
            'source' => 'ikman.lk',
            'live' => false,
            'search_url' => $url,
            'error' => $reason,
            'fetched_at' => now()->toIso8601String(),
        ];
    }

    private function parseIkmanListings(string $html): array
    {
        $listings = [];
        $seen = [];

        // Anchors look like:
        //   <a href="/en/ad/<slug>" title="Title here" ...>
        if (!preg_match_all(
            '/href="(\/en\/ad\/[^"]+)"[^>]*title="([^"]+)"/',
            $html,
            $matches,
            PREG_OFFSET_CAPTURE
        )) {
            return [];
        }

        foreach ($matches[1] as $i => $hrefMatch) {
            $href = $hrefMatch[0];
            $offset = $hrefMatch[1];
            $title = html_entity_decode($matches[2][$i][0], ENT_QUOTES, 'UTF-8');
            $url = 'https://ikman.lk' . $href;

            // Dedupe by URL (same listing often appears twice)
            if (isset($seen[$url])) {
                continue;
            }
            $seen[$url] = true;

            // Look in a 2500-char window around the anchor for price + image
            $window = substr($html, max(0, $offset - 200), 2500);

            $price = null;
            if (preg_match('/Rs\s*([\d,]+)/', $window, $pm)) {
                $price = 'Rs ' . $pm[1];
            }

            $image = null;
            if (preg_match('#https?://i\.ikman-st\.com/[^"\s]+\.(?:jpg|jpeg|png|webp)#', $window, $im)) {
                $image = $im[0];
            }

            $listings[] = [
                'title' => $title,
                'url' => $url,
                'price' => $price,
                'image' => $image,
            ];

            if (count($listings) >= 12) {
                break;
            }
        }

        return $listings;
    }
}
