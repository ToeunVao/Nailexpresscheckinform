import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, query, doc, getDoc, deleteDoc, serverTimestamp, where, getDocs, orderBy, Timestamp, updateDoc, writeBatch, setDoc, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyAGZBJFVi_o1HeGDmjcSsmCcWxWOkuLc_4",
    authDomain: "nailexpress-10f2f.firebaseapp.com",
    projectId: "nailexpress-10f2f",
    storageBucket: "nailexpress-10f2f.appspot.com",
    messagingSenderId: "1015991996673",
    appId: "1:1015991996673:web:b6e8888abae83906d34b00"
};
///---3
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// --- Global State ---
const loadingScreen = document.getElementById('loading-screen');
const landingPageContent = document.getElementById('landing-page-content');
const appContent = document.getElementById('app-content');
const clientDashboardContent = document.getElementById('client-dashboard-content');
const policyModal = document.getElementById('policy-modal');
const addAppointmentModal = document.getElementById('add-appointment-modal');
const addAppointmentForm = document.getElementById('add-appointment-form');
let mainAppInitialized = false;
let clientDashboardInitialized = false;
let landingPageInitialized = false;
let anonymousUserId = null;
let bookingSettings = { minBookingHours: 2 };
let loginSecuritySettings = { maxAttempts: 5, lockoutMinutes: 15 };
let salonHours = {}; // To store salon operating hours
let salonRevenueChart, myEarningsChart, staffEarningsChart;
let notifications = [];
let currentUserRole = null;
let currentUserName = null; // To store the logged-in user's name
let currentUserId = null;
let initialAppointmentsLoaded = false;
let initialInventoryLoaded = false;
let allFinishedClients = [], allAppointments = [], allClients = [], allActiveClients = [], servicesData = {};
let allColorBrands = [];

const giftCardBackgrounds = {
    'General': [
        'https://png.pngtree.com/thumb_back/fh260/background/20240930/pngtree-christmas-banner-with-happy-new-year-festive-for-celebrations-image_16282636.jpg',
        'https://png.pngtree.com/thumb_back/fh260/background/20250205/pngtree-soft-pastel-floral-design-light-blue-background-image_16896113.jpg',
        'https://files.123freevectors.com/wp-content/original/119522-abstract-pastel-pink-background-image.jpg'
    ],
    'Holidays': [
        'https://media.istockphoto.com/id/1281966270/vector/christmas-background-with-snowflakes.jpg?s=612x612&w=0&k=20&c=3t2mJbipFc4aln2M8qDbd3kJvUwtjl1md1F3Rj0xVI4=',
        'https://media.istockphoto.com/id/1180986336/vector/red-bokeh-snowflakes-background.jpg?s=612x612&w=0&k=20&c=NR_Hf8C2owuvtCxtjk789Ckynqdm6l2oDWLHwI7uqlE=',
        'https://png.pngtree.com/background/20210710/original/pngtree-red-christmas-snow-winter-cartoon-show-board-background-picture-image_979028.jpg'
    ],
      'Valentines': [
        'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?q=80&w=2070&auto=format&fit=crop',
        'https://images.rawpixel.com/image_800/cHJpdmF0ZS9sci9pbWFnZXMvd2Vic2l0ZS8yMDIzLTExL2xhdXJhc3RlZmFubzI2Nl9waW5rX3ZhbGVudGluZXNfZGF5X2JhY2tncm91bmRfd2l0aF9oZWFydHNfYm9rZV9kZTAzMWNjMy05MmJmLTQ2NzAtYjliZC0wN2Y2ZDkzYTM1ZDBfMS5qcGc.jpg',
        'https://cms-artifacts.artlist.io/content/motion_array/1390934/Valentines_Day_Romantic_Background_high_resolution_preview_1390934.jpg?Expires=2037527646045&Key-Pair-Id=K2ZDLYDZI2R1DF&Signature=fCbOC95RTvVc0Ld-pyxhFN5gzuS-VqGG1UYsxvu48kx8A6rdAPf~gjuv0sVBrV~0p0~2u99BYafKT5oRUsRbluBt9c8eH4k~YXVcT2KdNrQUjVD-wKS2qTcgdp8aVDYCCILMkFT4hrWRWzKlsjjgoBe7mAIaHV3cc2iqMErb-qGWlk8jX0J8vLfCvXH~daNNPMqO7tssbeYiHVrD7y89fbJ0YRVfR6wwb1AoBLseF8-7IsAZe8Hh2bn-kUEp8KocRZ4X7DBTFD~9Ho-E0HeRym4oZ37u3BdLAqY-y0a1HdIf3dOXXkF6X~UQpMlPtxTvWj4857QSez20b1mhnBhpsQ__'
    ],
    'Birthday': [
        'https://marketplace.canva.com/EAGhbM7XcuY/1/0/1600w/canva-white-and-blue-birthday-background-card-yqLk4e5MQjY.jpg',
        'https://images.rawpixel.com/image_800/czNmcy1wcml2YXRlL3Jhd3BpeGVsX2ltYWdlcy93ZWJzaXRlX2NvbnRlbnQvbHIvam9iNTE2LW51bm9vbi0xMC5qcGc.jpg',
        'https://www.creativefabrica.com/wp-content/uploads/2021/08/30/Happy-birthday-background-design-Graphics-16518598-1-1-580x430.jpg'
    ]
};

const updateLandingGiftCardPreview = () => {
    const purchaseForm = document.getElementById('landing-gift-card-form');
    if (!purchaseForm) return;

    const showTo = document.getElementById('gc-show-to').checked;
    const showFrom = document.getElementById('gc-show-from').checked;

    document.getElementById('gc-to-wrapper').style.display = showTo ? '' : 'none';
    document.getElementById('gc-from-wrapper').style.display = showFrom ? '' : 'none';

    document.getElementById('landing-gc-preview-to').parentElement.style.display = showTo ? '' : 'none';
    document.getElementById('landing-gc-preview-from').parentElement.style.display = showFrom ? '' : 'none';

    document.getElementById('landing-gc-preview-to').textContent = document.getElementById('gc-to').value || 'Recipient';
    document.getElementById('landing-gc-preview-from').textContent = document.getElementById('gc-from').value || 'Sender';

    const amount = parseFloat(document.getElementById('gc-amount').value) || 0;
    const quantity = parseInt(document.getElementById('gc-quantity').value, 10) || 1;

    document.getElementById('landing-gc-preview-amount').textContent = `$${amount.toFixed(2)}`;
    document.getElementById('landing-gc-total-amount').textContent = `$${(amount * quantity).toFixed(2)}`;

    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + 6);
    const formattedExpiryDate = expiryDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    document.getElementById('landing-gc-preview-expiry').textContent = `Expires: ${formattedExpiryDate}`;
};

const initializeLandingGiftCardDesigner = () => {
    const purchaseForm = document.getElementById('landing-gift-card-form');
    const previewCard = document.getElementById('landing-gc-preview-card');
    if (!purchaseForm || !previewCard) return;

    purchaseForm.reset();
    document.getElementById('gc-quantity').value = 1;

    const backgroundTabs = document.getElementById('landing-gc-background-tabs');
    const backgroundOptions = document.getElementById('landing-gc-background-options');

    backgroundTabs.innerHTML = Object.keys(giftCardBackgrounds).map(cat =>
        `<button type="button" data-category="${cat}" class="px-3 py-1 text-sm font-medium rounded-t-lg">${cat}</button>`
    ).join('');

    const firstTab = backgroundTabs.querySelector('button');
    if (firstTab) {
        firstTab.classList.add('bg-gray-200', 'border-gray-300', 'border-b-0');
        backgroundOptions.innerHTML = giftCardBackgrounds[firstTab.dataset.category].map(url =>
            `<button type="button" data-bg="${url}" class="w-full h-16 bg-cover bg-center rounded-md border-2 border-transparent hover:border-pink-400" style="background-image: url('${url}')"></button>`
        ).join('');
        previewCard.style.backgroundImage = `url('${giftCardBackgrounds[firstTab.dataset.category][0]}')`;
    }
    updateLandingGiftCardPreview();
};

// --- Global Helper Functions ---
const getLocalDateString = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// --- Email Notification Logic ---
async function sendBookingNotificationEmail(appointmentData) {
    try {
        const adminsQuery = query(collection(db, "users"), where("role", "==", "admin"));
        const adminSnapshot = await getDocs(adminsQuery);
        const adminEmails = adminSnapshot.docs.map(doc => doc.data().email).filter(Boolean);

        let technicianEmail = null;
        if (appointmentData.technician && appointmentData.technician !== 'Any Technician') {
            const techQuery = query(collection(db, "users"), where("name", "==", appointmentData.technician));
            const techSnapshot = await getDocs(techQuery);
            if (!techSnapshot.empty) {
                const techData = techSnapshot.docs[0].data();
                if (techData.email) {
                    technicianEmail = techData.email;
                }
            }
        }

        const recipients = [...new Set([...adminEmails, technicianEmail].filter(Boolean))];

        if (recipients.length === 0) {
            console.log("No recipients found for booking notification email.");
            return;
        }

        const appointmentTime = appointmentData.appointmentTimestamp.toDate().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
        const subject = `New Booking: ${appointmentData.name} @ ${appointmentTime}`;
        const servicesList = Array.isArray(appointmentData.services) ? appointmentData.services.join(', ') : appointmentData.services;
        
        const html = `<div style="font-family: Arial, sans-serif; color: #333;"><h2 style="color: #d63384;">New Appointment Booked</h2><p>A new appointment has been scheduled for <strong>${appointmentData.name}</strong>.</p><table style="width: 100%; border-collapse: collapse; margin-top: 15px;"><tr style="border-bottom: 1px solid #ddd;"><td style="padding: 8px; width: 120px;"><strong>Client:</strong></td><td style="padding: 8px;">${appointmentData.name}</td></tr><tr style="border-bottom: 1px solid #ddd;"><td style="padding: 8px;"><strong>Phone:</strong></td><td style="padding: 8px;">${appointmentData.phone || 'N/A'}</td></tr><tr style="border-bottom: 1px solid #ddd;"><td style="padding: 8px;"><strong>Time:</strong></td><td style="padding: 8px;">${appointmentTime}</td></tr><tr style="border-bottom: 1px solid #ddd;"><td style="padding: 8px;"><strong>Technician:</strong></td><td style="padding: 8px;">${appointmentData.technician}</td></tr><tr style="border-bottom: 1px solid #ddd;"><td style="padding: 8px;"><strong>Services:</strong></td><td style="padding: 8px;">${servicesList}</td></tr><tr style="border-bottom: 1px solid #ddd;"><td style="padding: 8px;"><strong>Notes:</strong></td><td style="padding: 8px;">${appointmentData.notes || 'None'}</td></tr></table></div>`;

        const mailPromises = recipients.map(email => {
            return addDoc(collection(db, "mail"), {
                to: email,
                message: { subject: subject, html: html },
            });
        });

        await Promise.all(mailPromises);
        console.log("Booking notification emails queued for:", recipients.join(', '));

    } catch (error) {
        console.error("Error queuing booking notification email:", error);
    }
}

// --- Booking Validation Logic ---
function isBookingTimeValid(bookingDate) {
    const dayOfWeek = bookingDate.getDay(); 
    const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dayOfWeek];

    const dayHours = salonHours[dayName];

    if (!dayHours || !dayHours.isOpen) {
        return { valid: false, message: `Sorry, the salon is closed on ${dayName.charAt(0).toUpperCase() + dayName.slice(1)}s.` };
    }

    const bookingTime = bookingDate.getHours() * 60 + bookingDate.getMinutes();
    
    const [openHour, openMinute] = dayHours.open.split(':').map(Number);
    const openTime = openHour * 60 + openMinute;
    
    const [closeHour, closeMinute] = dayHours.close.split(':').map(Number);
    const closeTime = closeHour * 60 + closeMinute;

    if (bookingTime < openTime || bookingTime > closeTime) {
         const formatTime = (timeStr) => new Date(`1970-01-01T${timeStr}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        return { valid: false, message: `Sorry, our hours on ${dayName.charAt(0).toUpperCase() + dayName.slice(1)}s are from ${formatTime(dayHours.open)} to ${formatTime(dayHours.close)}.` };
    }

    return { valid: true };
}


// --- Global Modal Logic ---
const openPolicyModal = () => { policyModal.classList.add('flex'); policyModal.classList.remove('hidden'); };
const closePolicyModal = () => { policyModal.classList.add('hidden'); policyModal.classList.remove('flex'); };
document.addEventListener('click', (e) => { if (e.target.closest('.view-policy-btn')) { openPolicyModal(); } });
document.getElementById('policy-close-btn').addEventListener('click', closePolicyModal);
document.querySelector('#policy-modal .policy-modal-overlay').addEventListener('click', closePolicyModal);

// --- Shared Appointment Modal Logic ---
const openAddAppointmentModal = (date, clientData = null) => {
    addAppointmentForm.reset();
    const now = new Date();
    const defaultDateTime = `${date}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    document.getElementById('appointment-datetime').value = defaultDateTime;

    if (clientData) {
        document.getElementById('appointment-client-name').value = clientData.name || '';
        document.getElementById('appointment-phone').value = clientData.phone || '';
    }

    const clientList = document.getElementById('client-names-list');
    const appointmentPhoneList = document.getElementById('appointment-client-phones');
    const uniqueNames = [...new Set(allFinishedClients.map(c => c.name))];
    const uniquePhones = [...new Set(allFinishedClients.filter(c => c.phone && c.phone !== 'N/A').map(c => c.phone))];
    clientList.innerHTML = uniqueNames.map(name => `<option value="${name}"></option>`).join('');
    appointmentPhoneList.innerHTML = uniquePhones.map(phone => `<option value="${phone}"></option>`).join('');
    
    const mainServicesList = document.getElementById('main-services-list');
    mainServicesList.innerHTML = Object.keys(servicesData).flatMap(category => 
        servicesData[category].map(service => `<option value="${service.p || ''}${service.name}${service.price ? ' ' + service.price : ''}"></option>`)
    ).join('');

    addAppointmentModal.classList.remove('hidden'); 
    addAppointmentModal.classList.add('flex');
};

const closeAddAppointmentModal = () => { 
    addAppointmentModal.classList.add('hidden'); 
    addAppointmentModal.classList.remove('flex'); 
};

document.getElementById('add-appointment-cancel-btn').addEventListener('click', closeAddAppointmentModal);
document.querySelector('.add-appointment-modal-overlay').addEventListener('click', closeAddAppointmentModal);
document.getElementById('appointment-client-name').addEventListener('input', (e) => { 
    const client = allFinishedClients.find(c => c.name === e.target.value); 
    if (client) { document.getElementById('appointment-phone').value = client.phone; } 
});
document.getElementById('appointment-phone').addEventListener('input', (e) => { 
    const client = allFinishedClients.find(c => c.phone === e.target.value); 
    if (client) { document.getElementById('appointment-client-name').value = client.name; } 
});

addAppointmentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const datetimeString = document.getElementById('appointment-datetime').value;
    if (!datetimeString) { return alert('Please select a date and time.'); }
    
    const bookingDate = new Date(datetimeString);
    const validation = isBookingTimeValid(bookingDate);
    if (!validation.valid) {
        alert(validation.message);
        return;
    }
    
    const appointmentData = {
        name: document.getElementById('appointment-client-name').value,
        phone: document.getElementById('appointment-phone').value,
        people: document.getElementById('appointment-people').value,
        bookingType: document.getElementById('appointment-booking-type').value,
        services: [document.getElementById('appointment-services').value],
        technician: document.getElementById('appointment-technician-select').value,
        notes: document.getElementById('appointment-notes').value,
        appointmentTimestamp: Timestamp.fromDate(bookingDate)
    };
    
    try {
        await addDoc(collection(db, "appointments"), appointmentData);
        await sendBookingNotificationEmail(appointmentData);
        closeAddAppointmentModal();
    } catch (err) {
        console.error("Error adding appointment:", err);
        alert("Could not save appointment.");
    }
});



// --- Primary Authentication Router ---
// REPLACE the entire onAuthStateChanged function
// REPLACE the entire onAuthStateChanged function
onAuthStateChanged(auth, async (user) => {
    try {
        const hoursDoc = await getDoc(doc(db, "settings", "salonHours"));
        if (hoursDoc.exists()) {
            salonHours = hoursDoc.data();
        }

        if (user) {
            currentUserId = user.uid;
            if (user.isAnonymous) {
                anonymousUserId = user.uid;
                loadingScreen.style.display = 'none';
                appContent.style.display = 'none';
                clientDashboardContent.style.display = 'none';
                landingPageContent.style.display = 'block';
                if (!landingPageInitialized) {
                    initLandingPage();
                    landingPageInitialized = true;
                }
            } else {
                const userDocRef = doc(db, "users", user.uid);
                const userDoc = await getDoc(userDocRef);

                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    currentUserRole = userData.role;
                    currentUserName = userData.name; // Store user's name
                    loadingScreen.style.display = 'none';
                    landingPageContent.style.display = 'none';
                    clientDashboardContent.style.display = 'none';
                    appContent.style.display = 'block';
                    if (!mainAppInitialized) {
                        initMainApp(currentUserRole, currentUserName);
                        mainAppInitialized = true;
                    }
                } else {
                     const clientDocRef = doc(db, "clients", user.uid);
                    const clientDoc = await getDoc(clientDocRef);
                    if (clientDoc.exists()) {
                        currentUserRole = clientDoc.data().role;
                        loadingScreen.style.display = 'none';
                        landingPageContent.style.display = 'none';
                        appContent.style.display = 'none';
                        clientDashboardContent.style.display = 'block';
                        
                        // FIX: Always initialize the dashboard on login to attach listeners
                        initClientDashboard(user.uid, clientDoc.data());
                    } else {
                        const pendingPurchaseJSON = sessionStorage.getItem('pendingGiftCardPurchase');
                        if (pendingPurchaseJSON) {
                            const details = JSON.parse(pendingPurchaseJSON);
                            const purchaseModal = document.getElementById('gift-card-purchase-modal');

                            const newClientData = {
                                name: details.buyerName,
                                email: details.buyerEmail,
                                phone: details.buyerPhone,
                                role: 'client',
                                createdAt: serverTimestamp()
                            };
                            await setDoc(doc(db, "clients", user.uid), newClientData);

                            const batch = writeBatch(db);
                            const expiryDate = new Date();
                            expiryDate.setMonth(expiryDate.getMonth() + 6);

                            for (let i = 0; i < details.quantity; i++) {
                                const cardData = {
                                    amount: details.amount,
                                    balance: details.amount,
                                    history: [],
                                    recipientName: details.recipientName,
                                    senderName: details.senderName,
                                    code: `GC-${Date.now()}-${i}`,
                                    status: 'Pending',
                                    type: 'E-Gift',
                                    createdBy: user.uid,
                                    buyerInfo: { name: details.buyerName, email: details.buyerEmail, phone: details.buyerPhone },
                                    createdAt: serverTimestamp(),
                                    expiresAt: Timestamp.fromDate(expiryDate),
                                    // *** CHANGE IS HERE: Save the background URL ***
                                    backgroundUrl: details.backgroundUrl 
                                };
                                const newCardRef = doc(collection(db, "gift_cards"));
                                batch.set(newCardRef, cardData);
                            }

                            await batch.commit();
                            sessionStorage.removeItem('pendingGiftCardPurchase');

                            alert("Success! Your account has been created and your gift card request has been sent. It will be activated once payment is confirmed.");

                            if (purchaseModal) {
                                purchaseModal.classList.add('hidden');
                            }

                            landingPageContent.style.display = 'none';
                            appContent.style.display = 'none';
                            clientDashboardContent.style.display = 'block';
                            if (!clientDashboardInitialized) {
                                initClientDashboard(user.uid, newClientData);
                                clientDashboardInitialized = true;
                            }

                        } else {
                            console.error("User authenticated but no user/client document found. Logging out.");
                            await signOut(auth);
                            alert("Login error: User data not found.");
                        }
                    }
                }
            }
        } else {
            currentUserId = null;
            currentUserRole = null;
            currentUserName = null;
            await signInAnonymously(auth)
        }
    } catch (error) {
        console.error("Authentication Error:", error);
        loadingScreen.innerHTML = `<div class="text-center"><h2 class="text-3xl font-bold text-red-700">Connection Error</h2><p class="text-gray-600 mt-2">Could not connect to services. Please check your internet connection and refresh the page.</p><p class="text-xs text-gray-400 mt-4">Error: ${error.message}</p></div>`;
    }
});


// --- LANDING PAGE SCRIPT ---
function initLandingPage() {
    const signupLoginModal = document.getElementById('signup-login-modal');
    const userIcon = document.getElementById('user-icon');
    const closeSignupLoginModalBtn = document.getElementById('close-signup-login-modal-btn');
    const landingLoginForm = document.getElementById('landing-login-form');
    const landingSignupForm = document.getElementById('landing-signup-form');
    const addAppointmentFormLanding = document.getElementById('add-appointment-form-landing');
    const lockoutMessageDiv = document.getElementById('login-lockout-message');
// --- NEW E-COMMERCE GIFT CARD LOGIC ---
    const purchaseModal = document.getElementById('gift-card-purchase-modal');
    const buyGiftCardBtn = document.getElementById('buy-gift-card-btn');
    const closePurchaseModalBtn = document.getElementById('close-gift-card-purchase-modal-btn');
    const purchaseForm = document.getElementById('landing-gift-card-form');
    const previewCard = document.getElementById('landing-gc-preview-card');

    const updateLandingGiftCardPreview = () => {
        const showTo = document.getElementById('gc-show-to').checked;
        const showFrom = document.getElementById('gc-show-from').checked;

        document.getElementById('gc-to-wrapper').style.display = showTo ? '' : 'none';
        document.getElementById('gc-from-wrapper').style.display = showFrom ? '' : 'none';

        document.getElementById('landing-gc-preview-to').parentElement.style.display = showTo ? '' : 'none';
        document.getElementById('landing-gc-preview-from').parentElement.style.display = showFrom ? '' : 'none';

        document.getElementById('landing-gc-preview-to').textContent = document.getElementById('gc-to').value || 'Recipient';
        document.getElementById('landing-gc-preview-from').textContent = document.getElementById('gc-from').value || 'Sender';

        const amount = parseFloat(document.getElementById('gc-amount').value) || 0;
        const quantity = parseInt(document.getElementById('gc-quantity').value, 10) || 0;

        document.getElementById('landing-gc-preview-amount').textContent = `$${amount.toFixed(2)}`;
        document.getElementById('landing-gc-total-amount').textContent = `$${(amount * quantity).toFixed(2)}`;

        const expiryDate = new Date();
        expiryDate.setMonth(expiryDate.getMonth() + 6);
        const formattedExpiryDate = expiryDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        document.getElementById('landing-gc-preview-expiry').textContent = `Expires: ${formattedExpiryDate}`;
    };

    const initializeLandingGiftCardDesigner = () => {
        purchaseForm.reset();
        document.getElementById('gc-quantity').value = 1;

        const backgroundTabs = document.getElementById('landing-gc-background-tabs');
        const backgroundOptions = document.getElementById('landing-gc-background-options');

        backgroundTabs.innerHTML = Object.keys(giftCardBackgrounds).map(cat => 
            `<button type="button" data-category="${cat}" class="px-3 py-1 text-sm font-medium rounded-t-lg">${cat}</button>`
        ).join('');

        const firstTab = backgroundTabs.querySelector('button');
        if(firstTab) {
             firstTab.classList.add('bg-gray-200', 'border-gray-300', 'border-b-0');
             backgroundOptions.innerHTML = giftCardBackgrounds[firstTab.dataset.category].map(url => 
                `<button type="button" data-bg="${url}" class="w-full h-16 bg-cover bg-center rounded-md border-2 border-transparent hover:border-pink-400" style="background-image: url('${url}')"></button>`
             ).join('');
             previewCard.style.backgroundImage = `url('${giftCardBackgrounds[firstTab.dataset.category][0]}')`;
        }
        updateLandingGiftCardPreview();
    };

    buyGiftCardBtn.addEventListener('click', () => {
        const userInfoSection = document.getElementById('gc-user-info-section');
        // *** SHOW the user info section ***
        if (userInfoSection) {
            userInfoSection.classList.remove('hidden');
        }

        getDoc(doc(db, "settings", "paymentGuide")).then(docSnap => {
            if (docSnap.exists() && docSnap.data().text) {
                paymentGuideDisplay.innerHTML = `<p class="font-semibold mb-2">How to Pay:</p><p>${docSnap.data().text.replace(/\n/g, '<br>')}</p>`;
            } else {
                paymentGuideDisplay.textContent = 'Please contact the salon to complete your payment.';
            }
        });
        initializeLandingGiftCardDesigner();
        purchaseModal.classList.remove('hidden');
    });
    closePurchaseModalBtn.addEventListener('click', () => purchaseModal.classList.add('hidden'));
    purchaseModal.querySelector('.modal-overlay').addEventListener('click', () => purchaseModal.classList.add('hidden'));

    purchaseForm.addEventListener('input', updateLandingGiftCardPreview);

    document.getElementById('landing-gc-background-tabs').addEventListener('click', e => {
        const tab = e.target.closest('button');
        if (tab) {
             document.getElementById('landing-gc-background-tabs').querySelectorAll('button').forEach(t => t.classList.remove('bg-gray-200', 'border-gray-300', 'border-b-0'));
             tab.classList.add('bg-gray-200', 'border-gray-300', 'border-b-0');
             const backgroundOptions = document.getElementById('landing-gc-background-options');
             backgroundOptions.innerHTML = giftCardBackgrounds[tab.dataset.category].map(url => 
                `<button type="button" data-bg="${url}" class="w-full h-16 bg-cover bg-center rounded-md border-2 border-transparent hover:border-pink-400" style="background-image: url('${url}')"></button>`
             ).join('');
             previewCard.style.backgroundImage = `url('${giftCardBackgrounds[tab.dataset.category][0]}')`;
        }
    });

    document.getElementById('landing-gc-background-options').addEventListener('click', (e) => {
        const target = e.target.closest('button');
        if (target && target.dataset.bg) {
            document.getElementById('landing-gc-background-options').querySelectorAll('button').forEach(btn => btn.classList.remove('ring-2', 'ring-pink-500'));
            target.classList.add('ring-2', 'ring-pink-500');
            previewCard.style.backgroundImage = `url('${target.dataset.bg}')`;
        }
    });

   // Located inside initLandingPage()
purchaseForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const amount = parseFloat(document.getElementById('gc-amount').value);
    const quantity = parseInt(document.getElementById('gc-quantity').value, 10);

    if (isNaN(amount) || amount <= 0 || isNaN(quantity) || quantity <= 0) {
        alert('Please fill out the gift card amount and quantity correctly.');
        return;
    }

    const submitBtn = document.getElementById('landing-gc-submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Processing...';

    try {
        // SCENARIO 1: User is already a logged-in client
        if (currentUserId && auth.currentUser && !auth.currentUser.isAnonymous) {
            const batch = writeBatch(db);
            const expiryDate = new Date();
            expiryDate.setMonth(expiryDate.getMonth() + 6);
            
            const buyerInfo = {
                name: document.getElementById('gc-buyer-name').value,
                email: document.getElementById('gc-buyer-email').value,
                phone: document.getElementById('gc-buyer-phone').value,
            };

            for (let i = 0; i < quantity; i++) {
                const cardData = {
                    amount: amount,
                    balance: amount,
                    history: [],
                    recipientName: document.getElementById('gc-show-to').checked ? document.getElementById('gc-to').value : buyerInfo.name,
                    senderName: document.getElementById('gc-show-from').checked ? document.getElementById('gc-from').value : buyerInfo.name,
                    backgroundUrl: document.getElementById('landing-gc-preview-card').style.backgroundImage.slice(5, -2),
                    code: `GC-${Date.now()}-${i}`,
                    status: 'Pending',
                    type: 'E-Gift',
                    createdBy: currentUserId,
                    buyerInfo: buyerInfo,
                    createdAt: serverTimestamp(),
                    expiresAt: Timestamp.fromDate(expiryDate)
                };
                const newCardRef = doc(collection(db, "gift_cards"));
                batch.set(newCardRef, cardData);
            }
            await batch.commit();
            alert("Success! Your gift card request has been sent. It will be activated once payment is confirmed.");
            document.getElementById('gift-card-purchase-modal').classList.add('hidden');

        } else {
            // SCENARIO 2: New or anonymous user (original flow)
            const buyerName = document.getElementById('gc-buyer-name').value;
            const buyerPhone = document.getElementById('gc-buyer-phone').value;
            const buyerEmail = document.getElementById('gc-buyer-email').value;

            if (!buyerName || !buyerPhone || !buyerEmail) {
                alert('Please fill out all your information to create an account.');
                throw new Error("Missing buyer information.");
            }
            
            await createUserWithEmailAndPassword(auth, buyerEmail, buyerPhone);
            
            const purchaseDetails = {
                buyerName, buyerPhone, buyerEmail, amount, quantity,
                recipientName: document.getElementById('gc-show-to').checked ? document.getElementById('gc-to').value : buyerName,
                senderName: document.getElementById('gc-show-from').checked ? document.getElementById('gc-from').value : buyerName,
                backgroundUrl: document.getElementById('landing-gc-preview-card').style.backgroundImage.slice(5, -2),
            };
            sessionStorage.setItem('pendingGiftCardPurchase', JSON.stringify(purchaseDetails));
            // onAuthStateChanged will handle the rest
        }
    } catch (error) {
        if (error.code === 'auth/email-already-in-use') {
            alert("An account with this email already exists. Please log in to purchase a gift card.");
        } else {
            console.error("Error during gift card purchase:", error);
            alert(`Could not process your request. Error: ${error.message}`);
        }
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Purchase Request';
        // Re-enable form fields that might have been disabled
        document.getElementById('gc-buyer-name').disabled = false;
        document.getElementById('gc-buyer-phone').disabled = false;
        document.getElementById('gc-buyer-email').disabled = false;
    }

});

// *** ADD THIS CORRECTED BLOCK ***
    const closePurchaseModal = () => {
        const purchaseModal = document.getElementById('gift-card-purchase-modal');
        const userInfoSection = document.getElementById('gc-user-info-section');
        purchaseModal.classList.add('hidden');
        // Reset the form fields for the next user
        document.getElementById('gc-buyer-name').disabled = false;
        document.getElementById('gc-buyer-phone').disabled = false;
        document.getElementById('gc-buyer-email').disabled = false;
        // *** SHOW the user info section again for the next user ***
        if (userInfoSection) {
            userInfoSection.classList.remove('hidden');
        }
    };

    // Note: The 'purchaseModal' and 'closePurchaseModalBtn' variables are already
    // declared at the top of the gift card logic section, so we just use them here.
    closePurchaseModalBtn.addEventListener('click', closePurchaseModal);
    purchaseModal.querySelector('.modal-overlay').addEventListener('click', closePurchaseModal);
    // *** END OF CORRECTED BLOCK ***

    getDoc(doc(db, "settings", "security")).then(docSnap => {
        if (docSnap.exists()) {
            loginSecuritySettings = docSnap.data();
        }
    });

    const openAuthModal = () => { signupLoginModal.classList.remove('hidden'); signupLoginModal.classList.add('flex'); };
    const closeAuthModal = () => { signupLoginModal.classList.add('hidden'); signupLoginModal.classList.remove('flex'); };
    userIcon.addEventListener('click', openAuthModal);
    closeSignupLoginModalBtn.addEventListener('click', closeAuthModal);
    signupLoginModal.querySelector('.modal-overlay').addEventListener('click', closeAuthModal);

    const loginTabBtn = document.getElementById('login-tab-btn');
    const signupTabBtn = document.getElementById('signup-tab-btn');
    const loginFormContainer = document.getElementById('login-form-container');
    const signupFormContainer = document.getElementById('signup-form-container');

    loginTabBtn.addEventListener('click', () => {
        loginTabBtn.classList.add('active');
        signupTabBtn.classList.remove('active');
        loginFormContainer.classList.remove('hidden');
        signupFormContainer.classList.add('hidden');
    });

    signupTabBtn.addEventListener('click', () => {
        signupTabBtn.classList.add('active');
        loginTabBtn.classList.remove('active');
        signupFormContainer.classList.remove('hidden');
        loginFormContainer.classList.add('hidden');
    });


const paymentGuideDisplay = document.getElementById('landing-gc-payment-guide');
    // Load payment guide text into the purchase form
    getDoc(doc(db, "settings", "paymentGuide")).then(docSnap => {
        if (docSnap.exists() && docSnap.data().text) {
            paymentGuideDisplay.innerHTML = `<p class="font-semibold mb-2">How to Pay:</p><p>${docSnap.data().text.replace(/\n/g, '<br>')}</p>`;
        } else {
            paymentGuideDisplay.textContent = 'Please contact the salon to complete your payment.';
        }
    });
    

    landingLoginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('landing-email').value;
        const password = document.getElementById('landing-password').value;
        const loginBtn = document.getElementById('landing-login-btn');
        const btnText = loginBtn.querySelector('.btn-text');
        const spinner = loginBtn.querySelector('i');
        const emailKey = 'loginAttempts_' + email.toLowerCase();
        const lockoutKey = 'lockoutUntil_' + email.toLowerCase();

        const lockoutUntil = localStorage.getItem(lockoutKey);
        if (lockoutUntil && Date.now() < parseInt(lockoutUntil)) {
            const remainingTime = Math.ceil((parseInt(lockoutUntil) - Date.now()) / (1000 * 60));
            lockoutMessageDiv.textContent = `Too many failed attempts. Please try again in ${remainingTime} minutes.`;
            lockoutMessageDiv.classList.remove('hidden');
            return;
        } else if (lockoutUntil) {
            localStorage.removeItem(lockoutKey);
        }
        lockoutMessageDiv.classList.add('hidden');

        btnText.textContent = 'Logging In...';
        spinner.classList.remove('hidden');
        loginBtn.disabled = true;

        try {
            await signInWithEmailAndPassword(auth, email, password);
            localStorage.removeItem(emailKey); 
            localStorage.removeItem(lockoutKey);
            closeAuthModal(); 
        } catch (error) {
            let attempts = (parseInt(localStorage.getItem(emailKey)) || 0) + 1;
            if (attempts >= loginSecuritySettings.maxAttempts) {
                const lockoutTime = Date.now() + loginSecuritySettings.lockoutMinutes * 60 * 1000;
                localStorage.setItem(lockoutKey, lockoutTime);
                localStorage.removeItem(emailKey);
                lockoutMessageDiv.textContent = `Login disabled for ${loginSecuritySettings.lockoutMinutes} minutes due to too many failed attempts.`;
                lockoutMessageDiv.classList.remove('hidden');
            } else {
                localStorage.setItem(emailKey, attempts);
                alert(`Login Failed: ${error.message}. You have ${loginSecuritySettings.maxAttempts - attempts} attempts remaining.`);
            }
        } finally {
            btnText.textContent = 'Log In';
            spinner.classList.add('hidden');
            loginBtn.disabled = false;
        }
    });

    landingSignupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const signupBtn = document.getElementById('landing-signup-btn');
        const btnText = signupBtn.querySelector('.btn-text');
        const spinner = signupBtn.querySelector('i');

        btnText.textContent = 'Signing Up...';
        spinner.classList.remove('hidden');
        signupBtn.disabled = true;

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            await setDoc(doc(db, "clients", user.uid), { name: name, email: email, role: 'client', createdAt: serverTimestamp() });
            closeAuthModal(); 
        } catch (error) {
            alert(`Sign Up Failed: ${error.message}`);
        } finally {
            btnText.textContent = 'Sign Up';
            spinner.classList.add('hidden');
            signupBtn.disabled = false;
        }
    });

    const peopleSelect = document.getElementById('appointment-people-landing');
    for (let i = 1; i <= 20; i++) {
        peopleSelect.appendChild(new Option(i, i));
    }

