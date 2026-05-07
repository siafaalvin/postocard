import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-04-30.basil",
});

export const PRICES = {
  registration: 100,      // $1.00 in cents
  plus: 500,              // $5.00
  creator: 2000,          // $20.00
  viewExtension: 100,     // $1.00
  // Flag removal: escalates per offense (1st–4th; no removal after 4th)
  flagRemoval1: 100,      // $1.00
  flagRemoval2: 1000,     // $10.00
  flagRemoval3: 10000,    // $100.00
  flagRemoval4: 100000,   // $1,000.00
} as const;
