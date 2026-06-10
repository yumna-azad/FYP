<?php

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['*'],
    'allowed_origins' => array_values(array_filter(array_merge(
        [
            'http://localhost:5173', 'http://localhost:5174', 'http://localhost:4173', 'http://localhost:3000',
            'http://127.0.0.1:5173', 'http://127.0.0.1:5174', 'http://127.0.0.1:4173',
            'https://fyp-sandy-ten.vercel.app',
        ],
        // Extra origins from the hosting env (Render sets CORS_ALLOWED_ORIGINS),
        // comma-separated. Lets the deployed frontend reach the deployed API.
        array_map('trim', explode(',', (string) env('CORS_ALLOWED_ORIGINS', '')))
    ))),
    // Allow any Vercel deploy (production + preview URLs like *.vercel.app).
    'allowed_origins_patterns' => ['#^https://.*\.vercel\.app$#'],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => true,
];