// REPLACE the onSnapshot in initLandingPage with this getDoc
const technicianSelect = document.getElementById('appointment-technician-select-landing');
getDoc(doc(db, "public_data", "technicians")).then(docSnap => {
    if (docSnap.exists()) {
        const techNames = docSnap.data().names || [];
        technicianSelect.innerHTML = '<option>Any Technician</option>';
        techNames.forEach(name => {
            technicianSelect.appendChild(new Option(name, name));
        });
    }
});
    
    const step1 = document.getElementById('booking-step-1');
    const step2 = document.getElementById('booking-step-2');
    document.getElementById('booking-next-btn').addEventListener('click', () => {
        step1.classList.add('hidden');
        step2.classList.remove('hidden');
    });
    document.getElementById('booking-prev-btn').addEventListener('click', () => {
        step2.classList.add('hidden');
        step1.classList.remove('hidden');
    });

    const servicesContainerLanding = document.getElementById('services-container-landing');
    const hiddenCheckboxContainerLanding = document.getElementById('hidden-checkbox-container-landing');
    let landingServicesData = {};
    
    getDocs(collection(db, "services")).then(servicesSnapshot => {
        servicesData = {}; 
        landingServicesData = {};
        servicesSnapshot.forEach(doc => { 
            servicesData[doc.id] = doc.data().items;
            landingServicesData[doc.id] = doc.data().items; 
        });
        
        servicesContainerLanding.innerHTML = '';
        hiddenCheckboxContainerLanding.innerHTML = '';
        Object.keys(landingServicesData).forEach(category => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'category-button p-4 border border-gray-200 rounded-lg text-left bg-white hover:border-pink-300 hover:bg-pink-50 transition-all duration-200 shadow-sm';
            btn.dataset.category = category;
            btn.innerHTML = `<h3 class="text-lg font-bold text-pink-700">${category}</h3><span class="text-sm text-gray-500 mt-1 block">Click to select</span><span class="selection-count hidden mt-2 bg-pink-600 text-white text-xs font-bold px-2 py-1 rounded-full"></span>`;
            servicesContainerLanding.appendChild(btn);
            landingServicesData[category].forEach(service => {
                const val = `${service.p || ''}${service.name}${service.price ? ' ' + service.price : ''}`;
                const cb = document.createElement('input');
                cb.type = 'checkbox'; cb.name = 'service-landing'; cb.value = val; cb.dataset.category = category;
                hiddenCheckboxContainerLanding.appendChild(cb);
            });
        });
    });

    const serviceModalLanding = document.getElementById('landing-booking-service-modal');
    const serviceModalContentLanding = document.getElementById('landing-booking-service-modal-content');
    
    servicesContainerLanding.addEventListener('click', (e) => {
        const btn = e.target.closest('.category-button');
        if (btn) {
            const category = btn.dataset.category;
            document.getElementById('landing-booking-modal-title').textContent = category;
            serviceModalContentLanding.innerHTML = '';
            landingServicesData[category].forEach(service => {
                const val = `${service.p || ''}${service.name}${service.price ? ' ' + service.price : ''}`;
                const sourceCb = hiddenCheckboxContainerLanding.querySelector(`input[value="${val}"]`);
                const label = document.createElement('label');
                label.className = 'flex items-center p-3 hover:bg-pink-50 cursor-pointer rounded-lg';
                label.innerHTML = `<input type="checkbox" class="form-checkbox modal-checkbox-landing" value="${val}" ${sourceCb && sourceCb.checked ? 'checked' : ''}><span class="ml-3 text-gray-700 flex-grow">${service.name}</span>${service.price ? `<span class="font-semibold">${service.price}</span>` : ''}`;
                serviceModalContentLanding.appendChild(label);
            });
            serviceModalLanding.classList.remove('hidden');
            serviceModalLanding.classList.add('flex');
        }
    });

    document.getElementById('landing-booking-service-modal-done-btn').addEventListener('click', () => {
        serviceModalContentLanding.querySelectorAll('.modal-checkbox-landing').forEach(modalCb => {
            const sourceCb = hiddenCheckboxContainerLanding.querySelector(`input[value="${modalCb.value}"]`);
            if (sourceCb) sourceCb.checked = modalCb.checked;
        });
        serviceModalLanding.classList.add('hidden');
        serviceModalLanding.classList.remove('flex');
        
        document.querySelectorAll('#services-container-landing .category-button').forEach(button => {
            const cat = button.dataset.category;
            const count = hiddenCheckboxContainerLanding.querySelectorAll(`input[data-category="${cat}"]:checked`).length;
            const badge = button.querySelector('.selection-count');
            if (count > 0) {
                badge.textContent = `${count} selected`;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        });
    });

    addAppointmentFormLanding.addEventListener('submit', async (e) => {
        e.preventDefault();
        const services = Array.from(document.querySelectorAll('input[name="service-landing"]:checked')).map(el => el.value);
        if (services.length === 0) {
            alert('Please select at least one service.');
            return;
        }
        
        const bookingDate = new Date(document.getElementById('appointment-datetime-landing').value);
        const validation = isBookingTimeValid(bookingDate);
        if (!validation.valid) {
            alert(validation.message);
            return;
        }

        const appointmentData = {
            name: document.getElementById('appointment-client-name-landing').value,
            phone: document.getElementById('appointment-phone-landing').value,
            people: document.getElementById('appointment-people-landing').value,
            technician: document.getElementById('appointment-technician-select-landing').value,
            appointmentTimestamp: Timestamp.fromDate(bookingDate),
            notes: document.getElementById('appointment-notes-landing').value,
            services: services,
            bookingType: 'Online'
        };

        try {
            await addDoc(collection(db, "appointments"), appointmentData);
            await sendBookingNotificationEmail(appointmentData);

            alert('Appointment booked successfully!');
            addAppointmentFormLanding.reset();
            step2.classList.add('hidden');
            step1.classList.remove('hidden');

            document.querySelectorAll('#services-container-landing .selection-count').forEach(badge => badge.classList.add('hidden'));
            hiddenCheckboxContainerLanding.querySelectorAll('input').forEach(cb => cb.checked = false);

        } catch (error) {
            console.error("Error booking appointment:", error);
            alert("Could not book appointment. Please try again.");
        }
    });

    const updateFeatureVisibility = (settings) => {
        const showClientRegistration = settings.showClientLogin !== false;
        const showPromos = settings.showPromotions !== false;
        const showGiftCards = settings.showGiftCards !== false;
        const showNailArt = settings.showNailArt !== false;
        
        const signupTab = document.getElementById('signup-tab-btn').parentElement;
        if (signupTab) {
             signupTab.style.display = showClientRegistration ? 'block' : 'none';
        }
        
        document.getElementById('promotions-landing').style.display = showPromos ? '' : 'none';
        document.querySelector('.nav-item-promotions').style.display = showPromos ? '' : 'none';
        
        document.getElementById('gift-card-landing').style.display = showGiftCards ? '' : 'none';
        document.querySelector('.nav-item-gift-card').style.display = showGiftCards ? '' : 'none';

        document.getElementById('nails-idea-landing').style.display = showNailArt ? '' : 'none';
        document.querySelector('.nav-item-nails-idea').style.display = showNailArt ? '' : 'none';
    };

    onSnapshot(doc(db, "settings", "features"), (docSnap) => {
        if (docSnap.exists()) {
            updateFeatureVisibility(docSnap.data());
        } else {
            updateFeatureVisibility({ showClientLogin: true, showPromotions: true, showGiftCards: true, showNailArt: true });
        }
    });
}

// --- CLIENT DASHBOARD SCRIPT ---
// REPLACE the entire initClientDashboard function
function initClientDashboard(clientId, clientData) {
    document.getElementById('client-welcome-name').textContent = `Welcome back, ${clientData.name}!`;
    document.getElementById('client-sign-out-btn').addEventListener('click', () => signOut(auth));

    const openPurchaseModalForClient = (client) => {
        const purchaseModal = document.getElementById('gift-card-purchase-modal');
        const userInfoSection = document.getElementById('gc-user-info-section');

        // *** HIDE the user info section ***
        if (userInfoSection) {
            userInfoSection.classList.add('hidden');
        }
        // Pre-fill and disable user info fields
        document.getElementById('gc-buyer-name').value = client.name;
        document.getElementById('gc-buyer-name').disabled = true;
        document.getElementById('gc-buyer-phone').value = client.phone || '';
        document.getElementById('gc-buyer-phone').disabled = true;
        document.getElementById('gc-buyer-email').value = clientData.email;
        document.getElementById('gc-buyer-email').disabled = true;

        // Initialize designer and show the modal
        initializeLandingGiftCardDesigner();
        purchaseModal.classList.remove('hidden');
    };
    // Opens a new tab with just the gift card for printing or saving as an image
    const openCardForPrint = (card) => {
        const expiryText = card.expiresAt ? `Expires: ${card.expiresAt.toDate().toLocaleDateString()}` : '';
        const cardHTML = `
            <html>
                <head>
                    <title>Your Gift Card ${card.code}</title>
                    <script src="https://cdn.tailwindcss.com"></script>
                    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Poppins:wght@400;600&family=Parisienne&display=swap" rel="stylesheet">
                    <style>
                        body { font-family: 'Poppins', sans-serif; display: flex; align-items: center; justify-content: center; margin: 0; background-color: #f0f0f0; }
                        .font-parisienne { font-family: 'Parisienne', cursive; }
                        .card { text-shadow: 1px 1px 3px rgba(0,0,0,0.6); }
                    </style>
                </head>
                <body>
                    <div class="card w-[400px] h-[228px] rounded-lg p-4 flex flex-col justify-between bg-cover bg-center text-white" 
                         style="background-image: url('${card.backgroundUrl}');">
                        <div class="flex justify-between items-start">
                            <img src="https://placehold.co/100x100/d63384/FFFFFF?text=NE" class="w-12 h-12 rounded-full border-2 border-white" />
                            <div class="text-right">
                                <p class="font-parisienne text-3xl">Gift Card</p>
                                <p class="text-xs font-semibold tracking-wider">Nails Express</p>
                            </div>
                        </div>
                        <div class="text-center"><p class="text-5xl font-bold">$${card.balance.toFixed(2)}</p></div>
                        <div class="text-xs">
                            <div class="flex justify-between font-semibold">
                                <span style="display: ${card.recipientName ? 'inline' : 'none'}">FOR: <span class="font-normal">${card.recipientName}</span></span>
                                <span style="display: ${card.senderName ? 'inline' : 'none'}">FROM: <span class="font-normal">${card.senderName}</span></span>
                            </div>
                            <p class="mt-2 text-center font-mono tracking-widest text-sm">${card.code}</p>
                            <p class="mt-1 text-center text-[10px] opacity-80" style="display: ${expiryText ? 'block' : 'none'}">${expiryText}</p>
                        </div>
                    </div>
                </body>
            </html>
        `;
        const printWindow = window.open('', '_blank');
        printWindow.document.write(cardHTML);
        printWindow.document.close();
        printWindow.focus();
    };

    const renderClientGiftCards = (cards) => {
        const container = document.getElementById('client-gift-cards-container');
        if (!container) return;

        container.innerHTML = '';
        if (cards.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center col-span-full">You do not have any gift cards.</p>';
            return;
        }

        cards.forEach(card => {
            const cardEl = document.createElement('div');
            cardEl.className = 'bg-white p-3 rounded-lg shadow-md space-y-3';
            
            const expiryText = card.expiresAt ? `Expires: ${card.expiresAt.toDate().toLocaleDateString()}` : '';
            
            cardEl.innerHTML = `
                <div class="w-full h-[200px] shadow-lg rounded-lg p-4 flex flex-col justify-between bg-cover bg-center text-white" 
                     style="background-image: url('${card.backgroundUrl}'); text-shadow: 1px 1px 3px rgba(0,0,0,0.6);">
                    <div class="flex justify-between items-start">
                        <img src="https://placehold.co/100x100/d63384/FFFFFF?text=NE" class="w-12 h-12 rounded-full border-2 border-white" />
                        <div class="text-right">
                            <p class="font-parisienne text-3xl">Gift Card</p>
                            <p class="text-xs font-semibold tracking-wider">Nails Express</p>
                        </div>
                    </div>
                    <div class="text-center"><p class="text-5xl font-bold">$${card.balance.toFixed(2)}</p></div>
                    <div class="text-xs">
                        <div class="flex justify-between font-semibold">
                            <span>FOR: <span class="font-normal">${card.recipientName}</span></span>
                            <span>FROM: <span class="font-normal">${card.senderName}</span></span>
                        </div>
                        <p class="mt-2 text-center font-mono tracking-widest text-sm">${card.code}</p>
                        <p class="mt-1 text-center text-[10px] opacity-80" style="display: ${expiryText ? 'block' : 'none'}">${expiryText}</p>
                    </div>
                </div>
                <div class="flex justify-between items-center pt-2">
                     <span class="px-2 py-1 text-xs font-semibold rounded-full ${card.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">${card.status}</span>
                     <div class="flex gap-2">
                        <button data-card-id="${card.id}" class="download-card-btn text-gray-500 hover:text-blue-600" title="Download/Print"><i class="fas fa-download"></i></button>
                        <button data-card-id="${card.id}" class="share-card-btn text-gray-500 hover:text-pink-600" title="Share"><i class="fas fa-share-alt"></i></button>
                     </div>
                </div>
            `;
            container.appendChild(cardEl);
        });
    };

 const setupClientTabs = () => {
        const tabs = document.getElementById('client-dashboard-tabs');
        tabs.addEventListener('click', (e) => {
            const button = e.target.closest('button');
            if (!button) return;
            document.querySelectorAll('#client-dashboard-tabs .tab-btn').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            document.querySelectorAll('.client-tab-content').forEach(content => content.classList.add('hidden'));
            document.getElementById(button.id.replace('-tab', '-content')).classList.remove('hidden');
        });
    };


    const renderClientAppointments = (appointments) => {
        const container = document.getElementById('client-upcoming-appointments');
        container.innerHTML = '';
        const upcoming = appointments.filter(a => a.appointmentTimestamp.toDate() > new Date());
        if (upcoming.length === 0) {
            container.innerHTML = '<p class="text-gray-500">You have no upcoming appointments.</p>';
            return;
        }
        upcoming.forEach(appt => {
            const el = document.createElement('div');
            el.className = 'bg-white p-4 rounded-lg shadow';
            el.innerHTML = `<p class="font-bold">${new Date(appt.appointmentTimestamp.seconds * 1000).toLocaleString()}</p><p>${appt.services.join(', ')}</p><p class="text-sm text-gray-600">With: ${appt.technician}</p>`;
            container.appendChild(el);
        });
    };

    const renderClientHistory = (history) => {
         const container = document.getElementById('client-appointment-history');
        container.innerHTML = '';
        if (history.length === 0) {
            container.innerHTML = '<p class="text-gray-500">You have no past appointments.</p>';
            return;
        }
        history.forEach(visit => {
            const el = document.createElement('div');
            el.className = 'bg-white p-4 rounded-lg shadow';
            el.innerHTML = `<p class="font-bold">${new Date(visit.checkOutTimestamp.seconds * 1000).toLocaleDateString()}</p><p>${visit.services}</p><p class="text-sm text-gray-600">With: ${visit.technician}</p>${visit.colorCode ? `<p class="text-sm text-gray-600">Color: ${visit.colorCode}</p>` : ''}`;
            container.appendChild(el);
        });
    };

    const calculateAndRenderFavorites = (history) => {
        if (history.length === 0) return;
        const techCounts = history.reduce((acc, visit) => {
            if (visit.technician) acc[visit.technician] = (acc[visit.technician] || 0) + 1;
            return acc;
        }, {});
        const colorCounts = history.reduce((acc, visit) => {
            if(visit.colorCode) acc[visit.colorCode] = (acc[visit.colorCode] || 0) + 1;
            return acc;
        }, {});

        const favTech = Object.keys(techCounts).length > 0 ? Object.keys(techCounts).reduce((a, b) => techCounts[a] > techCounts[b] ? a : b) : 'N/A';
        const favColor = Object.keys(colorCounts).length > 0 ? Object.keys(colorCounts).reduce((a, b) => colorCounts[a] > colorCounts[b] ? a : b) : 'N/A';

        document.getElementById('favorite-technician').textContent = favTech;
        document.getElementById('favorite-color').textContent = favColor;
    };


    // Listeners for snapshots (appointments, history, etc.)
    onSnapshot(query(collection(db, "appointments"), where("name", "==", clientData.name)), (snapshot) => { renderClientAppointments(snapshot.docs.map(doc => ({...doc.data(), id: doc.id}))); });
    onSnapshot(query(collection(db, "finished_clients"), where("name", "==", clientData.name), orderBy("checkOutTimestamp", "desc")), (snapshot) => { const history = snapshot.docs.map(doc => ({...doc.data(), id: doc.id})); renderClientHistory(history); calculateAndRenderFavorites(history); });

    let allClientGiftCards = [];
    onSnapshot(query(collection(db, "gift_cards"), where("createdBy", "==", clientId), orderBy("createdAt", "desc")), (snapshot) => {
        allClientGiftCards = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        renderClientGiftCards(allClientGiftCards);
    });

    // Event listener for the entire gift card container
    document.getElementById('client-gift-cards-container').addEventListener('click', (e) => {
        const downloadBtn = e.target.closest('.download-card-btn');
        const shareBtn = e.target.closest('.share-card-btn');
        
        if (downloadBtn) {
            const cardId = downloadBtn.dataset.cardId;
            const card = allClientGiftCards.find(c => c.id === cardId);
            if (card) openCardForPrint(card);
        }

        if (shareBtn) {
            const cardId = shareBtn.dataset.cardId;
            const card = allClientGiftCards.find(c => c.id === cardId);
            if (card) {
                // For simplicity, we can use the Web Share API if available, or just copy a link
                if (navigator.share) {
                    navigator.share({
                        title: 'Nails Express Gift Card',
                        text: `Check out this gift card for Nails Express! Code: ${card.code}`,
                        url: window.location.href,
                    }).catch(console.error);
                } else {
                    alert('Sharing is not supported on this browser. Try the download button!');
                }
            }
        }
    });

   document.getElementById('client-photo-upload').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const storageRef = ref(storage, `client_galleries/${clientId}/${Date.now()}_${file.name}`);
        try {
            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);
            await updateDoc(doc(db, "clients", clientId), {
                photoGallery: arrayUnion(downloadURL)
            });
            alert('Photo uploaded successfully!');
        } catch (error) {
            console.error("Error uploading photo:", error);
            alert("Could not upload photo.");
        }
        e.target.value = '';
    });

    document.getElementById('client-book-new-btn').addEventListener('click', () => {
        openAddAppointmentModal(getLocalDateString(), clientData);
    });
     // *** NEW LISTENER FOR THE "BUY MORE" BUTTON ***
    document.getElementById('client-buy-gift-card-btn').addEventListener('click', () => {
        openPurchaseModalForClient(clientData);
    });

    setupClientTabs();
}

// --- MAIN CHECK-IN APP SCRIPT ---
function initMainApp(userRole, userName) {
    // --- START: MOBILE MENU LOGIC (REPLACE YOUR OLD BLOCK WITH THIS) ---
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileSidebar = document.getElementById('mobile-sidebar');
    const mobileSidebarCloseBtn = document.getElementById('mobile-sidebar-close-btn');
    const mobileSidebarOverlay = document.getElementById('mobile-sidebar-overlay');
    const mobileNavLinksContainer = document.getElementById('mobile-nav-links');
    const topNavContainer = document.getElementById('top-nav');

    // Function to open the sidebar
    const openSidebar = () => {
        mobileSidebar.classList.remove('translate-x-full');
        mobileSidebarOverlay.classList.remove('hidden');
    };

    // Function to close the sidebar
    const closeSidebar = () => {
        mobileSidebar.classList.add('translate-x-full');
        mobileSidebarOverlay.classList.add('hidden');
    };
    
    // Build and Populate Navigation Links
    let navHTML = `
        <button class="top-nav-btn relative" data-target="check-in">
            Check-in
            <span id="check-in-nav-count" class="absolute -top-1 -right-1 bg-pink-600 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center hidden">0</span>
        </button>
        <button class="top-nav-btn relative" data-target="booking">
            Booking
            <span id="booking-nav-count" class="absolute -top-1 -right-1 bg-blue-600 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center hidden">0</span>
        </button>
    `;

    // Add admin-only links if the user is an admin
    if (userRole === 'admin') {
        navHTML += `

            <button class="top-nav-btn" data-target="nails-idea">Nails Inspo</button>
            <button class="top-nav-btn" data-target="color-chart">Color Chart</button>
            <button class="top-nav-btn" data-target="report">Report</button>
            <button class="top-nav-btn" data-target="setting">Setting</button>
        `;
    }
    
    // Populate both the desktop and mobile navigation containers
    topNavContainer.innerHTML = navHTML;
    mobileNavLinksContainer.innerHTML = navHTML;
   // --- ADD THIS NEW BLOCK TO ADD THE LOGOUT BUTTON ---
    const mobileLogoutButtonHTML = `
        <button id="mobile-logout-btn" class="top-nav-btn mt-4 w-full text-left bg-pink-100 text-pink-700">
            <i class="fas fa-sign-out-alt mr-2"></i>Logout
        </button>
    `;
    mobileNavLinksContainer.insertAdjacentHTML('beforeend', mobileLogoutButtonHTML);
    // --- END OF NEW BLOCK ---
    // Add event listeners
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', openSidebar);
    }
    if (mobileSidebarCloseBtn) {
        mobileSidebarCloseBtn.addEventListener('click', closeSidebar);
    }
    if (mobileSidebarOverlay) {
        mobileSidebarOverlay.addEventListener('click', closeSidebar);
    }
    
    // Add listener to close sidebar when a nav link is clicked
    if (mobileNavLinksContainer) {
        mobileNavLinksContainer.addEventListener('click', (e) => {
            if (e.target.closest('.top-nav-btn')) {
                // We need to find the corresponding desktop button to click it
                const target = e.target.closest('.top-nav-btn').dataset.target;
                const desktopButton = topNavContainer.querySelector(`[data-target="${target}"]`);
                if (desktopButton) {
                    desktopButton.click();
                }
                closeSidebar();
            }
        });
    }
     // --- ADD THIS NEW BLOCK TO MAKE THE LOGOUT BUTTON WORK ---
    const mobileLogoutBtn = document.getElementById('mobile-logout-btn');
    if (mobileLogoutBtn) {
        mobileLogoutBtn.addEventListener('click', () => {
            signOut(auth);
            closeSidebar(); // Also close the sidebar on logout
        });
    }
    // --- END: MOBILE MENU LOGIC ---
    // --- END OF NEW BLOCK ---
     // Personalize the header subtitle
    const appSubtitle = document.getElementById('app-subtitle');
    if (appSubtitle) {
        appSubtitle.textContent = `Welcome, ${userName}!`;
    }
    const dashboardContent = document.getElementById('dashboard-content');
    const mainAppContainer = document.getElementById('main-app-container');
    const logoLink = document.getElementById('logo-link');
    const topNav = document.getElementById('top-nav');
    const allMainSections = document.querySelectorAll('.main-section');
    const notificationBell = document.getElementById('notification-bell');
    const notificationCount = document.getElementById('notification-count');
    const notificationDropdown = document.getElementById('notification-dropdown');
    const checkInNavCount = document.getElementById('check-in-nav-count');
    const bookingNavCount = document.getElementById('booking-nav-count');
    const appLoadTimestamp = Timestamp.now();
    const adminDashboardView = document.getElementById('admin-dashboard-view');
    const staffDashboardView = document.getElementById('staff-dashboard-view');

    // Role-based Dashboard View
    if (userRole === 'admin') {
        adminDashboardView.classList.remove('hidden');
        staffDashboardView.classList.add('hidden');
    } else {
        adminDashboardView.classList.add('hidden');
        staffDashboardView.classList.remove('hidden');
        const welcomeHeading = document.getElementById('staff-welcome-heading');
        if (welcomeHeading) {
            welcomeHeading.textContent = `My Earning Details`;
        }
    }

    const updateNavCounts = () => {
        const checkInCount = allActiveClients.length;
        if (checkInNavCount) {
            if (checkInCount > 0) {
                checkInNavCount.textContent = checkInCount;
                checkInNavCount.classList.remove('hidden');
            } else {
                checkInNavCount.classList.add('hidden');
            }
        }

        const bookingCount = allAppointments.length;
        if (bookingNavCount) {
            if (bookingCount > 0) {
                bookingNavCount.textContent = bookingCount;
                bookingNavCount.classList.remove('hidden');
            } else {
                bookingNavCount.classList.add('hidden');
            }
        }
    };
    
    const updateNotificationDisplay = () => {
        const unreadCount = notifications.filter(n => !n.read).length;
        notificationCount.textContent = unreadCount;
        notificationCount.style.display = unreadCount > 0 ? 'block' : 'none';

        notificationDropdown.innerHTML = notifications.length === 0 
            ? '<div class="p-4 text-center text-sm text-gray-500">No new notifications</div>' 
            : '';
        
        notifications.forEach(n => {
            const item = document.createElement('div');
            item.className = `notification-item ${!n.read ? 'font-bold bg-pink-50' : ''}`;
            item.innerHTML = `<p class="text-gray-800">${n.message}</p><p class="text-xs text-gray-400 mt-1">${n.timestamp.toLocaleString()}</p>`;
            notificationDropdown.appendChild(item);
        });
    };

    const addNotification = (type, message, itemId = null) => {
        const newNotification = { id: Date.now() + Math.random(), type: type, message: message, timestamp: new Date(), read: false, itemId: itemId };
        notifications.unshift(newNotification);
        updateNotificationDisplay();

        const bellIcon = notificationBell.querySelector('i');
        bellIcon.classList.remove('ring-animation');
        void bellIcon.offsetWidth;
        bellIcon.classList.add('ring-animation');
    };
    
    dashboardContent.classList.remove('hidden');
    mainAppContainer.classList.add('hidden');

    logoLink.addEventListener('click', () => {
        dashboardContent.classList.remove('hidden');
        mainAppContainer.classList.add('hidden');
        topNav.querySelectorAll('.top-nav-btn').forEach(btn => btn.classList.remove('active'));
    });

// NEW Reusable Navigation Function
const navigateToSection = (target) => {
    // De-activate all buttons in both desktop and mobile nav
    document.querySelectorAll('#top-nav .top-nav-btn, #mobile-nav-links .top-nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Activate the correct buttons in both navs
    const desktopBtn = topNavContainer.querySelector(`[data-target="${target}"]`);
    if (desktopBtn) desktopBtn.classList.add('active');
    const mobileBtn = mobileNavLinksContainer.querySelector(`[data-target="${target}"]`);
    if (mobileBtn) mobileBtn.classList.add('active');

    // Switch the main content view
    dashboardContent.classList.add('hidden');
    mainAppContainer.classList.remove('hidden');
    allMainSections.forEach(section => section.classList.add('hidden'));

    switch (target) {
        case 'check-in':
            document.getElementById('check-in-section').classList.remove('hidden');
            document.getElementById('check-in-tab').click();
            break;
        case 'booking':
            document.getElementById('calendar-content').classList.remove('hidden');
            break;
        case 'nails-idea':
            document.getElementById('nails-idea-content').classList.remove('hidden');
            break;
        case 'color-chart': // ADD THIS CASE
            document.getElementById('color-chart-content').classList.remove('hidden');
            initColorChart();
            break;
        case 'report':
            document.getElementById('reports-content').classList.remove('hidden');
            document.getElementById('salon-earning-report-tab').click();
            break;
        case 'setting':
            document.getElementById('admin-content').classList.remove('hidden');
            document.getElementById('user-management-tab').click();
            break;
    }
};

// NEW Simplified Desktop Nav Listener
topNav.addEventListener('click', (e) => {
    const button = e.target.closest('.top-nav-btn');
    if (button) {
        navigateToSection(button.dataset.target);
    }
});
    
    notificationBell.addEventListener('click', () => {
        notificationDropdown.classList.toggle('hidden');
        if (!notificationDropdown.classList.contains('hidden')) {
            notifications.forEach(n => n.read = true);
            setTimeout(updateNotificationDisplay, 300);
        }
    });



    const checkInForm = document.getElementById('check-in-form');
    const peopleCountSelect = document.getElementById('people-count');
    const servicesContainer = document.getElementById('services-container');
    const hiddenCheckboxContainer = document.getElementById('hidden-checkbox-container');
    const serviceModal = document.getElementById('service-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalContent = document.getElementById('modal-content');
    const modalDoneBtn = document.getElementById('modal-done-btn');
    const modalOverlay = document.querySelector('#service-modal .modal-overlay');

    const checkoutModal = document.getElementById('checkout-modal');
    const checkoutForm = document.getElementById('checkout-form');
    const viewDetailModal = document.getElementById('view-detail-modal');
    
    const editEarningModal = document.getElementById('edit-earning-modal');
    const editEarningForm = document.getElementById('edit-earning-form');
    const editSalonEarningModal = document.getElementById('edit-salon-earning-modal');
    const editSalonEarningForm = document.getElementById('edit-salon-earning-form');
    const clientFormModal = document.getElementById('client-form-modal');
    const clientForm = document.getElementById('client-form');
    const geminiSmsModal = document.getElementById('gemini-sms-modal');
    const confirmModal = document.getElementById('confirm-modal');
    const confirmModalMessage = document.getElementById('confirm-modal-message');
    const confirmConfirmBtn = document.getElementById('confirm-confirm-btn');
    const confirmCancelBtn = document.getElementById('confirm-cancel-btn');
    const logUsageModal = document.getElementById('log-usage-modal');
    const logUsageForm = document.getElementById('log-usage-form');
    const shareModal = document.getElementById('share-modal');
    const editGiftCardModal = document.getElementById('edit-gift-card-modal');
    const clientProfileModal = document.getElementById('client-profile-modal');


    const rebookOtherInput = document.getElementById('rebook-other-input');
    const rebookSelect = document.getElementById('rebook-select');

    const activeCountSpan = document.getElementById('active-count');
    const finishedCountSpan = document.getElementById('finished-count');
    const todayCountSpan = document.getElementById('today-count');
    const calendarCountSpan = document.getElementById('calendar-count');
    const processingCountSpan = document.getElementById('processing-count');
    
    const calendarGrid = document.getElementById('calendar');
    const monthYearDisplay = document.getElementById('month-year-display');
    let currentMonth = new Date().getMonth();
    let currentYear = new Date().getFullYear();

    let currentTechFilterCalendar = 'All', currentTechFilterActive = 'All', currentTechFilterProcessing = 'All', currentTechFilterFinished = 'All', currentFinishedDateFilter = '';
    let currentEarningTechFilter = 'All', currentEarningDateFilter = '', currentEarningRangeFilter = 'daily',
    currentDashboardDateFilter = '', currentDashboardRangeFilter = String(new Date().getMonth()),
    currentStaffDashboardDateFilter = '', currentStaffDashboardRangeFilter = String(new Date().getMonth());
    
    let currentDashboardEarningTechFilter = 'All', currentDashboardEarningDateFilter = '', currentDashboardEarningRangeFilter = 'daily';
    let currentSalonEarningDateFilter = '', currentSalonEarningRangeFilter = String(new Date().getMonth()), currentExpenseMonthFilter = '', currentDashboardApptTechFilter = 'All';

   // ... other variables
let aggregatedClients = [], allEarnings = [], allSalonEarnings = [], allExpenses = [], allInventory = [], allNailIdeas = [], allInventoryUsage = [], allGiftCards = [], allPromotions = [], allServicesList = [], technicianColorMap = {}, sentReminderIds = [], currentRotation = 0;
// ... more variables
    let techniciansAndStaff = [], technicians = [];
    let allExpenseCategories = [], allPaymentAccounts = [], allSuppliers = [];
// ADD THIS ENTIRE NEW BLOCK for the lightbox
const nailIdeaLightbox = document.getElementById('nail-idea-lightbox');
const lightboxCloseBtn = document.getElementById('lightbox-close-btn');
const lightboxPrevBtn = document.getElementById('lightbox-prev-btn');
const lightboxNextBtn = document.getElementById('lightbox-next-btn');
const lightboxImage = document.getElementById('lightbox-image');
const lightboxTitle = document.getElementById('lightbox-title');
const lightboxShape = document.getElementById('lightbox-shape');
const lightboxColor = document.getElementById('lightbox-color');
const lightboxCategories = document.getElementById('lightbox-categories');
const lightboxDescription = document.getElementById('lightbox-description'); // ADD THIS LINE
let currentLightboxIndex = 0;
let currentGalleryData = [];
    
    let confirmCallback = null;
    const showConfirmModal = (message, onConfirm, confirmText = 'Delete') => {
        confirmModalMessage.textContent = message;
        confirmCallback = onConfirm;
        confirmConfirmBtn.textContent = confirmText;

        // Also update the button color for better user experience
        confirmConfirmBtn.classList.remove('bg-red-600', 'bg-green-600'); // Reset colors
        if (confirmText.toLowerCase() === 'activate') {
            confirmConfirmBtn.classList.add('bg-green-600');
        } else {
            confirmConfirmBtn.classList.add('bg-red-600'); // Default to red for delete
        }

        confirmModal.classList.remove('hidden');
        confirmModal.classList.add('flex');
    };
    const closeConfirmModal = () => { confirmModal.classList.add('hidden'); confirmModal.classList.remove('flex'); confirmCallback = null; };
    confirmConfirmBtn.addEventListener('click', () => { if (confirmCallback) { confirmCallback(); } closeConfirmModal(); });
    confirmCancelBtn.addEventListener('click', closeConfirmModal);
    document.querySelector('.confirm-modal-overlay').addEventListener('click', closeConfirmModal);

    const initializeChart = (chartInstance, ctx, type, data, options) => {
        if (chartInstance) { chartInstance.data = data; chartInstance.options = options; chartInstance.update(); } 
        else { chartInstance = new Chart(ctx, { type, data, options }); }
        return chartInstance;
    };
    
// REPLACE the old getDateRange function with this one
const getDateRange = (filter, specificDate = null) => {
    const now = new Date();
    let startDate, endDate = new Date(now);

    if (filter === 'daily' || filter === 'today') {
        const dateToUse = specificDate ? new Date(specificDate + 'T00:00:00') : now;
        startDate = new Date(dateToUse.getFullYear(), dateToUse.getMonth(), dateToUse.getDate());
        endDate = new Date(dateToUse.getFullYear(), dateToUse.getMonth(), dateToUse.getDate(), 23, 59, 59, 999);
        return { startDate, endDate };
    }

    switch (filter) {
        case 'this_week':
            const firstDayOfWeek = now.getDate() - now.getDay();
            startDate = new Date(now.setDate(firstDayOfWeek));
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 6);
            endDate.setHours(23, 59, 59, 999);
            break;
        case 'this_month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
            break;
        case 'this_year':
            startDate = new Date(now.getFullYear(), 0, 1);
            endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
            break;
         case 'last-year':
            const lastYear = now.getFullYear() - 1;
            startDate = new Date(lastYear, 0, 1);
            endDate = new Date(lastYear, 11, 31, 23, 59, 59, 999);
            break;
        default: // Monthly filter
            if (!isNaN(parseInt(filter))) {
                const month = parseInt(filter, 10);
                startDate = new Date(now.getFullYear(), month, 1);
                endDate = new Date(now.getFullYear(), month + 1, 0, 23, 59, 59, 999);
            }
            break;
    }
    return { startDate, endDate };
};
    // --- NEW DASHBOARD LOGIC ---
    const updateDashboard = () => {
        if (currentUserRole === 'admin') {
            updateAdminDashboard();
        } else {
            updateStaffDashboard();
        }
    };
// DELETE the old cardColors array and REPLACE it with this new palette
const colorPalette = [
    { card: 'bg-pink-100', text: 'text-pink-800', bg: 'rgba(255, 99, 132, 0.5)', border: 'rgba(255, 99, 132, 1)' },
    { card: 'bg-blue-100', text: 'text-blue-800', bg: 'rgba(54, 162, 235, 0.5)', border: 'rgba(54, 162, 235, 1)' },
    { card: 'bg-green-100', text: 'text-green-800', bg: 'rgba(75, 192, 192, 0.5)', border: 'rgba(75, 192, 192, 1)' },
    { card: 'bg-yellow-100', text: 'text-yellow-800', bg: 'rgba(255, 206, 86, 0.5)', border: 'rgba(255, 206, 86, 1)' },
    { card: 'bg-purple-100', text: 'text-purple-800', bg: 'rgba(153, 102, 255, 0.5)', border: 'rgba(153, 102, 255, 1)' },
    { card: 'bg-teal-100', text: 'text-teal-800', bg: 'rgba(32, 201, 151, 0.5)', border: 'rgba(32, 201, 151, 1)' },
    { card: 'bg-indigo-100', text: 'text-indigo-800', bg: 'rgba(79, 70, 229, 0.5)', border: 'rgba(79, 70, 229, 1)' },
    { card: 'bg-orange-100', text: 'text-orange-800', bg: 'rgba(255, 159, 64, 0.5)', border: 'rgba(255, 159, 64, 1)' }
];

    const updateStaffEarningsReport = (filteredData) => {
    const staffContainer = document.getElementById('staff-earning-cards-container');
    const ctx = document.getElementById('staff-earnings-chart')?.getContext('2d');

    if (!staffContainer || !ctx) return;

    // Calculate total earnings for each staff member (excluding admin)
    const staffTotals = {};
    const staffExcludingAdmins = techniciansAndStaff.filter(user => user.role !== 'admin');

    staffExcludingAdmins.forEach(staff => {
        staffTotals[staff.name] = 0; // Initialize
    });

    filteredData.forEach(earning => {
        staffExcludingAdmins.forEach(staff => {
            const staffNameLower = staff.name.toLowerCase();
            if (earning[staffNameLower]) {
                staffTotals[staff.name] += earning[staffNameLower];
            }
        });
    });

    // Render Staff Earning Cards using the new palette
    staffContainer.innerHTML = '';
    if (staffExcludingAdmins.length === 0) {
        staffContainer.innerHTML = '<p class="col-span-full text-center text-gray-500">No staff found.</p>';
    } else {
        staffExcludingAdmins.forEach((staff, index) => {
            // --- Calculations ---
            const totalEarning = staffTotals[staff.name] || 0;
            const commission = totalEarning * 0.70;
            const checkPayout = commission * 0.70;
            const cashPayout = commission * 0.30; // This is the remaining 30% of the commission

            // --- HTML Template ---
            const colorTheme = colorPalette[index % colorPalette.length];
            const cardHTML = `
                <div class="dashboard-card ${colorTheme.card} p-4 flex flex-col">
                    <div>
                        <h4 class="font-bold ${colorTheme.text} truncate">${staff.name}</h4>
                        <p class="text-2xl font-bold text-gray-700 mb-2">$${totalEarning.toFixed(2)}</p>
                    </div>
                    <div class="mt-auto space-y-1 text-xs text-gray-600 border-t border-gray-400/20 pt-2">
                        <div class="flex justify-between">
                            <span>Total Payout:</span>
                            <span class="font-semibold text-gray-800">$${commission.toFixed(2)}</span>
                        </div>
                        <div class="flex justify-between">
                            <span>Check Payout:</span>
                            <span class="font-semibold text-gray-800">$${checkPayout.toFixed(2)}</span>
                        </div>
                        <div class="flex justify-between">
                            <span>Cash Payout:</span>
                            <span class="font-semibold text-gray-800">$${cashPayout.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            `;
            staffContainer.innerHTML += cardHTML;
        });
    }
    // Render Staff Earnings Chart using the new palette
    const labels = Object.keys(staffTotals);
    const data = Object.values(staffTotals);

    // Dynamically create color arrays that match the cards
    const backgroundColors = labels.map((_, index) => colorPalette[index % colorPalette.length].bg);
    const borderColors = labels.map((_, index) => colorPalette[index % colorPalette.length].border);

    const chartConfig = {
        labels,
        datasets: [{
            label: 'Total Earnings',
            data: data,
            backgroundColor: backgroundColors,
            borderColor: borderColors,
            borderWidth: 1
        }]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            }
        },
        scales: {
            y: {
                beginAtZero: true
            }
        }
    };

    staffEarningsChart = initializeChart(staffEarningsChart, ctx, 'bar', chartConfig, chartOptions);
};
        
    // REPLACE the old updateAdminDashboard function with this one
