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
let mainAppInitialized = false;
let clientDashboardInitialized = false;
let landingPageInitialized = false;
let anonymousUserId = null;
let bookingSettings = { minBookingHours: 2 };
let loginSecuritySettings = { maxAttempts: 5, lockoutMinutes: 15 };
let salonHours = {};
let bookingsChart, servicesChart, earningsChart;
let notifications = [];
let currentUserRole = null;
let currentUserId = null;

// --- Global Data Arrays & Loading State ---
let allFinishedClients = [], allAppointments = [], allClients = [], allActiveClients = [], servicesData = {};
let allEarnings = [], allSalonEarnings = [], allExpenses = [], allInventory = [], allNailIdeas = [];
let allInventoryUsage = [], allGiftCards = [], allPromotions = [];
let techniciansAndStaff = [], technicians = [];
let allExpenseCategories = [], allPaymentAccounts = [], allSuppliers = [];
let dataLoaded = { appointments: false, finishedClients: false, users: false, services: false, clients: false };

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
                currentUserRole = userDoc.data().role;
                loadingScreen.style.display = 'none';
                landingPageContent.style.display = 'none';
                clientDashboardContent.style.display = 'none';
                appContent.style.display = 'block';
                if (!mainAppInitialized) {
                    initMainApp(currentUserRole);
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
        signInAnonymously(auth).catch((error) => {
            console.error("Anonymous sign-in failed:", error);
            loadingScreen.innerHTML = '<h2 class="text-3xl font-bold text-red-700">Could not connect. Please refresh.</h2>';
        });
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
    const giftCardModal = document.getElementById('gift-card-modal');
    const buyGiftCardBtn = document.getElementById('buy-gift-card-btn');
    const closeGiftCardModalBtn = document.getElementById('close-gift-card-modal-btn');
    const giftCardForm = document.getElementById('gift-card-form');
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

    const openGiftCardModal = () => { giftCardModal.classList.remove('hidden'); giftCardModal.classList.add('flex'); };
    const closeGiftCardModal = () => { giftCardModal.classList.add('hidden'); giftCardModal.classList.remove('flex'); };
    buyGiftCardBtn.addEventListener('click', openGiftCardModal);
    closeGiftCardModalBtn.addEventListener('click', closeGiftCardModal);
    giftCardModal.querySelector('.modal-overlay').addEventListener('click', closeGiftCardModal);
    
    const giftCardAmountSelect = document.getElementById('gift-card-amount');
    const customAmountInput = document.getElementById('gift-card-custom-amount');
    giftCardAmountSelect.addEventListener('change', () => {
        if (giftCardAmountSelect.value === 'custom') {
            customAmountInput.classList.remove('hidden');
            customAmountInput.required = true;
        } else {
            customAmountInput.classList.add('hidden');
            customAmountInput.required = false;
        }
    });

    giftCardForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const amount = giftCardAmountSelect.value === 'custom' 
            ? parseFloat(customAmountInput.value) 
            : parseInt(giftCardAmountSelect.value, 10);

        if (isNaN(amount) || amount <= 0) {
            alert('Please enter a valid amount.');
            return;
        }

        const giftCardData = { amount: amount, balance: amount, history: [], recipientName: document.getElementById('gift-card-recipient-name').value, recipientEmail: document.getElementById('gift-card-recipient-email').value, senderName: document.getElementById('gift-card-sender-name').value, message: document.getElementById('gift-card-message').value, code: `GC-${Date.now()}${[...Array(4)].map(() => Math.floor(Math.random() * 10)).join('')}`, status: 'Active', createdAt: serverTimestamp() };

        try {
            alert('Redirecting to a secure payment page...');
            await addDoc(collection(db, "gift_cards"), giftCardData);
            alert(`Success! Gift card for $${amount} has been sent to ${giftCardData.recipientEmail}.`);
            giftCardForm.reset();
            closeGiftCardModal();

        } catch (error) {
            console.error("Error purchasing gift card:", error);
            alert("Could not process the gift card purchase. Please try again.");
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

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            await setDoc(doc(db, "clients", user.uid), { name: name, email: email, role: 'client', createdAt: serverTimestamp() });
        } catch (error) {
            alert(`Sign Up Failed: ${error.message}`);
        } finally {
            btnText.textContent = 'Sign Up';
            spinner.classList.add('hidden');
        }
    });

    const peopleSelect = document.getElementById('appointment-people-landing');
    for (let i = 1; i <= 20; i++) {
        peopleSelect.appendChild(new Option(i, i));
    }

    const technicianSelect = document.getElementById('appointment-technician-select-landing');
    onSnapshot(collection(db, "users"), (snapshot) => {
        const users = snapshot.docs.map(doc => doc.data());
        const technicians = users.filter(user => user.role === 'technician');
        technicianSelect.innerHTML = '<option>Any Technician</option>';
        technicians.forEach(tech => {
            technicianSelect.appendChild(new Option(tech.name, tech.name));
        });
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
}

// --- MAIN CHECK-IN APP SCRIPT ---
function initMainApp(userRole) {
    const dashboardContent = document.getElementById('dashboard-content');
    const mainAppContainer = document.getElementById('main-app-container');
    const logoLink = document.getElementById('logo-link');
    const topNav = document.getElementById('top-nav');
    const allMainSections = document.querySelectorAll('.main-section');
    const mainTabsContainer = document.getElementById('main-tabs-container');
    const notificationBell = document.getElementById('notification-bell');
    const notificationCount = document.getElementById('notification-count');
    const notificationDropdown = document.getElementById('notification-dropdown');
    const checkInNavCount = document.getElementById('check-in-nav-count');
    const bookingNavCount = document.getElementById('booking-nav-count');
    const appLoadTimestamp = Timestamp.now();

    const updateNavCounts = () => {
        const checkInCount = allActiveClients.length;
        if (checkInCount > 0) {
            checkInNavCount.textContent = checkInCount;
            checkInNavCount.classList.remove('hidden');
        } else {
            checkInNavCount.classList.add('hidden');
        }

        const bookingCount = allAppointments.length;
        if (bookingCount > 0) {
            bookingNavCount.textContent = bookingCount;
            bookingNavCount.classList.remove('hidden');
        } else {
            bookingNavCount.classList.add('hidden');
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

    topNav.addEventListener('click', (e) => {
        const button = e.target.closest('.top-nav-btn');
        if (!button) return;
        const target = button.dataset.target;
        topNav.querySelectorAll('.top-nav-btn').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        dashboardContent.classList.add('hidden');
        mainAppContainer.classList.remove('hidden');
        allMainSections.forEach(section => section.classList.add('hidden'));
        switch (target) {
            case 'check-in': document.getElementById('check-in-section').classList.remove('hidden'); document.getElementById('check-in-tab').click(); break;
            case 'booking': document.getElementById('calendar-content').classList.remove('hidden'); break;
            case 'nails-idea': document.getElementById('nails-idea-content').classList.remove('hidden'); break;
            case 'report': document.getElementById('reports-content').classList.remove('hidden'); document.getElementById('salon-earning-report-tab').click(); break;
            case 'setting': document.getElementById('admin-content').classList.remove('hidden'); document.getElementById('user-management-tab').click(); break;
        }
    });
    
    notificationBell.addEventListener('click', () => {
        notificationDropdown.classList.toggle('hidden');
        if (!notificationDropdown.classList.contains('hidden')) {
            notifications.forEach(n => n.read = true);
            setTimeout(updateNotificationDisplay, 300);
        }
    });


    if (userRole === 'technician' || userRole === 'staff') {
        document.querySelector('[data-target="report"]').style.display = 'none';
        document.querySelector('[data-target="setting"]').style.display = 'none';
    }

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
    const giftCardDesignerModal = document.getElementById('gift-card-designer-modal');
    const editGiftCardModal = document.getElementById('edit-gift-card-modal');
    const clientProfileModal = document.getElementById('client-profile-modal');

    const rebookOtherInput = document.getElementById('rebook-other-input');
    const rebookSelect = document.getElementById('rebook-select');

    const activeCountSpan = document.getElementById('active-count');
    const finishedCountSpan = document.getElementById('finished-count');
    const todayCountSpan = document.getElementById('today-count');
    const calendarCountSpan = document.getElementById('calendar-count');
    const processingCountSpan = document.getElementById('processing-count');
    const clientsListCountSpan = document.getElementById('clients-list-count');
    const filteredEarningTotalMainSpan = document.getElementById('filtered-earning-total-main');
    const filteredEarningTotalTipSpan = document.getElementById('filtered-earning-total-tip');

    const calendarGrid = document.getElementById('calendar');
    const monthYearDisplay = document.getElementById('month-year-display');
    let currentMonth = new Date().getMonth();
    let currentYear = new Date().getFullYear();

    let currentTechFilterCalendar = 'All', currentTechFilterActive = 'All', currentTechFilterProcessing = 'All', currentTechFilterFinished = 'All';
    let currentFinishedDateFilter = '', currentEarningTechFilter = 'All', currentEarningDateFilter = '', currentEarningRangeFilter = 'daily';
    let currentSalonEarningDateFilter = '', currentSalonEarningRangeFilter = String(new Date().getMonth()), currentExpenseMonthFilter = '';
    
    let confirmCallback = null;
    const showConfirmModal = (message, onConfirm) => { confirmModalMessage.textContent = message; confirmCallback = onConfirm; confirmModal.classList.remove('hidden'); confirmModal.classList.add('flex'); };
    const closeConfirmModal = () => { confirmModal.classList.add('hidden'); confirmModal.classList.remove('flex'); confirmCallback = null; };
    confirmConfirmBtn.addEventListener('click', () => { if (confirmCallback) { confirmCallback(); } closeConfirmModal(); });
    confirmCancelBtn.addEventListener('click', closeConfirmModal);
    document.querySelector('.confirm-modal-overlay').addEventListener('click', closeConfirmModal);

    const dashboardDateFilter = document.getElementById('dashboard-date-filter');

    const updateDashboard = () => {
        const filter = dashboardDateFilter.value;
        const now = new Date();
        let startDate, endDate;
        switch (filter) {
            case 'today': startDate = new Date(now.setHours(0, 0, 0, 0)); endDate = new Date(now.setHours(23, 59, 59, 999)); break;
            case 'this_week': const firstDayOfWeek = now.getDate() - now.getDay(); startDate = new Date(now.setDate(firstDayOfWeek)); startDate.setHours(0, 0, 0, 0); endDate = new Date(startDate); endDate.setDate(startDate.getDate() + 6); endDate.setHours(23, 59, 59, 999); break;
            case 'this_month': startDate = new Date(now.getFullYear(), now.getMonth(), 1); endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999); break;
            case 'this_year': startDate = new Date(now.getFullYear(), 0, 1); endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999); break;
        }
        const filteredBookings = allAppointments.filter(a => { const apptDate = a.appointmentTimestamp.toDate(); return apptDate >= startDate && apptDate <= endDate; });
        const filteredFinished = allFinishedClients.filter(f => { const finDate = f.checkOutTimestamp.toDate(); return finDate >= startDate && finDate <= endDate; });
        const filteredEarnings = allEarnings.filter(e => { const earnDate = e.date.toDate(); return earnDate >= startDate && earnDate <= endDate; });
        document.getElementById('total-bookings-card').textContent = filteredBookings.length + filteredFinished.length;
        const totalRevenue = filteredEarnings.reduce((sum, e) => sum + e.earning, 0);
        document.getElementById('total-revenue-card').textContent = `$${totalRevenue.toFixed(2)}`;
        const lowStockItems = allInventory.filter(item => item.quantity <= item.lowStockAlert).length;
        document.getElementById('low-stock-card').textContent = lowStockItems;
        const techEarnings = filteredEarnings.reduce((acc, curr) => { acc[curr.staffName] = (acc[curr.staffName] || 0) + curr.earning; return acc; }, {});
        const topTechnician = Object.keys(techEarnings).reduce((a, b) => techEarnings[a] > techEarnings[b] ? a : b, '-');
        document.getElementById('top-technician-card').textContent = topTechnician;
        updateBookingsChart(filteredBookings.concat(filteredFinished), filter);
        updateServicesChart(filteredFinished);
        updateEarningsChart(techEarnings);
    };

    const initializeChart = (chartInstance, ctx, type, data, options) => {
        if (chartInstance) { chartInstance.data = data; chartInstance.options = options; chartInstance.update(); } 
        else { chartInstance = new Chart(ctx, { type, data, options }); }
        return chartInstance;
    };
    
    const updateBookingsChart = (data, filter) => {
        const ctx = document.getElementById('bookings-chart').getContext('2d');
        let labels = [], chartData = [], counts = {};
        if (filter === 'today') {
            labels = Array.from({ length: 12 }, (_, i) => `${i * 2}:00`);
            chartData = Array(12).fill(0);
            data.forEach(item => { const date = item.appointmentTimestamp?.toDate() || item.checkOutTimestamp?.toDate(); if (date) { const hour = Math.floor(date.getHours() / 2); chartData[hour]++; } });
        } else if (filter === 'this_week') {
            labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            chartData = Array(7).fill(0);
            data.forEach(item => { const date = item.appointmentTimestamp?.toDate() || item.checkOutTimestamp?.toDate(); if (date) { chartData[date.getDay()]++; } });
        } else {
            const format = filter === 'this_month' ? 'numeric' : 'short';
            data.forEach(item => { const date = item.appointmentTimestamp?.toDate() || item.checkOutTimestamp?.toDate(); if (date) { const key = filter === 'this_month' ? date.getDate() : date.toLocaleString('default', { month: format }); counts[key] = (counts[key] || 0) + 1; } });
            labels = Object.keys(counts).sort((a,b) => (filter === 'this_month' ? a-b : new Date(a + ' 1, 2000') - new Date(b + ' 1, 2000')) );
            chartData = labels.map(label => counts[label]);
        }
        const chartConfig = { labels: labels, datasets: [{ label: 'Bookings', data: chartData, backgroundColor: 'rgba(219, 39, 119, 0.5)', borderColor: 'rgba(219, 39, 119, 1)', borderWidth: 1, tension: 0.1 }] };
        bookingsChart = initializeChart(bookingsChart, ctx, 'line', chartConfig, { responsive: true, maintainAspectRatio: false });
    };

    const updateServicesChart = (data) => {
        const ctx = document.getElementById('services-chart').getContext('2d');
        const serviceCounts = data.reduce((acc, client) => { const services = typeof client.services === 'string' ? client.services.split(', ') : (client.services || []); services.forEach(service => { const serviceName = service.split(' $')[0].replace(/Gel Polish - /g, '').trim(); acc[serviceName] = (acc[serviceName] || 0) + 1; }); return acc; }, {});
        const sortedServices = Object.entries(serviceCounts).sort(([, a], [, b]) => b - a).slice(0, 5);
        const labels = sortedServices.map(item => item[0]);
        const chartData = sortedServices.map(item => item[1]);
        const chartConfig = { labels: labels, datasets: [{ label: 'Top Services', data: chartData, backgroundColor: ['rgba(255, 99, 132, 0.5)', 'rgba(54, 162, 235, 0.5)', 'rgba(255, 206, 86, 0.5)', 'rgba(75, 192, 192, 0.5)', 'rgba(153, 102, 255, 0.5)'], borderColor: ['rgba(255, 99, 132, 1)', 'rgba(54, 162, 235, 1)', 'rgba(255, 206, 86, 1)', 'rgba(75, 192, 192, 1)', 'rgba(153, 102, 255, 1)'], borderWidth: 1 }] };
        servicesChart = initializeChart(servicesChart, ctx, 'doughnut', chartConfig, { responsive: true, maintainAspectRatio: false });
    };

    const updateEarningsChart = (techEarnings) => {
        const ctx = document.getElementById('earnings-chart').getContext('2d');
        const labels = Object.keys(techEarnings);
        const chartData = Object.values(techEarnings);
        const chartConfig = { labels: labels, datasets: [{ label: 'Technician Earnings', data: chartData, backgroundColor: 'rgba(54, 162, 235, 0.5)', borderColor: 'rgba(54, 162, 235, 1)', borderWidth: 1 }] };
        earningsChart = initializeChart(earningsChart, ctx, 'bar', chartConfig, { responsive: true, maintainAspectRatio: false, indexAxis: 'y' });
    };

    dashboardDateFilter.addEventListener('change', updateDashboard);
    const dailyNotesForm = document.getElementById('daily-notes-form');
    const dailyNoteInput = document.getElementById('daily-note-input');
    const dailyNotesContainer = document.getElementById('daily-notes-container');

    const renderDailyNotes = (notes) => {
        dailyNotesContainer.innerHTML = '';
        if (!notes || notes.length === 0) {
            dailyNotesContainer.innerHTML = '<p class="text-gray-500">No notes for today.</p>';
            return;
        }
        notes.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);
        notes.forEach(note => { const noteEl = document.createElement('div'); noteEl.className = 'bg-pink-50 p-3 rounded-lg flex justify-between items-center'; noteEl.innerHTML = `<p class="text-gray-800">${note.text}</p><button data-id="${note.id}" class="delete-note-btn text-red-400 hover:text-red-600"><i class="fas fa-times-circle"></i></button>`; dailyNotesContainer.appendChild(noteEl); });
    };

    const todayStringForNotes = getLocalDateString();
    const noteDocRef = doc(db, "daily_notes", todayStringForNotes);

    onSnapshot(noteDocRef, (docSnap) => {
        if (docSnap.exists()) { renderDailyNotes(docSnap.data().notes); } 
        else { renderDailyNotes([]); }
    });

    dailyNotesForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const noteText = dailyNoteInput.value.trim();
        if (!noteText) return;
        const newNote = { text: noteText, createdAt: Timestamp.now(), id: crypto.randomUUID() };
        try { await setDoc(noteDocRef, { notes: arrayUnion(newNote) }, { merge: true }); dailyNoteInput.value = ''; } 
        catch (error) { console.error("Error adding note: ", error); alert("Could not save the note."); }
    });

    dailyNotesContainer.addEventListener('click', async (e) => {
        const deleteBtn = e.target.closest('.delete-note-btn');
        if (deleteBtn) {
            const noteIdToDelete = deleteBtn.dataset.id;
            try {
                const docSnap = await getDoc(noteDocRef);
                if (docSnap.exists()) {
                    const existingNotes = docSnap.data().notes || [];
                    const noteToRemove = existingNotes.find(note => note.id === noteIdToDelete);
                    if (noteToRemove) { await updateDoc(noteDocRef, { notes: arrayRemove(noteToRemove) }); }
                }
            } catch (error) { console.error("Error deleting note: ", error); alert("Could not delete the note."); }
        }
    });

    const loadAndRenderServices = async () => {
        const servicesSnapshot = await getDocs(collection(db, "services"));
        servicesData = {};
        servicesSnapshot.forEach(doc => { servicesData[doc.id] = doc.data().items; });
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

    const applyEarningFilters = (earnings, techFilter, dateFilter, rangeFilter) => {
        let filtered = earnings;
        if (techFilter !== 'All') { filtered = filtered.filter(e => e.staffName === techFilter); }
        const now = new Date();
        const currentYear = now.getFullYear();
        const lastYear = currentYear - 1;
        let startDate, endDate;
        if (rangeFilter === 'this-year') { startDate = new Date(currentYear, 0, 1); endDate = new Date(currentYear, 11, 31, 23, 59, 59, 999); } 
        else if (rangeFilter === 'last-year') { startDate = new Date(lastYear, 0, 1); endDate = new Date(lastYear, 11, 31, 23, 59, 59, 999); } 
        else if (!isNaN(parseInt(rangeFilter))) { const month = parseInt(rangeFilter, 10); startDate = new Date(currentYear, month, 1); endDate = new Date(currentYear, month + 1, 0, 23, 59, 59, 999); } 
        else if (rangeFilter === 'daily' && dateFilter) { startDate = new Date(dateFilter + 'T00:00:00'); endDate = new Date(dateFilter + 'T23:59:59'); }
        if (startDate && endDate) { filtered = filtered.filter(e => { const earningDate = new Date(e.date.seconds * 1000); return earningDate >= startDate && earningDate <= endDate; }); }
        return filtered;
    };

     const renderStaffEarnings = (earnings) => {
        const tbody = document.querySelector('#staff-earning-table tbody');
        if (!tbody) return;
        tbody.innerHTML = earnings.length === 0 ? `<tr><td colspan="5" class="py-6 text-center text-gray-400">No earnings found.</td></tr>` : '';
        earnings.sort((a, b) => b.date.seconds - a.date.seconds).forEach(earning => {
            const row = tbody.insertRow();
            row.className = 'bg-white border-b';
            row.innerHTML = `<td class="px-6 py-4">${new Date(earning.date.seconds * 1000).toLocaleDateString()}</td><td class="px-6 py-4 font-medium text-gray-900">${earning.staffName}</td><td class="px-6 py-4">$${earning.earning.toFixed(2)}</td><td class="px-6 py-4">$${earning.tip.toFixed(2)}</td><td class="px-6 py-4 text-center space-x-2"><button data-id="${earning.id}" class="edit-earning-btn text-blue-500 hover:text-blue-700" title="Edit Earning"><i class="fas fa-edit text-lg"></i></button><button data-id="${earning.id}" class="delete-earning-btn text-red-500 hover:text-red-700" title="Delete Earning"><i class="fas fa-trash-alt text-lg"></i></button></td>`;
        });
        const totalEarning = earnings.reduce((sum, e) => sum + e.earning, 0);
        const totalTip = earnings.reduce((sum, e) => sum + e.tip, 0);
        document.getElementById('total-earning').textContent = `$${totalEarning.toFixed(2)}`;
        document.getElementById('total-tip').textContent = `$${totalTip.toFixed(2)}`;
        filteredEarningTotalMainSpan.textContent = `Total ($${totalEarning.toFixed(2)})`;
        filteredEarningTotalTipSpan.textContent = `Tip ($${totalTip.toFixed(2)})`;
    };

    const applySalonEarningFilters = (earnings, dateFilter, rangeFilter) => {
        let filtered = [...earnings];
        const now = new Date();
        const currentYear = now.getFullYear();
        const lastYear = currentYear - 1;
        let startDate, endDate;
        if (rangeFilter === 'this-year') { startDate = new Date(currentYear, 0, 1); endDate = new Date(currentYear, 11, 31, 23, 59, 59, 999); } 
        else if (rangeFilter === 'last-year') { startDate = new Date(lastYear, 0, 1); endDate = new Date(lastYear, 11, 31, 23, 59, 59, 999); } 
        else if (!isNaN(parseInt(rangeFilter))) { const month = parseInt(rangeFilter, 10); startDate = new Date(currentYear, month, 1); endDate = new Date(currentYear, month + 1, 0, 23, 59, 59, 999); } 
        else if (rangeFilter === 'daily' && dateFilter) { startDate = new Date(dateFilter + 'T00:00:00'); endDate = new Date(dateFilter + 'T23:59:59'); }
        if (startDate && endDate) { filtered = filtered.filter(e => { const earningDate = new Date(e.date.seconds * 1000); return earningDate >= startDate && earningDate <= endDate; }); }
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
            if (change.type === "added" && dataLoaded.appointments) {
                 const data = change.doc.data();
                 if (data.appointmentTimestamp.seconds > appLoadTimestamp.seconds) {
                    const apptTime = new Date(data.appointmentTimestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    addNotification('booking', `New booking for ${data.name} at ${apptTime}`);
                 }
            }
        });
        
        allAppointments = snapshot.docs.map(doc => ({ id: doc.id, appointmentTime: doc.data().appointmentTimestamp ? new Date(doc.data().appointmentTimestamp.seconds * 1000).toLocaleString() : 'N/A', ...doc.data() }));
        renderCalendar(currentYear, currentMonth, currentTechFilterCalendar);
        renderAllBookingsList();
        updateDashboard();
        updateNavCounts();

        if (!dataLoaded.appointments) {
            dataLoaded.appointments = true;
        }
    });

    onSnapshot(query(collection(db, "earnings"), orderBy("date", "desc")), (snapshot) => {
        allEarnings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderStaffEarnings(applyEarningFilters(allEarnings, currentEarningTechFilter, currentEarningDateFilter, currentEarningRangeFilter));
        updateDashboard();
    });

    onSnapshot(query(collection(db, "salon_earnings"), orderBy("date", "desc")), (snapshot) => {
        allSalonEarnings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderSalonEarnings(applySalonEarningFilters(allSalonEarnings, currentSalonEarningDateFilter, currentSalonEarningRangeFilter));
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
    
    document.getElementById('export-clients-btn').addEventListener('click', () => {
        const dataToExport = aggregatedClients.map(c => ({ Name: c.name, Phone: c.phone || '', DOB: c.dob || '', 'Favorite Tech': c.favoriteTech || '', 'Favorite Color': c.favoriteColor || '', 'Last Visit': c.lastVisit ? new Date(c.lastVisit).toLocaleDateString() : '' }));
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
        if (technicianFilter !== 'All' && technicianFilter !== 'Any Technician') { filteredAppointments = allAppointments.filter(appt => appt.technician === technicianFilter); } 
        else if (technicianFilter === 'Any Technician') { filteredAppointments = allAppointments.filter(appt => appt.technician === 'Any Technician'); }
        filteredAppointments.forEach(appt => {
            const apptDate = new Date(appt.appointmentTimestamp.seconds * 1000);
             if (apptDate.getFullYear() === year && apptDate.getMonth() === month) {
                const dayCell = document.getElementById(`day-${apptDate.getDate()}`);
                if (dayCell) { dayCell.insertAdjacentHTML('beforeend', `<div class="appointment-entry bg-blue-100 text-blue-700" data-id="${appt.id}" data-type="appointment">${appt.name}</div>`); }
            }
        });
        calendarCountSpan.textContent = calendarGrid.querySelectorAll('.appointment-entry').length;
    }
    document.getElementById('prev-month-btn').addEventListener('click', () => { currentMonth--; if (currentMonth < 0) { currentMonth = 11; currentYear--; } renderCalendar(currentYear, currentMonth, currentTechFilterCalendar); });
    document.getElementById('next-month-btn').addEventListener('click', () => { currentMonth++; if (currentMonth > 11) { currentMonth = 0; currentYear++; } renderCalendar(currentYear, currentMonth, currentTechFilterCalendar); });
    calendarGrid.addEventListener('click', (e) => {
        const dayCell = e.target.closest('.calendar-day');
        if (!dayCell) return;
        if (e.target.classList.contains('appointment-entry')) { const client = allAppointments.find(a => a.id === e.target.dataset.id); openViewDetailModal(client, "Booking Detail"); } 
        else { openAddAppointmentModal(dayCell.dataset.date); }
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
    setupTechFilter('tech-filter-container-earning', (tech) => { currentEarningTechFilter = tech; renderStaffEarnings(applyEarningFilters(allEarnings, currentEarningTechFilter, currentEarningDateFilter, currentEarningRangeFilter)); });
    
    const setupReportDateFilters = (selectId, dateInputId, callback) => {
        const select = document.getElementById(selectId);
        const dateInput = document.getElementById(dateInputId);
        const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        select.innerHTML = `<option value="daily">Daily</option>`;
        months.forEach((month, index) => { select.innerHTML += `<option value="${index}">${month}</option>`; });
        select.innerHTML += `<option value="this-year">This Year</option><option value="last-year">Last Year</option>`;
        select.addEventListener('change', (e) => { const range = e.target.value; dateInput.style.display = range === 'daily' ? 'block' : 'none'; callback(dateInput.value, range); });
        dateInput.addEventListener('input', (e) => { callback(e.target.value, select.value); });
    };

    setupReportDateFilters('earning-range-filter', 'earning-date-filter', (date, range) => { currentEarningDateFilter = date; currentEarningRangeFilter = range; renderStaffEarnings(applyEarningFilters(allEarnings, currentEarningTechFilter, date, range)); });
    setupReportDateFilters('salon-earning-range-filter', 'salon-earning-date-filter', (date, range) => { currentSalonEarningDateFilter = date; currentSalonEarningRangeFilter = range; renderSalonEarnings(applySalonEarningFilters(allSalonEarnings, date, range)); });

    
    document.getElementById('staff-earning-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const staffName = document.getElementById('staff-name').value;
        const earning = parseFloat(document.getElementById('staff-earning').value);
        const tip = parseFloat(document.getElementById('staff-tip').value);
        const date = document.getElementById('staff-earning-date').value;
        if (isNaN(earning) || isNaN(tip) || !date) { return alert('Please fill out all fields correctly.'); }
        try {
            await addDoc(collection(db, "earnings"), { staffName, earning, tip, date: Timestamp.fromDate(new Date(date + 'T12:00:00')) });
            e.target.reset();
            document.getElementById('staff-earning-date').value = getLocalDateString();
        } catch (err) { console.error("Error adding earning: ", err); alert("Could not add earning."); }
    });

    document.getElementById('staff-earning-table').addEventListener('click', async (e) => {
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
            await addDoc(collection(db, "salon_earnings"), salonEarningData);
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
    
    document.getElementById('print-salon-earnings-btn').addEventListener('click', () => {
        const printWindow = window.open('', '_blank', 'height=600,width=800');
        printWindow.document.write('<html><head><title>Salon Earning Report</title><script src="https://cdn.tailwindcss.com"><\/script><style>body{padding:20px;font-family:"Poppins",sans-serif}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background-color:#f2f2f2}</style></head><body><h1>Salon Earning Report</h1>');
        printWindow.document.write(document.getElementById('salon-earning-table').outerHTML);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.focus(); 
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
    });

    const openEditEarningModal = (earning) => {
        editEarningForm.reset();
        document.getElementById('edit-earning-id').value = earning.id;
        document.getElementById('edit-staff-earning-date').value = new Date(earning.date.seconds * 1000).toISOString().split('T')[0];
        document.getElementById('edit-staff-name').value = earning.staffName;
        document.getElementById('edit-staff-earning').value = earning.earning;
        document.getElementById('edit-staff-tip').value = earning.tip;
        editEarningModal.classList.remove('hidden'); editEarningModal.classList.add('flex');
    };
    const closeEditEarningModal = () => { editEarningModal.classList.add('hidden'); editEarningModal.classList.remove('flex'); };
    document.getElementById('edit-earning-cancel-btn').addEventListener('click', closeEditEarningModal);
    document.querySelector('.edit-earning-modal-overlay').addEventListener('click', closeEditEarningModal);

    editEarningForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const earningId = document.getElementById('edit-earning-id').value;
        if (!earningId) return;
        try {
            await updateDoc(doc(db, "earnings", earningId), {
                staffName: document.getElementById('edit-staff-name').value, earning: parseFloat(document.getElementById('edit-staff-earning').value),
                tip: parseFloat(document.getElementById('edit-staff-tip').value), date: Timestamp.fromDate(new Date(document.getElementById('edit-staff-earning-date').value + 'T12:00:00'))
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

    const renderAllBookingsList = () => {
        let filteredAppointments = [...allAppointments];
        if (currentTechFilterCalendar !== 'All' && currentTechFilterCalendar !== 'Any Technician') { filteredAppointments = filteredAppointments.filter(appt => appt.technician === currentTechFilterCalendar); } 
        else if (currentTechFilterCalendar === 'Any Technician') { filteredAppointments = allAppointments.filter(appt => appt.technician === 'Any Technician'); }
        filteredAppointments.sort((a, b) => b.appointmentTimestamp.seconds - a.appointmentTimestamp.seconds);
        todayCountSpan.textContent = filteredAppointments.length;
        const tbody = document.querySelector('#today-bookings-table tbody');
        tbody.innerHTML = filteredAppointments.length === 0 ? `<tr><td colspan="6" class="py-6 text-center text-gray-400">No bookings found.</td></tr>` : '';
        filteredAppointments.forEach(appt => {
            const row = tbody.insertRow();
            row.className = 'bg-white border-b';
            row.innerHTML = `<td class="px-6 py-3">${appt.name}</td><td class="px-6 py-3">${Array.isArray(appt.services) ? appt.services.join(', ') : appt.services}</td><td class="px-6 py-3">${appt.technician}</td><td class="px-6 py-3 text-center">${appt.people || 1}</td><td class="px-6 py-3">${new Date(appt.appointmentTimestamp.seconds * 1000).toLocaleString([], {dateStyle: 'short', timeStyle: 'short'})}</td><td class="px-6 py-3 text-center"><button data-id="${appt.id}" class="checkin-today-btn text-blue-500 hover:underline">Check In</button></td>`;
        });
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
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
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
        if (viewProfileBtn) { const client = aggregatedClients.find(c => c.id === viewProfileBtn.dataset.id); if(client) { openClientProfileModal(client); } } 
        else if (editBtn) { const client = aggregatedClients.find(c => c.id === editBtn.dataset.id); if(client) { openClientModal(client); } } 
        else if (deleteBtn) { const clientId = deleteBtn.dataset.id; const client = aggregatedClients.find(c => c.id === clientId); if (client) { showConfirmModal(`Delete all records for ${client.name}? This cannot be undone.`, async () => { await deleteDoc(doc(db, "clients", clientId)); }); } }
    });
    
    const openClientProfileModal = async (client) => {
        if (!client) return;
        document.getElementById('profile-client-name').textContent = client.name;
        document.getElementById('profile-client-phone').textContent = client.phone || 'No phone number';
       
        const historyQuery = query(collection(db, "finished_clients"), where("name", "==", client.name), orderBy("checkOutTimestamp", "desc"));
        const historySnapshot = await getDocs(historyQuery);
        const history = historySnapshot.docs.map(doc => doc.data());
        
        let totalSpent = 0;
        const historyBody = document.getElementById('profile-history-table-body');
        
        if (history.length === 0) {
            historyBody.innerHTML = '<tr><td colspan="4" class="py-4 text-center text-gray-500">No visit history found.</td></tr>';
        } else {
            historyBody.innerHTML = history.map(visit => {
                let visitTotal = 0;
                if (typeof visit.services === 'string') {
                    const prices = visit.services.match(/\$\d+(\.\d{2})?/g) || [];
                    visitTotal = prices.reduce((sum, price) => sum + parseFloat(price.substring(1)), 0);
                    totalSpent += visitTotal;
                }
                return `<tr class="border-b"><td class="px-4 py-2">${new Date(visit.checkOutTimestamp.seconds * 1000).toLocaleDateString()}</td><td class="px-4 py-2">${visit.services}</td><td class="px-4 py-2">${visit.technician}</td><td class="px-4 py-2 text-right font-medium">$${visitTotal.toFixed(2)}</td></tr>`;
            }).join('');
        }
        
        document.getElementById('profile-total-visits').textContent = history.length;
        document.getElementById('profile-total-spent').textContent = `$${totalSpent.toFixed(2)}`;
        document.getElementById('profile-fav-tech').textContent = client.favoriteTech || 'N/A';
        document.getElementById('profile-fav-color').textContent = client.favoriteColor || 'N/A';
        
        clientProfileModal.classList.remove('hidden');
        clientProfileModal.classList.add('flex');
    };

    const closeClientProfileModal = () => {
        clientProfileModal.classList.add('hidden');
        clientProfileModal.classList.remove('flex');
    };
    
    document.getElementById('close-client-profile-modal-btn').addEventListener('click', closeClientProfileModal);
    clientProfileModal.querySelector('.modal-overlay').addEventListener('click', closeClientProfileModal);

    document.getElementById('gemini-sms-close-btn').addEventListener('click', () => { geminiSmsModal.classList.add('hidden'); geminiSmsModal.classList.remove('flex'); });
    document.querySelector('.gemini-sms-modal-overlay').addEventListener('click', () => { geminiSmsModal.classList.add('hidden'); geminiSmsModal.classList.remove('flex'); });
    
    document.getElementById('floating-booking-btn').addEventListener('click', () => { openAddAppointmentModal(getLocalDateString()); });

    loadAndRenderServices();
    const todayString = getLocalDateString();
    const currentMonthIndex = new Date().getMonth();
    document.getElementById('finished-date-filter').value = todayString;
    currentFinishedDateFilter = todayString;
    renderFinishedClients(applyClientFilters(allFinishedClients, '', 'All', currentFinishedDateFilter));
    document.getElementById('staff-earning-date').value = todayString;
    document.getElementById('earning-date-filter').value = todayString;
    currentEarningDateFilter = todayString;
    renderStaffEarnings(applyEarningFilters(allEarnings, 'All', currentEarningDateFilter, 'daily'));
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
}

