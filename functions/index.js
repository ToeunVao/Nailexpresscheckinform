const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

// To set your Stripe secret key, run this in your terminal:
// firebase functions:config:set stripe.secret_key="sk_test_YOUR_SECRET_KEY"
const stripe = require("stripe")(functions.config().stripe.secret_key);

// IMPORTANT: Replace this with your actual app URL
const YOUR_APP_URL = "https://nailexpress-10f2f.web.app";

exports.createECommerceCheckoutSession = functions.https.onCall(async (data, context) => {
    const { items } = data;
    const line_items = items.map(item => ({
        price_data: {
            currency: 'usd',
            product_data: { name: item.name },
            unit_amount: Math.round(item.price * 100),
        },
        quantity: item.quantity,
    }));

    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items,
        mode: 'payment',
        success_url: `${YOUR_APP_URL}/payment-success.html?session_id={CHECKOUT_SESSION_ID}&type=ecommerce`,
        cancel_url: `${YOUR_APP_URL}/payment-cancel.html`,
    });
    return { id: session.id };
});

exports.createGiftCardCheckoutSession = functions.https.onCall(async (data, context) => {
    const { details } = data;
    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
            price_data: {
                currency: 'usd',
                product_data: { name: `Nails Express Gift Card for ${details.recipientName || details.buyerName}` },
                unit_amount: Math.round(details.amount * 100),
            },
            quantity: details.quantity,
        }],
        mode: 'payment',
        success_url: `${YOUR_APP_URL}/payment-success.html?session_id={CHECKOUT_SESSION_ID}&type=giftcard`,
        cancel_url: `${YOUR_APP_URL}/payment-cancel.html`,
    });
    return { id: session.id };
});

exports.createMembershipCheckoutSession = functions.https.onCall(async (data, context) => {
    const { tier } = data;
    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
            price_data: {
                currency: 'usd',
                product_data: { name: `${tier.name} Membership Tier` },
                unit_amount: Math.round(tier.price * 100),
            },
            quantity: 1,
        }],
        mode: 'payment',
        success_url: `${YOUR_APP_URL}/payment-success.html?session_id={CHECKOUT_SESSION_ID}&type=membership`,
        cancel_url: `${YOUR_APP_URL}/payment-cancel.html`,
    });
    return { id: session.id };
});