const updateAdminDashboard = () => {
    const filter = document.getElementById('dashboard-date-filter').value;
    const { startDate, endDate } = getDateRange(currentDashboardRangeFilter, currentDashboardDateFilter);
    if (!startDate) return;

    const filteredSalonEarnings = allSalonEarnings.filter(e => {
        const earnDate = e.date.toDate();
        return earnDate >= startDate && earnDate <= endDate;
    });

    const filteredAppointments = allAppointments.filter(a => {
        const apptDate = a.appointmentTimestamp.toDate();
        return apptDate >= startDate && apptDate <= endDate;
    });

    const filteredExpenses = allExpenses.filter(ex => {
        const expDate = ex.date.toDate();
        return expDate >= startDate && expDate <= endDate;
    });

    const filteredGiftCards = allGiftCards.filter(gc => {
        const gcDate = gc.createdAt.toDate();
        return gcDate >= startDate && gcDate <= endDate;
    });

    // Card Calculations
    let totalRevenue = 0;
    let totalCash = 0;
    const techEarnings = {};

    filteredSalonEarnings.forEach(earning => {
        let dailyTotal = 0;
        techniciansAndStaff.forEach(tech => {
            const techNameLower = tech.name.toLowerCase();
            const dailyEarning = earning[techNameLower] || 0;
            dailyTotal += dailyEarning;
            techEarnings[tech.name] = (techEarnings[tech.name] || 0) + dailyEarning;
        });
        dailyTotal += earning.sellGiftCard || 0;
        const dailyCash = dailyTotal - ((earning.totalCredit || 0) + (earning.check || 0) + (earning.returnGiftCard || 0) + (earning.venmo || 0) + (earning.square || 0));
        totalRevenue += dailyTotal;
        totalCash += dailyCash;
    });

    document.getElementById('total-salon-revenue-card').textContent = `$${totalRevenue.toFixed(2)}`;
    document.getElementById('total-salon-cash-card').textContent = `$${totalCash.toFixed(2)}`;

    const topEarningTechnician = Object.keys(techEarnings).reduce((a, b) => techEarnings[a] > techEarnings[b] ? a : b, '-');
    document.getElementById('top-earning-technician-card').textContent = topEarningTechnician;

    const techBookings = filteredAppointments.reduce((acc, curr) => {
        if (curr.technician && curr.technician !== 'Any Technician') {
            acc[curr.technician] = (acc[curr.technician] || 0) + 1;
        }
        return acc;
    }, {});
    const topBookingTechnician = Object.keys(techBookings).reduce((a, b) => techBookings[a] > techBookings[b] ? a : b, '-');
    document.getElementById('top-booking-technician-card').textContent = topBookingTechnician;

    // New Card Calculations
    document.getElementById('total-appointments-card').textContent = allAppointments.length;
    document.getElementById('total-clients-card').textContent = allClients.length;

    const totalGiftCardValue = filteredGiftCards.reduce((sum, gc) => sum + gc.amount, 0);
    document.getElementById('total-gift-card-card').textContent = `$${totalGiftCardValue.toFixed(2)}`;

    const totalExpense = filteredExpenses.reduce((sum, ex) => sum + ex.amount, 0);
    document.getElementById('total-expense-card').textContent = `$${totalExpense.toFixed(2)}`;

    // Render Graph and Upcoming Appointments
   updateSalonRevenueChart(filteredSalonEarnings, currentDashboardRangeFilter);
    updateStaffEarningsReport(filteredSalonEarnings); // <-- ADD THIS LINE
   renderDetailedAppointmentsList('admin-upcoming-appointments-list', allAppointments, currentDashboardApptTechFilter);
};


// REPLACE the old updateStaffDashboard function with this one
const updateStaffDashboard = () => {
const filter = document.getElementById('staff-dashboard-date-filter').value;
const { startDate, endDate } = getDateRange(currentStaffDashboardRangeFilter, currentStaffDashboardDateFilter);
    if (!startDate) return;

    // --- Calculations for Cards & Graph (This part remains the same) ---
    const mySalonEarnings = allSalonEarnings.filter(e => {
        const earnDate = e.date.toDate();
        return earnDate >= startDate && earnDate <= endDate;
    });

    const staffNameLower = currentUserName.toLowerCase();
    let myTotalEarning = 0;
    mySalonEarnings.forEach(earning => {
        myTotalEarning += earning[staffNameLower] || 0;
    });

    const myTotalPayout = myTotalEarning * 0.70;
    const myCheckPayout = myTotalPayout * 0.70;
    const myCashPayout = myTotalPayout - myCheckPayout;

   document.getElementById('my-earning-card').textContent = `$${myTotalEarning.toFixed(2)}`;
    document.getElementById('my-total-payout-card').textContent = `$${myTotalPayout.toFixed(2)}`;
    document.getElementById('my-cash-payout-card').textContent = `$${myCashPayout.toFixed(2)}`;
    document.getElementById('my-check-payout-card').textContent = `$${myCheckPayout.toFixed(2)}`;

    // --- ADD THIS NEW BLOCK FOR THE TIPS CARD ---
    // Filter all earnings data for the current user and date range
    const myFilteredEarnings = allEarnings.filter(e => {
        const earnDate = e.date.toDate();
        return e.staffName === currentUserName && earnDate >= startDate && earnDate <= endDate;
    });

    // Sum up the tips from the filtered earnings
    const myTotalTips = myFilteredEarnings.reduce((sum, e) => sum + (e.tip || 0), 0);
    
    // Update the new "My Tips" card
    const myTipsCard = document.getElementById('my-tips-card');
    if (myTipsCard) {
        myTipsCard.textContent = `$${myTotalTips.toFixed(2)}`;
    }
    // --- END OF NEW BLOCK ---
// --- ADD THIS NEW BLOCK FOR APPOINTMENT & CLIENT COUNTS ---
// Filter for upcoming appointments assigned to the current staff member
const myUpcomingAppointments = allAppointments.filter(appt => 
    appt.technician === currentUserName && appt.appointmentTimestamp.toDate() > new Date()
);

// Count unique clients served by the current staff member from their history
const myClientNames = new Set(
    allFinishedClients
        .filter(client => client.technician === currentUserName)
        .map(client => client.name)
);

// Update the dashboard cards with the new counts
const myAppointmentsCard = document.getElementById('my-appointments-card');
if (myAppointmentsCard) {
    myAppointmentsCard.textContent = myUpcomingAppointments.length;
}

const myClientsCard = document.getElementById('my-clients-card');
if (myClientsCard) {
    myClientsCard.textContent = myClientNames.size;
}
// --- END OF NEW BLOCK ---
    updateMyEarningsChart(mySalonEarnings, currentStaffDashboardRangeFilter, currentUserName);

    // --- NEW: Logic for the Earning Details Table ---
    const detailsDateFilter = document.getElementById('staff-details-date-filter').value;
    let myPayoutDetails = allEarnings.filter(e => e.staffName === currentUserName);

    // If a specific date is chosen in the new filter, use it
    if (detailsDateFilter) {
        const specificDate = new Date(detailsDateFilter + 'T00:00:00');
        const startOfDay = new Date(specificDate.getFullYear(), specificDate.getMonth(), specificDate.getDate());
        const endOfDay = new Date(specificDate.getFullYear(), specificDate.getMonth(), specificDate.getDate(), 23, 59, 59, 999);
        myPayoutDetails = myPayoutDetails.filter(e => {
            const earnDate = e.date.toDate();
            return earnDate >= startOfDay && earnDate <= endOfDay;
        });
    }

   
    // Update the title with the client count
    const clientCount = myPayoutDetails.length;
    const detailsTitle = document.getElementById('staff-details-title');
    if (detailsTitle) {
        detailsTitle.textContent = `My Earning Details (${clientCount} Client${clientCount === 1 ? '' : 's'})`;
    }

    // Render the table and update its live totals
    const { totalEarning, totalTip } = renderStaffEarningsTable(myPayoutDetails, 'staff-dashboard-earning-table', 'staff-dashboard-total-earning', 'staff-dashboard-total-tip');
    const totalMainSpan = document.getElementById('staff-dashboard-filtered-earning-total-main');
    const totalTipSpan = document.getElementById('staff-dashboard-filtered-earning-total-tip');
    if(totalMainSpan) totalMainSpan.textContent = `Total ($${totalEarning.toFixed(2)})`;
    if(totalTipSpan) totalTipSpan.textContent = `Tip ($${totalTip.toFixed(2)})`;
    // --- THIS IS THE NEW LINE THAT FIXES THE PROBLEM ---
    renderDetailedAppointmentsList('staff-upcoming-appointments-list', allAppointments, currentUserName);
};
    // ADD THIS ENTIRE NEW FUNCTION
const renderDetailedAppointmentsList = (containerId, appointments, techFilter = 'All') => {
    const container = document.getElementById(containerId);
    if (!container) return;

    let filteredAppointments = appointments.filter(a => a.appointmentTimestamp.toDate() > new Date());

    if (techFilter !== 'All' && techFilter !== 'Any Technician') {
        filteredAppointments = filteredAppointments.filter(appt => appt.technician === techFilter);
    } else if (techFilter === 'Any Technician') {
        filteredAppointments = filteredAppointments.filter(appt => appt.technician === 'Any Technician');
    }

    if (filteredAppointments.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-500 py-4">No upcoming appointments found.</p>';
        return;
    }

    let tableHTML = `
        <table class="w-full text-sm text-left text-gray-600">
            <thead class="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0">
                <tr>
                    <th scope="col" class="px-6 py-3">Name</th>
                    <th scope="col" class="px-6 py-3">Services</th>
                    <th scope="col" class="px-6 py-3">Technician</th>
                    <th scope="col" class="px-6 py-3">Group</th>
                    <th scope="col" class="px-6 py-3">Date & Time</th>
                    <th scope="col" class="px-6 py-3 text-center">Action</th>
                </tr>
            </thead>
            <tbody>`;

    filteredAppointments.sort((a, b) => a.appointmentTimestamp.seconds - b.appointmentTimestamp.seconds);

    filteredAppointments.forEach(appt => {
        tableHTML += `
            <tr class="border-b">
                <td class="px-6 py-3 font-medium">${appt.name}</td>
                <td class="px-6 py-3">${Array.isArray(appt.services) ? appt.services.join(', ') : appt.services}</td>
                <td class="px-6 py-3">${appt.technician}</td>
                <td class="px-6 py-3 text-center">${appt.people || 1}</td>
                <td class="px-6 py-3">${new Date(appt.appointmentTimestamp.seconds * 1000).toLocaleString([], {dateStyle: 'short', timeStyle: 'short'})}</td>
                <td class="px-6 py-3 text-center"><button data-id="${appt.id}" class="checkin-today-btn text-blue-500 hover:underline">Check In</button></td>
            </tr>
        `;
    });

    tableHTML += '</tbody></table>';
    container.innerHTML = tableHTML;
};
    
const updateSalonRevenueChart = (data, filter) => {
    const ctx = document.getElementById('salon-revenue-chart')?.getContext('2d');
    if (!ctx) return;

    let labels = [];
    let revenueData = [];
    let cashData = [];
    let revenueCounts = {};
    let cashCounts = {};

    data.forEach(item => {
        const date = item.date.toDate();
        let key;

        // NEW: Updated logic to handle the new filter values
        if (filter === 'daily') {
            key = date.getHours();
        } else if (filter === 'this-year' || filter === 'last-year') {
            key = date.getMonth();
        } else if (!isNaN(parseInt(filter))) { // Handles month filters (e.g., '0' for Jan, '1' for Feb)
            key = date.getDate();
        }

        let dailyTotal = 0;
        techniciansAndStaff.forEach(tech => { dailyTotal += item[tech.name.toLowerCase()] || 0; });
        dailyTotal += item.sellGiftCard || 0;

        const dailyCash = dailyTotal - ((item.totalCredit || 0) + (item.check || 0) + (item.returnGiftCard || 0) + (item.venmo || 0) + (item.square || 0));

        if (key !== undefined) {
             revenueCounts[key] = (revenueCounts[key] || 0) + dailyTotal;
             cashCounts[key] = (cashCounts[key] || 0) + dailyCash;
        }
    });

    // NEW: Updated logic to build the chart labels and data correctly
    if (filter === 'daily') {
        labels = Array.from({ length: 24 }, (_, i) => `${i}:00`);
        revenueData = labels.map((_, i) => revenueCounts[i] || 0);
        cashData = labels.map((_, i) => cashCounts[i] || 0);
    } else if (filter === 'this-year' || filter === 'last-year') {
        labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        revenueData = labels.map((_, i) => revenueCounts[i] || 0);
        cashData = labels.map((_, i) => cashCounts[i] || 0);
    } else if (!isNaN(parseInt(filter))) {
        const year = new Date().getFullYear();
        const month = parseInt(filter);
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        labels = Array.from({ length: daysInMonth }, (_, i) => i + 1);
        revenueData = labels.map(day => revenueCounts[day] || 0);
        cashData = labels.map(day => cashCounts[day] || 0);
    }

    const chartConfig = {
        labels,
        datasets: [{
            label: 'Total Revenue',
            data: revenueData,
            backgroundColor: 'rgba(219, 39, 119, 0.5)',
            borderColor: 'rgba(219, 39, 119, 1)',
            borderWidth: 1,
            tension: 0.1
        }, {
            label: 'Cash Revenue',
            data: cashData,
            backgroundColor: 'rgba(16, 185, 129, 0.5)',
            borderColor: 'rgba(16, 185, 129, 1)',
            borderWidth: 1,
            tension: 0.1
        }]
    };
    salonRevenueChart = initializeChart(salonRevenueChart, ctx, 'line', chartConfig, { responsive: true, maintainAspectRatio: false });
};
const updateMyEarningsChart = (data, filter, staffName) => {
    const ctx = document.getElementById('my-earnings-chart')?.getContext('2d');
    if (!ctx) return;

    const staffNameLower = staffName.toLowerCase();
    const labels = [];
    const datasets = {
        earning: { label: 'Total Earning', data: [], backgroundColor: 'rgba(219, 39, 119, 0.5)', borderColor: 'rgba(219, 39, 119, 1)' },
        payout: { label: 'Total Payout', data: [], backgroundColor: 'rgba(16, 185, 129, 0.5)', borderColor: 'rgba(16, 185, 129, 1)' },
        cash: { label: 'Cash Payout', data: [], backgroundColor: 'rgba(245, 158, 11, 0.5)', borderColor: 'rgba(245, 158, 11, 1)' },
        check: { label: 'Check Payout', data: [], backgroundColor: 'rgba(59, 130, 246, 0.5)', borderColor: 'rgba(59, 130, 246, 1)' }
    };

    const timeData = {};

    data.forEach(item => {
        const date = item.date.toDate();
        let key;

        // CORRECTED: Logic now handles the new filter values
        if (filter === 'daily') {
            key = date.getHours();
        } else if (filter === 'this-year' || filter === 'last-year') {
            key = date.getMonth();
        } else if (!isNaN(parseInt(filter))) { // Handles month numbers
            key = date.getDate();
        }
        
        if (key !== undefined) {
            if (!timeData[key]) {
                timeData[key] = { earning: 0 };
            }
            timeData[key].earning += item[staffNameLower] || 0;
        }
    });

    const populateDatasets = (key) => {
        const earning = timeData[key]?.earning || 0;
        const payout = earning * 0.70;
        const checkPayout = payout * 0.70;
        const cashPayout = payout - checkPayout;

        datasets.earning.data.push(earning);
        datasets.payout.data.push(payout);
        datasets.cash.data.push(cashPayout);
        datasets.check.data.push(checkPayout);
    };

    // CORRECTED: Logic to build labels based on new filter values
    if (filter === 'daily') {
        for (let i = 0; i < 24; i++) { labels.push(`${i}:00`); populateDatasets(i); }
    } else if (filter === 'this-year' || filter === 'last-year') {
        labels.push('Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec');
        for (let i = 0; i < 12; i++) { populateDatasets(i); }
    } else if (!isNaN(parseInt(filter))) {
        const year = new Date().getFullYear();
        const month = parseInt(filter);
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        for (let i = 1; i <= daysInMonth; i++) { labels.push(i); populateDatasets(i); }
    }


    const chartConfig = {
        labels,
        datasets: Object.values(datasets).map(ds => ({ ...ds, borderWidth: 1, tension: 0.1 }))
    };
    myEarningsChart = initializeChart(myEarningsChart, ctx, 'line', chartConfig, { responsive: true, maintainAspectRatio: false });
};
    document.getElementById('dashboard-date-filter').addEventListener('change', updateAdminDashboard);
    document.getElementById('staff-dashboard-date-filter').addEventListener('change', updateStaffDashboard);
    
    // END NEW DASHBOARD LOGIC

const loadAndRenderServices = async () => {
        const servicesSnapshot = await getDocs(collection(db, "services"));
        servicesData = {};
        servicesSnapshot.forEach(doc => { servicesData[doc.id] = doc.data().items; });

        // --- ADD THIS NEW BLOCK ---
        allServicesList = []; // Reset the list
        Object.values(servicesData).forEach(categoryItems => {
            categoryItems.forEach(service => {
                if (service.name && service.price) {
                    // Extract the number from a price string like "$50"
                    const priceValue = parseFloat(service.price.replace(/[^0-9.]/g, ''));
                    if (!isNaN(priceValue)) {
                        allServicesList.push({
                            name: service.name,
                            price: priceValue
                        });
                    }
                }
            });
        });
        // --- END OF NEW BLOCK ---

        renderCheckInServices();
    };

    const renderCheckInServices = () => {
        servicesContainer.innerHTML = '';
        hiddenCheckboxContainer.innerHTML = '';
        Object.keys(servicesData).forEach(category => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'category-button p-4 border border-gray-200 rounded-lg text-left bg-white hover:border-pink-300 hover:bg-pink-50 transition-all duration-200 shadow-sm';
            btn.dataset.category = category;
            btn.innerHTML = `<h3 class="text-lg font-bold text-pink-700">${category}</h3><span class="text-sm text-gray-500 mt-1 block">Click to select</span><span class="selection-count hidden mt-2 bg-pink-600 text-white text-xs font-bold px-2 py-1 rounded-full"></span>`;
            servicesContainer.appendChild(btn);
            servicesData[category].forEach(service => {
                const val = `${service.p || ''}${service.name}${service.price ? ' ' + service.price : ''}`;
                const cb = document.createElement('input');
                cb.type = 'checkbox'; cb.name = 'service'; cb.value = val; cb.dataset.category = category;
                hiddenCheckboxContainer.appendChild(cb);
            });
        });
    };

    const applyClientFilters = (clients, searchTerm, techFilter, dateFilter) => {
        let filtered = clients;
        if (searchTerm) { filtered = filtered.filter(c => c.name.toLowerCase().includes(searchTerm)); }
        if (techFilter !== 'All' && techFilter !== 'Any Technician') { filtered = filtered.filter(c => c.technician === techFilter); } 
        else if (techFilter === 'Any Technician') { filtered = filtered.filter(c => c.technician === 'Any Technician'); }
        if (dateFilter) {
            filtered = filtered.filter(c => {
                if (!c.checkOutTimestamp) return false;
                return getLocalDateString(new Date(c.checkOutTimestamp.seconds * 1000)) === dateFilter;
            });
        }
        return filtered;
    };

    const renderActiveClients = (clients) => {
        const tbody = document.querySelector('#clients-table tbody');
        if (!tbody) return;
        tbody.innerHTML = clients.length === 0 ? `<tr><td colspan="4" class="py-6 text-center text-gray-400">No clients in the queue.</td></tr>` : '';
        clients.forEach((client, index) => {
            const row = tbody.insertRow();
            row.className = 'bg-white border-b';
            row.innerHTML = `<td class="px-6 py-4 text-center font-medium text-gray-900">${index + 1}</td><td class="px-6 py-4">${client.name}</td><td class="px-6 py-4">${client.services}</td><td class="px-6 py-4 text-center space-x-4"><button data-id="${client.id}" class="move-to-processing-btn" title="Move to Processing"><i class="fas fa-arrow-right text-lg text-blue-500 hover:text-blue-700"></i></button><button data-id="${client.id}" class="detail-btn-active" title="View Details"><i class="fas fa-info-circle text-lg text-gray-500 hover:text-gray-700"></i></button></td>`;
        });
    };

    const renderProcessingClients = (clients) => {
        const tbody = document.querySelector('#processing-table tbody');
        if (!tbody) return;
        tbody.innerHTML = clients.length === 0 ? `<tr><td colspan="6" class="py-6 text-center text-gray-400">No clients are being processed.</td></tr>` : '';
        clients.forEach((client, index) => {
            const row = tbody.insertRow();
            row.className = 'bg-white border-b';
            row.innerHTML = `<td class="px-6 py-4 text-center font-medium text-gray-900">${index + 1}</td><td class="px-6 py-4">${client.name}</td><td class="px-6 py-4">${client.services}</td><td class="px-6 py-4">${client.technician}</td><td class="px-6 py-4">${client.checkInTime}</td><td class="px-6 py-4 text-center"><button data-id="${client.id}" class="check-out-btn-processing" title="Check Out"><i class="fas fa-check-circle text-lg text-green-500 hover:text-green-700"></i></button></td>`;
        });
    };

    const renderFinishedClients = (clients) => {
        const tbody = document.querySelector('#finished-clients-table tbody');
        if (!tbody) return;
        tbody.innerHTML = clients.length === 0 ? `<tr><td colspan="6" class="py-6 text-center text-gray-400">No finished clients found.</td></tr>` : '';
        clients.forEach((client, index) => {
            const row = tbody.insertRow();
            row.className = 'bg-white border-b';
            row.innerHTML = `<td class="px-6 py-4 text-center font-medium text-gray-900">${index + 1}</td><td class="px-6 py-4">${client.name}</td><td class="px-6 py-4 text-center">${client.people}</td><td class="px-6 py-4">${client.services}</td><td class="px-6 py-4">${client.checkInTime}</td><td class="px-6 py-4 text-center space-x-2"><button data-id="${client.id}" class="view-feedback-btn" title="View Feedback"><i class="fas fa-comment text-lg text-green-500 hover:text-green-700"></i></button><button data-id="${client.id}" class="draft-sms-btn" title="Draft SMS with Gemini"><i class="fas fa-sms text-lg text-purple-500 hover:text-purple-700"></i></button><button data-id="${client.id}" class="delete-btn-finished" title="Delete"><i class="fas fa-trash-alt text-lg text-red-500 hover:text-red-700"></i></button></td>`;
        });
    };

   // Located inside initMainApp()
const renderClientsList = () => {
    if (!allFinishedClients || !allClients) {
        const tbody = document.querySelector('#clients-list-table tbody');
        if (tbody) tbody.innerHTML = `<tr><td colspan="5" class="py-6 text-center text-gray-400">Loading client data...</td></tr>`;
        return;
    }

    const clientsMap = new Map();
    allFinishedClients.forEach(visit => {
        if (!visit.name) return;
        const clientKey = visit.name.toLowerCase();
        if (!clientsMap.has(clientKey)) {
            clientsMap.set(clientKey, { name: visit.name, phone: visit.phone || '', email: visit.email || '', lastVisit: visit.checkOutTimestamp.toMillis(), techCounts: {}, colorCounts: {} });
        }
        const clientData = clientsMap.get(clientKey);
        if (visit.checkOutTimestamp.toMillis() > clientData.lastVisit) {
            clientData.lastVisit = visit.checkOutTimestamp.toMillis();
            clientData.phone = visit.phone || clientData.phone;
            clientData.email = visit.email || clientData.email; // Capture email from last visit
        }
        if (visit.technician) { clientData.techCounts[visit.technician] = (clientData.techCounts[visit.technician] || 0) + 1; }
        if (visit.colorCode) { clientData.colorCounts[visit.colorCode] = (clientData.colorCounts[visit.colorCode] || 0) + 1; }
    });

    let processedClients = Array.from(clientsMap.values()).map(client => {
        const findFavorite = (counts) => Object.keys(counts).length > 0 ? Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b) : 'N/A';
        return { ...client, favoriteTech: findFavorite(client.techCounts), favoriteColor: findFavorite(client.colorCounts) };
    });

    const clientInfoMap = new Map(allClients.map(c => [c.name.toLowerCase(), { dob: c.dob, id: c.id, phone: c.phone, email: c.email }]));
    let finalClientList = processedClients.map(aggClient => {
        const key = aggClient.name.toLowerCase();
        const masterInfo = clientInfoMap.get(key);
        return { ...aggClient, id: masterInfo ? masterInfo.id : null, dob: masterInfo ? masterInfo.dob : '', phone: masterInfo && masterInfo.phone ? masterInfo.phone : aggClient.phone, email: masterInfo && masterInfo.email ? masterInfo.email : aggClient.email };
    });

    allClients.forEach(masterClient => {
        if (!clientsMap.has(masterClient.name.toLowerCase())) {
            finalClientList.push({ ...masterClient, lastVisit: null, favoriteTech: 'N/A', favoriteColor: 'N/A' });
        }
    });
    
    aggregatedClients = finalClientList;

    const searchTerm = document.getElementById('search-clients-list').value.toLowerCase();
    const filteredClients = aggregatedClients.filter(c => c.name.toLowerCase().includes(searchTerm));

    const tbody = document.querySelector('#clients-list-table tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (filteredClients.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="py-6 text-center text-gray-400">No clients found.</td></tr>`;
        return;
    }

    filteredClients.forEach(client => {
        const row = tbody.insertRow();
        row.className = 'bg-white border-b';
        // *** UPDATED THIS LINE TO INCLUDE EMAIL ***
        row.innerHTML = `<td class="px-6 py-4 font-medium text-gray-900">${client.name}</td><td class="px-6 py-4">${client.phone || 'N/A'}</td><td class="px-6 py-4">${client.email || 'N/A'}</td><td class="px-6 py-4">${client.lastVisit ? new Date(client.lastVisit).toLocaleDateString() : 'N/A'}</td><td class="px-6 py-4 text-center space-x-2"><button data-id="${client.id}" class="text-indigo-500 hover:text-indigo-700 view-client-profile-btn" title="View Profile"><i class="fas fa-user-circle text-lg"></i></button><button data-id="${client.id}" class="text-blue-500 hover:text-blue-700 edit-client-btn" title="Edit Client"><i class="fas fa-edit text-lg"></i></button><button data-id="${client.id}" class="text-red-500 hover:text-red-700 delete-client-btn" title="Delete Client"><i class="fas fa-trash-alt text-lg"></i></button></td>`;
    });
};

    const applyEarningFilters = (earnings, techFilter, dateFilter, rangeFilter, role, name) => {
        let filtered = earnings;

        if (role !== 'admin') {
            filtered = filtered.filter(e => e.staffName === name);
        } else {
            if (techFilter !== 'All') {
                filtered = filtered.filter(e => e.staffName === techFilter);
            }
        }
        
        const { startDate, endDate } = getDateRange(rangeFilter, dateFilter);
        
        if (startDate && endDate) { 
            filtered = filtered.filter(e => { 
                const earningDate = e.date.toDate(); 
                return earningDate >= startDate && earningDate <= endDate; 
            }); 
        }
        return filtered;
    };

// Located inside initMainApp()
const renderStaffEarningsTable = (earnings, tableId, totalEarningId, totalTipId) => {
    const tbody = document.querySelector(`#${tableId} tbody`);
    if (!tbody) return;

    const colspan = userRole === 'admin' ? 6 : 5;
    tbody.innerHTML = earnings.length === 0 ? `<tr><td colspan="${colspan}" class="py-6 text-center text-gray-400">No earnings found.</td></tr>` : '';

    // *** FIX IS HERE: Re-instating the correct descending sort logic. ***
    // This explicitly sorts the array by the newest date first every time the table is drawn.
    earnings.sort((a, b) => b.date.seconds - a.date.seconds).forEach(earning => {
        const row = tbody.insertRow();
        row.className = 'bg-white border-b';
        let rowHTML = `
            <td class="px-6 py-4">${new Date(earning.date.seconds * 1000).toLocaleDateString()}</td>
            <td class="px-6 py-4 font-medium text-gray-900">${earning.staffName}</td>
            <td class="px-6 py-4">${earning.service || ''}</td>
            <td class="px-6 py-4">$${earning.earning.toFixed(2)}</td>
            <td class="px-6 py-4">$${earning.tip.toFixed(2)}</td>
        `;
        if (userRole === 'admin') {
            rowHTML += `<td class="px-6 py-4 text-center space-x-2"><button data-id="${earning.id}" class="edit-earning-btn text-blue-500 hover:text-blue-700" title="Edit Earning"><i class="fas fa-edit text-lg"></i></button><button data-id="${earning.id}" class="delete-earning-btn text-red-500 hover:text-red-700" title="Delete Earning"><i class="fas fa-trash-alt text-lg"></i></button></td>`;
        }
        row.innerHTML = rowHTML;
    });

    const totalEarning = earnings.reduce((sum, e) => sum + e.earning, 0);
    const totalTip = earnings.reduce((sum, e) => sum + e.tip, 0);

    const totalEarningEl = document.getElementById(totalEarningId);
    const totalTipEl = document.getElementById(totalTipId);
    if(totalEarningEl) totalEarningEl.textContent = `$${totalEarning.toFixed(2)}`;
    if(totalTipEl) totalTipEl.textContent = `$${totalTip.toFixed(2)}`;

    return { totalEarning, totalTip };
};

