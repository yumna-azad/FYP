/**
 * Stripe checkout for Pro subscription.
 *
 * Supports two modes:
 * 1. Payment Link (no backend): set VITE_STRIPE_PRO_PAYMENT_LINK in .env
 *    Create the link in Stripe Dashboard → Products → Pro → Payment links.
 * 2. Backend API: set VITE_STRIPE_API_URL to your Laravel/API base URL.
 *    Backend must POST to /create-checkout-session and return { url }.
 */

const PAYMENT_LINK = import.meta.env.VITE_STRIPE_PRO_PAYMENT_LINK || "";
const API_BASE = (import.meta.env.VITE_STRIPE_API_URL || "").replace(/\/$/, "");

/**
 * Returns the Stripe Checkout URL for the Pro subscription, then redirect.
 * @returns {Promise<string|null>} Checkout URL or null if not configured
 */
export async function redirectToStripeCheckout() {
  if (PAYMENT_LINK) {
    return PAYMENT_LINK;
  }

  if (API_BASE) {
    const successUrl = `${window.location.origin}/subscribe?success=1`;
    const cancelUrl = `${window.location.origin}/subscribe?canceled=1`;
    const res = await fetch(`${API_BASE}/create-checkout-session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        plan: "pro",
        success_url: successUrl,
        cancel_url: cancelUrl,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || `Checkout session failed: ${res.status}`);
    }
    const data = await res.json();
    if (data.url) return data.url;
    throw new Error("No checkout URL in response");
  }

  return null;
}

/**
 * Start Pro subscription: get Stripe URL and redirect.
 * Shows alert if Stripe is not configured.
 */
export async function subscribeToPro() {
  try {
    const url = await redirectToStripeCheckout();
    if (url) {
      window.location.href = url;
      return;
    }
    // Not configured: remind to set env or use Payment Link
    alert(
      "Stripe is not configured. Add VITE_STRIPE_PRO_PAYMENT_LINK in .env (from Stripe Dashboard → Payment links), or set VITE_STRIPE_API_URL to your backend that creates Checkout Sessions."
    );
  } catch (e) {
    console.error("Stripe checkout error:", e);
    alert(e.message || "Payment could not be started. Please try again.");
  }
}
