const Stripe = require("stripe");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

module.exports = stripe;
module.exports.STRIPE_WEBHOOK_SECRET = STRIPE_WEBHOOK_SECRET;