// Located inside initMainApp()
const renderAllStaffEarnings = () => {
    // Render for Report Page
    const reportFiltered = applyEarningFilters(allEarnings, currentEarningTechFilter, currentEarningDateFilter, currentEarningRangeFilter, userRole, userName);
    const { totalEarning: reportTotalEarning, totalTip: reportTotalTip } = renderStaffEarningsTable(reportFiltered, 'staff-earning-table', 'total-earning', 'total-tip');
    
    const reportTotalMainSpan = document.getElementById('filtered-earning-total-main');
    const reportTotalTipSpan = document.getElementById('filtered-earning-total-tip');
    if(reportTotalMainSpan) reportTotalMainSpan.textContent = `Total ($${reportTotalEarning.toFixed(2)})`;
    if(reportTotalTipSpan) reportTotalTipSpan.textContent = `Tip ($${reportTotalTip.toFixed(2)})`;


    // Render for Dashboard Page
    const dashboardFiltered = applyEarningFilters(allEarnings, currentDashboardEarningTechFilter, currentDashboardEarningDateFilter, currentDashboardEarningRangeFilter, userRole, userName);
    const { totalEarning: dashTotalEarning, totalTip: dashTotalTip } = renderStaffEarningsTable(dashboardFiltered, 'dashboard-staff-earning-table-full', 'dashboard-total-earning', 'dashboard-total-tip');

    const dashTotalMainSpan = document.getElementById('dashboard-filtered-earning-total-main');
    const dashTotalTipSpan = document.getElementById('dashboard-filtered-earning-total-tip');
    if(dashTotalMainSpan) dashTotalMainSpan.textContent = `Total ($${dashTotalEarning.toFixed(2)})`;
    if(dashTotalTipSpan) dashTotalTipSpan.textContent = `Tip ($${dashTotalTip.toFixed(2)})`;

    // *** NEW: Add live client count to the dashboard report title ***
    const clientCount = dashboardFiltered.length;
    const detailsTitle = document.getElementById('dashboard-staff-earning-title');
    if (detailsTitle) {
        detailsTitle.textContent = `Staff Earning Report (${clientCount} Client${clientCount === 1 ? '' : 's'})`;
    }
};
    
    const applySalonEarningFilters = (earnings, dateFilter, rangeFilter) => {
        let filtered = [...earnings];
        const { startDate, endDate } = getDateRange(rangeFilter, dateFilter);
        if (startDate && endDate) { filtered = filtered.filter(e => { const earningDate = e.date.toDate(); return earningDate >= startDate && earningDate <= endDate; }); }
        return filtered;
    };

    const renderSalonEarnings = (earnings) => {
        const tbody = document.querySelector('#salon-earning-table tbody');
        const tfoot = document.querySelector('#salon-earning-table-foot');
        if (!tbody || !tfoot) return;
        tbody.innerHTML = '';
        const footerIds = ['sell-gc', 'return-gc', 'check', 'no-credit', 'total-credit', 'venmo', 'square', 'total', 'cash'];
        const staffAndTechNames = techniciansAndStaff.map(t => t.name.toLowerCase());
        const allFooterIds = [...staffAndTechNames, ...footerIds];
        if (earnings.length === 0) {
            tbody.innerHTML = `<tr><td colspan="${staffAndTechNames.length + 10}" class="py-6 text-center text-gray-400">No salon earnings found.</td></tr>`;
            allFooterIds.forEach(id => { const el = document.getElementById(`total-${id}`); if (el) el.textContent = id === 'no-credit' ? '0' : '$0.00'; });
            staffAndTechNames.forEach(name => {
                const commissionEl = document.getElementById(`commission-${name}`);
                const check70El = document.getElementById(`check70-${name}`);
                const cash30El = document.getElementById(`cash30-${name}`);
                if(commissionEl) commissionEl.textContent = '$0.00'; if(check70El) check70El.textContent = '$0.00'; if(cash30El) cash30El.textContent = '$0.00';
            });
            return;
        }
        let grandTotals = {};
        allFooterIds.forEach(id => grandTotals[id.replace(/-/g, '')] = 0);
        earnings.sort((a, b) => b.date.seconds - a.date.seconds).forEach(earning => {
            const row = tbody.insertRow();
            row.className = 'bg-white border-b';
            let rowHTML = `<td class="px-6 py-4">${new Date(earning.date.seconds * 1000).toLocaleDateString()}</td>`;
            let rowStaffTotal = 0;
            staffAndTechNames.forEach(name => { const techEarning = earning[name] || 0; rowHTML += `<td class="px-6 py-4">$${techEarning.toFixed(2)}</td>`; rowStaffTotal += techEarning; });
            const rowTotal = rowStaffTotal + (earning.sellGiftCard || 0);
            const cash = rowTotal - ((earning.totalCredit || 0) + (earning.check || 0) + (earning.returnGiftCard || 0) + (earning.venmo || 0) + (earning.square || 0));
            rowHTML += `<td class="px-6 py-4">$${(earning.sellGiftCard || 0).toFixed(2)}</td><td class="px-6 py-4">$${(earning.returnGiftCard || 0).toFixed(2)}</td><td class="px-6 py-4">$${(earning.check || 0).toFixed(2)}</td><td class="px-6 py-4">${earning.noOfCredit || 0}</td><td class="px-6 py-4">$${(earning.totalCredit || 0).toFixed(2)}</td><td class="px-6 py-4">$${(earning.venmo || 0).toFixed(2)}</td><td class="px-6 py-4">$${(earning.square || 0).toFixed(2)}</td><td class="px-6 py-4 font-bold">$${rowTotal.toFixed(2)}</td><td class="px-6 py-4 font-bold">$${cash.toFixed(2)}</td><td class="px-6 py-4 text-center space-x-2"><button data-id="${earning.id}" class="edit-salon-earning-btn text-blue-500 hover:text-blue-700" title="Edit Salon Earning"><i class="fas fa-edit text-lg"></i></button><button data-id="${earning.id}" class="delete-salon-earning-btn text-red-500 hover:text-red-700" title="Delete Salon Earning"><i class="fas fa-trash-alt text-lg"></i></button></td>`;
            row.innerHTML = rowHTML;
        });
        earnings.forEach(earning => {
            let rowStaffTotal = 0;
            staffAndTechNames.forEach(name => { const techEarning = earning[name] || 0; grandTotals[name] = (grandTotals[name] || 0) + techEarning; rowStaffTotal += techEarning; });
            const rowTotal = rowStaffTotal + (earning.sellGiftCard || 0);
            const cash = rowTotal - ((earning.totalCredit || 0) + (earning.check || 0) + (earning.returnGiftCard || 0) + (earning.venmo || 0) + (earning.square || 0));
            grandTotals.sellgc += earning.sellGiftCard || 0;
            grandTotals.returngc += earning.returnGiftCard || 0;
            grandTotals.check += earning.check || 0;
            grandTotals.noofcredit += earning.noOfCredit || 0;
            grandTotals.totalcredit += earning.totalCredit || 0;
            grandTotals.venmo += earning.venmo || 0;
            grandTotals.square += earning.square || 0;
            grandTotals.total += rowTotal;
            grandTotals.cash += cash;
        });
        allFooterIds.forEach(id => {
            const el = document.getElementById(`total-${id.replace(/gc/g, '-gc').replace(/of/g, '-of-')}`);
            if (el) { const key = id.replace(/-/g, ''); const value = grandTotals[key] || 0; el.textContent = id === 'noofcredit' ? value : `$${value.toFixed(2)}`; }
        });
        staffAndTechNames.forEach(name => {
            const commission70 = (grandTotals[name] || 0) * 0.70;
            const check70 = commission70 * 0.70;
            const cash30 = commission70 - check70;
            const commissionEl = document.getElementById(`commission-${name}`);
            const check70El = document.getElementById(`check70-${name}`);
            const cash30El = document.getElementById(`cash30-${name}`);
            if(commissionEl) commissionEl.textContent = `$${commission70.toFixed(2)}`;
            if(check70El) check70El.textContent = `$${check70.toFixed(2)}`;
            if(cash30El) cash30El.textContent = `$${cash30.toFixed(2)}`;
        });
    };

    for (let i = 1; i <= 20; i++) peopleCountSelect.appendChild(new Option(i, i));
    for (let i = 1; i <= 20; i++) document.getElementById('appointment-people').appendChild(new Option(i, i));

    const updateSelectionCounts = () => {
        document.querySelectorAll('.category-button').forEach(button => {
            const cat = button.dataset.category;
            const count = hiddenCheckboxContainer.querySelectorAll(`input[data-category="${cat}"]:checked`).length;
            const badge = button.querySelector('.selection-count');
            count > 0 ? (badge.textContent = `${count} selected`, badge.classList.remove('hidden')) : badge.classList.add('hidden');
        });
    };

    const openServiceModal = (category) => {
        modalTitle.textContent = category;
        modalContent.innerHTML = '';
        servicesData[category].forEach(service => {
            const val = `${service.p || ''}${service.name}${service.price ? ' ' + service.price : ''}`;
            const sourceCb = hiddenCheckboxContainer.querySelector(`input[value="${val}"]`);
            const label = document.createElement('label');
            label.className = 'flex items-center p-3 hover:bg-pink-50 cursor-pointer rounded-lg';
            label.innerHTML = `<input type="checkbox" class="form-checkbox modal-checkbox" value="${val}" ${sourceCb && sourceCb.checked ? 'checked' : ''}><span class="ml-3 text-gray-700 flex-grow">${service.name}</span>${service.price ? `<span class="font-semibold">${service.price}</span>` : ''}`;
            modalContent.appendChild(label);
        });
        serviceModal.classList.add('flex'); serviceModal.classList.remove('hidden');
    };

    const closeServiceModal = () => {
        modalContent.querySelectorAll('.modal-checkbox').forEach(modalCb => {
            const sourceCb = hiddenCheckboxContainer.querySelector(`input[value="${modalCb.value}"]`);
            if (sourceCb) sourceCb.checked = modalCb.checked;
        });
        serviceModal.classList.add('hidden'); serviceModal.classList.remove('flex');
        updateSelectionCounts();
    };

    servicesContainer.addEventListener('click', (e) => { const btn = e.target.closest('.category-button'); if (btn) openServiceModal(btn.dataset.category); });
    modalDoneBtn.addEventListener('click', closeServiceModal);
    modalOverlay.addEventListener('click', closeServiceModal);

    checkInForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const services = Array.from(document.querySelectorAll('input[name="service"]:checked')).map(el => el.value);
        if (!document.getElementById('full-name').value || services.length === 0) { return alert('Please enter a name and select at least one service.'); }
        try {
            await addDoc(collection(db, "active_queue"), {
                name: document.getElementById('full-name').value, phone: document.getElementById('phone-number').value || 'N/A', people: document.getElementById('people-count').value,
                bookingType: document.getElementById('booking-type').value, services, checkInTimestamp: serverTimestamp(), status: 'waiting', technician: document.getElementById('checkin-technician-select').value
            });
            checkInForm.reset();
            hiddenCheckboxContainer.querySelectorAll('input').forEach(cb => cb.checked = false);
            updateSelectionCounts();
        } catch (err) { console.error("Error adding document: ", err); alert("Could not add client to the queue."); }
    });

    document.getElementById('queue-content').addEventListener('click', async (e) => {
        const moveBtn = e.target.closest('.move-to-processing-btn');
        const detailBtn = e.target.closest('.detail-btn-active');
        if (moveBtn) { await updateDoc(doc(db, "active_queue", moveBtn.dataset.id), { status: 'processing' }); } 
        else if (detailBtn) { const client = allActiveClients.find(c => c.id === detailBtn.dataset.id); openViewDetailModal(client, `Booking Detail`); }
    });

     document.getElementById('processing-content').addEventListener('click', async (e) => {
        const checkOutBtn = e.target.closest('.check-out-btn-processing');
        if (checkOutBtn) {
            const clientId = checkOutBtn.dataset.id;
            const client = allActiveClients.find(c => c.id === clientId);
            if(client) { document.getElementById('technician-name-select').value = client.technician; }
            document.getElementById('checkout-client-id').value = clientId;
            checkoutModal.classList.remove('hidden'); checkoutModal.classList.add('flex');
        }
    });

    const openViewDetailModal = (client, title = "Client Details") => {
        if (!client) return;
        document.getElementById('view-detail-title').textContent = title;
        const content = document.getElementById('view-detail-content');
        const actions = document.getElementById('view-detail-actions');
        let appointmentDetailsHTML = '<div class="space-y-2"><h4 class="text-lg font-semibold text-gray-800 border-b pb-1">Appointment Details</h4>';
        let appointmentTime = 'N/A';
        if (client.appointmentTimestamp) { appointmentTime = new Date(client.appointmentTimestamp.seconds * 1000).toLocaleString(); } 
        else if (client.checkInTimestamp) { appointmentTime = new Date(client.checkInTimestamp.seconds * 1000).toLocaleString(); }
        appointmentDetailsHTML += `<div><strong class="font-semibold text-gray-700">Date:</strong> ${appointmentTime}</div>`;
        appointmentDetailsHTML += `<div><strong class="font-semibold text-gray-700">Services:</strong> ${Array.isArray(client.services) ? client.services.join(', ') : client.services || 'N/A'}</div>`;
        appointmentDetailsHTML += `<div><strong class="font-semibold text-gray-700">Technician:</strong> ${client.technician || 'N/A'}</div>`;
        appointmentDetailsHTML += `<div><strong class="font-semibold text-gray-700">Booking Type:</strong> ${client.bookingType || 'N/A'}</div>`;
        if (client.colorCode) { appointmentDetailsHTML += `<div><strong class="font-semibold text-gray-700">Color Code:</strong> ${client.colorCode}</div>`; }
        if (client.notes) { appointmentDetailsHTML += `<div><strong class="font-semibold text-gray-700">Notes:</strong> ${client.notes}</div>`; }
        appointmentDetailsHTML += '</div>';
        const lastFinished = allFinishedClients.filter(c => c.name === client.name && c.id !== client.id).sort((a,b) => b.checkOutTimestamp.toMillis() - a.checkOutTimestamp.toMillis())[0];
        let lastVisitHTML = '';
        if (lastFinished) { lastVisitHTML = `<div class="space-y-2"><h4 class="text-lg font-semibold text-gray-800 border-b pb-1">Previous Visit</h4><div><strong class="font-semibold text-gray-700">Date:</strong> ${new Date(lastFinished.checkOutTimestamp.seconds * 1000).toLocaleString()}</div><div><strong class="font-semibold text-gray-700">Services:</strong> ${lastFinished.services || 'N/A'}</div><div><strong class="font-semibold text-gray-700">Color Code:</strong> ${lastFinished.colorCode || 'N/A'}</div><div><strong class="font-semibold text-gray-700">Technician:</strong> ${lastFinished.technician || 'N/A'}</div>${lastFinished.notes ? `<div><strong class="font-semibold text-gray-700">Notes:</strong> ${lastFinished.notes}</div>` : ''}</div>`; }
        const nextAppointment = allAppointments.filter(appt => appt.name === client.name && appt.appointmentTimestamp.toMillis() > Date.now()).sort((a, b) => a.appointmentTimestamp.toMillis() - b.appointmentTimestamp.toMillis())[0];
        let nextAppointmentHTML = `<div class="space-y-2"><h4 class="text-lg font-semibold text-gray-800 border-b pb-1">Next Appointment</h4><div class="font-bold text-pink-600">${nextAppointment ? new Date(nextAppointment.appointmentTimestamp.seconds * 1000).toLocaleString() : 'Not scheduled'}</div></div>`;
        content.innerHTML = `<div class="space-y-2"><h4 class="text-lg font-semibold text-gray-800 border-b pb-1">Client Details</h4><div><strong class="font-semibold text-gray-700">Name:</strong> ${client.name || 'N/A'}</div><div><strong class="font-semibold text-gray-700">Phone:</strong> ${client.phone || 'N/A'}</div><div><strong class="font-semibold text-gray-700">Group Size:</strong> ${client.people || '1'}</div></div>${appointmentDetailsHTML}${lastVisitHTML}${nextAppointmentHTML}`;
        actions.innerHTML = '<button type="button" id="view-detail-close-btn" class="bg-gray-200 text-gray-800 font-semibold py-2 px-6 rounded-lg">Close</button>';
        if(client.appointmentTimestamp && client.status !== 'waiting' && client.status !== 'processing') { actions.insertAdjacentHTML('afterbegin', `<button type="button" data-id="${client.id}" class="bg-blue-500 text-white font-semibold py-2 px-6 rounded-lg booking-action-btn" data-action="checkin">Check In</button><button type="button" data-id="${client.id}" class="bg-red-500 text-white font-semibold py-2 px-6 rounded-lg booking-action-btn" data-action="cancel">Cancel</button>`); }
        document.getElementById('view-detail-close-btn').addEventListener('click', closeViewDetailModal);
        viewDetailModal.classList.remove('hidden'); viewDetailModal.classList.add('flex');
    };

    const closeViewDetailModal = () => { viewDetailModal.classList.add('hidden'); viewDetailModal.classList.remove('flex'); };
    document.getElementById('view-detail-close-btn').addEventListener('click', closeViewDetailModal);
    document.querySelector('.view-detail-modal-overlay').addEventListener('click', closeViewDetailModal);

    document.getElementById('view-detail-actions').addEventListener('click', async (e) => {
         if (e.target.classList.contains('booking-action-btn')) {
            const action = e.target.dataset.action;
            const bookingId = e.target.dataset.id;
            const appointment = allAppointments.find(a => a.id === bookingId);
            if (!appointment) return;
            if (action === 'cancel') { showConfirmModal("Are you sure you want to cancel this booking?", async () => { await deleteDoc(doc(db, "appointments", bookingId)); }); } 
            else if (action === 'checkin') {
                 await addDoc(collection(db, "active_queue"), { name: appointment.name, phone: appointment.phone, people: appointment.people || 1, bookingType: 'Booked - Calendar', services: Array.isArray(appointment.services) ? appointment.services : [appointment.services], technician: appointment.technician, notes: appointment.notes || '', checkInTimestamp: serverTimestamp(), status: 'waiting' });
                await deleteDoc(doc(db, "appointments", bookingId));
            }
            closeViewDetailModal();
        }
    });

// Located inside initMainApp()
const openClientProfileModal = async (client) => {
    // Find all relevant data for the selected client
    const clientData = aggregatedClients.find(c => c.id === client.id);
    if (!clientData) {
        console.error("Could not find aggregated data for client:", client);
        alert("Could not load client profile.");
        return;
    }
    const clientHistory = allFinishedClients.filter(c => c.name === clientData.name);
    const clientAppointments = allAppointments.filter(c => c.name === clientData.name && c.appointmentTimestamp.toDate() > new Date());

    // Populate the modal with basic info
    document.getElementById('profile-client-name').textContent = clientData.name;
    document.getElementById('profile-client-phone').textContent = clientData.phone || 'No phone number';

    // Populate stats cards
    document.getElementById('profile-total-visits').textContent = clientHistory.length;
    const totalSpent = clientHistory.reduce((sum, visit) => {
        const servicesString = Array.isArray(visit.services) ? visit.services.join(', ') : visit.services;
        const prices = (servicesString.match(/\$\d+/g) || []).map(p => Number(p.slice(1)));
        return sum + prices.reduce((a, b) => a + b, 0);
    }, 0);
    document.getElementById('profile-total-spent').textContent = `$${totalSpent.toFixed(2)}`;
    document.getElementById('profile-fav-tech').textContent = clientData.favoriteTech;
    document.getElementById('profile-fav-color').textContent = clientData.favoriteColor;

    // Populate the visit history table
    const historyBody = document.getElementById('profile-history-table-body');
    historyBody.innerHTML = clientHistory.length > 0 ? clientHistory.map(v => 
        `<tr>
            <td class="px-4 py-2">${v.checkOutTimestamp.toDate().toLocaleDateString()}</td>
            <td class="px-4 py-2">${Array.isArray(v.services) ? v.services.join(', ') : v.services}</td>
            <td class="px-4 py-2">${v.technician}</td>
        </tr>`
    ).join('') : '<tr><td colspan="3" class="text-center p-4 text-gray-500">No visit history found.</td></tr>';

    // Populate upcoming appointments
    const apptsContainer = document.getElementById('profile-upcoming-appts');
    apptsContainer.innerHTML = clientAppointments.length > 0 
        ? clientAppointments.map(a => `<div class="bg-blue-50 p-2 rounded-md"><p class="font-semibold">${a.appointmentTimestamp.toDate().toLocaleString()}</p><p class="text-sm">${a.services.join(', ')}</p></div>`).join('')
        : '<p class="text-sm text-gray-500">No upcoming appointments.</p>';

    // The photo gallery logic has been removed from this function.

    // Show the modal
    clientProfileModal.classList.remove('hidden');
};
     document.getElementById('finished-content').addEventListener('click', async (e) => {
        const deleteBtn = e.target.closest('.delete-btn-finished');
        const feedbackBtn = e.target.closest('.view-feedback-btn');
        const draftSmsBtn = e.target.closest('.draft-sms-btn');
        if(deleteBtn) { showConfirmModal("Are you sure you want to delete this client record?", async () => { try { await deleteDoc(doc(db, "finished_clients", deleteBtn.dataset.id)); } catch (err) { console.error("Error deleting finished client: ", err); alert("Could not delete finished client."); } }); } 
        else if (feedbackBtn) { const client = allFinishedClients.find(c => c.id === feedbackBtn.dataset.id); if (client) openViewDetailModal(client, `Booking Detail`); } 
        else if (draftSmsBtn) { const client = allFinishedClients.find(c => c.id === draftSmsBtn.dataset.id); if (client) generateSmsMessage(client); }
    });

    const closeCheckoutModal = () => { checkoutForm.reset(); rebookOtherInput.classList.add('hidden'); checkoutModal.classList.add('hidden'); checkoutModal.classList.remove('flex'); };
    rebookSelect.addEventListener('change', (e) => { if(e.target.value === 'other') { rebookOtherInput.classList.remove('hidden'); } else { rebookOtherInput.classList.add('hidden'); } });
    const technicianNameSelect = document.getElementById('technician-name-select');
    const technicianNameOther = document.getElementById('technician-name-other');
    technicianNameSelect.addEventListener('change', (e) => { if (e.target.value === 'other') { technicianNameOther.classList.remove('hidden'); } else { technicianNameOther.classList.add('hidden'); } });

    checkoutForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const clientId = document.getElementById('checkout-client-id').value;
        const client = allActiveClients.find(c => c.id === clientId);
        if (client) {
             try {
                const clientNameLower = client.name.toLowerCase();
                const existingClient = allClients.find(c => c.name.toLowerCase() === clientNameLower);
                if (!existingClient) {
                    await addDoc(collection(db, "clients"), { name: client.name, phone: client.phone || '', dob: '' });
                }
                const finishedClientData = { ...client };
                delete finishedClientData.id;
                finishedClientData.checkOutTimestamp = serverTimestamp();
                finishedClientData.colorCode = document.getElementById('color-code').value || '';
                let technicianValue = technicianNameSelect.value;
                if(technicianValue === 'other') { technicianValue = technicianNameOther.value; }
                finishedClientData.technician = technicianValue;
                let rebookInfo = rebookSelect.value;
                if (rebookInfo === '2w' || rebookInfo === '3w') {
                    const interval = (rebookInfo === '2w' ? 14 : 21);
                     let nextAppointmentDate = new Date();
                     nextAppointmentDate.setDate(nextAppointmentDate.getDate() + interval);
                     finishedClientData.rebook = nextAppointmentDate.toLocaleString();
                     await addDoc(collection(db, "appointments"), { name: client.name, phone: client.phone, people: client.people, bookingType: client.bookingType, services: client.services, technician: finishedClientData.technician, appointmentTimestamp: Timestamp.fromDate(nextAppointmentDate) });
                } else if (rebookInfo === 'other') {
                   const otherDateValue = document.getElementById('rebook-other-input').value;
                   finishedClientData.rebook = otherDateValue ? new Date(otherDateValue).toLocaleString() : 'Other';
                   if(otherDateValue){ await addDoc(collection(db, "appointments"), { name: client.name, phone: client.phone, people: client.people, bookingType: client.bookingType, services: client.services, technician: finishedClientData.technician, appointmentTimestamp: Timestamp.fromDate(new Date(otherDateValue)) }); }
                } else { finishedClientData.rebook = 'No'; }
                await addDoc(collection(db, "finished_clients"), finishedClientData);
                await deleteDoc(doc(db, "active_queue", clientId));
                closeCheckoutModal();
            } catch(err) { console.error("Error checking out client: ", err); alert("Could not check out client."); }
        }
    });
    document.getElementById('checkout-cancel-btn').addEventListener('click', closeCheckoutModal);
    document.querySelector('.checkout-modal-overlay').addEventListener('click', closeCheckoutModal);

    // ADD THIS ENTIRE NEW FUNCTION
const updateSalonEarningsForDate = async (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    const startOfDay = Timestamp.fromDate(date);
    const endOfDay = Timestamp.fromDate(new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999));

    const q = query(collection(db, "earnings"), where("date", ">=", startOfDay), where("date", "<=", endOfDay));
    const querySnapshot = await getDocs(q);

    const dailyStaffTotals = {};
    // Initialize all known staff with 0 to handle deletions correctly
    techniciansAndStaff.forEach(tech => {
        dailyStaffTotals[tech.name] = 0;
    });

    // Sum up the earnings for the day
    querySnapshot.forEach(doc => {
        const earningData = doc.data();
        dailyStaffTotals[earningData.staffName] = (dailyStaffTotals[earningData.staffName] || 0) + earningData.earning;
    });

    const salonEarningUpdate = {};
    Object.keys(dailyStaffTotals).forEach(staffName => {
        salonEarningUpdate[staffName.toLowerCase()] = dailyStaffTotals[staffName];
    });

    // Add the date back in for filtering purposes
    salonEarningUpdate.date = Timestamp.fromDate(date);

    const salonEarningDocRef = doc(db, "salon_earnings", dateStr);
    await setDoc(salonEarningDocRef, salonEarningUpdate, { merge: true });
};
    onSnapshot(query(collection(db, "active_queue"), orderBy("checkInTimestamp", "asc")), (snapshot) => {
         allActiveClients = snapshot.docs.map(doc => ({ id: doc.id, checkInTime: doc.data().checkInTimestamp ? new Date(doc.data().checkInTimestamp.seconds * 1000).toLocaleString() : 'Pending...', services: (doc.data().services || []).join(', '), ...doc.data() }));
        const waitingClients = allActiveClients.filter(c => c.status === 'waiting');
        const processingClients = allActiveClients.filter(c => c.status === 'processing');
        activeCountSpan.textContent = waitingClients.length;
        processingCountSpan.textContent = processingClients.length;
        renderActiveClients(applyClientFilters(waitingClients, document.getElementById('search-active').value.toLowerCase(), currentTechFilterActive, null));
        renderProcessingClients(applyClientFilters(processingClients, document.getElementById('search-processing').value.toLowerCase(), currentTechFilterProcessing, null));
        updateNavCounts();
    });

    onSnapshot(query(collection(db, "finished_clients"), orderBy("checkOutTimestamp", "desc")), (snapshot) => {
        allFinishedClients = snapshot.docs.map(doc => ({ id: doc.id, checkInTime: doc.data().checkInTimestamp ? new Date(doc.data().checkInTimestamp.seconds * 1000).toLocaleString() : 'N/A', checkOutTimestamp: doc.data().checkOutTimestamp, services: (doc.data().services || []).join(', '), ...doc.data() }));
        finishedCountSpan.textContent = allFinishedClients.length;
        renderFinishedClients(applyClientFilters(allFinishedClients, document.getElementById('search-finished').value.toLowerCase(), currentTechFilterFinished, currentFinishedDateFilter));
        renderClientsList();
        const clientList = document.getElementById('client-names-list'), checkinClientList = document.getElementById('checkin-client-names');
        const appointmentPhoneList = document.getElementById('appointment-client-phones'), checkinPhoneList = document.getElementById('checkin-client-phones');
        const uniqueNames = [...new Set(allFinishedClients.map(c => c.name))];
        const uniquePhones = [...new Set(allFinishedClients.filter(c => c.phone && c.phone !== 'N/A').map(c => c.phone))];
        const nameOptionsHtml = uniqueNames.map(name => `<option value="${name}"></option>`).join('');
        const phoneOptionsHtml = uniquePhones.map(phone => `<option value="${phone}"></option>`).join('');
        if(clientList) clientList.innerHTML = nameOptionsHtml;
        if(checkinClientList) checkinClientList.innerHTML = nameOptionsHtml;
        if(appointmentPhoneList) appointmentPhoneList.innerHTML = phoneOptionsHtml;
        if(checkinPhoneList) checkinPhoneList.innerHTML = phoneOptionsHtml;
        updateDashboard();
    });

     onSnapshot(query(collection(db, "appointments"), orderBy("appointmentTimestamp", "asc")), (snapshot) => {
        snapshot.docChanges().forEach((change) => {
if (change.type === "added" && initialAppointmentsLoaded) {
    const data = change.doc.data();
    if (data.appointmentTimestamp.seconds > appLoadTimestamp.seconds) {
        const apptTime = new Date(data.appointmentTimestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        // Create a clean service string
        const serviceString = Array.isArray(data.services) ? data.services[0] : data.services;
        // Update the notification message format
        addNotification('booking', `New booking from ${data.name} for ${serviceString} at ${apptTime}`);
    }
}
        });
        
        allAppointments = snapshot.docs.map(doc => ({ id: doc.id, appointmentTime: doc.data().appointmentTimestamp ? new Date(doc.data().appointmentTimestamp.seconds * 1000).toLocaleString() : 'N/A', ...doc.data() }));
        renderCalendar(currentYear, currentMonth, currentTechFilterCalendar);
        renderAllBookingsList();
        updateDashboard();
        updateNavCounts();

        if (!initialAppointmentsLoaded) {
            initialAppointmentsLoaded = true;
        }
    });

// REPLACE the onSnapshot listener for "earnings" with this one
onSnapshot(query(collection(db, "earnings"), orderBy("date", "desc")), (snapshot) => {
    allEarnings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    if (currentUserRole === 'admin') {
        const datesToUpdate = new Set();
        snapshot.docChanges().forEach((change) => {
            const dateStr = getLocalDateString(change.doc.data().date.toDate());
            datesToUpdate.add(dateStr);
        });
        datesToUpdate.forEach(dateStr => updateSalonEarningsForDate(dateStr));
    }

    renderAllStaffEarnings();
    updateDashboard();
});

    onSnapshot(query(collection(db, "salon_earnings"), orderBy("date", "desc")), (snapshot) => {
        allSalonEarnings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderSalonEarnings(applySalonEarningFilters(allSalonEarnings, currentSalonEarningDateFilter, currentSalonEarningRangeFilter));
        updateDashboard();
    });

    onSnapshot(query(collection(db, "expenses"), orderBy("date", "desc")), (snapshot) => {
        allExpenses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        populateExpenseMonthFilter();
        renderExpenses();
    });

    onSnapshot(query(collection(db, "clients"), orderBy("name")), (snapshot) => {
        allClients = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderClientsList();
    });

    document.getElementById('search-active').addEventListener('input', (e) => { renderActiveClients(applyClientFilters(allActiveClients.filter(c => c.status === 'waiting'), e.target.value.toLowerCase(), currentTechFilterActive, null)); });
    document.getElementById('search-processing').addEventListener('input', (e) => { renderProcessingClients(applyClientFilters(allActiveClients.filter(c => c.status === 'processing'), e.target.value.toLowerCase(), currentTechFilterProcessing, null)); });
    document.getElementById('search-finished').addEventListener('input', (e) => { renderFinishedClients(applyClientFilters(allFinishedClients, e.target.value.toLowerCase(), currentTechFilterFinished, currentFinishedDateFilter)); });
    document.getElementById('finished-date-filter').addEventListener('input', (e) => { currentFinishedDateFilter = e.target.value; renderFinishedClients(applyClientFilters(allFinishedClients, document.getElementById('search-finished').value.toLowerCase(), currentTechFilterFinished, currentFinishedDateFilter)); });
    document.getElementById('search-clients-list').addEventListener('input', () => renderClientsList());
    document.getElementById('search-gift-cards').addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const filtered = allGiftCards.filter(card => 
        card.code.toLowerCase().includes(searchTerm) || 
        card.recipientName.toLowerCase().includes(searchTerm)
    );
    renderGiftCardsAdminTable(filtered);
});
    document.getElementById('search-gift-cards').addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filtered = allGiftCards.filter(card => card.code.toLowerCase().includes(searchTerm) || card.recipientName.toLowerCase().includes(searchTerm));
        renderGiftCardsAdminTable(filtered);
    });
    
// Located inside initMainApp()
document.getElementById('export-clients-btn').addEventListener('click', () => {
    // *** UPDATED THIS LINE TO INCLUDE EMAIL ***
    const dataToExport = aggregatedClients.map(c => ({ 
        Name: c.name, 
        Phone: c.phone || '', 
        Email: c.email || '', 
        DOB: c.dob || '', 
        'Favorite Tech': c.favoriteTech || '', 
        'Favorite Color': c.favoriteColor || '', 
        'Last Visit': c.lastVisit ? new Date(c.lastVisit).toLocaleDateString() : '' 
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Clients");
    XLSX.writeFile(workbook, "clients_list.xlsx");
});

    document.getElementById('full-name').addEventListener('input', (e) => { const client = allFinishedClients.find(c => c.name === e.target.value); if (client) { document.getElementById('phone-number').value = client.phone; } });
    document.getElementById('phone-number').addEventListener('input', (e) => { const client = allFinishedClients.find(c => c.phone === e.target.value); if (client) { document.getElementById('full-name').value = client.name; } });

    document.getElementById('main-tabs').addEventListener('click', (e) => {
        const button = e.target.closest('button');
        if (!button) return;
        document.querySelectorAll('#main-tabs .tab-btn').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));
        document.getElementById(button.id.replace('-tab', '-content')).classList.remove('hidden');
    });

   const setupSubTabs = (tabsId, contentClass) => {
        document.getElementById(tabsId).addEventListener('click', (e) => {
            const button = e.target.closest('button');
            if (!button) return;
            document.querySelectorAll(`#${tabsId} .sub-tab-btn`).forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            document.querySelectorAll(`.${contentClass}`).forEach(content => content.classList.add('hidden'));
            const targetContent = document.getElementById(button.id.replace('-tab', '-content'));
            if (targetContent) {
                targetContent.classList.remove('hidden');
            }

            // ADDED: Logic to render the correct report when its tab is clicked
            if (tabsId === 'reports-sub-tabs') {
                switch (button.id) {
                    case 'salon-earning-report-tab':
                        // Manually trigger render with the current filter state
                        renderSalonEarnings(applySalonEarningFilters(allSalonEarnings, currentSalonEarningDateFilter, currentSalonEarningRangeFilter));
                        break;
                    case 'staff-earning-report-tab':
                        // Manually trigger render with the current filter state
                        renderAllStaffEarnings();
                        break;
                }
            }
        });
    };
    setupSubTabs('reports-sub-tabs', 'sub-tab-content');
    setupSubTabs('admin-sub-tabs', 'sub-tab-content');


    function renderCalendar(year, month, technicianFilter = 'All') {
        monthYearDisplay.textContent = `${new Date(year, month).toLocaleString('default', { month: 'long' })} ${year}`;
        calendarGrid.innerHTML = '';
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        for (let i = 0; i < firstDay; i++) { calendarGrid.insertAdjacentHTML('beforeend', '<div></div>'); }
        for (let day = 1; day <= daysInMonth; day++) {
            const dayCell = document.createElement('div');
            dayCell.className = 'calendar-day border p-2';
            dayCell.dataset.date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            dayCell.innerHTML = `<div class="font-bold">${day}</div><div id="day-${day}" class="appointments"></div>`;
            calendarGrid.appendChild(dayCell);
        }
let filteredAppointments = allAppointments;
        if (technicianFilter !== 'All' && technicianFilter !== 'Any Technician') {
            filteredAppointments = allAppointments.filter(appt => appt.technician === technicianFilter);
        } else if (technicianFilter === 'Any Technician') {
            filteredAppointments = allAppointments.filter(appt => appt.technician === 'Any Technician');
        }

        // Sort appointments by time to display them chronologically
        filteredAppointments.sort((a, b) => a.appointmentTimestamp.seconds - b.appointmentTimestamp.seconds);

        filteredAppointments.forEach(appt => {
            const apptDate = new Date(appt.appointmentTimestamp.seconds * 1000);
            if (apptDate.getFullYear() === year && apptDate.getMonth() === month) {
                const dayCell = document.getElementById(`day-${apptDate.getDate()}`);
                if (dayCell) {
                    const timeString = apptDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
                    const serviceString = Array.isArray(appt.services) ? appt.services[0] : appt.services;
                    
                    // --- Get the color for the assigned technician ---
                    const technicianName = appt.technician;
                    let colorTheme = { card: 'bg-gray-100', text: 'text-gray-800' }; // Default for "Any Technician"
                    if (technicianName && technicianColorMap[technicianName]) {
                        colorTheme = technicianColorMap[technicianName];
                    }
                    // --- End of color logic ---

                    const entryHTML = `
                        <div class="appointment-entry ${colorTheme.card} p-1" data-id="${appt.id}" data-type="appointment">
                            <p class="font-semibold text-xs ${colorTheme.text} truncate">${timeString} - ${appt.name}</p>
                            <p class="text-xs text-gray-600 truncate">${serviceString || 'Service not specified'}</p>
                        </div>`;
                    
                    dayCell.insertAdjacentHTML('beforeend', entryHTML);
                }
            }
        });
        if(calendarCountSpan) {
            calendarCountSpan.textContent = calendarGrid.querySelectorAll('.appointment-entry').length;
        }
    }
    document.getElementById('prev-month-btn').addEventListener('click', () => { currentMonth--; if (currentMonth < 0) { currentMonth = 11; currentYear--; } renderCalendar(currentYear, currentMonth, currentTechFilterCalendar); });
    document.getElementById('next-month-btn').addEventListener('click', () => { currentMonth++; if (currentMonth > 11) { currentMonth = 0; currentYear++; } renderCalendar(currentYear, currentMonth, currentTechFilterCalendar); });
calendarGrid.addEventListener('click', (e) => {
        const appointmentEntry = e.target.closest('.appointment-entry');
        const dayCell = e.target.closest('.calendar-day');

        // First, check if the click was inside an appointment entry
        if (appointmentEntry) {
            const client = allAppointments.find(a => a.id === appointmentEntry.dataset.id);
            if (client) {
                openViewDetailModal(client, "Booking Detail");
            }
        } 
        // If not, then check if the click was on an empty part of a day cell
        else if (dayCell) {
            openAddAppointmentModal(dayCell.dataset.date);
        }
    });

    const setupTechFilter = (containerId, callback) => {
         document.getElementById(containerId).addEventListener('click', (e) => {
            if (e.target.classList.contains('tech-filter-btn')) {
                document.querySelectorAll(`#${containerId} .tech-filter-btn`).forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
                callback(e.target.dataset.tech);
            }
        });
    };

    setupTechFilter('tech-filter-container-active', (tech) => { currentTechFilterActive = tech; renderActiveClients(applyClientFilters(allActiveClients.filter(c => c.status === 'waiting'), document.getElementById('search-active').value.toLowerCase(), currentTechFilterActive, null)); });
    setupTechFilter('tech-filter-container-processing', (tech) => { currentTechFilterProcessing = tech; renderProcessingClients(applyClientFilters(allActiveClients.filter(c => c.status === 'processing'), document.getElementById('search-processing').value.toLowerCase(), currentTechFilterProcessing, null)); });
    setupTechFilter('tech-filter-container-finished', (tech) => { currentTechFilterFinished = tech; renderFinishedClients(applyClientFilters(allFinishedClients, document.getElementById('search-finished').value.toLowerCase(), currentTechFilterFinished, currentFinishedDateFilter)); });
    setupTechFilter('tech-filter-container-calendar', (tech) => { currentTechFilterCalendar = tech; if (!document.getElementById('list-view').classList.contains('hidden')) { renderAllBookingsList(); } else { renderCalendar(currentYear, currentMonth, currentTechFilterCalendar); } });
    
    setupTechFilter('tech-filter-container-earning', (tech) => { currentEarningTechFilter = tech; renderAllStaffEarnings(); });
    setupTechFilter('dashboard-tech-filter-container-earning', (tech) => { currentDashboardEarningTechFilter = tech; renderAllStaffEarnings(); });
    // Located inside initMainApp()
setupTechFilter('tech-filter-container-earning', (tech) => { currentEarningTechFilter = tech; renderAllStaffEarnings(); });
setupTechFilter('dashboard-tech-filter-container-earning', (tech) => { currentDashboardEarningTechFilter = tech; renderAllStaffEarnings(); });

// *** ADD THIS NEW LINE ***
setupTechFilter('tech-filter-container-dashboard-appointments', (tech) => { currentDashboardApptTechFilter = tech; updateAdminDashboard(); });

    
const setupReportDateFilters = (selectId, dateInputId, callback) => {
    const select = document.getElementById(selectId);
    const dateInput = document.getElementById(dateInputId);
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    select.innerHTML = `<option value="daily">Daily</option>`;
    months.forEach((month, index) => { select.innerHTML += `<option value="${index}">${month}</option>`; });
    select.innerHTML += `<option value="this-year">This Year</option><option value="last-year">Last Year</option>`;
    
    select.addEventListener('change', (e) => { 
        const range = e.target.value; 
        dateInput.style.display = range === 'daily' ? 'block' : 'none'; 
        callback(dateInput.value, range); 
    });
    dateInput.addEventListener('input', (e) => { 
        callback(e.target.value, select.value); 
    });
};

    setupReportDateFilters('earning-range-filter', 'earning-date-filter', (date, range) => { currentEarningDateFilter = date; currentEarningRangeFilter = range; renderAllStaffEarnings(); });
    setupReportDateFilters('dashboard-earning-range-filter', 'dashboard-earning-date-filter', (date, range) => { currentDashboardEarningDateFilter = date; currentDashboardEarningRangeFilter = range; renderAllStaffEarnings(); });
// ... existing filter setups
setupReportDateFilters('salon-earning-range-filter', 'salon-earning-date-filter', (date, range) => { currentSalonEarningDateFilter = date; currentSalonEarningRangeFilter = range; renderSalonEarnings(applySalonEarningFilters(allSalonEarnings, date, range)); });

// ADD THESE TWO NEW LINES
setupReportDateFilters('dashboard-range-filter', 'dashboard-date-filter', (date, range) => { currentDashboardRangeFilter = range; currentDashboardDateFilter = date; updateAdminDashboard(); });
setupReportDateFilters('staff-dashboard-range-filter', 'staff-dashboard-date-filter', (date, range) => { currentStaffDashboardRangeFilter = range; currentStaffDashboardDateFilter = date; updateStaffDashboard(); });
 // --- Set Default Dashboard Filters to Current Month ---
    const currentMonthValue = String(new Date().getMonth());
    const adminDashboardFilter = document.getElementById('dashboard-range-filter');
    if (adminDashboardFilter) {
        adminDashboardFilter.value = currentMonthValue;
    }
    const staffDashboardFilter = document.getElementById('staff-dashboard-range-filter');
    if (staffDashboardFilter) {
        staffDashboardFilter.value = currentMonthValue;
    }   
    // --- Autocomplete for Dashboard Earning Form ---
const dashboardServiceInput = document.getElementById('dashboard-staff-earning-service');
const dashboardEarningInput = document.getElementById('dashboard-staff-earning-full');

if (dashboardServiceInput && dashboardEarningInput) {
    // Use 'change' event to fire when an option is selected or input loses focus
    dashboardServiceInput.addEventListener('change', (e) => {
        const selectedServiceName = e.target.value;
        const service = allServicesList.find(s => s.name === selectedServiceName);

        if (service) {
            dashboardEarningInput.value = service.price.toFixed(2);
        }
    });
}
    // --- PASTE THE NEW REMINDER LOGIC HERE ---
        const checkAppointmentReminders = () => {
            const now = new Date();
            allAppointments.forEach(appt => {
                if (sentReminderIds.includes(appt.id)) {
                    return; // Reminder already sent for this appointment
                }

                const apptTime = appt.appointmentTimestamp.toDate();
                const timeDifferenceMinutes = (apptTime.getTime() - now.getTime()) / 60000;

                // If the appointment is between 0 and 60 minutes from now
                if (timeDifferenceMinutes > 0 && timeDifferenceMinutes <= 60) {
                    const timeString = apptTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const serviceString = Array.isArray(appt.services) ? appt.services[0] : appt.services;
                    
                    addNotification('reminder', `Reminder: ${appt.name}'s appointment for ${serviceString} is at ${timeString}.`);
                    
                    sentReminderIds.push(appt.id); // Mark reminder as sent
                }
            });
        };

        // Check for reminders every minute
        setInterval(checkAppointmentReminders, 60000);
        // --- END OF NEW BLOCK ---
   // REPLACE the old staff-earning-form listener with this one
document.getElementById('staff-earning-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const staffName = document.getElementById('staff-name').value;
    const service = document.getElementById('staff-earning-service').value;
    const earning = parseFloat(document.getElementById('staff-earning').value);
    const tip = parseFloat(document.getElementById('staff-tip').value) || 0;
    const date = document.getElementById('staff-earning-date').value;
    if (isNaN(earning) || !date ) { return alert('Please ensure Date, and Earning fields are filled out correctly.'); }
    try {
        await addDoc(collection(db, "earnings"), { staffName, service, earning, tip, date: Timestamp.fromDate(new Date(date + 'T12:00:00')) });
       
       // Manually clear only the fields that need it, leaving the date intact
       document.getElementById('staff-earning-service').value = '';
       document.getElementById('staff-earning').value = '';
       document.getElementById('staff-tip').value = '';

    } catch (err) { console.error("Error adding earning: ", err); alert("Could not add earning."); }
});

