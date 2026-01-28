<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Foundation\Support\Providers\RouteServiceProvider as ServiceProvider;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;

class RouteServiceProvider extends ServiceProvider
{
    public const HOME = '/home';

    public function boot(): void
    {
        // #region agent log
        @file_put_contents(
            base_path('.cursor/debug.log'),
            json_encode([
                'sessionId' => 'debug-session',
                'runId' => 'pre-fix',
                'hypothesisId' => 'H1',
                'location' => __CLASS__ . ':boot:enter',
                'message' => 'RouteServiceProvider boot start',
                'data' => [],
                'timestamp' => (int) (microtime(true) * 1000),
            ]) . PHP_EOL,
            FILE_APPEND
        );
        // #endregion

        RateLimiter::for('api', function (Request $request) {
            // NOTE: Do not call $request->user() here. It triggers the default "web" guard
            // which depends on session.store. For an API-only app, IP-based limiting is enough.

            // #region agent log
            @file_put_contents(
                base_path('.cursor/debug.log'),
                json_encode([
                    'sessionId' => 'debug-session',
                    'runId' => 'run2',
                    'hypothesisId' => 'H2',
                    'location' => __CLASS__ . ':rateLimiter:api',
                    'message' => 'RateLimiter(api) invoked',
                    'data' => [
                        'method' => $request->getMethod(),
                        'path' => $request->path(),
                        'hasIp' => (bool) $request->ip(),
                    ],
                    'timestamp' => (int) (microtime(true) * 1000),
                ]) . PHP_EOL,
                FILE_APPEND
            );
            // #endregion

            return Limit::perMinute(60)->by($request->ip() ?: 'unknown');
        });

        $this->routes(function () {
            Route::middleware('api')
                ->prefix('api')
                ->group(base_path('routes/api.php'));
        });

        // #region agent log
        @file_put_contents(
            base_path('.cursor/debug.log'),
            json_encode([
                'sessionId' => 'debug-session',
                'runId' => 'pre-fix',
                'hypothesisId' => 'H1',
                'location' => __CLASS__ . ':boot:exit',
                'message' => 'RouteServiceProvider boot end',
                'data' => [],
                'timestamp' => (int) (microtime(true) * 1000),
            ]) . PHP_EOL,
            FILE_APPEND
        );
        // #endregion
    }
}
