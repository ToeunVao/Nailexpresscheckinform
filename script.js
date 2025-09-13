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
const confirmModal = document.getElementById('confirm-modal');
const confirmModalMessage = document.getElementById('confirm-modal-message');
const confirmConfirmBtn = document.getElementById('confirm-confirm-btn');
const confirmCancelBtn = document.getElementById('confirm-cancel-btn');
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
let sentReminderIds = [];
let currentRotation = 0;
let allServicesList = [], technicianColorMap = {};

const giftCardBackgrounds = {
    'General': [
        'https://images.unsplash.com/photo-1596048135132-911961bd4350?q=80&w=1887&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1519638831568-d9897f54ed69?q=80&w=2070&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1558081236-5415b3c5a7a5?q=80&w=1887&auto=format&fit=crop'
    ],
    'Holidays': [
        'https://images.unsplash.com/photo-1513297887119-d46091b24bfa?q=80&w=2070&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1541142762-9f70343a4b08?q=80&w=1964&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1577991395684-245a6a5839a8?q=80&w=1887&auto=format&fit=crop'
    ],
    'Birthday': [
        'https://images.unsplash.com/photo-1509281373149-e957c6296406?q=80&w=1928&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1513151233558-d860c5398176?q=80&w=2070&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1560240643-6d27e85c251e?q=80&w=1887&auto=format&fit=crop'
    ]
};

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
                         if (!clientDashboardInitialized) {
                            initClientDashboard(user.uid, clientDoc.data());
                            clientDashboardInitialized = true;
                        }
                    } else {
                         console.error("User authenticated but no user/client document found. Logging out.");
                         await signOut(auth);
                         alert("Login error: User data not found.");
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
    
    // --- NEW E-COMMERCE GIFT CARD LOGIC ---
    const purchaseModal = document.getElementById('gift-card-purchase-modal');
    const buyGiftCardBtn = document.getElementById('buy-gift-card-btn');
    const closePurchaseModalBtn = document.getElementById('close-gift-card-purchase-modal-btn');
    const purchaseForm = document.getElementById('landing-gift-card-form');
    const previewCard = document.getElementById('landing-gc-preview-card');
    const paymentGuideDisplay = document.getElementById('landing-gc-payment-guide');

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
        // Load payment guide text into the purchase form
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

    purchaseForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const buyerName = document.getElementById('gc-buyer-name').value;
        const buyerPhone = document.getElementById('gc-buyer-phone').value;
        const buyerEmail = document.getElementById('gc-buyer-email').value;
        const amount = parseFloat(document.getElementById('gc-amount').value);
        const quantity = parseInt(document.getElementById('gc-quantity').value, 10);

        if (!buyerName || !buyerPhone || !buyerEmail || isNaN(amount) || amount <= 0 || isNaN(quantity) || quantity <= 0) {
            alert('Please fill out all user and gift card information correctly.');
            return;
        }

        const submitBtn = document.getElementById('landing-gc-submit-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Processing...';

        try {
            alert('Your gift card request will be submitted. Please follow the payment instructions to activate your card.');

            const batch = writeBatch(db);
            const expiryDate = new Date();
            expiryDate.setMonth(expiryDate.getMonth() + 6);

            for (let i = 0; i < quantity; i++) {
                const cardData = {
                    amount: amount,
                    balance: amount,
                    history: [],
                    recipientName: document.getElementById('gc-show-to').checked ? document.getElementById('gc-to').value : buyerName,
                    senderName: document.getElementById('gc-show-from').checked ? document.getElementById('gc-from').value : buyerName,
                    code: `GC-${Date.now()}-${i}`,
                    status: 'Pending', // <-- IMPORTANT: Set status to Pending
                    type: 'E-Gift',
                    createdBy: anonymousUserId,
                    buyerInfo: { name: buyerName, email: buyerEmail, phone: buyerPhone },
                    createdAt: serverTimestamp(),
                    expiresAt: Timestamp.fromDate(expiryDate)
                };
                const newCardRef = doc(collection(db, "gift_cards"));
                batch.set(newCardRef, cardData);
            }

            await batch.commit();

            alert(`Success! Your gift card request has been submitted. It will be activated once payment is confirmed.`);
            purchaseForm.reset();
            purchaseModal.classList.add('hidden');

        } catch (error) {
            console.error("Error during gift card purchase:", error);
            alert(`Could not process your request. Error: ${error.message}`);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Buy Gift Card Now';
        }
    });
    
    const lockoutMessageDiv = document.getElementById('login-lockout-message');

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
function initClientDashboard(clientId, clientData) {
    document.getElementById('client-welcome-name').textContent = `Welcome back, ${clientData.name}!`;
    document.getElementById('client-sign-out-btn').addEventListener('click', () => signOut(auth));

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

    const renderClientGallery = (photos) => {
        const container = document.getElementById('client-photo-gallery');
        container.innerHTML = '';
        if (!photos || photos.length === 0) {
            container.innerHTML = '<p class="text-gray-500 col-span-full">You haven\'t uploaded any photos yet.</p>';
            return;
        }
        photos.forEach(photoURL => {
            const imgContainer = document.createElement('div');
            imgContainer.className = 'relative';
            imgContainer.innerHTML = `<img src="${photoURL}" class="w-full h-48 object-cover rounded-lg shadow">`;
            container.appendChild(imgContainer);
        });
    };

    onSnapshot(doc(db, "clients", clientId), (docSnap) => {
        if (docSnap.exists()) {
            renderClientGallery(docSnap.data().photoGallery);
        }
    });

    onSnapshot(query(collection(db, "appointments"), where("name", "==", clientData.name)), (snapshot) => {
        const appointments = snapshot.docs.map(doc => ({...doc.data(), id: doc.id}));
        renderClientAppointments(appointments);
    });
     onSnapshot(query(collection(db, "finished_clients"), where("name", "==", clientData.name), orderBy("checkOutTimestamp", "desc")), (snapshot) => {
        const history = snapshot.docs.map(doc => ({...doc.data(), id: doc.id}));
        allFinishedClients = history; 
        renderClientHistory(history);
        calculateAndRenderFavorites(history);
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

    setupClientTabs();
enableSwipeableTabs('#client-dashboard-content > main', '#client-dashboard-tabs');
}

// --- MAIN CHECK-IN APP SCRIPT ---
const setupAdminFeatures = (userRole) => {
    // This function will only be called if userRole is 'admin'
    
    // Admin Dashboard Listeners
    setupReportDateFilters('dashboard-range-filter', 'dashboard-date-filter', (date, range) => {
        currentDashboardDateFilter = range === 'daily' ? date : '';
        currentDashboardRangeFilter = range;
        updateAdminDashboard();
    });

    const dashboardStaffEarningForm = document.getElementById('dashboard-staff-earning-form-full');
    if (dashboardStaffEarningForm) {
        dashboardStaffEarningForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const staffName = document.getElementById('dashboard-staff-name-full').value;
            const service = document.getElementById('dashboard-staff-earning-service').value;
            const earning = parseFloat(document.getElementById('dashboard-staff-earning-full').value);
            const tip = parseFloat(document.getElementById('dashboard-staff-tip-full').value) || 0;
            const dateStr = document.getElementById('dashboard-staff-earning-date-full').value;

            if (isNaN(earning) || !dateStr) {
                return alert('Please make sure the Date and Earning fields are filled out correctly.');
            }
            const date = new Date(dateStr + 'T12:00:00');
            try {
                await addDoc(collection(db, "earnings"), { staffName, service, earning, tip, date: Timestamp.fromDate(date) });
                document.getElementById('dashboard-staff-earning-service').value = '';
                document.getElementById('dashboard-staff-earning-full').value = '';
                document.getElementById('dashboard-staff-tip-full').value = '';
            } catch (err) {
                console.error("Error saving earning entry: ", err);
                alert("Could not save the earning entry.");
            }
        });
    }

    const dashboardStaffEarningTable = document.getElementById('dashboard-staff-earning-table-full');
    if (dashboardStaffEarningTable) {
        dashboardStaffEarningTable.addEventListener('click', async (e) => {
            const deleteBtn = e.target.closest('.delete-earning-btn');
            const editBtn = e.target.closest('.edit-earning-btn');
            if (deleteBtn) {
                showConfirmModal("Delete this earning entry?", async () => {
                    await deleteDoc(doc(db, "earnings", deleteBtn.dataset.id));
                });
            } else if (editBtn) {
                const earning = allEarnings.find(e => e.id === editBtn.dataset.id);
                if (earning) { openEditEarningModal(earning); }
            }
        });
    }

    // Report Page Listeners (for admin)
    const salonEarningForm = document.getElementById('salon-earning-form');
    if (salonEarningForm) {
        salonEarningForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const date = document.getElementById('salon-earning-date').value;
            if (!date) { return alert('Please select a date.'); }
            const salonEarningData = { date: Timestamp.fromDate(new Date(date + 'T12:00:00')), sellGiftCard: parseFloat(document.getElementById('sell-gift-card').value) || 0, returnGiftCard: parseFloat(document.getElementById('return-gift-card').value) || 0, check: parseFloat(document.getElementById('check-payment').value) || 0, noOfCredit: parseInt(document.getElementById('no-of-credit').value) || 0, totalCredit: parseFloat(document.getElementById('total-credit').value) || 0, venmo: parseFloat(document.getElementById('venmo-payment').value) || 0, square: parseFloat(document.getElementById('square-payment').value) || 0 };
            techniciansAndStaff.forEach(tech => { const input = document.getElementById(`salon-earning-${tech.name.toLowerCase()}`); if(input) { salonEarningData[tech.name.toLowerCase()] = parseFloat(input.value) || 0; } });
            try {
                await setDoc(doc(db, "salon_earnings", date), salonEarningData, { merge: true });
                e.target.reset();
                document.getElementById('salon-earning-date').value = getLocalDateString();
            } catch (err) { console.error("Error adding salon earning: ", err); alert("Could not add salon earning."); }
        });
    }

    const salonEarningTable = document.getElementById('salon-earning-table');
    if (salonEarningTable) {
        salonEarningTable.addEventListener('click', async (e) => {
            const deleteBtn = e.target.closest('.delete-salon-earning-btn');
            const editBtn = e.target.closest('.edit-salon-earning-btn');
            if (deleteBtn) {
                showConfirmModal("Delete this salon earning entry?", async () => {
                    await deleteDoc(doc(db, "salon_earnings", deleteBtn.dataset.id));
                });
            } else if (editBtn) {
                const earning = allSalonEarnings.find(e => e.id === editBtn.dataset.id);
                if (earning) { openEditSalonEarningModal(earning); }
            }
        });
    }

    // Settings Page Listeners
    loadAndRenderSalonHours();
    loadSettings();
    loadFeatureToggles();
    setupAdminSettingsListeners();
};

