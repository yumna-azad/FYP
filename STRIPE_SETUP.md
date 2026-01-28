# Stripe setup for Pro subscription

The **Pay & Subscribe to Pro** button on `/subscribe` uses Stripe for the transaction. Configure it in one of two ways.

## Option 1: Payment Link (no backend)

1. In [Stripe Dashboard](https://dashboard.stripe.com):
   - **Products** → **Add product**
   - Name: **Pro**, Price: **$9.99** recurring monthly
   - Save, then create a **Payment link** for that price

2. In your project root, create a `.env` file:

   ```
   VITE_STRIPE_PRO_PAYMENT_LINK=https://buy.stripe.com/xxxxx
   ```

3. Restart the dev server (`npm run dev`). Clicking **Pay & Subscribe to Pro** will redirect to Stripe Checkout; after payment, users return to `/subscribe?success=1`.

## Option 2: Backend API (e.g. Laravel)

1. Expose an endpoint that creates a Stripe Checkout Session and returns the URL, for example:

   **POST** `{API_BASE}/create-checkout-session`  
   **Body:** `{ "plan": "pro", "success_url": "...", "cancel_url": "..." }`  
   **Response:** `{ "url": "https://checkout.stripe.com/..." }`

2. In `.env`:

   ```
   VITE_STRIPE_API_URL=https://your-api.com
   ```

   (No trailing slash.)

3. The frontend sends `success_url` and `cancel_url` as  
   `{origin}/subscribe?success=1` and `{origin}/subscribe?canceled=1`.

### Laravel example (session creation)

```php
// Install: composer require stripe/stripe-php

use Stripe\Stripe;
use Stripe\Checkout\Session;

Stripe::setApiKey(config('services.stripe.secret'));

$session = Session::create([
    'payment_method_types' => ['card'],
    'line_items' => [[
        'price' => 'price_xxxxx', // Your Pro price ID from Stripe
        'quantity' => 1,
    ]],
    'mode' => 'subscription',
    'success_url' => $request->input('success_url'),
    'cancel_url' => $request->input('cancel_url'),
]);

return response()->json(['url' => $session->url]);
```

---

If neither `VITE_STRIPE_PRO_PAYMENT_LINK` nor `VITE_STRIPE_API_URL` is set, the button shows an alert explaining how to configure Stripe.
