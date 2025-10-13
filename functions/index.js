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
exports.checkBirthdaysAndSendEmails = functions.pubsub.schedule('0 9 * * *') // Runs every day at 9:00 AM
    .timeZone('America/New_York') // IMPORTANT: Change to your salon's timezone if different
    .onRun(async (context) => {
    
    console.log('Running daily birthday check...');
    const db = admin.firestore();

    // 1. Get Birthday Reward Settings
    const settingsDoc = await db.collection('settings').doc('birthday_rewards').get();
    if (!settingsDoc.exists || !settingsDoc.data().enabled) {
        console.log('Birthday rewards are disabled. Exiting function.');
        return null;
    }
    const settings = settingsDoc.data();

    // 2. Calculate the target birthday date (7 days from now)
    const today = new Date();
    const targetDate = new Date();
    targetDate.setDate(today.getDate() + 7);
    
    const targetMonth = targetDate.getMonth() + 1; // JavaScript months are 0-11
    const targetDay = targetDate.getDate();

    console.log(`Checking for birthdays on: ${targetMonth}/${targetDay}`);

    // 3. Get all clients with a DOB and email
    const clientsSnapshot = await db.collection('clients').where('dob', '!=', null).where('email', '!=', null).get();
    if (clientsSnapshot.empty) {
        console.log('No clients with DOB and email found.');
        return null;
    }

    // 4. Filter for clients with a birthday on the target date
    const birthdayClients = [];
    clientsSnapshot.forEach(doc => {
        const client = doc.data();
        // DOB is stored as 'YYYY-MM-DD'
        const dobParts = client.dob.split('-');
        const birthMonth = parseInt(dobParts[1], 10);
        const birthDay = parseInt(dobParts[2], 10);

        if (birthMonth === targetMonth && birthDay === targetDay) {
            birthdayClients.push({ id: doc.id, ...client });
        }
    });

    if (birthdayClients.length === 0) {
        console.log('No client birthdays found for the target date.');
        return null;
    }

    console.log(`Found ${birthdayClients.length} client(s) with a birthday.`);

    // 5. Create email documents to be sent by the "Trigger Email" extension
    const mailPromises = birthdayClients.map(client => {
        const personalizedBody = settings.body.replace(/{clientName}/g, client.name).replace(/\n/g, '<br>');
        
        return db.collection('mail').add({
            to: client.email,
            message: {
                subject: settings.subject,
                html: personalizedBody
            }
        });
    });

    await Promise.all(mailPromises);
    console.log(`Successfully queued ${birthdayClients.length} birthday emails.`);
    return null;
});