const setupStaffFeatures = (userRole) => {
    setupReportDateFilters('staff-dashboard-range-filter', 'staff-dashboard-date-filter', (date, range) => {
        currentStaffDashboardDateFilter = range === 'daily' ? date : '';
        currentStaffDashboardRangeFilter = range;
        updateStaffDashboard();
    });

    const staffDetailsDateFilter = document.getElementById('staff-details-date-filter');
    if(staffDetailsDateFilter) {
        staffDetailsDateFilter.addEventListener('change', updateStaffDashboard);
    }
};

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
        <button class="top-nav-btn" data-target="nails-idea">Nails Idea</button>
    `;

    // Add admin-only links if the user is an admin
    if (userRole === 'admin') {
        navHTML += `
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
   // NEW Simplified Mobile Nav Listener
if (mobileNavLinksContainer) {
    mobileNavLinksContainer.addEventListener('click', (e) => {
        const button = e.target.closest('.top-nav-btn');
        if (button) {
            navigateToSection(button.dataset.target);
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
        setupAdminFeatures(userRole);
    } else {
        adminDashboardView.classList.add('hidden');
        staffDashboardView.classList.remove('hidden');
        setupStaffFeatures(userRole);
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

   let currentEarningTechFilter = 'All', currentEarningDateFilter = '', currentEarningRangeFilter = 'daily',
    currentDashboardDateFilter = '', currentDashboardRangeFilter = String(new Date().getMonth()),
    currentStaffDashboardDateFilter = '', currentStaffDashboardRangeFilter = String(new Date().getMonth());
let currentDashboardEarningTechFilter = 'All', currentDashboardEarningDateFilter = '', currentDashboardEarningRangeFilter = 'daily';
let currentAdminDashboardDateFilter = '', currentAdminDashboardRangeFilter = String(new Date().getMonth());
let currentStaffDashboardRangeFilter = String(new Date().getMonth());
    
    let currentSalonEarningDateFilter = '', currentSalonEarningRangeFilter = String(new Date().getMonth()), currentExpenseMonthFilter = '';

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

    if (filter === 'daily') {
        const dateToUse = specificDate ? new Date(specificDate + 'T00:00:00') : now;
        startDate = new Date(dateToUse.getFullYear(), dateToUse.getMonth(), dateToUse.getDate());
        endDate = new Date(dateToUse.getFullYear(), dateToUse.getMonth(), dateToUse.getDate(), 23, 59, 59, 999);
    } else {
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
            case 'this-year':
            case 'last-year':
                const year = filter === 'this-year' ? now.getFullYear() : now.getFullYear() - 1;
                startDate = new Date(year, 0, 1);
                endDate = new Date(year, 11, 31, 23, 59, 59, 999);
                break;
            default: // Monthly filter
                if (!isNaN(parseInt(filter))) {
                    const month = parseInt(filter, 10);
                    startDate = new Date(now.getFullYear(), month, 1);
                    endDate = new Date(now.getFullYear(), month + 1, 0, 23, 59, 59, 999);
                }
                break;
        }
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
                            <span>Commission (70%):</span>
                            <span class="font-semibold text-gray-800">$${commission.toFixed(2)}</span>
                        </div>
                        <div class="flex justify-between">
                            <span>Check Payout (70%):</span>
                            <span class="font-semibold text-gray-800">$${checkPayout.toFixed(2)}</span>
                        </div>
                        <div class="flex justify-between">
                            <span>Cash Payout (30%):</span>
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
    updateStaffEarningsReport(filteredSalonEarnings); 
    renderDetailedAppointmentsList('admin-upcoming-appointments-list', allAppointments);
};


// REPLACE the old updateStaffDashboard function with this one
const updateStaffDashboard = () => {
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
    
    renderDetailedAppointmentsList('staff-upcoming-appointments-list', allAppointments, currentUserName);
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
        earning: { label: 'My Earning', data: [], backgroundColor: 'rgba(219, 39, 119, 0.5)', borderColor: 'rgba(219, 39, 119, 1)' },
        payout: { label: 'My Total Payout (70%)', data: [], backgroundColor: 'rgba(16, 185, 129, 0.5)', borderColor: 'rgba(16, 185, 129, 1)' },
        cash: { label: 'My Cash Payout', data: [], backgroundColor: 'rgba(245, 158, 11, 0.5)', borderColor: 'rgba(245, 158, 11, 1)' },
        check: { label: 'My Check Payout', data: [], backgroundColor: 'rgba(59, 130, 246, 0.5)', borderColor: 'rgba(59, 130, 246, 1)' }
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

    const renderClientsList = () => {
        if (!allFinishedClients || !allClients) {
            const tbody = document.querySelector('#clients-list-table tbody');
            if (tbody) tbody.innerHTML = `<tr><td colspan="4" class="py-6 text-center text-gray-400">Loading client data...</td></tr>`;
            return;
        }
    
        const clientsMap = new Map();
        allFinishedClients.forEach(visit => {
            if (!visit.name) return;
            const clientKey = visit.name.toLowerCase();
            if (!clientsMap.has(clientKey)) {
                clientsMap.set(clientKey, { name: visit.name, phone: visit.phone || '', lastVisit: visit.checkOutTimestamp.toMillis(), techCounts: {}, colorCounts: {} });
            }
            const clientData = clientsMap.get(clientKey);
            if (visit.checkOutTimestamp.toMillis() > clientData.lastVisit) {
                clientData.lastVisit = visit.checkOutTimestamp.toMillis();
                clientData.phone = visit.phone || clientData.phone;
            }
            if (visit.technician) { clientData.techCounts[visit.technician] = (clientData.techCounts[visit.technician] || 0) + 1; }
            if (visit.colorCode) { clientData.colorCounts[visit.colorCode] = (clientData.colorCounts[visit.colorCode] || 0) + 1; }
        });
    
        let processedClients = Array.from(clientsMap.values()).map(client => {
            const findFavorite = (counts) => Object.keys(counts).length > 0 ? Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b) : 'N/A';
            return { ...client, favoriteTech: findFavorite(client.techCounts), favoriteColor: findFavorite(client.colorCounts) };
        });
    
        const clientInfoMap = new Map(allClients.map(c => [c.name.toLowerCase(), { dob: c.dob, id: c.id, phone: c.phone }]));
        let finalClientList = processedClients.map(aggClient => {
            const key = aggClient.name.toLowerCase();
            const masterInfo = clientInfoMap.get(key);
            return { ...aggClient, id: masterInfo ? masterInfo.id : null, dob: masterInfo ? masterInfo.dob : '', phone: masterInfo && masterInfo.phone ? masterInfo.phone : aggClient.phone };
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
            tbody.innerHTML = `<tr><td colspan="4" class="py-6 text-center text-gray-400">No clients found.</td></tr>`;
            return;
        }
    
        filteredClients.forEach(client => {
            const row = tbody.insertRow();
            row.className = 'bg-white border-b';
            row.innerHTML = `<td class="px-6 py-4 font-medium text-gray-900">${client.name}</td><td class="px-6 py-4">${client.phone || 'N/A'}</td><td class="px-6 py-4">${client.lastVisit ? new Date(client.lastVisit).toLocaleDateString() : 'N/A'}</td><td class="px-6 py-4 text-center space-x-2"><button data-id="${client.id}" class="text-indigo-500 hover:text-indigo-700 view-client-profile-btn" title="View Profile"><i class="fas fa-user-circle text-lg"></i></button><button data-id="${client.id}" class="text-blue-500 hover:text-blue-700 edit-client-btn" title="Edit Client"><i class="fas fa-edit text-lg"></i></button><button data-id="${client.id}" class="text-red-500 hover:text-red-700 delete-client-btn" title="Delete Client"><i class="fas fa-trash-alt text-lg"></i></button></td>`;
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

    // REPLACE the old renderStaffEarningsTable function with this one
const renderStaffEarningsTable = (earnings, tableId, totalEarningId, totalTipId) => {
    const tbody = document.querySelector(`#${tableId} tbody`);
    if (!tbody) return;

    const colspan = userRole === 'admin' ? 6 : 5; // Increased colspan for new column
    tbody.innerHTML = earnings.length === 0 ? `<tr><td colspan="${colspan}" class="py-6 text-center text-gray-400">No earnings found.</td></tr>` : '';

    earnings.sort((a, b) => b.date.seconds - a.date.seconds).forEach(earning => {
        const row = tbody.insertRow();
        row.className = 'bg-white border-b';
        let rowHTML = `
            <td class="px-6 py-4">${new Date(earning.date.seconds * 1000).toLocaleDateString()}</td>
            <td class="px-6 py-4 font-medium text-gray-900">${earning.staffName}</td>
            <td class="px-6 py-4">${earning.service || ''}</td> <td class="px-6 py-4">$${earning.earning.toFixed(2)}</td>
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

     const renderAllStaffEarnings = () => {
        // Render for Report Page
        const reportFiltered = applyEarningFilters(allEarnings, currentEarningTechFilter, currentEarningDateFilter, currentEarningRangeFilter, userRole, userName);
        const { totalEarning: reportTotalEarning, totalTip: reportTotalTip } = renderStaffEarningsTable(reportFiltered, 'staff-earning-table', 'total-earning', 'total-tip');
        
        const reportTotalMainSpan = document.getElementById('filtered-earning-total-main');
        const reportTotalTipSpan = document.getElementById('filtered-earning-total-tip');
        if(reportTotalMainSpan) reportTotalMainSpan.textContent = `Total ($${reportTotalEarning.toFixed(2)})`;
        if(reportTotalTipSpan) reportTotalTipSpan.textContent = `Tip ($${reportTotalTip.toFixed(2)})`;


        // Render for Dashboard Page
        if (currentUserRole === 'admin') {
            const dashboardFiltered = applyEarningFilters(allEarnings, currentDashboardEarningTechFilter, currentDashboardEarningDateFilter, currentDashboardEarningRangeFilter, userRole, userName);
            const { totalEarning: dashTotalEarning, totalTip: dashTotalTip } = renderStaffEarningsTable(dashboardFiltered, 'dashboard-staff-earning-table-full', 'dashboard-total-earning', 'dashboard-total-tip');

            const dashTotalMainSpan = document.getElementById('dashboard-filtered-earning-total-main');
            const dashTotalTipSpan = document.getElementById('dashboard-filtered-earning-total-tip');
            if(dashTotalMainSpan) dashTotalMainSpan.textContent = `Total ($${dashTotalEarning.toFixed(2)})`;
            if(dashTotalTipSpan) dashTotalTipSpan.textContent = `Tip ($${dashTotalTip.toFixed(2)})`;
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
        const prices = (visit.services.match(/\$\d+/g) || []).map(p => Number(p.slice(1)));
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
            <td class="px-4 py-2">${v.services}</td>
            <td class="px-4 py-2">${v.technician}</td>
        </tr>`
    ).join('') : '<tr><td colspan="3" class="text-center p-4 text-gray-500">No visit history found.</td></tr>';

    // Populate upcoming appointments
    const apptsContainer = document.getElementById('profile-upcoming-appts');
    apptsContainer.innerHTML = clientAppointments.length > 0 
        ? clientAppointments.map(a => `<div class="bg-blue-50 p-2 rounded-md"><p class="font-semibold">${a.appointmentTimestamp.toDate().toLocaleString()}</p><p class="text-sm">${a.services.join(', ')}</p></div>`).join('')
        : '<p class="text-sm text-gray-500">No upcoming appointments.</p>';

    // Populate photo gallery
    const galleryContainer = document.getElementById('profile-photo-gallery');
    try {
        const clientDocSnap = await getDoc(doc(db, "clients", client.id));
        if (clientDocSnap.exists() && clientDocSnap.data().photoGallery && clientDocSnap.data().photoGallery.length > 0) {
             galleryContainer.innerHTML = clientDocSnap.data().photoGallery.map(url => `<a href="${url}" target="_blank"><img src="${url}" class="w-full h-24 object-cover rounded-md"></a>`).join('');
        } else {
            galleryContainer.innerHTML = '<p class="text-sm text-gray-500 col-span-full">No photos uploaded.</p>';
        }
    } catch (error) {
        console.error("Error fetching client photo gallery:", error);
        galleryContainer.innerHTML = '<p class="text-sm text-red-500 col-span-full">Could not load photos.</p>';
    }

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
        if (currentUserRole === 'admin') {
            renderSalonEarnings(applySalonEarningFilters(allSalonEarnings, currentSalonEarningDateFilter, currentSalonEarningRangeFilter));
        }
        updateDashboard();
    });

    onSnapshot(query(collection(db, "expenses"), orderBy("date", "desc")), (snapshot) => {
        allExpenses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (currentUserRole === 'admin') {
            populateExpenseMonthFilter();
            renderExpenses();
        }
    });

    onSnapshot(query(collection(db, "clients"), orderBy("name")), (snapshot) => {
        allClients = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (currentUserRole === 'admin') {
            renderClientsList();
        }
    });

    document.getElementById('search-active').addEventListener('input', (e) => { renderActiveClients(applyClientFilters(allActiveClients.filter(c => c.status === 'waiting'), e.target.value.toLowerCase(), currentTechFilterActive, null)); });
    document.getElementById('search-processing').addEventListener('input', (e) => { renderProcessingClients(applyClientFilters(allActiveClients.filter(c => c.status === 'processing'), e.target.value.toLowerCase(), currentTechFilterProcessing, null)); });
    document.getElementById('search-finished').addEventListener('input', (e) => { renderFinishedClients(applyClientFilters(allFinishedClients, e.target.value.toLowerCase(), currentTechFilterFinished, currentFinishedDateFilter)); });
    document.getElementById('finished-date-filter').addEventListener('input', (e) => { currentFinishedDateFilter = e.target.value; renderFinishedClients(applyClientFilters(allFinishedClients, document.getElementById('search-finished').value.toLowerCase(), currentTechFilterFinished, currentFinishedDateFilter)); });
    
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
        const container = document.getElementById(containerId);
        if(!container) return;
         container.addEventListener('click', (e) => {
            if (e.target.classList.contains('tech-filter-btn')) {
                container.querySelectorAll('.tech-filter-btn').forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
                callback(e.target.dataset.tech);
            }
        });
    };
    

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

    document.getElementById('gemini-sms-close-btn').addEventListener('click', () => { geminiSmsModal.classList.add('hidden'); geminiSmsModal.classList.remove('flex'); });
    document.querySelector('.gemini-sms-modal-overlay').addEventListener('click', () => { geminiSmsModal.classList.add('hidden'); geminiSmsModal.classList.remove('flex'); });
    
    document.getElementById('floating-booking-btn').addEventListener('click', () => { openAddAppointmentModal(getLocalDateString()); });
}

}
