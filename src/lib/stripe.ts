import { loadStripe } from '@stripe/stripe-js';

const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string;

export const stripePromise = loadStripe(stripePublishableKey);

export async function createCheckoutSession(priceId: string, userId: string): Promise<void> {
  const response = await fetch('/api/create-checkout-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ priceId, userId }),
  });

  if (!response.ok) {
    throw new Error('Failed to create checkout session');
  }

  const { url } = (await response.json()) as { url: string };
  window.location.href = url;
}
