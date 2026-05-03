// Initialize Stripe with API key from environment
// The key should be set in .env file
let stripe = null;

const initializeStripe = () => {
  if (stripe) return stripe;

  const apiKey = process.env.STRIPE_SECRET_KEY;

  if (!apiKey) {
    throw new Error(
      'Stripe API key not configured. Please set STRIPE_SECRET_KEY in your .env file. ' +
      'Get your test key from: https://dashboard.stripe.com/test/apikeys'
    );
  }

  stripe = require('stripe')(apiKey);
  return stripe;
};

/**
 * Create a Stripe payment intent
 * @param {number} amount - Amount in cents (multiply by 100)
 * @param {string} customerId - Optional customer ID
 * @param {string} description - Payment description
 * @returns {object} Payment intent
 */
exports.createPaymentIntent = async (amount, customerId, description = '') => {
  try {
    const stripeInstance = initializeStripe();
    const params = {
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd', // LKR is not supported by Stripe — using USD for demo
      description: description,
      payment_method_types: ['card'],
    };

    if (customerId) {
      params.customer = customerId;
    }

    const paymentIntent = await stripeInstance.paymentIntents.create(params);
    return paymentIntent;
  } catch (error) {
    console.error('Error creating payment intent:', error);
    throw error;
  }
};

/**
 * Retrieve a payment intent
 * @param {string} paymentIntentId - Payment intent ID
 * @returns {object} Payment intentInstance
 */
exports.getPaymentIntent = async (paymentIntentId) => {
  try {
    if (!paymentIntentId) {
      throw new Error('Payment intent ID is required');
    }
    const stripeInstance = initializeStripe();
    const paymentIntent = await stripeInstance.paymentIntents.retrieve(paymentIntentId);
    return paymentIntent;
  } catch (error) {
    console.error('Error retrieving payment intent:', error.message);
    if (error.code === 'resource_missing') {
      throw new Error(`Payment intent not found: ${paymentIntentId}`);
    }
    throw error;
  }
};

/**
 * Confirm a payment intent
 * @param {string} paymentIntentId - Payment intent ID
 * @param {string} paymentMethodId - Payment method ID
 * @returns {object} Confirmed payment intent
 */
exports.confirmPaymentIntent = async (paymentIntentId, paymentMethodId) => {
  try {
    const stripeInstance = initializeStripe();
    const paymentIntent = await stripeInstance.paymentIntents.confirm(paymentIntentId, {
      payment_method: paymentMethodId,
    });
    return paymentIntent;
  } catch (error) {
    console.error('Error confirming payment intent:', error);
    throw error;
  }
};

/**
 * Cancel a payment intent
 * @param {string} paymentIntentId - Payment intent ID
 * @returns {object} Canceled payment intent
 */
exports.cancelPaymentIntent = async (paymentIntentId) => {
  try {
    const stripeInstance = initializeStripe();
    const canceledPaymentIntent = await stripeInstance.paymentIntents.cancel(paymentIntentId);
    return canceledPaymentIntent;
  } catch (error) {
    console.error('Error canceling payment intent:', error);
    throw error;
  }
};

/**
 * Create a Stripe customer
 * @param {string} email - Customer email
 * @param {string} name - Customer name
 * @returns {object} Customer
 */
exports.createCustomer = async (email, name) => {
  try {
    const stripeInstance = initializeStripe();
    const customer = await stripeInstance.customers.create({
      email: email,
      name: name,
    });
    return customer;
  } catch (error) {
    console.error('Error creating customer:', error);
    throw error;
  }
};

/**
 * Verify webhook signature
 * @param {string} body - Raw request body
 * @param {string} signature - Stripe signature header
 * @param {string} secret - Webhook secret
 * @returns {object} Event
 */
exports.verifyWebhookSignature = (body, signature, secret) => {
  try {
    const stripeInstance = initializeStripe();
    const event = stripeInstance.webhooks.constructEvent(body, signature, secret);
    return event;
  } catch (error) {
    console.error('Webhook signature verification failed:', error.message);
    throw error;
  }
};