// Located inside initMainApp()
document.getElementById('dashboard-staff-earning-form-full').addEventListener('submit', async (e) => {
    e.preventDefault();
    const staffName = document.getElementById('dashboard-staff-name-full').value;
    const service = document.getElementById('dashboard-staff-earning-service').value;
    const earning = parseFloat(document.getElementById('dashboard-staff-earning-full').value);
    const tip = parseFloat(document.getElementById('dashboard-staff-tip-full').value) || 0;
    const dateStr = document.getElementById('dashboard-staff-earning-date-full').value;

   if (isNaN(earning) || !dateStr) { return alert('Please make sure the Date and Earning fields are filled out correctly.'); }

    const date = new Date(dateStr + 'T12:00:00');

    try {
        await addDoc(collection(db, "earnings"), { staffName, service, earning, tip, date: Timestamp.fromDate(date) });
       
       // Manually clear only the fields that need it, leaving the date intact
       document.getElementById('dashboard-staff-earning-service').value = '';
       document.getElementById('dashboard-staff-earning-full').value = '';
       document.getElementById('dashboard-staff-tip-full').value = '';
       
    } catch (err) {
        console.error("Error saving earning entry: ", err);
        alert("Could not save the earning entry.");
    }
});
    
    document.getElementById('staff-earning-table').addEventListener('click', async (e) => {
        const deleteBtn = e.target.closest('.delete-earning-btn');
        const editBtn = e.target.closest('.edit-earning-btn');
        if(deleteBtn) { showConfirmModal("Delete this earning entry?", async () => { await deleteDoc(doc(db, "earnings", deleteBtn.dataset.id)); }); } 
        else if (editBtn) { const earning = allEarnings.find(e => e.id === editBtn.dataset.id); if (earning) { openEditEarningModal(earning); } }
    });
     document.getElementById('dashboard-staff-earning-table-full').addEventListener('click', async (e) => {
        const deleteBtn = e.target.closest('.delete-earning-btn');
        const editBtn = e.target.closest('.edit-earning-btn');
        if(deleteBtn) { showConfirmModal("Delete this earning entry?", async () => { await deleteDoc(doc(db, "earnings", deleteBtn.dataset.id)); }); } 
        else if (editBtn) { const earning = allEarnings.find(e => e.id === editBtn.dataset.id); if (earning) { openEditEarningModal(earning); } }
    });

    document.getElementById('salon-earning-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const date = document.getElementById('salon-earning-date').value;
        if (!date) { return alert('Please select a date.'); }
        const salonEarningData = { date: Timestamp.fromDate(new Date(date + 'T12:00:00')), sellGiftCard: parseFloat(document.getElementById('sell-gift-card').value) || 0, returnGiftCard: parseFloat(document.getElementById('return-gift-card').value) || 0, check: parseFloat(document.getElementById('check-payment').value) || 0, noOfCredit: parseInt(document.getElementById('no-of-credit').value) || 0, totalCredit: parseFloat(document.getElementById('total-credit').value) || 0, venmo: parseFloat(document.getElementById('venmo-payment').value) || 0, square: parseFloat(document.getElementById('square-payment').value) || 0 };
        techniciansAndStaff.forEach(tech => { const input = document.getElementById(`salon-earning-${tech.name.toLowerCase()}`); if(input) { salonEarningData[tech.name.toLowerCase()] = parseFloat(input.value) || 0; } });
        try {
            // Using set with merge to update if exists, create if not
            await setDoc(doc(db, "salon_earnings", date), salonEarningData, { merge: true });
            e.target.reset();
            document.getElementById('salon-earning-date').value = getLocalDateString();
        } catch (err) { console.error("Error adding salon earning: ", err); alert("Could not add salon earning."); }
    });

    document.getElementById('salon-earning-table').addEventListener('click', async (e) => {
        const deleteBtn = e.target.closest('.delete-salon-earning-btn');
        const editBtn = e.target.closest('.edit-salon-earning-btn');
        if(deleteBtn) { showConfirmModal("Delete this salon earning entry?", async () => { await deleteDoc(doc(db, "salon_earnings", deleteBtn.dataset.id)); }); } 
        else if (editBtn) { const earning = allSalonEarnings.find(e => e.id === editBtn.dataset.id); if (earning) { openEditSalonEarningModal(earning); } }
    });
    
    document.getElementById('export-salon-earnings-btn').addEventListener('click', () => {
        const filteredData = applySalonEarningFilters(allSalonEarnings, currentSalonEarningDateFilter, currentSalonEarningRangeFilter);
        const dataForExport = filteredData.map(earning => {
            let rowData = { Date: new Date(earning.date.seconds * 1000).toLocaleDateString() };
            let total = 0;
            techniciansAndStaff.forEach(tech => { const techEarning = earning[tech.name.toLowerCase()] || 0; rowData[tech.name] = techEarning; total += techEarning; });
            total += (earning.sellGiftCard || 0);
            const cash = total - ((earning.totalCredit || 0) + (earning.check || 0) + (earning.returnGiftCard || 0) + (earning.venmo || 0) + (earning.square || 0));
            rowData["Sell GC"] = earning.sellGiftCard || 0; rowData["Return GC"] = earning.returnGiftCard || 0; rowData["Check"] = earning.check || 0; rowData["# Credit"] = earning.noOfCredit || 0;
            rowData["Total Credit"] = earning.totalCredit || 0; rowData["Venmo"] = earning.venmo || 0; rowData["Square"] = earning.square || 0; rowData["Total"] = total; rowData["Cash"] = cash;
            return rowData;
        });
        if (filteredData.length > 0) {
            let totals = { Date: "Total:" };
            let grandTotal = 0;
            techniciansAndStaff.forEach(tech => { const techTotal = filteredData.reduce((sum, e) => sum + (e[tech.name.toLowerCase()] || 0), 0); totals[tech.name] = techTotal; grandTotal += techTotal; });
            const otherFields = ["sellGiftCard", "returnGiftCard", "check", "noOfCredit", "totalCredit", "venmo", "square"];
            otherFields.forEach(field => { totals[field] = filteredData.reduce((sum, e) => sum + (e[field] || 0), 0); });
            grandTotal += totals.sellGiftCard;
            totals.total = grandTotal;
            totals.cash = grandTotal - (totals.totalCredit + totals.check + totals.returnGiftCard + totals.venmo + totals.square);
            dataForExport.push({}, totals);
            const commissionRow = { Date: "Commission 70%:" }, check70Row = { Date: "70% of Check:" }, cash30Row = { Date: "30% of Cash:" };
            techniciansAndStaff.forEach(tech => {
                const techTotal = totals[tech.name] || 0;
                const commission70 = techTotal * 0.70, check70 = commission70 * 0.70, cash30 = commission70 - check70;
                commissionRow[tech.name] = commission70; check70Row[tech.name] = check70; cash30Row[tech.name] = cash30;
            });
            dataForExport.push(commissionRow, check70Row, cash30Row);
        }
        const worksheet = XLSX.utils.json_to_sheet(dataForExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Salon Earnings");
        XLSX.writeFile(workbook, "Salon_Earning_Report.xlsx");
    });

    const importSalonEarningsBtn = document.getElementById('import-salon-earnings-btn');
    const importSalonEarningsInput = document.getElementById('import-salon-earnings-input');

    // When the "Import" button is clicked, trigger the hidden file input
    importSalonEarningsBtn.addEventListener('click', () => {
        importSalonEarningsInput.click();
    });

    // When a file is selected in the hidden input, process it
    importSalonEarningsInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const data = new Uint8Array(event.target.result);
                const workbook = XLSX.read(data, { type: 'array', cellDates: true });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const importedData = XLSX.utils.sheet_to_json(firstSheet);

                if (importedData.length === 0) {
                    alert('No data found in the Excel file.');
                    return;
                }

                const batch = writeBatch(db);
                let processedCount = 0;

                for (const row of importedData) {
                    // Ensure there's a valid date
                    if (!row.Date || !(row.Date instanceof Date)) {
                        console.warn('Skipping row due to invalid or missing date:', row);
                        continue;
                    }

                    const date = row.Date;
                    // Format the date as YYYY-MM-DD for the document ID
                    const docId = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                    
                    const salonEarningData = {
                        date: Timestamp.fromDate(date),
                        sellGiftCard: parseFloat(row['Sell GC']) || 0,
                        returnGiftCard: parseFloat(row['Return GC']) || 0,
                        check: parseFloat(row['Check']) || 0,
                        noOfCredit: parseInt(row['No of Credit']) || 0,
                        totalCredit: parseFloat(row['Total Credit']) || 0,
                        venmo: parseFloat(row['Venmo']) || 0,
                        square: parseFloat(row['Square']) || 0,
                    };

                    // Add earnings for each staff member found in the row
                    techniciansAndStaff.forEach(tech => {
                        const techName = tech.name;
                        if (row[techName] !== undefined && !isNaN(parseFloat(row[techName]))) {
                            salonEarningData[techName.toLowerCase()] = parseFloat(row[techName]);
                        }
                    });

                    const docRef = doc(db, "salon_earnings", docId);
                    batch.set(docRef, salonEarningData, { merge: true });
                    processedCount++;
                }

                await batch.commit();
                alert(`${processedCount} records imported successfully! The data will now appear in your report.`);

            } catch (error) {
                console.error("Error importing salon earnings:", error);
                alert("An error occurred during the import. Please check the console for details and ensure your file format is correct.");
            } finally {
                // Reset the input so you can upload the same file again if needed
                e.target.value = '';
            }
        };
        reader.readAsArrayBuffer(file);
    });
    document.getElementById('print-salon-earnings-btn').addEventListener('click', () => {
        const printWindow = window.open('', '_blank', 'height=600,width=800');
        printWindow.document.write('<html><head><title>Salon Earning Report</title><script src="https://cdn.tailwindcss.com"><\/script><style>body{padding:20px;font-family:"Poppins",sans-serif}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background-color:#f2f2f2}</style></head><body><h1>Salon Earning Report</h1>');
        printWindow.document.write(document.getElementById('salon-earning-table').outerHTML);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.focus(); 
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
    });

// REPLACE the old openEditEarningModal function with this one
const openEditEarningModal = (earning) => {
    editEarningForm.reset();
    document.getElementById('edit-earning-id').value = earning.id;
    document.getElementById('edit-staff-earning-date').value = new Date(earning.date.seconds * 1000).toISOString().split('T')[0];
    document.getElementById('edit-staff-name').value = earning.staffName;
    document.getElementById('edit-staff-earning-service').value = earning.service || ''; // Populate service
    document.getElementById('edit-staff-earning').value = earning.earning;
    document.getElementById('edit-staff-tip').value = earning.tip;

    // Populate the service datalist for autocomplete
    const serviceList = document.getElementById('edit-staff-earning-services-list');
    if (serviceList) {
        serviceList.innerHTML = Object.keys(servicesData).flatMap(category => 
            servicesData[category].map(service => `<option value="${service.name}"></option>`)
        ).join('');
    }

    editEarningModal.classList.remove('hidden'); 
    editEarningModal.classList.add('flex');
};
    const closeEditEarningModal = () => { editEarningModal.classList.add('hidden'); editEarningModal.classList.remove('flex'); };
    document.getElementById('edit-earning-cancel-btn').addEventListener('click', closeEditEarningModal);
    document.querySelector('.edit-earning-modal-overlay').addEventListener('click', closeEditEarningModal);

// REPLACE the old editEarningForm submit listener with this one
editEarningForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const earningId = document.getElementById('edit-earning-id').value;
    if (!earningId) return;
    try {
        await updateDoc(doc(db, "earnings", earningId), {
            staffName: document.getElementById('edit-staff-name').value,
            service: document.getElementById('edit-staff-earning-service').value, // Save the service
            earning: parseFloat(document.getElementById('edit-staff-earning').value),
            tip: parseFloat(document.getElementById('edit-staff-tip').value), 
            date: Timestamp.fromDate(new Date(document.getElementById('edit-staff-earning-date').value + 'T12:00:00'))
        });
        closeEditEarningModal();
    } catch(err) { console.error("Error updating earning:", err); alert("Could not update earning."); }
});

    const openEditSalonEarningModal = (earning) => {
        editSalonEarningForm.reset();
        document.getElementById('edit-salon-earning-id').value = earning.id;
        document.getElementById('edit-salon-earning-date').value = new Date(earning.date.seconds * 1000).toISOString().split('T')[0];
        const inputsContainer = document.getElementById('edit-salon-earning-inputs');
        inputsContainer.innerHTML = '';
        techniciansAndStaff.forEach(tech => {
            const techNameLower = tech.name.toLowerCase();
            inputsContainer.innerHTML += `<div><label for="edit-${techNameLower}-earning" class="block text-sm font-medium text-gray-600">${tech.name}</label><input type="number" step="0.01" id="edit-${techNameLower}-earning" value="${earning[techNameLower] || 0}" class="form-input mt-1 w-full p-2 border border-gray-300 rounded-lg" placeholder="Amount"></div>`;
        });
        document.getElementById('edit-sell-gift-card').value = earning.sellGiftCard || 0;
        document.getElementById('edit-return-gift-card').value = earning.returnGiftCard || 0;
        document.getElementById('edit-check-payment').value = earning.check || 0;
        document.getElementById('edit-no-of-credit').value = earning.noOfCredit || 0;
        document.getElementById('edit-total-credit').value = earning.totalCredit || 0;
        document.getElementById('edit-venmo-payment').value = earning.venmo || 0;
        document.getElementById('edit-square-payment').value = earning.square || 0;
        editSalonEarningModal.classList.remove('hidden'); editSalonEarningModal.classList.add('flex');
    };
    const closeEditSalonEarningModal = () => { editSalonEarningModal.classList.add('hidden'); editSalonEarningModal.classList.remove('flex'); };
    document.getElementById('edit-salon-earning-cancel-btn').addEventListener('click', closeEditSalonEarningModal);
    document.querySelector('.edit-salon-earning-modal-overlay').addEventListener('click', closeEditSalonEarningModal);

    editSalonEarningForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const earningId = document.getElementById('edit-salon-earning-id').value;
        if (!earningId) return;
        const updatedData = { date: Timestamp.fromDate(new Date(document.getElementById('edit-salon-earning-date').value + 'T12:00:00')), sellGiftCard: parseFloat(document.getElementById('edit-sell-gift-card').value) || 0, returnGiftCard: parseFloat(document.getElementById('edit-return-gift-card').value) || 0, check: parseFloat(document.getElementById('check-payment').value) || 0, noOfCredit: parseInt(document.getElementById('edit-no-of-credit').value) || 0, totalCredit: parseFloat(document.getElementById('edit-total-credit').value) || 0, venmo: parseFloat(document.getElementById('edit-venmo-payment').value) || 0, square: parseFloat(document.getElementById('edit-square-payment').value) || 0 };
        techniciansAndStaff.forEach(tech => { const input = document.getElementById(`edit-${tech.name.toLowerCase()}-earning`); if(input) { updatedData[tech.name.toLowerCase()] = parseFloat(input.value) || 0; } });
        try {
            await updateDoc(doc(db, "salon_earnings", earningId), updatedData);
            closeEditSalonEarningModal();
        } catch(err) { console.error("Error updating salon earning:", err); alert("Could not update salon earning."); }
    });

// REPLACE the old renderAllBookingsList function with this one
const renderAllBookingsList = () => {
    todayCountSpan.textContent = allAppointments.filter(a => a.appointmentTimestamp.toDate() > new Date()).length;
    renderDetailedAppointmentsList('today-bookings-table-container', allAppointments, currentTechFilterCalendar);
};

    document.getElementById('today-btn').addEventListener('click', () => { document.getElementById('month-view').classList.add('hidden'); document.getElementById('month-nav').classList.add('hidden'); document.getElementById('list-view').classList.remove('hidden'); document.getElementById('today-btn').classList.add('hidden'); document.getElementById('month-view-btn').classList.remove('hidden'); renderAllBookingsList(); });
    document.getElementById('month-view-btn').addEventListener('click', () => { document.getElementById('list-view').classList.add('hidden'); document.getElementById('month-view-btn').classList.add('hidden'); document.getElementById('month-view').classList.remove('hidden'); document.getElementById('month-nav').classList.remove('hidden'); document.getElementById('today-btn').classList.remove('hidden'); });

    document.getElementById('today-bookings-table').addEventListener('click', async (e) => {
        if (e.target.classList.contains('checkin-today-btn')) {
            const appointment = allAppointments.find(a => a.id === e.target.dataset.id);
            if (!appointment) return;
            try {
                await addDoc(collection(db, "active_queue"), { name: appointment.name, phone: appointment.phone, people: appointment.people || 1, bookingType: 'Booked - Calendar', services: Array.isArray(appointment.services) ? appointment.services : [appointment.services], technician: appointment.technician, notes: appointment.notes || '', checkInTimestamp: serverTimestamp(), status: 'waiting' });
                await deleteDoc(doc(db, "appointments", e.target.dataset.id));
            } catch (err) { console.error("Error checking in from today's view:", err); alert("Could not check in this client."); }
        }
    });

    const clockEl = document.getElementById('live-clock'), dateEl = document.getElementById('live-date'), copyrightYear = document.getElementById('copyright-year');
    const updateTime = () => { const now = new Date(); clockEl.textContent = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }); dateEl.textContent = now.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }); copyrightYear.textContent = now.getFullYear(); };
    updateTime(); setInterval(updateTime, 60000);

    async function generateSmsMessage(client) {
        const smsTextarea = document.getElementById('gemini-sms-textarea');
        const sendLink = document.getElementById('gemini-sms-send-link');
        smsTextarea.value = ''; smsTextarea.placeholder = 'Generating message...';
        sendLink.classList.add('pointer-events-none', 'opacity-50');
        geminiSmsModal.classList.remove('hidden'); geminiSmsModal.classList.add('flex');
        const prompt = `Write a single, friendly, and short SMS message to a nail salon client named ${client.name}. Thank them for their recent visit where they received the following services: ${client.services}. Mention that their technician was ${client.technician}. Ask them to come back soon. Keep it concise and professional.`;
        try {
            const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }] };
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${firebaseConfig.apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            const result = await response.json();
            let text = "Sorry, could not generate a message.";
            if (result.candidates?.[0]?.content?.parts?.[0]) { text = result.candidates[0].content.parts[0].text; }
            smsTextarea.value = text;
            if (client.phone && client.phone !== 'N/A') { sendLink.href = `sms:${client.phone}?body=${encodeURIComponent(text)}`; sendLink.classList.remove('pointer-events-none', 'opacity-50'); } 
            else { sendLink.href = '#'; sendLink.onclick = () => alert('Client phone number is not available.'); sendLink.classList.remove('pointer-events-none', 'opacity-50'); }
        } catch (error) { console.error("Error generating SMS:", error); smsTextarea.value = "Error connecting to the AI service."; sendLink.classList.remove('pointer-events-none', 'opacity-50'); }
    }

    document.getElementById('clients-list-report-content').addEventListener('click', (e) => {
    const viewProfileBtn = e.target.closest('.view-client-profile-btn');
    const editBtn = e.target.closest('.edit-client-btn');
    const deleteBtn = e.target.closest('.delete-client-btn');

    if (viewProfileBtn) { 
        const client = aggregatedClients.find(c => c.id === viewProfileBtn.dataset.id); 
        if(client) { 
            openClientProfileModal(client); 
        } else {
            console.warn("Could not find client data for ID:", viewProfileBtn.dataset.id);
        }
    } 
    else if (editBtn) { 
        const client = aggregatedClients.find(c => c.id === editBtn.dataset.id); 
        if(client) { 
            openClientModal(client); 
        } else {
            console.warn("Could not find client data for ID:", editBtn.dataset.id);
        }
    } 
    else if (deleteBtn) { 
        const clientId = deleteBtn.dataset.id; 
        const client = aggregatedClients.find(c => c.id === clientId); 
        if (client) { 
            showConfirmModal(`Delete all records for ${client.name}? This cannot be undone.`, async () => { 
                try {
                    await deleteDoc(doc(db, "clients", clientId)); 
                    alert(`${client.name} has been deleted.`);
                } catch (error) {
                    console.error("Error deleting client:", error);
                    alert("Could not delete the client.");
                }
            }); 
        } else {
             console.warn("Could not find client data for ID:", clientId);
        }
    }
});
    document.getElementById('gemini-sms-close-btn').addEventListener('click', () => { geminiSmsModal.classList.add('hidden'); geminiSmsModal.classList.remove('flex'); });
    document.querySelector('.gemini-sms-modal-overlay').addEventListener('click', () => { geminiSmsModal.classList.add('hidden'); geminiSmsModal.classList.remove('flex'); });
    
    document.getElementById('floating-booking-btn').addEventListener('click', () => { openAddAppointmentModal(getLocalDateString()); });
// ADD THIS NEW LINE
document.getElementById('staff-details-date-filter').addEventListener('change', updateStaffDashboard);
    
    const addUserForm = document.getElementById('add-user-form');
    const usersTableBody = document.querySelector('#users-table tbody');
    const renderUsers = (users) => {
        usersTableBody.innerHTML = '';
        users.forEach(user => {
            const row = usersTableBody.insertRow();
            row.innerHTML = `<td class="px-6 py-4">${user.name}</td><td class="px-6 py-4">${user.email}</td><td class="px-6 py-4">${user.phone}</td><td class="px-6 py-4">${user.role}</td><td class="px-6 py-4 text-center space-x-2"><button data-id="${user.id}" class="edit-user-btn text-blue-500"><i class="fas fa-edit"></i></button><button data-id="${user.id}" class="delete-user-btn text-red-500"><i class="fas fa-trash"></i></button></td>`;
        });
    };
  // REPLACE the old populateTechnicianFilters function with this one
const populateTechnicianFilters = () => {
    const techSelects = document.querySelectorAll('#appointment-technician-select, #technician-name-select, #staff-name, #edit-staff-name, #checkin-technician-select, #dashboard-staff-name-full');
    const techContainers = document.querySelectorAll('.tech-filter-container');

    const serviceOptionsHTML = Object.keys(servicesData).flatMap(category => 
        servicesData[category].map(service => `<option value="${service.name}"></option>`)
    ).join('');

    const staffEarningServiceList = document.getElementById('staff-earning-services-list');
    if (staffEarningServiceList) {
        staffEarningServiceList.innerHTML = serviceOptionsHTML;
    }
    const dashboardServiceList = document.getElementById('dashboard-staff-earning-services-list');
    if (dashboardServiceList) {
        dashboardServiceList.innerHTML = serviceOptionsHTML;
    }

    techContainers.forEach(container => {
        const userList = container.id.includes('earning') ? techniciansAndStaff : technicians;
        container.querySelectorAll('.dynamic-tech-btn').forEach(btn => btn.remove());
        userList.forEach(tech => { const btn = document.createElement('button'); btn.className = 'tech-filter-btn dynamic-tech-btn px-3 py-1 rounded-full text-sm'; btn.dataset.tech = tech.name; btn.textContent = tech.name; container.appendChild(btn); });
    });

    techSelects.forEach(select => {
        if (!select) return; 
        const userList = (select.id.includes('staff-name')) ? techniciansAndStaff : technicians;
        const firstOption = select.options[0];
        select.innerHTML = '';
        if(firstOption && (firstOption.value === 'Any Technician' || firstOption.value === '')) { select.appendChild(firstOption); }
        userList.forEach(tech => { select.appendChild(new Option(tech.name, tech.name)); });
         if(select.id === 'technician-name-select') { select.appendChild(new Option("Other", "other")); }

         if (select.id === 'staff-name' || select.id === 'dashboard-staff-name-full') {
            select.value = 'TJ';
         }
    });
    const salonEarningInputs = document.getElementById('salon-earning-inputs');
    const salonEarningTableHead = document.getElementById('salon-earning-table-head');
    const salonEarningTableFoot = document.getElementById('salon-earning-table-foot');
    salonEarningInputs.innerHTML = '';
    let headHTML = '<tr><th scope="col" class="px-6 py-3">Date</th>';
    let footHTML = `<tr><td class="px-6 py-3 text-right font-bold">Total:</td>`;
    techniciansAndStaff.forEach(tech => {
        const techNameLower = tech.name.toLowerCase();
        salonEarningInputs.innerHTML += `<div><label for="salon-earning-${techNameLower}" class="block text-sm font-medium text-gray-600">${tech.name}</label><input type="number" step="0.01" id="salon-earning-${techNameLower}" class="form-input mt-1 w-full p-2 border border-gray-300 rounded-lg" placeholder="Amount"></div>`;
        headHTML += `<th scope="col" class="px-6 py-3">${tech.name}</th>`;
        footHTML += `<td id="total-${techNameLower}" class="px-6 py-3"></td>`;
    });
    headHTML += `<th scope="col" class="px-6 py-3">Sell GC</th><th scope="col" class="px-6 py-3">Return GC</th><th scope="col" class="px-6 py-3">Check</th><th scope="col" class="px-6 py-3">No of Credit</th><th scope="col" class="px-6 py-3">Total Credit</th><th scope="col" class="px-6 py-3">Venmo</th><th scope="col" class="px-6 py-3">Square</th><th scope="col" class="px-6 py-3 font-bold">Total</th><th scope="col" class="px-6 py-3 font-bold">Cash</th><th scope="col" class="px-6 py-3 text-center">Action</th></tr>`;
    footHTML += `<td id="total-sell-gc" class="px-6 py-3"></td><td id="total-return-gc" class="px-6 py-3"></td><td id="total-check" class="px-6 py-3"></td><td id="total-no-credit" class="px-6 py-3"></td><td id="total-total-credit" class="px-6 py-3"></td><td id="total-venmo" class="px-6 py-3"></td><td id="total-square" class="px-6 py-3"></td><td id="total-total" class="px-6 py-3 font-bold"></td><td id="total-cash" class="px-6 py-3 font-bold"></td><td class="px-6 py-3"></td></tr>`;
    let commissionHTML = `<tr class="text-center"><td class="px-6 py-3 text-right font-bold border-t-2 border-gray-300">Commission 70%:</td>`, check70HTML = `<tr class="text-center"><td class="px-6 py-3 text-right font-bold">70% of Check:</td>`, cash30HTML = `<tr class="text-center"><td class="px-6 py-3 text-right font-bold">30% of Cash:</td>`;
    techniciansAndStaff.forEach(tech => {
        const techNameLower = tech.name.toLowerCase();
        commissionHTML += `<td id="commission-${techNameLower}" class="px-6 py-3 border-t-2 border-gray-300"></td>`;
        check70HTML += `<td id="check70-${techNameLower}" class="px-6 py-3"></td>`;
        cash30HTML += `<td id="cash30-${techNameLower}" class="px-6 py-3"></td>`;
    });
    commissionHTML += `<td class="border-t-2 border-gray-300" colspan="10"></td></tr>`;
    check70HTML += `<td colspan="10"></td></tr>`;
    cash30HTML += `<td colspan="10"></td></tr>`;
    salonEarningTableHead.innerHTML = headHTML;
    salonEarningTableFoot.innerHTML = footHTML + commissionHTML + check70HTML + cash30HTML;
};
    // ADD THIS ENTIRE NEW FUNCTION FOR LOAD TECHNICIAN IN LANDING PAGE 
const updatePublicTechnicianList = async (users) => {
    try {
        const technicians = users
            .filter(user => user.role === 'technician')
            .map(user => user.name);

        const publicDataRef = doc(db, "public_data", "technicians");
        await setDoc(publicDataRef, { names: technicians });
        //console.log("Public technician list updated.");
    } catch (error) {
        console.error("Error updating public technician list:", error);
    }
};
    

