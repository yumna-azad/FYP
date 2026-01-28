<?php

use Illuminate\Contracts\Http\Kernel;
use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

// #region agent log
@file_put_contents(
    dirname(__DIR__, 2) . '/.cursor/debug.log',
    json_encode([
        'sessionId' => 'debug-session',
        'runId' => 'run1',
        'hypothesisId' => 'H2',
        'location' => 'backend/public/index.php:boot:start',
        'message' => 'HTTP entrypoint hit',
        'data' => [
            'phpVersion' => PHP_VERSION,
            'phpSapi' => PHP_SAPI,
        ],
        'timestamp' => (int) (microtime(true) * 1000),
    ]) . PHP_EOL,
    FILE_APPEND
);
// #endregion

if (file_exists($maintenance = __DIR__.'/../storage/framework/maintenance.php')) {
    require $maintenance;
}

require __DIR__.'/../vendor/autoload.php';

$app = require_once __DIR__.'/../bootstrap/app.php';

// #region agent log
@file_put_contents(
    dirname(__DIR__, 2) . '/.cursor/debug.log',
    json_encode([
        'sessionId' => 'debug-session',
        'runId' => 'run1',
        'hypothesisId' => 'H2',
        'location' => 'backend/public/index.php:boot:app_loaded',
        'message' => 'Laravel app loaded',
        'data' => [
            'viewPaths' => (function () use ($app) {
                try {
                    return $app->make('config')->get('view.paths');
                } catch (\Throwable $e) {
                    return 'ERR:' . get_class($e);
                }
            })(),
        ],
        'timestamp' => (int) (microtime(true) * 1000),
    ]) . PHP_EOL,
    FILE_APPEND
);
// #endregion

$kernel = $app->make(Kernel::class);

$response = $kernel->handle(
    $request = Request::capture()
)->send();

$kernel->terminate($request, $response);