// REPLACE the old "users" onSnapshot listener with this one
onSnapshot(collection(db, "users"), (snapshot) => {
    const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    techniciansAndStaff = users.filter(user => user.role === 'technician' || user.role === 'staff');
    technicians = users.filter(user => user.role === 'technician');
    // --- ADD THIS NEW BLOCK TO CREATE THE COLOR MAP ---
    technicianColorMap = {};
    technicians.forEach((tech, index) => {
        // Assign a color from the palette to each technician
        technicianColorMap[tech.name] = colorPalette[index % colorPalette.length];
    });
    // --- END OF NEW BLOCK ---
    renderUsers(users);
    populateTechnicianFilters();

    // If the current user is an admin, update the public list
    if (currentUserRole === 'admin') {
        updatePublicTechnicianList(users);
    }
});
    addUserForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const userId = document.getElementById('edit-user-id').value;
        const name = document.getElementById('new-user-name').value, phone = document.getElementById('new-user-phone').value, email = document.getElementById('new-user-email').value, password = document.getElementById('new-user-password').value, role = document.getElementById('user-role').value;
        if (userId) { await setDoc(doc(db, "users", userId), { name, phone, email, role }); alert("User updated."); } 
        else {
            if (!password || password.length < 6) { return alert("Password must be at least 6 characters."); }
            try {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                await setDoc(doc(db, "users", userCredential.user.uid), { name, phone, email, role });
                alert("User created!");
            } catch (error) { console.error("Error creating user:", error); alert("Error creating user: " + error.message); }
        }
        addUserForm.reset();
        document.getElementById('edit-user-id').value = '';
        document.getElementById('new-user-email').disabled = false;
        document.getElementById('new-user-password').required = true;
    });

    usersTableBody.addEventListener('click', async (e) => {
        const editBtn = e.target.closest('.edit-user-btn');
        const deleteBtn = e.target.closest('.delete-user-btn');
        if (editBtn) {
            const userDoc = await getDoc(doc(db, "users", editBtn.dataset.id));
            if (userDoc.exists()) {
                const user = userDoc.data();
                document.getElementById('edit-user-id').value = editBtn.dataset.id;
                document.getElementById('new-user-name').value = user.name;
                document.getElementById('new-user-phone').value = user.phone;
                document.getElementById('new-user-email').value = user.email;
                document.getElementById('new-user-email').disabled = true;
                document.getElementById('new-user-password').required = false;
                document.getElementById('new-user-password').placeholder = "Leave blank to keep same password";
                document.getElementById('user-role').value = user.role;
            }
        }
        if (deleteBtn) { showConfirmModal("Delete this user?", async () => { await deleteDoc(doc(db, "users", deleteBtn.dataset.id)); alert("User role deleted. Login must be deleted from Firebase console."); }); }
    });

    const addProductForm = document.getElementById('add-product-form');
    const inventoryTableBody = document.querySelector('#inventory-table tbody');
    const productSupplierSelect = document.getElementById('product-supplier');
    const inventoryReportTableBody = document.querySelector('#inventory-report-table tbody');

    onSnapshot(query(collection(db, "inventory_usage"), orderBy("timestamp", "desc")), (snapshot) => {
        allInventoryUsage = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    });


    const renderInventoryReport = () => {
        const lowStockItems = allInventory.filter(item => item.quantity <= item.lowStockAlert);
        inventoryReportTableBody.innerHTML = '';

        if(lowStockItems.length === 0) {
            inventoryReportTableBody.innerHTML = `<tr><td colspan="5" class="py-6 text-center text-gray-400">No items are currently low on stock.</td></tr>`;
            return;
        }

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const thirtyDaysAgoTimestamp = Timestamp.fromDate(thirtyDaysAgo);

        const recentUsage = allInventoryUsage.filter(usage => usage.timestamp >= thirtyDaysAgoTimestamp);

        lowStockItems.forEach(item => {
            const usageLast30d = recentUsage
                .filter(usage => usage.productId === item.id)
                .reduce((sum, usage) => sum + usage.quantityUsed, 0);
            
            const suggestedReorder = Math.max(0, usageLast30d - item.quantity);

            const row = inventoryReportTableBody.insertRow();
            row.className = 'bg-white border-b hover:bg-yellow-50';
            row.innerHTML = `<td class="px-6 py-4 font-medium text-gray-900">${item.name}</td><td class="px-6 py-4 text-center text-red-600 font-bold">${item.quantity}</td><td class="px-6 py-4 text-center">${item.lowStockAlert}</td><td class="px-6 py-4 text-center">${usageLast30d}</td><td class="px-6 py-4 text-center font-bold text-blue-600">${suggestedReorder}</td>`;
        });
    };

    document.getElementById('inventory-report-tab').addEventListener('click', renderInventoryReport);


    const populateProductSupplierDropdown = () => {
        const first = productSupplierSelect.options[0];
        productSupplierSelect.innerHTML = '';
        productSupplierSelect.appendChild(first);
        allSuppliers.forEach(supplier => {
            productSupplierSelect.appendChild(new Option(supplier.name, supplier.name));
        });
    };
    
    const renderInventory = () => {
        inventoryTableBody.innerHTML = '';
        allInventory.forEach(product => {
            const row = inventoryTableBody.insertRow();
            const isLowStock = product.quantity <= product.lowStockAlert;
            row.className = isLowStock ? 'bg-yellow-100' : 'bg-white';
            row.innerHTML = `<td class="px-6 py-4">${product.name} ${isLowStock ? '<span class="text-xs font-bold text-yellow-700 ml-2">LOW</span>' : ''}</td><td class="px-6 py-4">${product.category || ''}</td><td class="px-6 py-4">${product.supplier || ''}</td><td class="px-6 py-4 text-center">${product.quantity}</td><td class="px-6 py-4 text-right">$${product.price.toFixed(2)}</td><td class="px-6 py-4 text-right">$${(product.quantity * product.price).toFixed(2)}</td><td class="px-6 py-4 text-center space-x-2"><button data-id="${product.id}" class="edit-product-btn text-blue-500"><i class="fas fa-edit"></i></button><button data-id="${product.id}" class="delete-product-btn text-red-500"><i class="fas fa-trash"></i></button></td>`;
        });
        updateDashboard();
    };


    onSnapshot(query(collection(db, "inventory"), orderBy("name")), (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if ((change.type === "added" || change.type === "modified") && initialInventoryLoaded) {
                const product = { id: change.doc.id, ...change.doc.data() };
                if (currentUserRole === 'admin' && product.quantity <= product.lowStockAlert) {
                     if (!notifications.some(n => n.itemId === product.id)) {
                        addNotification('stock', `${product.name} is low in stock (${product.quantity} left).`, product.id);
                    }
                } else {
                    const existingNotifIndex = notifications.findIndex(n => n.itemId === product.id);
                    if (existingNotifIndex > -1) {
                        notifications.splice(existingNotifIndex, 1);
                        updateNotificationDisplay();
                    }
                }
            }
        });
        initialInventoryLoaded = true;

        allInventory = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderInventory();
    });

    addProductForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const productId = document.getElementById('edit-product-id').value;
        const productData = { name: document.getElementById('product-name').value, category: document.getElementById('product-category').value, supplier: document.getElementById('product-supplier').value, quantity: parseInt(document.getElementById('product-quantity').value, 10), price: parseFloat(document.getElementById('product-price').value), lowStockAlert: parseInt(document.getElementById('low-stock-alert').value, 10) };
        try {
            if (productId) { await updateDoc(doc(db, "inventory", productId), productData); } 
            else { await addDoc(collection(db, "inventory"), productData); }
            resetProductForm();
        } catch (error) { console.error("Error saving product:", error); alert("Could not save product."); }
    });

    const resetProductForm = () => {
        addProductForm.reset();
        document.getElementById('edit-product-id').value = '';
        document.getElementById('add-product-btn').textContent = 'Add Product';
        document.getElementById('cancel-edit-product-btn').classList.add('hidden');
    };
    document.getElementById('cancel-edit-product-btn').addEventListener('click', resetProductForm);

    inventoryTableBody.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.edit-product-btn');
        const deleteBtn = e.target.closest('.delete-product-btn');
        if (editBtn) {
            const product = allInventory.find(p => p.id === editBtn.dataset.id);
            if (product) {
                document.getElementById('edit-product-id').value = product.id;
                document.getElementById('product-name').value = product.name;
                document.getElementById('product-category').value = product.category || '';
                document.getElementById('product-supplier').value = product.supplier || '';
                document.getElementById('product-quantity').value = product.quantity;
                document.getElementById('product-price').value = product.price;
                document.getElementById('low-stock-alert').value = product.lowStockAlert || 10;
                document.getElementById('add-product-btn').textContent = 'Update Product';
                document.getElementById('cancel-edit-product-btn').classList.remove('hidden');
            }
        } else if (deleteBtn) {
            showConfirmModal("Delete this product from inventory?", async () => {
                await deleteDoc(doc(db, "inventory", deleteBtn.dataset.id));
            });
        }
    });

    const openLogUsageModal = () => {
        const select = document.getElementById('log-usage-product-select');
        select.innerHTML = '<option value="">Select a product...</option>';
        allInventory.forEach(item => { select.appendChild(new Option(item.name, item.id)); });
        logUsageModal.classList.remove('hidden'); logUsageModal.classList.add('flex');
    };
    const closeLogUsageModal = () => { logUsageForm.reset(); logUsageModal.classList.add('hidden'); logUsageModal.classList.remove('flex'); };
    document.getElementById('log-usage-btn').addEventListener('click', openLogUsageModal);
    document.getElementById('log-usage-cancel-btn').addEventListener('click', closeLogUsageModal);
    document.querySelector('.log-usage-modal-overlay').addEventListener('click', closeLogUsageModal);

    logUsageForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const productId = document.getElementById('log-usage-product-select').value;
        const quantityUsed = parseInt(document.getElementById('log-usage-quantity').value, 10);
        if (!productId || isNaN(quantityUsed) || quantityUsed <= 0) { alert('Please select a product and enter a valid quantity.'); return; }
        const product = allInventory.find(p => p.id === productId);
        if (!product) { alert('Product not found.'); return; }
        if (product.quantity < quantityUsed) { alert(`Not enough stock. Only ${product.quantity} units available.`); return; }
        try {
            await addDoc(collection(db, "inventory_usage"), { productId: productId, productName: product.name, quantityUsed: quantityUsed, timestamp: serverTimestamp() });
            const newQuantity = product.quantity - quantityUsed;
            await updateDoc(doc(db, "inventory", productId), { quantity: newQuantity });
            alert('Usage logged successfully.');
            closeLogUsageModal();
        } catch (error) { console.error("Error logging usage:", error); alert("Could not log usage."); }
    });


    const settingsForm = document.getElementById('settings-form');
    const minBookingHoursInput = document.getElementById('min-booking-hours');
    const maxLoginAttemptsInput = document.getElementById('max-login-attempts');
    const loginLockoutMinutesInput = document.getElementById('login-lockout-minutes');
    const featureTogglesForm = document.getElementById('feature-toggles-form');
    const salonHoursForm = document.getElementById('salon-hours-form');

    const loadAndRenderSalonHours = async () => {
        const hoursContainer = document.getElementById('salon-hours-inputs');
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        let hoursData = {};
        const docSnap = await getDoc(doc(db, "settings", "salonHours"));
        if (docSnap.exists()) { hoursData = docSnap.data(); } 
        else { days.forEach(day => { hoursData[day.toLowerCase()] = { isOpen: day !== 'Sunday', open: '09:00', close: '20:00' }; }); }
        salonHours = hoursData;
        hoursContainer.innerHTML = days.map(day => {
            const dayLower = day.toLowerCase();
            const dayData = hoursData[dayLower] || { isOpen: true, open: '09:00', close: '20:00' };
            return `<div class="grid grid-cols-4 gap-2 items-center"><label class="font-semibold text-gray-700 col-span-1">${day}</label><div class="flex items-center gap-2"><input type="checkbox" id="is-open-${dayLower}" class="form-checkbox" ${dayData.isOpen ? 'checked' : ''}><label for="is-open-${dayLower}">Open</label></div><input type="time" value="${dayData.open}" class="form-input p-1 border rounded" ${!dayData.isOpen ? 'disabled' : ''}><input type="time" value="${dayData.close}" class="form-input p-1 border rounded" ${!dayData.isOpen ? 'disabled' : ''}></div>`;
        }).join('');
        days.forEach(day => {
            const dayLower = day.toLowerCase();
            const checkbox = document.getElementById(`is-open-${dayLower}`);
            const timeInputs = checkbox.closest('.grid').querySelectorAll('input[type="time"]');
            checkbox.addEventListener('change', () => { timeInputs.forEach(input => input.disabled = !checkbox.checked); });
        });
    };

    salonHoursForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const newHours = {};
        days.forEach(day => {
            const container = document.getElementById(`is-open-${day}`).closest('.grid');
            const timeInputs = container.querySelectorAll('input[type="time"]');
            newHours[day] = { isOpen: container.querySelector('input[type="checkbox"]').checked, open: timeInputs[0].value, close: timeInputs[1].value };
        });
        try { await setDoc(doc(db, "settings", "salonHours"), newHours); salonHours = newHours; alert("Salon hours saved!"); } 
        catch (error) { console.error("Error saving salon hours:", error); alert("Could not save salon hours."); }
    });


    const loadFeatureToggles = async () => {
        const settingsDoc = await getDoc(doc(db, "settings", "features"));
        if (settingsDoc.exists()) {
            const settings = settingsDoc.data();
            document.getElementById('toggle-client-login').checked = settings.showClientLogin !== false;
            document.getElementById('toggle-promotions').checked = settings.showPromotions !== false;
            document.getElementById('toggle-gift-card').checked = settings.showGiftCards !== false;
            document.getElementById('toggle-nails-idea').checked = settings.showNailArt !== false;
        } else {
            document.getElementById('toggle-client-login').checked = true;
            document.getElementById('toggle-promotions').checked = true;
            document.getElementById('toggle-gift-card').checked = true;
            document.getElementById('toggle-nails-idea').checked = true;
        }
    };
    
    featureTogglesForm.addEventListener('change', async (e) => {
        if (e.target.type === 'checkbox') {
            const settings = { showClientLogin: document.getElementById('toggle-client-login').checked, showPromotions: document.getElementById('toggle-promotions').checked, showGiftCards: document.getElementById('toggle-gift-card').checked, showNailArt: document.getElementById('toggle-nails-idea').checked };
            await setDoc(doc(db, "settings", "features"), settings, { merge: true });
        }
    });

    const loadSettings = async () => { 
        const bookingSnap = await getDoc(doc(db, "settings", "booking")); 
        if (bookingSnap.exists()) { const data = bookingSnap.data(); minBookingHoursInput.value = data.minBookingHours || 2; } 
        const securitySnap = await getDoc(doc(db, "settings", "security"));
        if (securitySnap.exists()) { const data = securitySnap.data(); loginSecuritySettings = data; maxLoginAttemptsInput.value = data.maxAttempts || 5; loginLockoutMinutesInput.value = data.lockoutMinutes || 15; }
    };
    loadSettings();
    loadFeatureToggles();
    loadAndRenderSalonHours();
// --- Setup for Payment Guide ---
    const paymentGuideForm = document.getElementById('payment-guide-form');
    const paymentGuideTextarea = document.getElementById('gift-card-payment-guide-textarea');

    // Load existing guide
    getDoc(doc(db, "settings", "paymentGuide")).then(docSnap => {
        if (docSnap.exists()) {
            paymentGuideTextarea.value = docSnap.data().text || '';
        }
    });

    // Save new guide
    paymentGuideForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            await setDoc(doc(db, "settings", "paymentGuide"), { text: paymentGuideTextarea.value });
            alert("Payment guide saved successfully!");
        } catch (error) {
            console.error("Error saving payment guide:", error);
            alert("Could not save payment guide.");
        }
    });
    settingsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const hours = parseInt(minBookingHoursInput.value, 10);
        const maxAttempts = parseInt(maxLoginAttemptsInput.value, 10);
        const lockoutMinutes = parseInt(loginLockoutMinutesInput.value, 10);
        if (isNaN(hours) || hours < 0 || isNaN(maxAttempts) || maxAttempts < 1 || isNaN(lockoutMinutes) || lockoutMinutes < 1) { return alert("Please enter valid, positive numbers for all settings."); }
        try { await setDoc(doc(db, "settings", "booking"), { minBookingHours: hours }); await setDoc(doc(db, "settings", "security"), { maxAttempts: maxAttempts, lockoutMinutes: lockoutMinutes }); loginSecuritySettings = { maxAttempts, lockoutMinutes }; alert("Settings saved!"); } 
        catch (error) { console.error("Error saving settings: ", error); alert("Could not save settings."); }
    });

    const setupSimpleCrud = (collectionName, formId, inputId, listId) => {
        const form = document.getElementById(formId);
        const input = document.getElementById(inputId);
        const listContainer = document.getElementById(listId);
        onSnapshot(collection(db, collectionName), (snapshot) => {
            const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            if (collectionName === 'expense_categories') allExpenseCategories = items;
            else if (collectionName === 'payment_accounts') allPaymentAccounts = items;
            else if (collectionName === 'suppliers') allSuppliers = items;
            listContainer.innerHTML = items.map(item => `<div class="flex justify-between items-center p-1 hover:bg-gray-100"><span>${item.name}</span><button data-id="${item.id}" class="delete-item-btn text-red-400 hover:text-red-600"><i class="fas fa-times-circle"></i></button></div>`).join('');
            populateExpenseDropdowns();
        });
        form.addEventListener('submit', async (e) => { e.preventDefault(); const name = input.value.trim(); if (name) { await addDoc(collection(db, collectionName), { name }); input.value = ''; } });
        listContainer.addEventListener('click', (e) => { const deleteBtn = e.target.closest('.delete-item-btn'); if (deleteBtn) { showConfirmModal("Delete this item?", async () => { await deleteDoc(doc(db, collectionName, deleteBtn.dataset.id)); }); } });
    };

    setupSimpleCrud('expense_categories', 'add-expense-category-form', 'new-expense-category-name', 'expense-categories-list');
    setupSimpleCrud('payment_accounts', 'add-payment-account-form', 'new-payment-account-name', 'payment-accounts-list');

    const addSupplierForm = document.getElementById('add-supplier-form');
    const suppliersTableBody = document.querySelector('#suppliers-table tbody');
    onSnapshot(collection(db, "suppliers"), (snapshot) => {
        allSuppliers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        suppliersTableBody.innerHTML = '';
        allSuppliers.forEach(s => { const row = suppliersTableBody.insertRow(); row.innerHTML = `<td class="px-6 py-4">${s.name}</td><td class="px-6 py-4">${s.phone || ''}</td><td class="px-6 py-4">${s.email || ''}</td><td class="px-6 py-4">${s.website ? `<a href="${s.website}" target="_blank" class="text-blue-500">Link</a>` : ''}</td><td class="px-6 py-4 text-center space-x-2"><button data-id="${s.id}" class="edit-supplier-btn text-blue-500"><i class="fas fa-edit"></i></button><button data-id="${s.id}" class="delete-supplier-btn text-red-500"><i class="fas fa-trash"></i></button></td>`; });
        populateExpenseDropdowns();
        populateProductSupplierDropdown();
    });

    addSupplierForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const supplierId = document.getElementById('edit-supplier-id').value;
        const data = { name: document.getElementById('supplier-name').value, phone: document.getElementById('supplier-phone').value, email: document.getElementById('supplier-email').value, website: document.getElementById('supplier-website').value };
        if (supplierId) { await updateDoc(doc(db, "suppliers", supplierId), data); } 
        else { await addDoc(collection(db, "suppliers"), data); }
        resetSupplierForm();
    });

    const resetSupplierForm = () => { addSupplierForm.reset(); document.getElementById('edit-supplier-id').value = ''; document.getElementById('add-supplier-btn').textContent = 'Add Supplier'; document.getElementById('cancel-edit-supplier-btn').classList.add('hidden'); };
    document.getElementById('cancel-edit-supplier-btn').addEventListener('click', resetSupplierForm);

    suppliersTableBody.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.edit-supplier-btn');
        const deleteBtn = e.target.closest('.delete-supplier-btn');
        if (editBtn) {
            const supplier = allSuppliers.find(s => s.id === editBtn.dataset.id);
            if (supplier) { document.getElementById('edit-supplier-id').value = supplier.id; document.getElementById('supplier-name').value = supplier.name; document.getElementById('supplier-phone').value = supplier.phone || ''; document.getElementById('supplier-email').value = supplier.email || ''; document.getElementById('supplier-website').value = supplier.website || ''; document.getElementById('add-supplier-btn').textContent = 'Update'; document.getElementById('cancel-edit-supplier-btn').classList.remove('hidden'); }
        } else if (deleteBtn) { showConfirmModal("Delete this supplier?", async () => { await deleteDoc(doc(db, "suppliers", deleteBtn.dataset.id)); }); }
    });

    const addExpenseForm = document.getElementById('add-expense-form');
    const expenseMonthFilter = document.getElementById('expense-month-filter');
    const expenseTableBody = document.querySelector('#expense-table tbody');
    const totalExpenseEl = document.getElementById('total-expense');

    const populateExpenseDropdowns = () => {
        const categorySelect = document.getElementById('expense-category');
        const supplierSelect = document.getElementById('expense-supplier');
        const paymentSelect = document.getElementById('expense-payment-account');
        const populate = (select, data) => { const first = select.options[0]; select.innerHTML = ''; select.appendChild(first); data.forEach(item => select.appendChild(new Option(item.name, item.name))); };
        populate(categorySelect, allExpenseCategories);
        populate(supplierSelect, allSuppliers);
        populate(paymentSelect, allPaymentAccounts);
    };

    const populateExpenseMonthFilter = () => {
        const months = [...new Set(allExpenses.map(exp => { const d = new Date(exp.date.seconds * 1000); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; }))].sort().reverse();
        expenseMonthFilter.innerHTML = '<option value="all">All Months</option>';
        months.forEach(monthYear => { const [year, month] = monthYear.split('-'); expenseMonthFilter.innerHTML += `<option value="${monthYear}">${new Date(year, month - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' })}</option>`; });
        expenseMonthFilter.value = currentExpenseMonthFilter || 'all';
    };

    const renderExpenses = () => {
        let filtered = allExpenses;
        if (currentExpenseMonthFilter && currentExpenseMonthFilter !== 'all') {
            const [year, month] = currentExpenseMonthFilter.split('-').map(Number);
            filtered = allExpenses.filter(exp => { const d = new Date(exp.date.seconds * 1000); return d.getFullYear() === year && d.getMonth() + 1 === month; });
        }
        expenseTableBody.innerHTML = filtered.length === 0 ? `<tr><td colspan="8" class="py-6 text-center text-gray-400">No expenses found.</td></tr>` : '';
        filtered.forEach(exp => {
            const row = expenseTableBody.insertRow();
            row.className = 'bg-white border-b';
            row.innerHTML = `<td class="px-6 py-4">${new Date(exp.date.seconds * 1000).toLocaleDateString()}</td><td class="px-6 py-4">${exp.name}</td><td class="px-6 py-4">${exp.category || ''}</td><td class="px-6 py-4">${exp.supplier || ''}</td><td class="px-6 py-4">${exp.paymentAccount || ''}</td><td class="px-6 py-4">${exp.attachmentURL ? `<a href="${exp.attachmentURL}" target="_blank" class="text-blue-500 hover:underline">View</a>` : 'N/A'}</td><td class="px-6 py-4 text-right">$${exp.amount.toFixed(2)}</td><td class="px-6 py-4 text-center space-x-2"><button data-id="${exp.id}" class="edit-expense-btn text-blue-500"><i class="fas fa-edit"></i></button><button data-id="${exp.id}" class="delete-expense-btn text-red-500"><i class="fas fa-trash"></i></button></td>`;
        });
        totalExpenseEl.textContent = `$${filtered.reduce((sum, exp) => sum + exp.amount, 0).toFixed(2)}`;
    };

    expenseMonthFilter.addEventListener('change', (e) => { currentExpenseMonthFilter = e.target.value; renderExpenses(); });

    addExpenseForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const expenseId = document.getElementById('edit-expense-id').value;
        const file = document.getElementById('expense-attachment').files[0];
        let attachmentURL = document.getElementById('current-attachment-info').dataset.url || null;
        if (file) {
            const storageRef = ref(storage, `expenses/${Date.now()}_${file.name}`);
            await uploadBytes(storageRef, file);
            attachmentURL = await getDownloadURL(storageRef);
        }
        const expenseData = {
            name: document.getElementById('expense-name').value, amount: parseFloat(document.getElementById('expense-amount').value), date: Timestamp.fromDate(new Date(document.getElementById('expense-date').value + 'T12:00:00')),
            category: document.getElementById('expense-category').value, supplier: document.getElementById('expense-supplier').value, paymentAccount: document.getElementById('expense-payment-account').value, attachmentURL
        };
        try {
            if (expenseId) { await updateDoc(doc(db, "expenses", expenseId), expenseData); } 
            else { await addDoc(collection(db, "expenses"), expenseData); }
            resetExpenseForm();
        } catch (error) { console.error("Error saving expense:", error); alert("Could not save expense."); }
    });

    const resetExpenseForm = () => { addExpenseForm.reset(); document.getElementById('edit-expense-id').value = ''; document.getElementById('expense-date').value = getLocalDateString(); document.getElementById('add-expense-btn').textContent = 'Add Expense'; document.getElementById('cancel-edit-expense-btn').classList.add('hidden'); document.getElementById('current-attachment-info').textContent = ''; document.getElementById('current-attachment-info').dataset.url = ''; };
    document.getElementById('cancel-edit-expense-btn').addEventListener('click', resetExpenseForm);

    expenseTableBody.addEventListener('click', (e) => {
        const deleteBtn = e.target.closest('.delete-expense-btn');
        const editBtn = e.target.closest('.edit-expense-btn');
        if (deleteBtn) { showConfirmModal("Delete this expense?", async () => { await deleteDoc(doc(db, "expenses", deleteBtn.dataset.id)); }); } 
        else if (editBtn) {
            const expense = allExpenses.find(exp => exp.id === editBtn.dataset.id);
            if (expense) {
                document.getElementById('edit-expense-id').value = expense.id;
                document.getElementById('expense-name').value = expense.name;
                document.getElementById('expense-amount').value = expense.amount;
                document.getElementById('expense-date').value = new Date(expense.date.seconds * 1000).toISOString().split('T')[0];
                document.getElementById('expense-category').value = expense.category || '';
                document.getElementById('expense-supplier').value = expense.supplier || '';
                document.getElementById('expense-payment-account').value = expense.paymentAccount || '';
                const attachmentInfo = document.getElementById('current-attachment-info');
                attachmentInfo.textContent = expense.attachmentURL ? 'Current attachment exists.' : '';
                attachmentInfo.dataset.url = expense.attachmentURL || '';
                document.getElementById('add-expense-btn').textContent = 'Update Expense';
                document.getElementById('cancel-edit-expense-btn').classList.remove('hidden');
            }
        }
    });

    const serviceCategoriesAdminContainer = document.getElementById('service-categories-admin');
    const addCategoryForm = document.getElementById('add-category-form');
    const addServiceForm = document.getElementById('add-service-form');
    const editServiceSection = document.getElementById('edit-service-section');
    const renderServiceAdmin = (services) => {
        serviceCategoriesAdminContainer.innerHTML = '';
        Object.entries(services).forEach(([categoryName, items]) => {
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'p-3 border rounded-lg';
            categoryDiv.innerHTML = `<div class="flex justify-between items-center mb-2"><h4 class="font-bold">${categoryName}</h4><div><button class="add-service-to-category-btn text-green-500 mr-2" data-category="${categoryName}"><i class="fas fa-plus-circle"></i></button><button class="edit-category-btn text-blue-500 mr-2" data-category="${categoryName}"><i class="fas fa-edit"></i></button><button class="delete-category-btn text-red-500" data-category="${categoryName}"><i class="fas fa-trash"></i></button></div></div><ul class="service-list space-y-1 pl-4">${items.map((item, index) => `<li class="flex justify-between items-center text-sm"><span>${item.name} - ${item.price}</span><div><button class="edit-service-btn text-blue-500 mr-2" data-category="${categoryName}" data-index="${index}"><i class="fas fa-edit"></i></button><button class="delete-service-btn text-red-500" data-category="${categoryName}" data-index="${index}"><i class="fas fa-times-circle"></i></button></div></li>`).join('')}</ul>`;
            serviceCategoriesAdminContainer.appendChild(categoryDiv);
        });
    };
    onSnapshot(collection(db, "services"), (snapshot) => { servicesData = {}; snapshot.forEach(doc => { servicesData[doc.id] = doc.data().items; }); renderServiceAdmin(servicesData); renderCheckInServices(); });
    addCategoryForm.addEventListener('submit', async (e) => { e.preventDefault(); const categoryName = document.getElementById('new-category-name').value; if (categoryName) { await setDoc(doc(db, "services", categoryName), { items: [] }); addCategoryForm.reset(); } });
    serviceCategoriesAdminContainer.addEventListener('click', async (e) => {
        const delCatBtn = e.target.closest('.delete-category-btn'), editCatBtn = e.target.closest('.edit-category-btn'), addSvcBtn = e.target.closest('.add-service-to-category-btn'), editSvcBtn = e.target.closest('.edit-service-btn'), delSvcBtn = e.target.closest('.delete-service-btn');
        if (delCatBtn) { showConfirmModal(`Delete category "${delCatBtn.dataset.category}"?`, async () => { await deleteDoc(doc(db, "services", delCatBtn.dataset.category)); }); }
        if (editCatBtn) { const oldName = editCatBtn.dataset.category; const newName = prompt("New category name:", oldName); if (newName && newName !== oldName) { const docSnap = await getDoc(doc(db, "services", oldName)); if (docSnap.exists()) { await setDoc(doc(db, "services", newName), docSnap.data()); await deleteDoc(doc(db, "services", oldName)); } } }
        if (addSvcBtn) { addServiceForm.reset(); document.getElementById('edit-category-id').value = addSvcBtn.dataset.category; document.getElementById('edit-service-index').value = ''; document.getElementById('edit-service-title').textContent = `Add Service to ${addSvcBtn.dataset.category}`; editServiceSection.classList.remove('hidden'); }
        if (editSvcBtn) { const category = editSvcBtn.dataset.category, index = editSvcBtn.dataset.index, service = servicesData[category][index]; addServiceForm.reset(); document.getElementById('edit-category-id').value = category; document.getElementById('edit-service-index').value = index; document.getElementById('service-prefix').value = service.p || ''; document.getElementById('service-name').value = service.name; document.getElementById('service-price').value = service.price; document.getElementById('edit-service-title').textContent = `Edit Service in ${category}`; editServiceSection.classList.remove('hidden'); }
        if (delSvcBtn) { const category = delSvcBtn.dataset.category, index = parseInt(delSvcBtn.dataset.index, 10); showConfirmModal('Delete this service?', async () => { const updatedItems = [...servicesData[category]]; updatedItems.splice(index, 1); await updateDoc(doc(db, "services", category), { items: updatedItems }); }); }
    });
    addServiceForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const category = document.getElementById('edit-category-id').value, index = document.getElementById('edit-service-index').value;
        const newService = { p: document.getElementById('service-prefix').value, name: document.getElementById('service-name').value, price: document.getElementById('service-price').value };
        const updatedItems = [...servicesData[category]];
        if (index !== '') { updatedItems[parseInt(index, 10)] = newService; } else { updatedItems.push(newService); }
        await updateDoc(doc(db, "services", category), { items: updatedItems });
        addServiceForm.reset(); editServiceSection.classList.add('hidden');
    });

    const nailsIdeaGallery = document.getElementById('nails-idea-gallery');
    const addNailIdeaForm = document.getElementById('add-nail-idea-form');
    const nailIdeasTableBody = document.querySelector('#nail-ideas-table tbody');
// ADD THIS ENTIRE NEW BLOCK for the radio button logic
const imageSourceRadios = document.querySelectorAll('input[name="imageSource"]');
const fileUploadContainer = document.getElementById('nail-idea-file-upload-container');
const urlContainer = document.getElementById('nail-idea-url-container');
const fileInput = document.getElementById('nail-idea-image');
const urlInput = document.getElementById('nail-idea-image-url');

imageSourceRadios.forEach(radio => {
    radio.addEventListener('change', () => {
        if (radio.value === 'upload') {
            fileUploadContainer.classList.remove('hidden');
            urlContainer.classList.add('hidden');
            urlInput.value = ''; // Clear the URL input
        } else {
            fileUploadContainer.classList.add('hidden');
            urlContainer.classList.remove('hidden');
            fileInput.value = ''; // Clear the file input
        }
    });
});
    const openShareModal = (idea) => {
        const salonUrl = "http://www.nailsxpressky.com";
        const shareText = `Check out this amazing nail design: ${idea.name}!`;
        document.getElementById('share-facebook').href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(salonUrl)}`;
        document.getElementById('share-pinterest').href = `http://pinterest.com/pin/create/button/?url=${encodeURIComponent(salonUrl)}&media=${encodeURIComponent(idea.imageURL)}&description=${encodeURIComponent(shareText)}`;
        document.getElementById('share-twitter').href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(salonUrl)}`;
        document.getElementById('share-copy-link').onclick = () => { navigator.clipboard.writeText(salonUrl).then(() => alert('Link copied to clipboard!')); };
        shareModal.classList.remove('hidden');
        shareModal.classList.add('flex');
    };

    const closeShareModal = () => { shareModal.classList.add('hidden'); shareModal.classList.remove('flex'); };
    document.getElementById('share-close-btn').addEventListener('click', closeShareModal);
    document.querySelector('.share-modal-overlay').addEventListener('click', closeShareModal);
    

    // ADD THIS ENTIRE NEW BLOCK for the lightbox functions
const openLightbox = (index) => {
    if (index < 0 || index >= currentGalleryData.length) return;

    currentLightboxIndex = index;
    const idea = currentGalleryData[index];

    lightboxImage.src = idea.imageURL;
    currentRotation = 0; // ADD THIS LINE TO RESET ROTATION
    lightboxImage.style.transform = `rotate(0deg)`; // AND THIS LINE TO RESET THE STYLE
    lightboxTitle.textContent = idea.name;
    lightboxShape.textContent = idea.shape || 'N/A';
    lightboxColor.textContent = idea.color || 'N/A';
    lightboxDescription.textContent = idea.description || ''; // ADD THIS LINE
    lightboxCategories.innerHTML = idea.categories.map(cat => 
        `<span class="bg-pink-100 text-pink-700 text-xs font-semibold px-2 py-1 rounded-full">${cat}</span>`
    ).join('');

    lightboxPrevBtn.classList.toggle('hidden', index === 0);
    lightboxNextBtn.classList.toggle('hidden', index === currentGalleryData.length - 1);

    nailIdeaLightbox.classList.remove('hidden');
    nailIdeaLightbox.classList.add('flex');
};
// --- ADD THESE TWO NEW FUNCTIONS ---
const toggleFullScreen = () => {
    const lightbox = document.getElementById('nail-idea-lightbox');
    const icon = document.getElementById('lightbox-fullscreen-btn').querySelector('i');
    if (!document.fullscreenElement) {
        lightbox.requestFullscreen().catch(err => {
            alert(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
        });
        icon.classList.replace('fa-expand', 'fa-compress');
    } else {
        document.exitFullscreen();
        icon.classList.replace('fa-compress', 'fa-expand');
    }
};

const rotateImage = () => {
    currentRotation += 90;
    if (currentRotation >= 360) {
        currentRotation = 0;
    }
    document.getElementById('lightbox-image').style.transform = `rotate(${currentRotation}deg)`;
};
// --- END OF NEW FUNCTIONS ---

const closeLightbox = () => {
    nailIdeaLightbox.classList.add('hidden');
    nailIdeaLightbox.classList.remove('flex');
};

const showNextImage = () => {
    openLightbox(currentLightboxIndex + 1);
};

const showPrevImage = () => {
    openLightbox(currentLightboxIndex - 1);
};
// REPLACE the old galleryClickHandler listeners with this new block ok
const galleryClickHandler = (e) => {
    const shareBtn = e.target.closest('.share-nail-idea-btn');
    const img = e.target.closest('img[data-index]');

    if (shareBtn) { 
        const ideaId = shareBtn.dataset.id; 
        const idea = allNailIdeas.find(i => i.id === ideaId); 
        if (idea) { openShareModal(idea); }
    } else if (img) {
        const index = parseInt(img.dataset.index, 10);
        openLightbox(index);
    }
};

document.getElementById('nails-idea-gallery').addEventListener('click', galleryClickHandler);
document.getElementById('nails-idea-landing').addEventListener('click', galleryClickHandler);

    // ADD THIS NEW BLOCK for the lightbox buttons
lightboxCloseBtn.addEventListener('click', closeLightbox);
lightboxNextBtn.addEventListener('click', showNextImage);
lightboxPrevBtn.addEventListener('click', showPrevImage);
// ADD THESE TWO NEW LISTENERS
document.getElementById('lightbox-fullscreen-btn').addEventListener('click', toggleFullScreen);
document.getElementById('lightbox-rotate-btn').addEventListener('click', rotateImage);
// END OF NEW LISTENERS

// Add keyboard navigation
document.addEventListener('keydown', (e) => {
    if (!nailIdeaLightbox.classList.contains('hidden')) {
        if (e.key === 'ArrowRight') showNextImage();
        if (e.key === 'ArrowLeft') showPrevImage();
        if (e.key === 'Escape') closeLightbox();
    }
});

    // ADD THIS NEW BLOCK to close the lightbox on overlay click
nailIdeaLightbox.addEventListener('click', (e) => {
    // If the click is on the dark background itself (the overlay)
    // and not on the content inside it, close the modal.
    if (e.target === nailIdeaLightbox) {
        closeLightbox();
    }
});
    // REPLACE the old renderNailIdeasGallery function with this one
const renderNailIdeasGallery = (ideas) => {
    const landingGallery = document.querySelector('#nails-idea-landing .columns-2');
    const appGallery = document.getElementById('nails-idea-gallery');
    currentGalleryData = ideas; // Store the current set of ideas for the lightbox

    const renderTo = (container, isLanding) => {
        if (!container) return;
        container.innerHTML = '';
        if (ideas.length === 0) { container.innerHTML = '<p class="text-gray-500 col-span-full text-center">No nail ideas found. Check back later!</p>'; return; }
        const ideasToRender = isLanding ? ideas.slice(0, 8) : ideas;
        ideasToRender.forEach((idea, index) => {
            const ideaEl = document.createElement('div');
            ideaEl.className = 'break-inside-avoid mb-4 relative gallery-item group';
            // Note: The share button is now separate from the clickable image
            ideaEl.innerHTML = `
                <img class="w-full rounded-lg shadow-md cursor-pointer" src="${idea.imageURL}" alt="${idea.name}" data-index="${index}">
                <div class="absolute top-2 right-2 bg-black/40 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                   <button data-id="${idea.id}" class="share-nail-idea-btn text-white text-lg"><i class="fas fa-share-alt"></i></button>
                </div>
                ${!isLanding ? `<div class="p-2"><h5 class="font-bold text-sm">${idea.name}</h5><p class="text-xs text-gray-600">${idea.categories.join(', ')}</p></div>` : ''}`;
            container.appendChild(ideaEl);
        });
    };

    renderTo(landingGallery, true);
    renderTo(appGallery, false);
};

    const renderNailIdeasAdminTable = (ideas) => {
        nailIdeasTableBody.innerHTML = '';
        ideas.forEach(idea => {
            const row = nailIdeasTableBody.insertRow();
            row.innerHTML = `<td class="px-6 py-4"><img src="${idea.imageURL}" alt="${idea.name}" class="w-16 h-16 object-cover rounded"></td><td class="px-6 py-4">${idea.name}</td><td class="px-6 py-4">${idea.shape}</td><td class="px-6 py-4">${idea.categories.join(', ')}</td><td class="px-6 py-4 text-center space-x-2"><button data-id="${idea.id}" class="edit-nail-idea-btn text-blue-500"><i class="fas fa-edit"></i></button><button data-id="${idea.id}" class="delete-nail-idea-btn text-red-500"><i class="fas fa-trash"></i></button></td>`;
        });
    };

    const applyNailIdeaFilters = () => {
        const searchTerm = document.getElementById('nail-idea-search').value.toLowerCase();
        const shapeFilter = document.getElementById('nail-idea-shape-filter').value;
        const categoryFilter = document.getElementById('nail-idea-category-filter').value;
        const filteredIdeas = allNailIdeas.filter(idea => { const matchesSearch = idea.name.toLowerCase().includes(searchTerm) || idea.categories.some(cat => cat.toLowerCase().includes(searchTerm)); const matchesShape = !shapeFilter || idea.shape === shapeFilter; const matchesCategory = !categoryFilter || idea.categories.includes(categoryFilter); return matchesSearch && matchesShape && matchesCategory; });
        renderNailIdeasGallery(filteredIdeas);
    };

    onSnapshot(query(collection(db, "nail_ideas"), orderBy("createdAt", "desc")), (snapshot) => {
        allNailIdeas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // ADD THIS NEW BLOCK to populate the Nail Shape datalist
const shapesDatalist = document.getElementById('nail-shapes-list');
if (shapesDatalist) {
    const uniqueShapes = [...new Set(allNailIdeas.map(idea => idea.shape).filter(Boolean))];
    shapesDatalist.innerHTML = uniqueShapes.map(shape => `<option value="${shape}"></option>`).join('');
}
        const shapes = [...new Set(allNailIdeas.map(i => i.shape).filter(Boolean))];
        const categories = [...new Set(allNailIdeas.flatMap(i => i.categories).filter(Boolean))];
        const shapeFilter = document.getElementById('nail-idea-shape-filter');
        const categoryFilter = document.getElementById('nail-idea-category-filter');
        shapeFilter.innerHTML = '<option value="">All Shapes</option>' + shapes.map(s => `<option value="${s}">${s}</option>`).join('');
        categoryFilter.innerHTML = '<option value="">All Categories</option>' + categories.map(c => `<option value="${c}">${c}</option>`).join('');
        applyNailIdeaFilters();
        renderNailIdeasAdminTable(allNailIdeas);
    });

    document.getElementById('nail-idea-search').addEventListener('input', applyNailIdeaFilters);
    document.getElementById('nail-idea-shape-filter').addEventListener('change', applyNailIdeaFilters);
    document.getElementById('nail-idea-category-filter').addEventListener('change', applyNailIdeaFilters);

   // REPLACE the old addNailIdeaForm listener with this one
addNailIdeaForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const ideaId = document.getElementById('edit-nail-idea-id').value;
    const imageSource = document.querySelector('input[name="imageSource"]:checked').value;
    const file = document.getElementById('nail-idea-image').files[0];
    const imageUrl = document.getElementById('nail-idea-image-url').value;
    let finalImageURL = null;

    const btn = document.getElementById('add-nail-idea-btn');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
        if (imageSource === 'upload') {
            if (!ideaId && !file) {
                alert('Please select an image to upload.');
                btn.disabled = false; btn.textContent = 'Add Idea';
                return;
            }
            if (file) {
                const storageRef = ref(storage, `nail_ideas/${Date.now()}_${file.name}`);
                await uploadBytes(storageRef, file);
                finalImageURL = await getDownloadURL(storageRef);
            }
        } else { // imageSource === 'url'
            if (!imageUrl) {
                alert('Please enter an image URL.');
                btn.disabled = false; btn.textContent = 'Add Idea';
                return;
            }
            finalImageURL = imageUrl;
        }

       const ideaData = {
    name: document.getElementById('nail-idea-name').value,
    description: document.getElementById('nail-idea-description').value, // ADD THIS LINE
    color: document.getElementById('nail-idea-color').value,
    shape: document.getElementById('nail-idea-shape').value,
    categories: document.getElementById('nail-idea-categories').value.split(',').map(s => s.trim()).filter(Boolean),
};

        if (ideaId) { // Editing an existing idea
            const existingIdea = allNailIdeas.find(i => i.id === ideaId);
            if (finalImageURL) { // If a new image (URL or upload) was provided
                ideaData.imageURL = finalImageURL;
                // If the old image was an upload, delete it from storage
                if (existingIdea.imageURL && existingIdea.imageURL.includes('firebasestorage')) {
                    try {
                        const oldImageRef = ref(storage, existingIdea.imageURL);
                        await deleteObject(oldImageRef);
                    } catch (storageError) {
                        console.warn("Could not delete old image, it might not exist:", storageError);
                    }
                }
            }
            await updateDoc(doc(db, "nail_ideas", ideaId), ideaData);
        } else { // Adding a new idea
            ideaData.imageURL = finalImageURL;
            ideaData.createdAt = serverTimestamp();
            await addDoc(collection(db, "nail_ideas"), ideaData);
        }

        resetNailIdeaForm();

    } catch (error) {
        console.error("Error saving nail idea:", error);
        alert("Could not save nail idea.");
    } finally {
        btn.disabled = false;
        // Ensure the text is correct for adding vs. editing
        const buttonText = document.getElementById('edit-nail-idea-id').value ? 'Update Idea' : 'Add Idea';
        btn.textContent = buttonText;
    }
});

    const resetNailIdeaForm = () => {
        addNailIdeaForm.reset();
        document.getElementById('edit-nail-idea-id').value = '';
        document.getElementById('nail-idea-description').value = ''; // ADD THIS LINE
        document.getElementById('add-nail-idea-btn').textContent = 'Add Idea';
        document.getElementById('cancel-edit-nail-idea-btn').classList.add('hidden');
    };
    document.getElementById('cancel-edit-nail-idea-btn').addEventListener('click', resetNailIdeaForm);

    nailIdeasTableBody.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.edit-nail-idea-btn');
        const deleteBtn = e.target.closest('.delete-nail-idea-btn');
        if (editBtn) {
            const idea = allNailIdeas.find(i => i.id === editBtn.dataset.id);
            if (idea) {
                document.getElementById('edit-nail-idea-id').value = idea.id;
                document.getElementById('nail-idea-name').value = idea.name;
                document.getElementById('nail-idea-color').value = idea.color;
                document.getElementById('nail-idea-shape').value = idea.shape;
                document.getElementById('nail-idea-description').value = idea.description || ''; // ADD THIS LINE
                document.getElementById('nail-idea-categories').value = idea.categories.join(', ');
                
                document.getElementById('add-nail-idea-btn').textContent = 'Update Idea';
                document.getElementById('cancel-edit-nail-idea-btn').classList.remove('hidden');
            }
        } else if (deleteBtn) {
            const ideaId = deleteBtn.dataset.id;
            showConfirmModal("Delete this nail idea? This will also delete the image.", async () => {
               // REPLACE the old delete logic with this new version
const ideaToDelete = allNailIdeas.find(i => i.id === ideaId);
if (ideaToDelete) {
    // NEW LINE: Only try to delete from storage if it's a Firebase URL
    if (ideaToDelete.imageURL && ideaToDelete.imageURL.includes('firebasestorage')) {
        const imageRef = ref(storage, ideaToDelete.imageURL);
        await deleteObject(imageRef).catch(err => console.error("Error deleting image from storage", err));
    }
    // This line will now run for all items, whether they had an uploaded image or a URL
    await deleteDoc(doc(db, "nail_ideas", ideaId));
}
            });
        }
    });


    // ADD ALL THIS CODE AT THE END OF THE initMainApp FUNCTION

    // --- COLOR CHART LOGIC ---

    let colorChartInitialized = false;
    let handSVGContent = null;

// Function to pre-fill the database with initial brands and colors
const prefillColorData = async () => {
    const batch = writeBatch(db);

    const brands = {
        "DND": [
            { name: "401 Angel Lace", hex: "#fce5cd", group: "Pinks & Nudes" },
            { name: "429 Pinky Star", hex: "#f4abc4", group: "Pinks & Nudes" },
            { name: "441 Funky Fuchsia", hex: "#d93696", group: "Pinks & Nudes" },
            { name: "473 French Tip", hex: "#fde9f0", group: "Pinks & Nudes" },
            { name: "499 Be My Valentine", hex: "#f7a7c8", group: "Pinks & Nudes" },
            { name: "501 Ballet Pink", hex: "#f9ddec", group: "Pinks & Nudes" },
            { name: "542 Tea Time", hex: "#f3d9d5", group: "Pinks & Nudes" },
            { name: "577 Nude", hex: "#e7d4c5", group: "Pinks & Nudes" },
            { name: "601 Ballet Pink", hex: "#f4c2c2", group: "Pinks & Nudes" },
            { name: "610 Pinky Promise", hex: "#f5b7b1", group: "Pinks & Nudes" },
            { name: "640 Barbie Pink", hex: "#ff82c3", group: "Pinks & Nudes" },
            { name: "650 Rose", hex: "#e4a7b5", group: "Pinks & Nudes" },
            { name: "661 Bubble Gum", hex: "#f7b2d5", group: "Pinks & Nudes" },
            { name: "719 Tutti Frutti", hex: "#ff6392", group: "Pinks & Nudes" },
            { name: "807 Cotton Candy", hex: "#ffbcd9", group: "Pinks & Nudes" },
            { name: "857 Sheer Pink", hex: "#ffe4e1", group: "Pinks & Nudes" },
            { name: "860 Perfect Nude", hex: "#eec9b8", group: "Pinks & Nudes" },
            { name: "862 Milky Pink", hex: "#fceef5", group: "Pinks & Nudes" },
            { name: "DC023 Blushing", hex: "#ffb6c1", group: "Pinks & Nudes" },
            { name: "DC149 Antique Pink", hex: "#e0b4b4", group: "Pinks & Nudes" },
            { name: "DC151 Rose Petal", hex: "#f9a8d4", group: "Pinks & Nudes" },
            { name: "430 Ferrari Red", hex: "#c1121f", group: "Reds & Berries" },
            { name: "429 Boston University Red", hex: "#cc0000", group: "Reds & Berries" },
            { name: "498 Fiery Red", hex: "#d90429", group: "Reds & Berries" },
            { name: "510 Red Stone", hex: "#a4161a", group: "Reds & Berries" },
            { name: "545 Fiery Red", hex: "#ff0000", group: "Reds & Berries" },
            { name: "633 Garnet Red", hex: "#8c0000", group: "Reds & Berries" },
            { name: "751 Cherry Mocha", hex: "#6a0000", group: "Reds & Berries" },
            { name: "753 Scarlett Dreams", hex: "#b20000", group: "Reds & Berries" },
            { name: "754 Winter Berry", hex: "#a4133c", group: "Reds & Berries" },
            { name: "757 Chili Pepper", hex: "#9b2226", group: "Reds & Berries" },
            { name: "DC010 Red Cherry", hex: "#c9184a", group: "Reds & Berries" },
            { name: "DC085 Cranberry", hex: "#8d0801", group: "Reds & Berries" },
            { name: "434 Violet", hex: "#a393eb", group: "Purples" },
            { name: "500 Lavender", hex: "#e6e6fa", group: "Purples" },
            { name: "543 Purple Passion", hex: "#8338ec", group: "Purples" },
            { name: "620 Grape", hex: "#6a0dad", group: "Purples" },
            { name: "621 Purple Rain", hex: "#7b2cbf", group: "Purples" },
            { name: "670 Lilac", hex: "#c8a2c8", group: "Purples" },
            { name: "785 Voodoo", hex: "#5a189a", group: "Purples" },
            { name: "DC091 Lavender Haze", hex: "#b39ddb", group: "Purples" },
            { name: "DC105 Iris", hex: "#9d4edd", group: "Purples" },
            { name: "DC172 Lilac Season", hex: "#c7b7e3", group: "Purples" },
            { name: "436 Baby Blue", hex: "#89cff0", group: "Blues" },
            { name: "502 Ocean Blue", hex: "#0081a7", group: "Blues" },
            { name: "529 Blue River", hex: "#0077b6", group: "Blues" },
            { name: "572 Great Smoky Mountain", hex: "#4895ef", group: "Blues" },
            { name: "574 Blue Bell", hex: "#a2a2d0", group: "Blues" },
            { name: "575 Blue Earth", hex: "#3f88c5", group: "Blues" },
            { name: "622 Midnight Blue", hex: "#03045e", group: "Blues" },
            { name: "671 Blue Hawaiian", hex: "#00b4d8", group: "Blues" },
            { name: "734 Berry Blue", hex: "#4a4e69", group: "Blues" },
            { name: "DC028 Navy Blue", hex: "#000080", group: "Blues" },
            { name: "DC107 Periwinkle", hex: "#ccccff", group: "Blues" },
            { name: "DC165 North Sea", hex: "#2b2d42", group: "Blues" },
            { name: "431 Minty Green", hex: "#98ff98", group: "Greens" },
            { name: "503 Lime Green", hex: "#32cd32", group: "Greens" },
            { name: "530 Emerald Green", hex: "#50c878", group: "Greens" },
            { name: "605 Olive Green", hex: "#808000", group: "Greens" },
            { name: "617 Sage", hex: "#b2ac88", group: "Greens" },
            { name: "680 Teal", hex: "#008080", group: "Greens" },
            { name: "747 Aurora Green", hex: "#4f7942", group: "Greens" },
            { name: "DC055 Mermaid Green", hex: "#006d77", group: "Greens" },
            { name: "DC118 Pale Kiwi", hex: "#d0f4de", group: "Greens" },
            { name: "DC205 Racing Green", hex: "#004b23", group: "Greens" },
            { name: "418 Butternut Squash", hex: "#f8961e", group: "Oranges & Corals" },
            { name: "420 Neon Orange", hex: "#ff9e00", group: "Oranges & Corals" },
            { name: "506 Sunset Orange", hex: "#fb5607", group: "Oranges & Corals" },
            { name: "532 Coral", hex: "#ff7f50", group: "Oranges & Corals" },
            { name: "660 Papaya", hex: "#ffc971", group: "Oranges & Corals" },
            { name: "729 Ambrosia", hex: "#ffbf69", group: "Oranges & Corals" },
            { name: "756 Bonfire", hex: "#f48c06", group: "Oranges & Corals" },
            { name: "DC011 Coral Kiss", hex: "#f77f00", group: "Oranges & Corals" },
            { name: "DC163 Coral Castle", hex: "#ff8fab", group: "Oranges & Corals" },
            { name: "DC205 Papaya Pop", hex: "#ff97b3", group: "Oranges & Corals" },
            { name: "425 Sunshine Yellow", hex: "#ffca3a", group: "Yellows" },
            { name: "525 Lemon Juice", hex: "#fdfcdc", group: "Yellows" },
            { name: "531 Canary Yellow", hex: "#fef278", group: "Yellows" },
            { name: "616 Lemon", hex: "#fff44f", group: "Yellows" },
            { name: "745 Honey", hex: "#fca311", group: "Yellows" },
            { name: "DC190 Gold Glam", hex: "#f0c808", group: "Yellows" },
            { name: "DC2509 Gimmie' Butter", hex: "#fae152", group: "Yellows" },
            { name: "405 Taupe", hex: "#bcae9e", group: "Browns & Neutrals" },
            { name: "422 Brown", hex: "#6f4e37", group: "Browns & Neutrals" },
            { name: "550 Chocolate", hex: "#492611", group: "Browns & Neutrals" },
            { name: "607 Espresso", hex: "#362222", group: "Browns & Neutrals" },
            { name: "750 Fudgsicle", hex: "#45322e", group: "Browns & Neutrals" },
            { name: "971 Tele-Talking", hex: "#eaddcf", group: "Browns & Neutrals" },
            { name: "DC075 Spiced Brown", hex: "#7f5539", group: "Browns & Neutrals" },
            { name: "447 Black Licorice", hex: "#000000", group: "Grays, Blacks & Whites" },
            { name: "448 Snow Flake", hex: "#ffffff", group: "Grays, Blacks & Whites" },
            { name: "460 Gray", hex: "#8e8d8d", group: "Grays, Blacks & Whites" },
            { name: "555 Charcoal", hex: "#3d3d3d", group: "Grays, Blacks & Whites" },
            { name: "602 Silver", hex: "#c0c0c0", group: "Grays, Blacks & Whites" },
            { name: "DC001 French White", hex: "#ffffff", group: "Grays, Blacks & Whites" },
            { name: "DC002 Sugar Swizzle", hex: "#f7ede2", group: "Grays, Blacks & Whites" },
            { name: "DC030 Charcoal Gray", hex: "#5e5e5e", group: "Grays, Blacks & Whites" },
            { name: "443 Twinkle Little Star", hex: "#d4af37", group: "Glitters & Metallics" },
            { name: "558 Gold", hex: "#ffd700", group: "Glitters & Metallics" },
            { name: "645 Rose Gold", hex: "#b76e79", group: "Glitters & Metallics" },
            { name: "740 Dazzle", hex: "#e0b0ff", group: "Glitters & Metallics" },
            { name: "741 Diamond Eyes", hex: "#b9f2ff", group: "Glitters & Metallics" },
            { name: "792 Bubbles", hex: "#e7feff", group: "Glitters & Metallics" },
            { name: "795 Super-Nova", hex: "#c9bcf3", group: "Glitters & Metallics" },
            { name: "726 Whirly Pop", hex: "#fec8d8", group: "Glitters & Metallics" },
        ],
        "DC": [
            { name: "002 Sugar Swizzle", hex: "#f7ede2", group: "Pinks & Nudes" },
            { name: "003 Dusty Pink", hex: "#e4c7c2", group: "Pinks & Nudes" },
            { name: "005 Pinky Swear", hex: "#f5cac3", group: "Pinks & Nudes" },
            { name: "023 Blushing", hex: "#ffb6c1", group: "Pinks & Nudes" },
            { name: "032 Tea Rose", hex: "#f4c2c2", group: "Pinks & Nudes" },
            { name: "045 Soft Peach", hex: "#fdebd1", group: "Pinks & Nudes" },
            { name: "051 Ballet Slipper", hex: "#fde8e9", group: "Pinks & Nudes" },
            { name: "062 Mauvelous", hex: "#e0b0ff", group: "Pinks & Nudes" },
            { name: "078 Rosewood", hex: "#a87c7c", group: "Pinks & Nudes" },
            { name: "088 Shocking Pink", hex: "#fc0fc0", group: "Pinks & Nudes" },
            { name: "101 Peachy Keen", hex: "#f8c8a0", group: "Pinks & Nudes" },
            { name: "115 Barefoot", hex: "#e7d2cc", group: "Pinks & Nudes" },
            { name: "125 Cashmere", hex: "#d1b399", group: "Pinks & Nudes" },
            { name: "149 Antique Pink", hex: "#e0b4b4", group: "Pinks & Nudes" },
            { name: "151 Rose Petal", hex: "#f9a8d4", group: "Pinks & Nudes" },
            { name: "166 Flamingo", hex: "#fca3b7", group: "Pinks & Nudes" },
            { name: "175 Fuchsia", hex: "#ff00ff", group: "Pinks & Nudes" },
            { name: "180 Pink Tutu", hex: "#f3d6e4", group: "Pinks & Nudes" },
            { name: "007 Fire Red", hex: "#be0000", group: "Reds & Berries" },
            { name: "008 Cherry Pop", hex: "#990000", group: "Reds & Berries" },
            { name: "010 Red Cherry", hex: "#c9184a", group: "Reds & Berries" },
            { name: "020 Red Stone", hex: "#a4161a", group: "Reds & Berries" },
            { name: "035 Scarlet Letter", hex: "#ff2400", group: "Reds & Berries" },
            { name: "048 Crimson", hex: "#dc143c", group: "Reds & Berries" },
            { name: "058 Pomegranate", hex: "#c1121f", group: "Reds & Berries" },
            { name: "070 Wine & Dine", hex: "#6a0000", group: "Reds & Berries" },
            { name: "085 Cranberry", hex: "#8d0801", group: "Reds & Berries" },
            { name: "100 Hollywood Red", hex: "#c10000", group: "Reds & Berries" },
            { name: "123 Sangria", hex: "#7e0021", group: "Reds & Berries" },
            { name: "135 Raspberry", hex: "#d7263d", group: "Reds & Berries" },
            { name: "155 Ruby Red", hex: "#e0115f", group: "Reds & Berries" },
            { name: "178 Strawberry", hex: "#fc5a8d", group: "Reds & Berries" },
            { name: "018 Lilac Mist", hex: "#dcd0ff", group: "Purples" },
            { name: "025 Grapevine", hex: "#5a189a", group: "Purples" },
            { name: "038 Purple Haze", hex: "#a393eb", group: "Purples" },
            { name: "052 Electric Purple", hex: "#bf00ff", group: "Purples" },
            { name: "065 Violet Vixen", hex: "#8338ec", group: "Purples" },
            { name: "075 Orchid", hex: "#af69ee", group: "Purples" },
            { name: "091 Lavender Haze", hex: "#b39ddb", group: "Purples" },
            { name: "105 Iris", hex: "#9d4edd", group: "Purples" },
            { name: "118 Amethyst", hex: "#9b5de5", group: "Purples" },
            { name: "132 Periwinkle", hex: "#b2b2e0", group: "Purples" },
            { name: "150 Plum", hex: "#5d3a9b", group: "Purples" },
            { name: "172 Lilac Season", hex: "#c7b7e3", group: "Purples" },
            { name: "177 Wisteria", hex: "#cba0e1", group: "Purples" },
            { name: "015 Ice Blue", hex: "#add8e6", group: "Blues" },
            { name: "028 Navy Blue", hex: "#000080", group: "Blues" },
            { name: "037 Sky Blue", hex: "#87cefa", group: "Blues" },
            { name: "042 Royal Blue", hex: "#002366", group: "Blues" },
            { name: "056 Ocean Deep", hex: "#0077b6", group: "Blues" },
            { name: "072 Blue Lagoon", hex: "#0096c7", group: "Blues" },
            { name: "083 Denim", hex: "#22577a", group: "Blues" },
            { name: "107 Periwinkle", hex: "#ccccff", group: "Blues" },
            { name: "120 Teal", hex: "#008080", group: "Blues" },
            { name: "138 Sapphire", hex: "#0f52ba", group: "Blues" },
            { name: "145 Baby Boy Blue", hex: "#a2d2ff", group: "Blues" },
            { name: "165 North Sea", hex: "#2b2d42", group: "Blues" },
            { name: "178 Cornflower", hex: "#6495ed", group: "Blues" },
            { name: "026 Minty Fresh", hex: "#cce3de", group: "Greens" },
            { name: "036 Forest Green", hex: "#014421", group: "Greens" },
            { name: "047 Olive You", hex: "#6b705c", group: "Greens" },
            { name: "055 Mermaid Green", hex: "#006d77", group: "Greens" },
            { name: "068 Sage", hex: "#a3b18a", group: "Greens" },
            { name: "080 Emerald", hex: "#009b7d", group: "Greens" },
            { name: "108 Lime Light", hex: "#bfff00", group: "Greens" },
            { name: "118 Pale Kiwi", hex: "#d0f4de", group: "Greens" },
            { name: "130 Jade", hex: "#00a36c", group: "Greens" },
            { name: "153 Hunter", hex: "#386641", group: "Greens" },
            { name: "168 Pistachio", hex: "#a1c084", group: "Greens" },
            { name: "179 Seafoam", hex: "#80b9a9", group: "Greens" },
            { name: "011 Coral Kiss", hex: "#f77f00", group: "Oranges & Corals" },
            { name: "012 Sunny Day", hex: "#fca311", group: "Oranges & Corals" },
            { name: "027 Peach Sorbet", hex: "#ffdba1", group: "Oranges & Corals" },
            { name: "040 Goldenrod", hex: "#daa520", group: "Oranges & Corals" },
            { name: "053 Tangerine", hex: "#ff9505", group: "Oranges & Corals" },
            { name: "066 Marigold", hex: "#fcc421", group: "Oranges & Corals" },
            { name: "081 Neon Orange", hex: "#ffad00", group: "Oranges & Corals" },
            { name: "095 Buttercup", hex: "#fae152", group: "Oranges & Corals" },
            { name: "111 Papaya", hex: "#f8961e", group: "Oranges & Corals" },
            { name: "133 Mango Tango", hex: "#fb8500", group: "Oranges & Corals" },
            { name: "152 Lemonade", hex: "#fcf4a3", group: "Oranges & Corals" },
            { name: "170 Burnt Sienna", hex: "#e85d04", group: "Oranges & Corals" },
            { name: "190 Gold Glam", hex: "#f0c808", group: "Oranges & Corals" },
            { name: "017 Almond", hex: "#eaddcf", group: "Browns & Neutrals" },
            { name: "022 Toasted Brown", hex: "#8a5a44", group: "Browns & Neutrals" },
            { name: "033 Espresso", hex: "#4a2c2a", group: "Browns & Neutrals" },
            { name: "046 Taupe", hex: "#a99985", group: "Browns & Neutrals" },
            { name: "060 Mocha", hex: "#6d4c41", group: "Browns & Neutrals" },
            { name: "075 Spiced Brown", hex: "#7f5539", group: "Browns & Neutrals" },
            { name: "089 Latte", hex: "#c4a389", group: "Browns & Neutrals" },
            { name: "106 Caramel", hex: "#bc6c25", group: "Browns & Neutrals" },
            { name: "117 Khaki", hex: "#b5a68d", group: "Browns & Neutrals" },
            { name: "131 Clay", hex: "#a18276", group: "Browns & Neutrals" },
            { name: "158 Chestnut", hex: "#744838", group: "Browns & Neutrals" },
            { name: "173 Sandstone", hex: "#cbbba0", group: "Browns & Neutrals" },
            { name: "001 French White", hex: "#ffffff", group: "Grays, Blacks & Whites" },
            { name: "030 Charcoal Gray", hex: "#5e5e5e", group: "Grays, Blacks & Whites" },
            { name: "041 Silver Lining", hex: "#d1d1d1", group: "Grays, Blacks & Whites" },
            { name: "050 Black Out", hex: "#000000", group: "Grays, Blacks & Whites" },
            { name: "063 Stormy", hex: "#797d7f", group: "Grays, Blacks & Whites" },
            { name: "076 Ash", hex: "#abb2b9", group: "Grays, Blacks & Whites" },
            { name: "099 Dove", hex: "#d8d8d8", group: "Grays, Blacks & Whites" },
            { name: "121 Milky Way", hex: "#f8f9fa", group: "Grays, Blacks & Whites" },
            { name: "140 Slate", hex: "#5d737e", group: "Grays, Blacks & Whites" },
            { name: "160 Steel", hex: "#858585", group: "Grays, Blacks & Whites" },
        ],
        "DD": [
            { name: "001 Bare Pink", hex: "#f4e3e0", group: "Pinks & Nudes" },
            { name: "003 Nude Pink", hex: "#e8d1c5", group: "Pinks & Nudes" },
            { name: "005 Pinky Nude", hex: "#e7c2b5", group: "Pinks & Nudes" },
            { name: "025 English Rose", hex: "#d9a9a3", group: "Pinks & Nudes" },
            { name: "032 Dusty Rose", hex: "#c99a98", group: "Pinks & Nudes" },
            { name: "041 Soft Pink", hex: "#f6d4d3", group: "Pinks & Nudes" },
            { name: "050 Baby Pink", hex: "#f5b7b1", group: "Pinks & Nudes" },
            { name: "077 Flamingo Pink", hex: "#f4a2a3", group: "Pinks & Nudes" },
            { name: "081 Barbie Pink", hex: "#e75480", group: "Pinks & Nudes" },
            { name: "088 Hot Pink", hex: "#ff69b4", group: "Pinks & Nudes" },
            { name: "102 Peach Puff", hex: "#f2d3b3", group: "Pinks & Nudes" },
            { name: "111 Sandy Beach", hex: "#e4c6a8", group: "Pinks & Nudes" },
            { name: "125 Taupe", hex: "#bcae9e", group: "Pinks & Nudes" },
            { name: "151 Rose Gold", hex: "#e0b4b4", group: "Pinks & Nudes" },
            { name: "203 Cotton Candy", hex: "#ffbcd9", group: "Pinks & Nudes" },
            { name: "220 Bubblegum", hex: "#ffc1cc", group: "Pinks & Nudes" },
            { name: "250 Mauve", hex: "#d1a3a4", group: "Pinks & Nudes" },
            { name: "288 Peony", hex: "#eeafaf", group: "Pinks & Nudes" },
            { name: "007 Cherry Red", hex: "#c21807", group: "Reds & Berries" },
            { name: "008 Fire Engine Red", hex: "#ce2029", group: "Reds & Berries" },
            { name: "036 Classic Red", hex: "#a11d21", group: "Reds & Berries" },
            { name: "045 Deep Red", hex: "#9b1c1c", group: "Reds & Berries" },
            { name: "058 Wine Red", hex: "#8b0000", group: "Reds & Berries" },
            { name: "060 Burgundy", hex: "#800020", group: "Reds & Berries" },
            { name: "075 Raspberry", hex: "#e30b5d", group: "Reds & Berries" },
            { name: "090 Cranberry", hex: "#951a32", group: "Reds & Berries" },
            { name: "100 Apple Red", hex: "#d71f28", group: "Reds & Berries" },
            { name: "133 Scarlet", hex: "#ff2400", group: "Reds & Berries" },
            { name: "144 Brick Red", hex: "#cb4154", group: "Reds & Berries" },
            { name: "168 Sangria", hex: "#5e0b15", group: "Reds & Berries" },
            { name: "189 Poppy", hex: "#e35335", group: "Reds & Berries" },
            { name: "211 Merlot", hex: "#731c22", group: "Reds & Berries" },
            { name: "245 Lipstick Red", hex: "#c00000", group: "Reds & Berries" },
            { name: "277 Ruby", hex: "#e0115f", group: "Reds & Berries" },
            { name: "011 Lavender", hex: "#e6e6fa", group: "Purples" },
            { name: "012 Lilac", hex: "#c8a2c8", group: "Purples" },
            { name: "028 Orchid", hex: "#da70d6", group: "Purples" },
            { name: "040 Violet", hex: "#8f00ff", group: "Purples" },
            { name: "065 Amethyst", hex: "#9966cc", group: "Purples" },
            { name: "078 Grape", hex: "#6f2da8", group: "Purples" },
            { name: "092 Plum", hex: "#8e4585", group: "Purples" },
            { name: "110 Periwinkle", hex: "#ccccff", group: "Purples" },
            { name: "123 Iris", hex: "#5a4fcf", group: "Purples" },
            { name: "155 Royal Purple", hex: "#7851a9", group: "Purples" },
            { name: "176 Magenta", hex: "#ff00ff", group: "Purples" },
            { name: "210 Eggplant", hex: "#483248", group: "Purples" },
            { name: "233 Wisteria", hex: "#c9a0dc", group: "Purples" },
            { name: "266 Thistle", hex: "#d8bfd8", group: "Purples" },
            { name: "299 Boysenberry", hex: "#873260", group: "Purples" },
            { name: "013 Baby Blue", hex: "#89cff0", group: "Blues" },
            { name: "014 Sky Blue", hex: "#87ceeb", group: "Blues" },
            { name: "021 Tiffany Blue", hex: "#0abab5", group: "Blues" },
            { name: "043 Royal Blue", hex: "#4169e1", group: "Blues" },
            { name: "055 Navy Blue", hex: "#000080", group: "Blues" },
            { name: "068 Teal", hex: "#008080", group: "Blues" },
            { name: "084 Denim Blue", hex: "#1560bd", group: "Blues" },
            { name: "105 Ocean Blue", hex: "#0077be", group: "Blues" },
            { name: "115 Slate Blue", hex: "#6a5acd", group: "Blues" },
            { name: "130 Cobalt Blue", hex: "#0047ab", group: "Blues" },
            { name: "160 Midnight Blue", hex: "#003366", group: "Blues" },
            { name: "181 Powder Blue", hex: "#b0e0e6", group: "Blues" },
            { name: "200 Turquoise", hex: "#40e0d0", group: "Blues" },
            { name: "240 Aqua", hex: "#00ffff", group: "Blues" },
            { name: "270 Cerulean", hex: "#2a52be", group: "Blues" },
            { name: "015 Mint Green", hex: "#98ff98", group: "Greens" },
            { name: "016 Sage Green", hex: "#b2ac88", group: "Greens" },
            { name: "022 Pistachio", hex: "#93c572", group: "Greens" },
            { name: "048 Lime Green", hex: "#32cd32", group: "Greens" },
            { name: "057 Olive Green", hex: "#808000", group: "Greens" },
            { name: "070 Forest Green", hex: "#228b22", group: "Greens" },
            { name: "085 Emerald Green", hex: "#50c878", group: "Greens" },
            { name: "118 Hunter Green", hex: "#355e3b", group: "Greens" },
            { name: "135 Kelly Green", hex: "#4cbb17", group: "Greens" },
            { name: "150 Seafoam Green", hex: "#9fe2bf", group: "Greens" },
            { name: "177 Jade", hex: "#00a86b", group: "Greens" },
            { name: "195 Chartreuse", hex: "#dfff00", group: "Greens" },
            { name: "215 Army Green", hex: "#4b5320", group: "Greens" },
            { name: "255 Celadon", hex: "#ace1af", group: "Greens" },
            { name: "290 Pear", hex: "#d1e231", group: "Greens" },
            { name: "018 Peach", hex: "#ffcba4", group: "Oranges & Yellows" },
            { name: "019 Coral", hex: "#ff7f50", group: "Oranges & Yellows" },
            { name: "030 Pastel Yellow", hex: "#fdfd96", group: "Oranges & Yellows" },
            { name: "031 Lemon Yellow", hex: "#fff44f", group: "Oranges & Yellows" },
            { name: "063 Tangerine", hex: "#f28500", group: "Oranges & Yellows" },
            { name: "072 Marigold", hex: "#ffbf00", group: "Oranges & Yellows" },
            { name: "095 Mustard Yellow", hex: "#ffdb58", group: "Oranges & Yellows" },
            { name: "112 Gold", hex: "#ffd700", group: "Oranges & Yellows" },
            { name: "140 Burnt Orange", hex: "#cc5500", group: "Oranges & Yellows" },
            { name: "165 Apricot", hex: "#fbceb1", group: "Oranges & Yellows" },
            { name: "188 Mango", hex: "#fdb84e", group: "Oranges & Yellows" },
            { name: "208 Buttercup", hex: "#fae052", group: "Oranges & Yellows" },
            { name: "225 Papaya", hex: "#ffc971", group: "Oranges & Yellows" },
            { name: "260 Cantaloupe", hex: "#fa9a50", group: "Oranges & Yellows" },
            { name: "295 Neon Orange", hex: "#ff9933", group: "Oranges & Yellows" },
            { name: "023 Beige", hex: "#f5f5dc", group: "Browns & Neutrals" },
            { name: "024 Tan", hex: "#d2b48c", group: "Browns & Neutrals" },
            { name: "035 Cream", hex: "#fffdd0", group: "Browns & Neutrals" },
            { name: "052 Chocolate", hex: "#7b3f00", group: "Browns & Neutrals" },
            { name: "061 Coffee", hex: "#6f4e37", group: "Browns & Neutrals" },
            { name: "076 Caramel", hex: "#af6f09", group: "Browns & Neutrals" },
            { name: "098 Cinnamon", hex: "#d2691e", group: "Browns & Neutrals" },
            { name: "120 Mocha", hex: "#9d7c61", group: "Browns & Neutrals" },
            { name: "138 Walnut", hex: "#593a28", group: "Browns & Neutrals" },
            { name: "158 Chestnut", hex: "#954535", group: "Browns & Neutrals" },
            { name: "180 Khaki", hex: "#c3b091", group: "Browns & Neutrals" },
            { name: "223 Ivory", hex: "#fffff0", group: "Browns & Neutrals" },
            { name: "252 Clay", hex: "#bca28e", group: "Browns & Neutrals" },
            { name: "280 Toffee", hex: "#8c5a2b", group: "Browns & Neutrals" },
            { name: "033 White", hex: "#ffffff", group: "Grays, Blacks & Whites" },
            { name: "034 Black", hex: "#000000", group: "Grays, Blacks & Whites" },
            { name: "049 Light Gray", hex: "#d3d3d3", group: "Grays, Blacks & Whites" },
            { name: "059 Silver", hex: "#c0c0c0", group: "Grays, Blacks & Whites" },
            { name: "069 Charcoal", hex: "#36454f", group: "Grays, Blacks & Whites" },
            { name: "086 Slate Gray", hex: "#708090", group: "Grays, Blacks & Whites" },
            { name: "101 Platinum", hex: "#e5e4e2", group: "Grays, Blacks & Whites" },
            { name: "121 Ash Gray", hex: "#b2beb5", group: "Grays, Blacks & Whites" },
            { name: "148 Stone", hex: "#8a795d", group: "Grays, Blacks & Whites" },
            { name: "170 Gunmetal", hex: "#53565a", group: "Grays, Blacks & Whites" },
            { name: "199 Onyx", hex: "#353839", group: "Grays, Blacks & Whites" },
            { name: "230 Off White", hex: "#f8f8f8", group: "Grays, Blacks & Whites" },
            { name: "262 Iron Gray", hex: "#615f5f", group: "Grays, Blacks & Whites" },
            { name: "298 Jet Black", hex: "#0a0a0a", group: "Grays, Blacks & Whites" },
        ],
        "Royal Cat Eye": [
            { name: "01 Ruby Slipper", hex: "#c00000", group: "Reds & Pinks" },
            { name: "02 Garnet", hex: "#9d0208", group: "Reds & Pinks" },
            { name: "03 Crimson", hex: "#8b0000", group: "Reds & Pinks" },
            { name: "04 Rose Quartz", hex: "#f7cac9", group: "Reds & Pinks" },
            { name: "05 Flamingo", hex: "#f896d8", group: "Reds & Pinks" },
            { name: "06 Fuchsia", hex: "#e75480", group: "Reds & Pinks" },
            { name: "07 Amethyst", hex: "#a45ee5", group: "Purples" },
            { name: "08 Lavender", hex: "#b57edc", group: "Purples" },
            { name: "09 Plum", hex: "#8e4585", group: "Purples" },
            { name: "10 Grape", hex: "#6f2da8", group: "Purples" },
            { name: "11 Violet", hex: "#7f00ff", group: "Purples" },
            { name: "12 Indigo", hex: "#4b0082", group: "Purples" },
            { name: "13 Sapphire", hex: "#0f52ba", group: "Blues" },
            { name: "14 Royal Blue", hex: "#0038a8", group: "Blues" },
            { name: "15 Cobalt", hex: "#0047ab", group: "Blues" },
            { name: "16 Ocean", hex: "#0077b6", group: "Blues" },
            { name: "17 Sky", hex: "#87ceeb", group: "Blues" },
            { name: "18 Baby Blue", hex: "#a2d2ff", group: "Blues" },
            { name: "19 Emerald", hex: "#009b7d", group: "Greens" },
            { name: "20 Forest", hex: "#014421", group: "Greens" },
            { name: "21 Jade", hex: "#00a86b", group: "Greens" },
            { name: "22 Olive", hex: "#708238", group: "Greens" },
            { name: "23 Mint", hex: "#bdfcc9", group: "Greens" },
            { name: "24 Teal", hex: "#008080", group: "Greens" },
            { name: "25 Gold", hex: "#ffd700", group: "Golds & Yellows" },
            { name: "26 Champagne", hex: "#f7e7ce", group: "Golds & Yellows" },
            { name: "27 Lemon", hex: "#fff44f", group: "Golds & Yellows" },
            { name: "28 Copper", hex: "#b87333", group: "Golds & Yellows" },
            { name: "29 Bronze", hex: "#cd7f32", group: "Golds & Yellows" },
            { name: "30 Amber", hex: "#ffbf00", group: "Golds & Yellows" },
            { name: "31 Silver", hex: "#c0c0c0", group: "Neutrals & Metallics" },
            { name: "32 Platinum", hex: "#e5e4e2", group: "Neutrals & Metallics" },
            { name: "33 Steel", hex: "#858585", group: "Neutrals & Metallics" },
            { name: "34 Onyx", hex: "#353839", group: "Neutrals & Metallics" },
            { name: "35 Diamond", hex: "#ffffff", group: "Neutrals & Metallics" },
            { name: "36 Pearl", hex: "#f0f0e0", group: "Neutrals & Metallics" },
            { name: "37 Chocolate", hex: "#5a3a22", group: "Browns" },
            { name: "38 Coffee", hex: "#4b372c", group: "Browns" },
            { name: "39 Mocha", hex: "#87624f", group: "Browns" },
            { name: "40 Caramel", hex: "#af6f09", group: "Browns" },
            { name: "41 Topaz", hex: "#ffc87c", group: "Browns" },
            { name: "42 Peach", hex: "#ffc99a", group: "Browns" },
            { name: "43 Sunset", hex: "#f28500", group: "Oranges" },
            { name: "44 Marigold", hex: "#fca311", group: "Oranges" },
            { name: "45 Coral", hex: "#ff7f50", group: "Oranges" },
            { name: "46 Fire", hex: "#e25822", group: "Oranges" },
            { name: "47 Papaya", hex: "#ff97b3", group: "Oranges" },
            { name: "48 Tiger Eye", hex: "#b0793d", group: "Oranges" }
        ],
        "Chrome": []
    };

    for (const brandName in brands) {
        const docRef = doc(db, "color_brands", brandName);
        await setDoc(docRef, { name: brandName, colors: brands[brandName] }, { merge: true });
    }

    try {
        console.log("Successfully pre-filled and merged color chart data.");
    } catch (error) {
        console.error("Error pre-filling color data: ", error);
    }
};

// REPLACE this function inside initMainApp()
const updateColorChartDisplay = (brand) => {
    const groupFilter = document.getElementById('color-group-filter');
    const searchInput = document.getElementById('color-search-input');
    const allGroups = [...new Set(brand.colors.map(c => c.group || 'Uncategorized'))];

    // Populate group filter dropdown, preserving the current selection
    const currentGroupSelection = groupFilter.value;
    groupFilter.innerHTML = '<option value="all">All Groups</option>';
    allGroups.sort().forEach(group => {
        const isSelected = group === currentGroupSelection ? 'selected' : '';
        groupFilter.innerHTML += `<option value="${group}" ${isSelected}>${group}</option>`;
    });

    const selectedGroup = groupFilter.value;
    const searchTerm = searchInput.value.toLowerCase();
    let colorsToDisplay = brand.colors;

    // Filter by group first
    if (selectedGroup && selectedGroup !== 'all') {
        colorsToDisplay = colorsToDisplay.filter(c => (c.group || 'Uncategorized') === selectedGroup);
    }
    
    // Then filter by search term
    if (searchTerm) {
        colorsToDisplay = colorsToDisplay.filter(c => c.name.toLowerCase().includes(searchTerm));
    }
    
    renderColorSwatches(colorsToDisplay);
};

// REPLACE this function inside initMainApp()
const renderColorSwatches = (colors) => {
    const container = document.getElementById('color-swatches-container');
    container.innerHTML = '';
    if (colors.length === 0) {
        container.innerHTML = '<p class="col-span-full text-sm text-gray-500">No colors match your filter.</p>';
    } else {
        colors.forEach(color => {
            container.innerHTML += `
                <div class="text-center">
                    <div class="color-swatch mx-auto" data-color="${color.hex}" style="background-color: ${color.hex};"></div>
                    <p class="text-xs mt-1">${color.name}</p>
                </div>
            `;
        });
    }
};

// REPLACE this function inside initMainApp()
const initColorChart = async () => {
    if (colorChartInitialized) return;

    if (!handSVGContent) {
        try {
            const response = await fetch('hand.svg');
            handSVGContent = await response.text();
        } catch (e) { console.error("Could not load hand.svg", e); return; }
    }
    const handContainer = document.getElementById('hand-preview-container');
    handContainer.innerHTML = handSVGContent;

    const tabsContainer = document.getElementById('color-brands-tabs');
    tabsContainer.innerHTML = '';
    allColorBrands.forEach((brand, index) => {
        const btn = document.createElement('button');
        btn.className = 'color-brand-btn px-3 py-1 rounded-full text-sm';
        btn.textContent = brand.name;
        btn.dataset.brandId = brand.id;
        if (index === 0) {
            btn.classList.add('active');
            updateColorChartDisplay(brand); // Initial display
        }
        tabsContainer.appendChild(btn);
    });

    const reapplyFilters = () => {
        const activeBrandBtn = tabsContainer.querySelector('.color-brand-btn.active');
        if (activeBrandBtn) {
            const brand = allColorBrands.find(b => b.id === activeBrandBtn.dataset.brandId);
            updateColorChartDisplay(brand);
        }
    };

    tabsContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.color-brand-btn');
        if (btn) {
            tabsContainer.querySelectorAll('.color-brand-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Reset filters for a new brand
            document.getElementById('color-group-filter').value = 'all';
            document.getElementById('color-search-input').value = '';
            
            reapplyFilters();
        }
    });

    // Correctly wire up the event listeners
    document.getElementById('color-group-filter').addEventListener('change', reapplyFilters);
    document.getElementById('color-search-input').addEventListener('input', reapplyFilters);

    document.getElementById('color-swatches-container').addEventListener('click', (e) => {
        const swatch = e.target.closest('.color-swatch');
        if (swatch) {
            const color = swatch.dataset.color;
            handContainer.querySelectorAll('.nail').forEach(nailPath => {
                nailPath.style.fill = color;
            });
        }
    });
    
    colorChartInitialized = true;
};

    // --- COLOR CHART ADMIN LOGIC ---
// Located inside initMainApp()
const renderColorBrandsAdmin = () => {
    const container = document.getElementById('color-brands-admin-list');
    if(!container) return;

    container.innerHTML = '';
    allColorBrands.forEach(brand => {
        const div = document.createElement('div');
        div.className = 'p-3 border rounded-lg bg-white flex justify-between items-center';
        div.innerHTML = `
            <span class="font-bold">${brand.name}</span>
            <div>
                <span class="text-sm text-gray-500 mr-4">${brand.colors.length} colors</span>
                
                <button data-id="${brand.id}" class="edit-color-brand-btn text-blue-500 hover:text-blue-700 mr-2" title="Edit Colors"><i class="fas fa-palette"></i></button>

                <button data-id="${brand.id}" class="delete-color-brand-btn text-red-500 hover:text-red-700" title="Delete Brand"><i class="fas fa-trash"></i></button>
            </div>
        `;
        container.appendChild(div);
    });
};

    document.getElementById('add-color-brand-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById('new-color-brand-name');
        const brandName = input.value.trim();
        if (brandName) {
            try {
                await setDoc(doc(db, "color_brands", brandName), { name: brandName, colors: [] });
                input.value = '';
            } catch (error) {
                console.error("Error adding new color brand: ", error);
                alert("Could not add new brand.");
            }
        }
    });

    document.getElementById('color-brands-admin-list')?.addEventListener('click', (e) => {
        const delBtn = e.target.closest('.delete-color-brand-btn');
        if (delBtn) {
            const brandId = delBtn.dataset.id;
            const brand = allColorBrands.find(b => b.id === brandId);
            showConfirmModal(`Are you sure you want to delete the brand "${brand.name}" and all its colors?`, async () => {
                await deleteDoc(doc(db, "color_brands", brandId));
            });
        }
    });
    
    // Fetch all color brands and prefill if needed
    onSnapshot(query(collection(db, "color_brands"), orderBy("name")), (snapshot) => {
        if (snapshot.empty) {
            prefillColorData(); // If collection is empty, add default data
        } else {
            allColorBrands = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderColorBrandsAdmin();
            // If the color chart has been initialized, we might want to refresh it
            if(colorChartInitialized) {
                colorChartInitialized = false; // Reset to allow re-initialization
                initColorChart();
            }
        }
    });

// ADD THIS ENTIRE BLOCK AT THE END OF initMainApp()

    // --- LOGIC FOR THE EDIT COLORS MODAL ---
    const editColorsModal = document.getElementById('edit-colors-modal');
    const closeColorsModalBtn = document.getElementById('close-edit-colors-modal-btn');
    const addColorForm = document.getElementById('add-new-color-form');
    const existingColorsList = document.getElementById('existing-colors-list');

// Located inside the "LOGIC FOR THE EDIT COLORS MODAL" section
const renderExistingColors = (brand) => {
    existingColorsList.innerHTML = '';
    if (brand.colors.length === 0) {
        existingColorsList.innerHTML = '<p class="text-sm text-gray-500 text-center p-4">No colors added yet.</p>';
        return;
    }
    brand.colors.forEach((color, index) => {
        const colorEl = document.createElement('div');
        colorEl.className = 'flex items-center justify-between p-2 bg-gray-50 rounded';
        colorEl.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="w-6 h-6 rounded-full border" style="background-color: ${color.hex};"></div>
                <div>
                    <span class="font-medium">${color.name}</span>
                    <p class="text-xs text-gray-500">${color.group || 'No Group'}</p>
                </div>
            </div>
            <button data-index="${index}" class="delete-color-btn text-red-400 hover:text-red-700"><i class="fas fa-times-circle"></i></button>
        `;
        existingColorsList.appendChild(colorEl);
    });
};
    const openEditColorsModal = (brand) => {
        document.getElementById('edit-colors-modal-title').textContent = `Edit Colors for ${brand.name}`;
        document.getElementById('edit-color-brand-id').value = brand.id;
        renderExistingColors(brand);
        editColorsModal.classList.remove('hidden');
    };

    const closeEditColorsModal = () => {
        editColorsModal.classList.add('hidden');
        addColorForm.reset();
    };

    // Event listener for opening the modal
    document.getElementById('color-brands-admin-list')?.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.edit-color-brand-btn');
        if (editBtn) {
            const brandId = editBtn.dataset.id;
            const brand = allColorBrands.find(b => b.id === brandId);
            if (brand) {
                openEditColorsModal(brand);
            }
        }
    });

// Located inside the "LOGIC FOR THE EDIT COLORS MODAL" section
addColorForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const brandId = document.getElementById('edit-color-brand-id').value;
    const brand = allColorBrands.find(b => b.id === brandId);
    if (!brand) return;

    const newColor = {
        name: document.getElementById('new-color-name').value,
        hex: document.getElementById('new-color-hex').value,
        group: document.getElementById('new-color-group').value.trim() || 'Uncategorized'
    };

    const updatedColors = [...brand.colors, newColor];
    try {
        await updateDoc(doc(db, "color_brands", brandId), { colors: updatedColors });
        addColorForm.reset();
    } catch (error) {
        console.error("Error adding new color:", error);
        alert("Could not add the color.");
    }
});

    // Event listener for deleting a color
    existingColorsList.addEventListener('click', async (e) => {
        const deleteBtn = e.target.closest('.delete-color-btn');
        if (deleteBtn) {
            const brandId = document.getElementById('edit-color-brand-id').value;
            const brand = allColorBrands.find(b => b.id === brandId);
            if (!brand) return;

            const indexToDelete = parseInt(deleteBtn.dataset.index, 10);
            const updatedColors = brand.colors.filter((_, index) => index !== indexToDelete);

            try {
                await updateDoc(doc(db, "color_brands", brandId), { colors: updatedColors });
            } catch (error) {
                console.error("Error deleting color:", error);
                alert("Could not delete the color.");
            }
        }
    });

    closeColorsModalBtn.addEventListener('click', closeEditColorsModal);
    editColorsModal.querySelector('.modal-overlay').addEventListener('click', closeEditColorsModal);

    const giftCardsTableBody = document.querySelector('#gift-cards-table tbody');
    const giftCardsTableAdminBody = document.querySelector('#gift-cards-table-admin tbody');

// Located inside initMainApp()
const renderGiftCardsAdminTable = (cards) => {
    const tables = [giftCardsTableBody, giftCardsTableAdminBody];
    tables.forEach(tbody => {
        if (!tbody) return;
        tbody.innerHTML = '';
        if (cards.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="py-6 text-center text-gray-400">No gift cards have been sold.</td></tr>`;
            return;
        }
        cards.forEach(card => {
            const row = tbody.insertRow();
            const balance = card.balance !== undefined ? card.balance : card.amount;
            
            let statusText = card.status || 'Active';
            let statusColor = 'bg-gray-200 text-gray-800';
            switch (statusText) {
                case 'Active': statusColor = 'bg-green-100 text-green-800'; break;
                case 'Pending': statusColor = 'bg-yellow-100 text-yellow-800'; break;
                case 'Depleted': statusColor = 'bg-red-100 text-red-800'; break;
            }

            let actionButtons = `<button data-id="${card.id}" class="edit-gift-card-btn text-blue-500 hover:text-blue-700" title="Manage Card"><i class="fas fa-edit text-lg"></i></button>
                                 <button data-id="${card.id}" class="delete-gift-card-btn text-red-500 hover:text-red-700" title="Delete Card"><i class="fas fa-trash-alt text-lg"></i></button>`;

            if (statusText === 'Pending') {
                actionButtons = `<button data-id="${card.id}" class="activate-gift-card-btn text-green-500 hover:text-green-700" title="Activate Card"><i class="fas fa-check-circle text-lg"></i></button>` + actionButtons;
            }

            // *** NEW: Create detailed HTML for the Buyer/Recipient column ***
            let buyerRecipientHTML = 'N/A';
            if (card.buyerInfo) {
                buyerRecipientHTML = `
                    <div>
                        <p class="font-semibold">${card.buyerInfo.name || 'N/A'}</p>
                        <p class="text-xs text-gray-600">${card.buyerInfo.phone || 'No Phone'}</p>
                        <p class="text-xs text-gray-600">${card.buyerInfo.email || 'No Email'}</p>
                    </div>
                `;
                // Also show the recipient if their name is different from the buyer's
                if (card.recipientName && card.recipientName !== card.buyerInfo.name) {
                    buyerRecipientHTML += `<div class="mt-1 border-t border-gray-200 pt-1 text-sm"><span class="font-semibold text-gray-500">To:</span> ${card.recipientName}</div>`;
                }
            }

            // *** UPDATED: The entire row.innerHTML is replaced to use the new HTML ***
            row.innerHTML = `<td class="px-6 py-4">${new Date(card.createdAt.seconds * 1000).toLocaleDateString()}</td>
                             <td class="px-6 py-4 font-mono text-xs">${card.code}</td>
                             <td class="px-6 py-4">$${card.amount.toFixed(2)}</td>
                             <td class="px-6 py-4 font-bold">$${balance.toFixed(2)}</td>
                             <td class="px-6 py-4">${buyerRecipientHTML}</td>
                             <td class="px-6 py-4">${card.senderName}</td>
                             <td class="px-6 py-4"><span class="px-2 py-1 text-xs font-semibold rounded-full ${statusColor}">${statusText}</span></td>
                             <td class="px-6 py-4 text-center space-x-4">${actionButtons}</td>`;
        });
    });
};

    onSnapshot(query(collection(db, "gift_cards"), orderBy("createdAt", "desc")), (snapshot) => {
        allGiftCards = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderGiftCardsAdminTable(allGiftCards);
    });

    const addPromotionForm = document.getElementById('add-promotion-form');
    const promotionsTableBody = document.querySelector('#promotions-table tbody');
    const promotionsContainerLanding = document.getElementById('promotions-container-landing');
    
    const renderPromotionsAdminTable = (promotions) => {
        promotionsTableBody.innerHTML = '';
        const now = new Date();
        promotions.forEach(promo => {
            const startDate = promo.startDate.toDate();
            const endDate = promo.endDate.toDate();
            let status, statusColor;
            if (now < startDate) { status = 'Scheduled'; statusColor = 'text-blue-600'; } 
            else if (now > endDate) { status = 'Expired'; statusColor = 'text-gray-500'; } 
            else { status = 'Active'; statusColor = 'text-green-600'; }
            const row = promotionsTableBody.insertRow();
            row.innerHTML = `<td class="px-6 py-4">${promo.title}</td><td class="px-6 py-4">${promo.description}</td><td class="px-6 py-4">${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}</td><td class="px-6 py-4 font-bold ${statusColor}">${status}</td><td class="px-6 py-4 text-center space-x-2"><button data-id="${promo.id}" class="send-promo-notification-btn text-purple-500" title="Send Notification"><i class="fas fa-paper-plane"></i></button><button data-id="${promo.id}" class="edit-promotion-btn text-blue-500"><i class="fas fa-edit"></i></button><button data-id="${promo.id}" class="delete-promotion-btn text-red-500"><i class="fas fa-trash"></i></button></td>`;
        });
    };

    const renderPromotionsLanding = (promotions) => {
        promotionsContainerLanding.innerHTML = '';
        const now = new Date();
        const activePromos = promotions.filter(promo => {
            const startDate = promo.startDate.toDate();
            const endDate = promo.endDate.toDate();
            return now >= startDate && now <= endDate;
        });
        if (activePromos.length === 0) { promotionsContainerLanding.innerHTML = '<p class="text-gray-600 col-span-full text-center">No active promotions right now. Check back soon!</p>'; return; }
        activePromos.forEach(promo => { const promoEl = document.createElement('div'); promoEl.className = 'bg-white p-6 rounded-lg shadow-md text-center'; promoEl.innerHTML = `<h3 class="text-xl font-bold text-pink-700 mb-2">${promo.title}</h3><p class="text-gray-600">${promo.description}</p>`; promotionsContainerLanding.appendChild(promoEl); });
    };

    onSnapshot(query(collection(db, "promotions"), orderBy("startDate", "desc")), (snapshot) => {
        allPromotions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderPromotionsAdminTable(allPromotions);
        renderPromotionsLanding(allPromotions);
    });

    addPromotionForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const promoId = document.getElementById('edit-promotion-id').value;
        const promoData = { title: document.getElementById('promotion-title').value, description: document.getElementById('promotion-description').value, startDate: Timestamp.fromDate(new Date(document.getElementById('promotion-start-date').value + 'T00:00:00')), endDate: Timestamp.fromDate(new Date(document.getElementById('promotion-end-date').value + 'T23:59:59')), };
        try {
            if (promoId) { await updateDoc(doc(db, "promotions", promoId), promoData); } 
            else { promoData.createdAt = serverTimestamp(); await addDoc(collection(db, "promotions"), promoData); }
            addPromotionForm.reset(); document.getElementById('edit-promotion-id').value = '';
        } catch (error) { console.error("Error saving promotion:", error); alert("Could not save promotion."); }
    });

    promotionsTableBody.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.edit-promotion-btn');
        const deleteBtn = e.target.closest('.delete-promotion-btn');
        const sendBtn = e.target.closest('.send-promo-notification-btn');
        if (editBtn) {
            const promo = allPromotions.find(p => p.id === editBtn.dataset.id);
            if (promo) { document.getElementById('edit-promotion-id').value = promo.id; document.getElementById('promotion-title').value = promo.title; document.getElementById('promotion-description').value = promo.description; document.getElementById('promotion-start-date').value = promo.startDate.toDate().toISOString().split('T')[0]; document.getElementById('promotion-end-date').value = promo.endDate.toDate().toISOString().split('T')[0]; document.getElementById('add-promotion-btn').textContent = 'Update Promotion'; document.getElementById('cancel-edit-promotion-btn').classList.remove('hidden'); }
        } else if (deleteBtn) { showConfirmModal("Are you sure you want to delete this promotion?", async () => { await deleteDoc(doc(db, "promotions", deleteBtn.dataset.id)); });
        } else if (sendBtn) {
            const promo = allPromotions.find(p => p.id === sendBtn.dataset.id);
            if (promo) { showConfirmModal(`Send a notification for "${promo.title}" to all clients?`, () => { addNotification('promo', `New Promotion: ${promo.title}! ${promo.description}`); alert('Promotion notification sent!'); }); }
        }
    });

    document.getElementById('cancel-edit-promotion-btn').addEventListener('click', () => {
        addPromotionForm.reset();
        document.getElementById('edit-promotion-id').value = '';
        document.getElementById('add-promotion-btn').textContent = 'Add Promotion';
        document.getElementById('cancel-edit-promotion-btn').classList.add('hidden');
    });

    const openClientModal = (client = null) => {
        clientForm.reset();
        const modalTitle = document.getElementById('client-form-title');
        if (client) {
            modalTitle.textContent = 'Edit Client Information';
            document.getElementById('edit-client-id').value = client.id;
            document.getElementById('client-form-name').value = client.name;
            document.getElementById('client-form-phone').value = client.phone || '';
            document.getElementById('client-form-dob').value = client.dob || '';
        } else {
            modalTitle.textContent = 'Create New Client';
            document.getElementById('edit-client-id').value = '';
        }
        clientFormModal.classList.remove('hidden');
        clientFormModal.classList.add('flex');
    };

    const closeClientModal = () => { clientFormModal.classList.add('hidden'); clientFormModal.classList.remove('flex'); };
    document.getElementById('create-new-client-btn').addEventListener('click', () => openClientModal());
    document.getElementById('client-form-cancel-btn').addEventListener('click', closeClientModal);
    document.querySelector('.client-form-modal-overlay').addEventListener('click', closeClientModal);

    clientForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const clientId = document.getElementById('edit-client-id').value;
        const clientData = { name: document.getElementById('client-form-name').value, phone: document.getElementById('client-form-phone').value, dob: document.getElementById('client-form-dob').value, };
        if (!clientData.name) { alert('Client name is required.'); return; }
        try {
            if (clientId) { await updateDoc(doc(db, "clients", clientId), clientData); } 
            else { await addDoc(collection(db, "clients"), clientData); }
            closeClientModal();
        } catch (error) { console.error("Error saving client:", error); alert("Could not save client data."); }
    });

    const importClientsBtn = document.getElementById('import-clients-btn');
    const importClientsInput = document.getElementById('import-clients-input');
    importClientsBtn.addEventListener('click', () => importClientsInput.click());
    importClientsInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (event) => {
            const data = new Uint8Array(event.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const clientsToImport = XLSX.utils.sheet_to_json(firstSheet);
            if (clientsToImport.length === 0) { alert('No clients found in the file.'); return; }
            const batch = writeBatch(db);
            clientsToImport.forEach(client => { const newClientRef = doc(collection(db, "clients")); batch.set(newClientRef, { name: client.Name || 'N/A', phone: client.Phone || '', dob: client.DOB || '' }); });
            try { await batch.commit(); alert(`${clientsToImport.length} clients imported successfully!`); } 
            catch (error) { console.error("Error importing clients: ", error); alert("An error occurred during import."); }
        };
        reader.readAsArrayBuffer(file);
        e.target.value = '';
    });
    
    // --- Gift Card Designer & Management Logic ---
    const designerForm = document.getElementById('physical-gift-card-form');
    const designerBackgroundTabs = document.getElementById('designer-background-tabs');
    const designerBackgroundOptions = document.getElementById('designer-background-options');
    const printableCardArea = document.getElementById('printable-gift-card-area');
    const printableCard = document.getElementById('printable-gift-card');
    const saveAndPrintBtn = document.getElementById('save-and-print-btn');
    const editGiftCardForm = document.getElementById('edit-gift-card-form');


    const updateDesignerPreview = () => {
        const showTo = document.getElementById('designer-show-to').checked;
        const showFrom = document.getElementById('designer-show-from').checked;
        const setExpiry = document.getElementById('designer-set-expiry').checked;
        
        document.getElementById('preview-to').parentElement.style.display = showTo ? '' : 'none';
        document.getElementById('preview-from').parentElement.style.display = showFrom ? '' : 'none';
        document.getElementById('designer-to-wrapper').style.display = showTo ? '' : 'none';
        document.getElementById('designer-from-wrapper').style.display = showFrom ? '' : 'none';

        document.getElementById('preview-to').textContent = document.getElementById('designer-to').value || 'Recipient';
        document.getElementById('preview-from').textContent = document.getElementById('designer-from').value || 'Sender';
        
        const amount = parseFloat(document.getElementById('designer-amount').value) || 0;
        document.getElementById('preview-amount').textContent = `$${amount.toFixed(2)}`;
        
        const expiryPreview = document.getElementById('preview-expiry');
        if (setExpiry) {
            const value = parseInt(document.getElementById('designer-expiry-value').value, 10);
            const unit = document.getElementById('designer-expiry-unit').value;
            if (value > 0) {
                const expiryDate = new Date();
                if (unit === 'months') {
                    expiryDate.setMonth(expiryDate.getMonth() + value);
                } else {
                    expiryDate.setFullYear(expiryDate.getFullYear() + value);
                }
                expiryPreview.textContent = `Expires: ${expiryDate.toLocaleDateString()}`;
                expiryPreview.style.display = 'block';
            } else {
                 expiryPreview.style.display = 'none';
            }
        } else {
            expiryPreview.style.display = 'none';
        }
    };
    
    const populateBackgrounds = (category) => {
        designerBackgroundOptions.innerHTML = giftCardBackgrounds[category].map(url => 
            `<button type="button" data-bg="${url}" class="w-full h-16 bg-cover bg-center rounded-md border-2 border-transparent hover:border-pink-400" style="background-image: url('${url}')"></button>`
        ).join('');
        const firstBgBtn = designerBackgroundOptions.querySelector('button');
        if (firstBgBtn) {
            firstBgBtn.classList.add('ring-2', 'ring-pink-500');
            printableCard.style.backgroundImage = `url('${firstBgBtn.dataset.bg}')`;
        }
    };
    
    const initializeGiftCardDesigner = () => {
        designerForm.reset();
        document.getElementById('designer-quantity').value = 1;
        document.getElementById('preview-code').textContent = `GC-${Date.now()}${[...Array(4)].map(() => Math.floor(Math.random() * 10)).join('')}`;
        
        designerBackgroundTabs.innerHTML = Object.keys(giftCardBackgrounds).map(cat => 
            `<button type="button" data-category="${cat}" class="px-3 py-1 text-sm font-medium rounded-t-lg">${cat}</button>`
        ).join('');
        
        const firstTab = designerBackgroundTabs.querySelector('button');
        if(firstTab) {
             firstTab.classList.add('bg-gray-200', 'border-gray-300', 'border-b-0');
             populateBackgrounds(firstTab.dataset.category);
        }

        updateDesignerPreview();
    };
    
    designerBackgroundTabs.addEventListener('click', e => {
        const tab = e.target.closest('button');
        if (tab) {
            designerBackgroundTabs.querySelectorAll('button').forEach(t => t.classList.remove('bg-gray-200', 'border-gray-300', 'border-b-0'));
            tab.classList.add('bg-gray-200', 'border-gray-300', 'border-b-0');
            populateBackgrounds(tab.dataset.category);
        }
    });

    designerBackgroundOptions.addEventListener('click', (e) => {
        const target = e.target.closest('button');
        if (target && target.dataset.bg) {
            designerBackgroundOptions.querySelectorAll('button').forEach(btn => btn.classList.remove('ring-2', 'ring-pink-500'));
            target.classList.add('ring-2', 'ring-pink-500');
            printableCard.style.backgroundImage = `url('${target.dataset.bg}')`;
        }
    });

    const handleSaveAndPrint = async () => {
        const quantity = parseInt(document.getElementById('designer-quantity').value, 10);
        if (isNaN(quantity) || quantity < 1) {
            alert("Please enter a valid quantity.");
            return;
        }

        const amount = parseFloat(document.getElementById('designer-amount').value);
        if (isNaN(amount) || amount <= 0) {
            alert("Please enter a valid amount.");
            return;
        }

        const batch = writeBatch(db);
        const cardsToPrint = [];

        for (let i = 0; i < quantity; i++) {
            const cardData = {
                amount: amount,
                balance: amount,
                history: [],
                recipientName: document.getElementById('designer-show-to').checked ? document.getElementById('designer-to').value : '',
                senderName: document.getElementById('designer-show-from').checked ? document.getElementById('designer-from').value : '',
                code: `GC-${Date.now()}-${i}`,
                status: 'Active',
                type: 'Physical',
                createdAt: serverTimestamp()
            };

            if (document.getElementById('designer-set-expiry').checked) {
                const value = parseInt(document.getElementById('designer-expiry-value').value, 10);
                const unit = document.getElementById('designer-expiry-unit').value;
                const expiryDate = new Date();
                if (unit === 'months') expiryDate.setMonth(expiryDate.getMonth() + value);
                else expiryDate.setFullYear(expiryDate.getFullYear() + value);
                cardData.expiresAt = Timestamp.fromDate(expiryDate);
            }

            const newCardRef = doc(collection(db, "gift_cards"));
            batch.set(newCardRef, cardData);
            cardsToPrint.push(cardData);
        }

        try {
            await batch.commit();
            
            const originalPreviewHTML = printableCardArea.innerHTML;

            printableCardArea.innerHTML = cardsToPrint.map(card => {
                 const expiryText = card.expiresAt ? `Expires: ${card.expiresAt.toDate().toLocaleDateString()}` : '';
                 const bgImage = printableCard.style.backgroundImage;
                 return `
                    <div class="printable-gift-card w-[400px] h-[228px] shadow-lg rounded-lg p-4 flex flex-col justify-between bg-cover bg-center text-white" style="background-image: ${bgImage};">
                        <div class="flex justify-between items-start" style="text-shadow: 1px 1px 2px rgba(0,0,0,0.5);">
                            <img src="${document.getElementById('preview-logo').src}" class="w-12 h-12 rounded-full border-2 border-white"/>
                            <div class="text-right">
                                <p class="font-parisienne text-3xl">Gift Card</p>
                                <p class="text-xs font-semibold tracking-wider">Nails Express</p>
                            </div>
                        </div>
                        <div class="text-center" style="text-shadow: 1px 1px 3px rgba(0,0,0,0.7);"><p class="text-5xl font-bold">$${card.amount.toFixed(2)}</p></div>
                        <div class="text-xs" style="text-shadow: 1px 1px 2px rgba(0,0,0,0.5);">
                            <div class="flex justify-between font-semibold">
                                <span style="display: ${card.recipientName ? 'inline' : 'none'}">FOR: <span class="font-normal">${card.recipientName}</span></span>
                                <span style="display: ${card.senderName ? 'inline' : 'none'}">FROM: <span class="font-normal">${card.senderName}</span></span>
                            </div>
                            <p class="mt-2 text-center font-mono tracking-widest text-sm">${card.code}</p>
                            <p class="mt-1 text-center text-[10px] opacity-80" style="display: ${expiryText ? 'block' : 'none'}">${expiryText}</p>
                        </div>
                    </div>`;
            }).join('');
            
            window.print();

            setTimeout(() => {
                printableCardArea.innerHTML = originalPreviewHTML;
            }, 1000);

        } catch (error) {
            console.error("Error saving physical gift cards:", error);
            alert("Could not save the gift cards. Please try again.");
        }
    };
    
    document.getElementById('designer-show-to').addEventListener('change', updateDesignerPreview);
    document.getElementById('designer-show-from').addEventListener('change', updateDesignerPreview);
    document.getElementById('designer-set-expiry').addEventListener('change', (e) => {
        document.getElementById('designer-expiry-inputs').classList.toggle('hidden', !e.target.checked);
        updateDesignerPreview();
    });

    designerForm.addEventListener('input', updateDesignerPreview);
    saveAndPrintBtn.addEventListener('click', handleSaveAndPrint);
    
    const openEditGiftCardModal = (card) => {
        editGiftCardForm.reset();
        document.getElementById('edit-gift-card-id').value = card.id;
        document.getElementById('edit-gc-code').textContent = card.code;
        document.getElementById('edit-gc-original-amount').textContent = `$${card.amount.toFixed(2)}`;
        document.getElementById('edit-gc-current-balance').textContent = `$${card.balance.toFixed(2)}`;

        const historyContainer = document.getElementById('edit-gc-history');
        historyContainer.innerHTML = '';
        if (card.history && card.history.length > 0) {
            card.history.slice().reverse().forEach(entry => {
                const isRedeem = entry.type === 'redeem';
                const el = document.createElement('div');
                el.className = 'text-sm p-2 rounded bg-gray-100 flex justify-between';
                el.innerHTML = `
                    <div>
                        <p class="font-semibold ${isRedeem ? 'text-red-600' : 'text-green-600'}">${isRedeem ? 'Redeemed' : 'Added'} $${entry.amount.toFixed(2)}</p>
                        <p class="text-xs text-gray-500">${entry.notes || ''}</p>
                    </div>
                    <div class="text-xs text-gray-500 text-right">
                        ${new Date(entry.timestamp.seconds * 1000).toLocaleString()}
                    </div>
                `;
                historyContainer.appendChild(el);
            });
        } else {
            historyContainer.innerHTML = '<p class="text-sm text-gray-500 text-center">No transactions yet.</p>';
        }

        editGiftCardModal.classList.remove('hidden');
        editGiftCardModal.classList.add('flex');
    };

    
    document.getElementById('close-edit-gift-card-modal-btn').addEventListener('click', () => editGiftCardModal.classList.add('hidden'));
    editGiftCardModal.querySelector('.modal-overlay').addEventListener('click', () => editGiftCardModal.classList.add('hidden'));
// REPLACE the entire setupGiftCardTableListener function
const setupGiftCardTableListener = (tableId) => {
    const table = document.getElementById(tableId);
    if (table) {
        table.addEventListener('click', (e) => {
            const activateBtn = e.target.closest('.activate-gift-card-btn');
            const editBtn = e.target.closest('.edit-gift-card-btn');
            const deleteBtn = e.target.closest('.delete-gift-card-btn');

            if (activateBtn) {
                const cardId = activateBtn.dataset.id;
                const card = allGiftCards.find(c => c.id === cardId);
                if (card) {
                    showConfirmModal(`Activate gift card ${card.code} for $${card.amount.toFixed(2)}?`, async () => {
                        try {
                            await updateDoc(doc(db, "gift_cards", cardId), { status: 'Active' });
                            alert('Gift card has been activated!');
                        } catch (error) {
                            console.error("Error activating gift card:", error);
                            alert("Could not activate the gift card.");
                        }
                    }, 'Activate');
                }
            } else if (editBtn) {
                const card = allGiftCards.find(c => c.id === editBtn.dataset.id);
                if (card) openEditGiftCardModal(card);
            } else if (deleteBtn) {
                const cardId = deleteBtn.dataset.id;
                const card = allGiftCards.find(c => c.id === cardId);
                if (card) {
                    showConfirmModal(`Are you sure you want to delete gift card ${card.code}? This action cannot be undone.`, async () => {
                        try {
                            await deleteDoc(doc(db, "gift_cards", cardId));
                            alert(`Gift card ${card.code} has been deleted.`);
                        } catch (error) {
                            console.error("Error deleting gift card:", error);
                            alert("Could not delete the gift card.");
                        }
                    });
                }
            }
        });
    }
};


setupGiftCardTableListener('gift-cards-table');
setupGiftCardTableListener('gift-cards-table-admin');
document.getElementById('close-client-profile-modal-btn').addEventListener('click', () => clientProfileModal.classList.add('hidden'));
clientProfileModal.querySelector('.modal-overlay').addEventListener('click', () => clientProfileModal.classList.add('hidden'));



    
    loadAndRenderServices();
    initializeGiftCardDesigner();
    const todayString = getLocalDateString();
    const currentMonthIndex = new Date().getMonth();
    document.getElementById('finished-date-filter').value = todayString;
    currentFinishedDateFilter = todayString;
    renderFinishedClients(applyClientFilters(allFinishedClients, '', 'All', currentFinishedDateFilter));
    document.getElementById('staff-earning-date').value = todayString;
    document.getElementById('earning-date-filter').value = todayString;
    currentEarningDateFilter = todayString;
    renderAllStaffEarnings();
    const dashboardEarningDateFilter = document.getElementById('dashboard-earning-date-filter');
    // ADD THESE TWO LINES
const dashboardEarningSubmitDateInput = document.getElementById('dashboard-staff-earning-date-full');
if (dashboardEarningSubmitDateInput) dashboardEarningSubmitDateInput.value = todayString;
    
    dashboardEarningDateFilter.value = todayString;
    currentDashboardEarningDateFilter = todayString;
    
    document.getElementById('salon-earning-date').value = todayString;
    const salonEarningRangeFilter = document.getElementById('salon-earning-range-filter');
    const salonEarningDateFilter = document.getElementById('salon-earning-date-filter');
    salonEarningRangeFilter.value = currentMonthIndex;
    salonEarningDateFilter.style.display = 'none';
    currentSalonEarningRangeFilter = String(currentMonthIndex);
    currentSalonEarningDateFilter = '';
    renderSalonEarnings(applySalonEarningFilters(allSalonEarnings, currentSalonEarningDateFilter, currentSalonEarningRangeFilter));
    document.getElementById('expense-date').value = todayString;
    document.getElementById('sign-out-btn').addEventListener('click', () => { signOut(auth); });
    document.getElementById('floating-booking-btn').addEventListener('click', () => { openAddAppointmentModal(getLocalDateString()); });
    // ADD THIS NEW LINE to set the default date
    document.getElementById('staff-details-date-filter').value = todayString;
    setInterval(() => {
        const now = new Date();
        allAppointments.forEach(appt => {
            if (sentReminderIds.includes(appt.id)) return;
            const apptTime = appt.appointmentTimestamp.toDate();
            const timeDifferenceMinutes = (apptTime.getTime() - now.getTime()) / 60000;
            if (timeDifferenceMinutes > 0 && timeDifferenceMinutes <= 60) {
                const timeString = apptTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const serviceString = Array.isArray(appt.services) ? appt.services[0] : appt.services;
                addNotification('reminder', `Reminder: ${appt.name}'s appointment for ${serviceString} is at ${timeString}.`);
                sentReminderIds.push(appt.id);
            }
        });
    }, 60000);
}
