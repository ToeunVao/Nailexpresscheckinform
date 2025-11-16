import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut, signInAnonymously, updateEmail, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, query, doc, getDoc, deleteDoc, serverTimestamp, where, getDocs, orderBy, Timestamp, updateDoc, writeBatch, setDoc, arrayUnion, arrayRemove, runTransaction } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
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
const purchaseForm = document.getElementById('landing-gift-card-form');
let allTasks = [];
let backupSettings = { frequency: 'weekly', lastBackup: null };
const loadingScreen = document.getElementById('loading-screen');
const landingPageContent = document.getElementById('landing-page-content');
const appContent = document.getElementById('app-content');
const clientDashboardContent = document.getElementById('client-dashboard-content');
const policyModal = document.getElementById('policy-modal');
const addAppointmentModal = document.getElementById('add-appointment-modal');
const promotionsContainerLanding = document.getElementById('promotions-container-landing');
const serviceModal = document.getElementById('service-modal');
const modalTitle = document.getElementById('modal-title');
const modalContent = document.getElementById('modal-content');
let mainAppInitialized = false;
let landingPageInitialized = false;
let clientDashboardInitialized = false;
let anonymousUserId = null;
let bookingSettings = { 
    minBookingHours: 2, 
    defaultDuration: 40, 
    bufferTime: 0 
};
let loginSecuritySettings = { maxAttempts: 5, lockoutMinutes: 15 };
let salonHours = {};
//... inside initMainApp, around line 247
let salonRevenueChart, myEarningsChart, staffEarningsChart, profitChart;
let clientSpendingChart, clientServicesChart;
let notifications = [];
let currentUserRole = null;
let currentUserName = null;
let currentUserId = null;
let initialAppointmentsLoaded = false;
let initialInventoryLoaded = false;
// AFTER EDITING
let allFinishedClients = [], allAppointments = [], allClients = [], allActiveClients = [], servicesData = {}, allServicesList = [];
let allColorBrands = [];
let allMembershipTiers = [];
let allPromotions = [];
let allNailIdeas = [];
let techniciansAndStaff = [], technicians = [];
let currentGalleryData = [];
let currentRotation = 0;
let royaltySettings = { visitsNeeded: 10, rewardDescription: 'One Free Classic Manicure' };
let allRoyaltyCards = [];
let globalListenersAttached = false;
let holidaySettings = { dates: [], message: 'The salon is closed on the selected date.' };
let holidayCalYear = new Date().getFullYear(); // You likely added this one
let holidayCalMonth = new Date().getMonth(); // <--- ADD THIS LINE
let currentLightboxImageIndex = 0;
let currentLightboxIdea = null;
let allShopProducts = []; 
let shoppingCart = loadCartFromLocalStorage();
let globalTaxRate = 0;
let globalShippingFee = 0; 
let allWaitlistEntries = []; 
let currentProductModalImageIndex = 0;
const nailIdeaLightbox = document.getElementById('nail-idea-lightbox');
const lightboxCloseBtn = document.getElementById('lightbox-close-btn');
const lightboxPrevBtn = document.getElementById('lightbox-prev-btn');
const lightboxNextBtn = document.getElementById('lightbox-next-btn');
const lightboxImage = document.getElementById('lightbox-image');
const lightboxTitle = document.getElementById('lightbox-title');
const lightboxShape = document.getElementById('lightbox-shape');
const lightboxColor = document.getElementById('lightbox-color');
const lightboxCategories = document.getElementById('lightbox-categories');
const lightboxDescription = document.getElementById('lightbox-description');
let currentLightboxIndex = 0;
let allFeaturedReviews = [];
let pendingWaitlistData = null;
let globalOnlineGcStartNumber = 1000; // Default start
let globalLastUsedOnlineGcNumber = 0; // Will be loaded from settings
let membershipRewardSettings = { threshold: 500, type: 'fixed', value: 25 }; // Default values
let allClientMemberships = [];

const giftCardBackgrounds = {
    'General': ['https://img.freepik.com/premium-photo/women-s-legs-with-bright-pedicure-pink-background-chamomile-flower-decoration-spa-pedicure-skincare-concept_256259-166.jpg', 'https://png.pngtree.com/thumb_back/fh260/background/20250205/pngtree-soft-pastel-floral-design-light-blue-background-image_16896113.jpg', 'https://files.123freevectors.com/wp-content/original/119522-abstract-pastel-pink-background-image.jpg'],
    'Holidays': ['https://media.istockphoto.com/id/1281966270/vector/christmas-background-with-snowflakes.jpg?s=612x612&w=0&k=20&c=3t2mJbipFc4aln2M8qDbd3kJvUwtjl1md1F3Rj0xVI4=', 'https://media.istockphoto.com/id/1180986336/vector/red-bokeh-snowflakes-background.jpg?s=612x612&w=0&k=20&c=NR_Hf8C2owuvtCxtjk789Ckynqdm6l2oDWLHwI7uqlE=', 'https://png.pngtree.com/background/20210710/original/pngtree-red-christmas-snow-winter-cartoon-show-board-background-picture-image_979028.jpg'],
    'Valentines': ['https://slidescorner.com/wp-content/uploads/2023/02/01-Cute-Pink-Hearts-Valentines-Day-Background-Aesthetic-FREE-by-SlidesCorner.com_.jpg', 'https://images.rawpixel.com/image_800/cHJpdmF0ZS9sci9pbWFnZXMvd2Vic2l0ZS8yMDIzLTExL2xhdXJhc3RlZmFubzI2Nl9waW5rX3ZhbGVudGluZXNfZGF5X2JhY2tncm91bmRfd2l0aF9oZWFydHNfYm9rZV9kZTAzMWNjMy05MmJmLTQ2NzAtYjliZC0wN2Y2ZDkzYTM1ZDBfMS5qcGc.jpg', 'https://cms-artifacts.artlist.io/content/motion_array/1390934/Valentines_Day_Romantic_Background_high_resolution_preview_1390934.jpg?Expires=2037527646045&Key-Pair-Id=K2ZDLYDZI2R1DF&Signature=fCbOC95RTvVc0Ld-pyxhFN5gzuS-VqGG1UYsxvu48kx8A6rdAPf~gjuv0sVBrV~0p0~2u99BYafKT5oRUsRbluBt9c8eH4k~YXVcT2KdNrQUjVD-wKS2qTcgdp8aVDYCCILMkFT4hrWRWzKlsjjgoBe7mAIaHV3cc2iqMErb-qGWlk8jX0J8vLfCvXH~daNNPMqO7tssbeYiHVrD7y89fbJ0YRVfR6wwb1AoBLseF8-7IsAZe8Hh2bn-kUEp8KocRZ4X7DBTFD~9Ho-E0HeRym4oZ37u3BdLAqY-y0a1HdIf3dOXXkF6X~UQpMlPtxTvWj4857QSez20b1mhnBhpsQ__'],
    'Birthday': ['https://marketplace.canva.com/EAGhbM7XcuY/1/0/1600w/canva-white-and-blue-birthday-background-card-yqLk4e5MQjY.jpg', 'https://images.rawpixel.com/image_800/czNmcy1wcml2YXRlL3Jhd3BpeGVsX2ltYWdlcy93ZWJzaXRlX2NvbnRlbnQvbHIvam9iNTE2LW51bm9vbi0xMC5qcGc.jpg', 'https://www.creativefabrica.com/wp-content/uploads/2021/08/30/Happy-birthday-background-design-Graphics-16518598-1-1-580x430.jpg']
};

// Global variable to store chart instances (optional, but useful)
    const initializeChart = (chartInstance, ctx, type, data, options) => {
        if (chartInstance) { chartInstance.data = data; chartInstance.options = options; chartInstance.update(); }
        else { chartInstance = new Chart(ctx, { type, data, options }); }
        return chartInstance;
    };

// ====================================================================
// Global Chart Initialization Function
// ====================================================================

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
// ====================================================================
// NEW: Global Notification Function
// ====================================================================

const addNotification = (type, message) => {
    const container = document.getElementById('notification-container');
    if (!container) {
        console.error(`Notification container (#notification-container) not found. Message: ${message}`);
        return;
    }

    const colorMap = {
        success: { bg: 'bg-green-100', text: 'text-green-800', icon: 'fa-check-circle' },
        error: { bg: 'bg-red-100', text: 'text-red-800', icon: 'fa-times-circle' },
        reminder: { bg: 'bg-blue-100', text: 'text-blue-800', icon: 'fa-bell' },
        // ... include other types if needed
    };

    const colors = colorMap[type] || colorMap.reminder;
    
    const notificationEl = document.createElement('div');
    notificationEl.className = `p-4 mb-3 rounded-lg shadow-md ${colors.bg} ${colors.text} flex items-center justify-between transition-all duration-500 ease-in-out transform opacity-0 translate-y-4`;
    notificationEl.innerHTML = `
        <div class="flex items-center">
            <i class="fas ${colors.icon} mr-3"></i>
            <span>${message}</span>
        </div>
        <button class="ml-4 opacity-75 hover:opacity-100 close-btn">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Add event listener to close the notification
    notificationEl.querySelector('.close-btn').addEventListener('click', () => {
        notificationEl.classList.remove('opacity-100', 'translate-y-0');
        notificationEl.classList.add('opacity-0', 'translate-y-4');
        setTimeout(() => notificationEl.remove(), 500);
    });

    container.prepend(notificationEl);
    
    // Animate in
    setTimeout(() => {
        notificationEl.classList.remove('opacity-0', 'translate-y-4');
        notificationEl.classList.add('opacity-100', 'translate-y-0');
    }, 10);

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        notificationEl.querySelector('.close-btn').click();
    }, 5000);
};


const renderStars = (rating) => {
    let stars = '';
    const fullStar = '<i class="fas fa-star text-yellow-400"></i>';
    const emptyStar = '<i class="fas fa-star text-gray-300"></i>';

    // Ensure rating is a number between 1 and 5
    const safeRating = Math.max(0, Math.min(5, parseInt(rating) || 0));

    for (let i = 1; i <= 5; i++) {
        stars += i <= safeRating ? fullStar : emptyStar;
    }
    return `<div class="text-xl mb-4">${stars}</div>`;
};

// ---
// --- NEW SAFE DATA LOADING FUNCTION ---
// ---
function initializeGlobalListeners() {
    if (globalListenersAttached) return;

    onSnapshot(query(collection(db, "memberships"), orderBy("price")), (snapshot) => {
        allMembershipTiers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (landingPageContent.style.display === 'block') {
            renderMembershipTiers(allMembershipTiers, 'landing-memberships-container', false);
        }
    });

    globalListenersAttached = true;
}

// ---
// --- PRIMARY AUTHENTICATION ROUTER ---
onAuthStateChanged(auth, async (user) => {
    try {
        if (user) {
            // Common setup for any authenticated user
            initializeGlobalListeners(); // Ensures Firestore listeners are ready
            currentUserId = user.uid;

            // Load essential settings
            const hoursDoc = await getDoc(doc(db, "settings", "salonHours"));
            if (hoursDoc.exists()) {
                salonHours = hoursDoc.data();
            }

            // --- Route based on user type ---

            if (user.isAnonymous) {
                // ANONYMOUS USER: Show Landing Page
                loadingScreen.style.display = 'none';
                appContent.style.display = 'none';
                clientDashboardContent.style.display = 'none';
                landingPageContent.style.display = 'block';
                if (!landingPageInitialized) {
                    initLandingPage();
                    landingPageInitialized = true;
                }
            } else {
                // AUTHENTICATED (Non-Anonymous) USER: Check if Admin/Staff or Client

                // 1. Check if it's an Admin or Staff user
                const userDocRef = doc(db, "users", user.uid);
                const userDocSnap = await getDoc(userDocRef);

                if (userDocSnap.exists()) {
                    // ADMIN/STAFF USER: Initialize Main App
                    const userData = userDocSnap.data();
                    currentUserRole = userData.role;
                    currentUserName = userData.name;

                    loadingScreen.style.display = 'none';
                    landingPageContent.style.display = 'none';
                    clientDashboardContent.style.display = 'none';
                    appContent.style.display = 'block';

                    if (!mainAppInitialized) {
                        initMainApp(currentUserRole, currentUserName);
                        mainAppInitialized = true;
                    }
                } else {
                    // Not Admin/Staff, check if it's an existing Client
                    const clientDocRef = doc(db, "clients", user.uid);
                    const clientDocSnap = await getDoc(clientDocRef);

                    if (clientDocSnap.exists()) {
                        // EXISTING CLIENT USER: Initialize Client Dashboard
                        loadingScreen.style.display = 'none';
                        landingPageContent.style.display = 'none';
                        appContent.style.display = 'none';
                        clientDashboardContent.style.display = 'block';
                        // Initialize dashboard with existing client data
                        initClientDashboard(user.uid, clientDocSnap.data());
                    } else {
                        // --- NEW CLIENT CREATION FLOW ---
                        // This user just signed up, likely triggered by an action.
                        // Check sessionStorage for pending actions.

                        const pendingPurchaseJSON = sessionStorage.getItem('pendingGiftCardPurchase');
                        const pendingMembershipId = sessionStorage.getItem('pendingMembershipPurchase');
                        const pendingRoyaltyJSON = sessionStorage.getItem('pendingRoyaltyCard');
                        const genericSignupJSON = sessionStorage.getItem('signupDetails'); // For generic signups

                        let newClientData = { role: 'client', createdAt: serverTimestamp() };
                        let signupDetails = null;
                        let actionTaken = false; // Flag to track if an action was processed

                        // Determine signup source and get details
                        if (pendingPurchaseJSON) {
                            signupDetails = JSON.parse(pendingPurchaseJSON);
                            newClientData.name = signupDetails.buyerName;
                            newClientData.email = signupDetails.buyerEmail;
                            newClientData.phone = signupDetails.buyerPhone;
                        } else if (pendingMembershipId) {
                            signupDetails = JSON.parse(genericSignupJSON); // Membership uses generic signup details
                            newClientData.name = signupDetails.name;
                            newClientData.email = signupDetails.email;
                            newClientData.phone = signupDetails.phone;
                            const tier = allMembershipTiers.find(t => t.id === pendingMembershipId);
                            newClientData.membership = {
                                tierId: pendingMembershipId,
                                tierName: tier?.name || 'Unknown Tier',
                                startDate: serverTimestamp(),
                                status: 'Pending' // Set initial status
                            };
                        } else if (pendingRoyaltyJSON) {
                            signupDetails = JSON.parse(pendingRoyaltyJSON);
                            newClientData.name = signupDetails.name;
                            newClientData.email = signupDetails.email;
                            newClientData.phone = signupDetails.phone;
                            newClientData.royaltyCard = { visits: 0, lastVisit: null };
                        } else if (genericSignupJSON) {
                            signupDetails = JSON.parse(genericSignupJSON);
                            newClientData.name = signupDetails.name;
                            newClientData.email = signupDetails.email;
                            newClientData.phone = signupDetails.phone; // Assuming phone was stored
                        }

                        // If we have details, create the client document
                        if (signupDetails) {
                            await setDoc(clientDocRef, newClientData); // Create the client document

                            // Perform action-specific logic AFTER client creation
                            if (pendingPurchaseJSON) {
                                // Create Gift Card(s) using details from sessionStorage
                                if (signupDetails.generatedCodes && signupDetails.generatedCodes.length === signupDetails.quantity) {
                                    const batch = writeBatch(db);
                                    const expiryDate = new Date();
                                    expiryDate.setMonth(expiryDate.getMonth() + 6); // Example expiry
                                    const buyerInfo = { name: signupDetails.buyerName, email: signupDetails.buyerEmail, phone: signupDetails.buyerPhone };

                                    signupDetails.generatedCodes.forEach((code) => {
                                        const cardData = {
                                            amount: signupDetails.amount,
                                            balance: signupDetails.amount,
                                            history: [],
                                            recipientName: signupDetails.recipientName,
                                            senderName: signupDetails.senderName,
                                            backgroundUrl: signupDetails.backgroundUrl,
                                            code: code,
                                            status: 'Pending', // Initial status
                                            type: 'E-Gift',
                                            createdBy: user.uid, // Link to the new client
                                            buyerInfo: buyerInfo,
                                            createdAt: serverTimestamp(),
                                            expiresAt: Timestamp.fromDate(expiryDate)
                                        };
                                        const newCardRef = doc(collection(db, "gift_cards"));
                                        batch.set(newCardRef, cardData);
                                    });

                                    // Update the last used online GC number in settings
                                    const settingsRef = doc(db, "settings", "ecommerce");
                                    batch.set(settingsRef, { lastUsedOnlineGcNumber: signupDetails.finalLastNumber }, { merge: true });

                                    await batch.commit();
                                    await sendGiftCardConfirmationEmail(signupDetails);
                                    addNotification('success', "Account created & gift card request sent!");
                                } else {
                                    console.error("Gift card code generation failed during signup.");
                                    addNotification('error', "Account created, but failed to process gift card request.");
                                }
                                sessionStorage.removeItem('pendingGiftCardPurchase');
                                actionTaken = true;
                            } else if (pendingMembershipId) {
                                await sendMembershipConfirmationEmail({ ...signupDetails, tierName: newClientData.membership.tierName });
                                addNotification('success', "Welcome! Account created & membership request sent.");
                                sessionStorage.removeItem('pendingMembershipPurchase');
                                actionTaken = true;
                            } else if (pendingRoyaltyJSON) {
                                addNotification('success', "Welcome! Your Royalty Card account is active.");
                                sessionStorage.removeItem('pendingRoyaltyCard');
                                actionTaken = true;
                            } else if (genericSignupJSON) {
                                // Just a generic signup, no further action needed besides client creation
                                addNotification('success', `Welcome, ${signupDetails.name}! Your account is ready.`);
                                actionTaken = true;
                            }

                            // Clear generic signup details if used
                            sessionStorage.removeItem('signupDetails');

                            // Initialize the dashboard for the newly created client
                            loadingScreen.style.display = 'none';
                            landingPageContent.style.display = 'none';
                            appContent.style.display = 'none';
                            clientDashboardContent.style.display = 'block';
                            initClientDashboard(user.uid, newClientData);

                        } else {
                            // Edge Case: User authenticated but has no user/client doc and no pending action in session.
                            console.error("New user detected, but no client document exists and no pending action found in sessionStorage. Cannot determine role.");
                            addNotification('error', "Account created, but initial setup failed. Please contact support.");
                            // Sign out to prevent being stuck in an invalid state.
                            await signOut(auth);
                            // Redirect to landing or show error message
                            loadingScreen.style.display = 'none';
                            landingPageContent.style.display = 'block'; // Go back to landing
                            appContent.style.display = 'none';
                            clientDashboardContent.style.display = 'none';
                            return; // Stop further execution
                        }
                    }
                }
            }
        } else {
            // NO USER: Sign in anonymously to allow landing page interaction
            signInAnonymously(auth).catch((error) => {
                console.error("Initial anonymous sign-in failed:", error);
                // Handle failure (e.g., show error message on loading screen)
                loadingScreen.innerHTML = `<div class="text-center"><h2 class="text-3xl font-bold text-red-700">Initialization Error</h2><p>Could not start the application anonymously. Please check your connection or browser settings.</p></div>`;
            });
        }
    } catch (error) {
        // --- General Authentication Error Handling ---
        console.error("Authentication State Error:", error);
        loadingScreen.innerHTML = `<div class="text-center"><h2 class="text-3xl font-bold text-red-700">Authentication Error</h2><p>An error occurred during authentication. Please refresh the page.</p><p class="text-xs text-gray-400 mt-4">Error: ${error.message}</p></div>`;
        // Ensure other content areas are hidden
        appContent.style.display = 'none';
        clientDashboardContent.style.display = 'none';
        landingPageContent.style.display = 'none';
    }
});


// Add this near the other onSnapshot listeners in your script.js
onSnapshot(doc(db, "settings", "ecommerce"), (docSnap) => {
    // Check if the cart rendering function exists before calling it
    const cartUpdateFn = window.renderCart || null; // Assume your function is named renderCart and globally accessible

    if (docSnap.exists()) {
        const data = docSnap.data();
        globalTaxRate = data.taxRate || 0; 
        globalShippingFee = data.shippingFee || 0;
        // --- FIX: Load online GC settings ---
        globalOnlineGcStartNumber = data.onlineGcStartNumber || 1000;
        globalLastUsedOnlineGcNumber = data.lastUsedOnlineGcNumber || 0; // Load last used
        // Update display in admin settings
        const startNumInput = document.getElementById('online-gc-start-number');
        const lastUsedDisplay = document.getElementById('last-used-online-gc-display');
        if (startNumInput) startNumInput.value = globalOnlineGcStartNumber;
        if (lastUsedDisplay) lastUsedDisplay.textContent = globalLastUsedOnlineGcNumber > 0 ? globalLastUsedOnlineGcNumber : 'Not set';
        // --- End fix ---

        // Update Admin Panel fields if they exist
        const adminTaxRateEl = document.getElementById('admin-tax-rate');
        const adminShippingFeeEl = document.getElementById('admin-shipping-fee');
        
        if (adminTaxRateEl && adminShippingFeeEl) {
            // Convert decimal back to percentage for display
            adminTaxRateEl.value = (data.taxRate * 100).toFixed(2); 
            adminShippingFeeEl.value = data.shippingFee.toFixed(2);
        }

        // Re-calculate the cart total with new settings
        if (typeof cartUpdateFn === 'function') {
             cartUpdateFn(); 
        }

    } else {
        // Initialize default settings if document doesn't exist
        setDoc(doc(db, "settings", "ecommerce"), {
             taxRate: 0.00,
             shippingFee: 0.00,
             onlineGcStartNumber: 1000, // Default start
             lastUsedOnlineGcNumber: 0
        }, { merge: true });
    }
});


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
// REPLACE the old renderNailIdeasGallery function with this one
const renderNailIdeasGallery = (ideas) => {
    const landingGallery = document.getElementById('nails-idea-container-landing');
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
                   <img class="w-full rounded-lg shadow-md cursor-pointer" src="${(idea.imageURLs && idea.imageURLs[0]) || idea.imageURL}" alt="${idea.name}" data-index="${index}">
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

// REPLACE your entire block of lightbox functions with this new one

const lightboxImagePrevBtn = document.getElementById('lightbox-image-prev-btn');
const lightboxImageNextBtn = document.getElementById('lightbox-image-next-btn');
const lightboxImageCounter = document.getElementById('lightbox-image-counter');

const displayLightboxImage = () => {
    if (!currentLightboxIdea || !currentLightboxIdea.imageURLs || currentLightboxIdea.imageURLs.length === 0) return;

    const images = currentLightboxIdea.imageURLs;
    lightboxImage.src = images[currentLightboxImageIndex];

    const hasMultipleImages = images.length > 1;
    lightboxImageCounter.classList.toggle('hidden', !hasMultipleImages);
    lightboxImagePrevBtn.classList.toggle('hidden', !hasMultipleImages || currentLightboxImageIndex === 0);
    lightboxImageNextBtn.classList.toggle('hidden', !hasMultipleImages || currentLightboxImageIndex === images.length - 1);

    if (hasMultipleImages) {
        lightboxImageCounter.textContent = `${currentLightboxImageIndex + 1} / ${images.length}`;
    }
};

const openLightbox = (index) => {
    if (index < 0 || index >= currentGalleryData.length) return;

    currentLightboxIndex = index;
    currentLightboxIdea = currentGalleryData[index];
    currentLightboxImageIndex = 0; // Always start at the first image

    lightboxTitle.textContent = currentLightboxIdea.name;
    lightboxShape.textContent = currentLightboxIdea.shape || 'N/A';
    lightboxColor.textContent = currentLightboxIdea.color || 'N/A';
    lightboxDescription.textContent = currentLightboxIdea.description || '';
    lightboxCategories.innerHTML = (currentLightboxIdea.categories || []).map(cat =>
        `<span class="bg-pink-100 text-pink-700 text-xs font-semibold px-2 py-1 rounded-full">${cat}</span>`
    ).join('');

    currentRotation = 0;
    lightboxImage.style.transform = `rotate(0deg)`;

    displayLightboxImage(); // This function now handles showing the image and controls

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
    currentLightboxIdea = null; // Clear the current idea
};

const showNextIdea = () => openLightbox(currentLightboxIndex + 1);
const showPrevIdea = () => openLightbox(currentLightboxIndex - 1);
const showNextImage = () => {
    if (currentLightboxIdea && currentLightboxImageIndex < currentLightboxIdea.imageURLs.length - 1) {
        currentLightboxImageIndex++;
        displayLightboxImage();
    }
};
const showPrevImage = () => {
    if (currentLightboxIdea && currentLightboxImageIndex > 0) {
        currentLightboxImageIndex--;
        displayLightboxImage();
    }
};

const galleryClickHandler = (e) => {
    // Handle clicking the share button first
    const shareBtn = e.target.closest('.share-nail-idea-btn');
    if (shareBtn) {
        // Find the correct nail idea using the 'data-id' from the button
        const ideaId = shareBtn.dataset.id;
        const ideaToShare = allNailIdeas.find(idea => idea.id === ideaId);
        if (ideaToShare) {
            openShareModal(ideaToShare);
        }
        return; // Stop further execution so the lightbox doesn't open
    }

    // If a share button wasn't clicked, handle clicking the image to open the lightbox
    const img = e.target.closest('img');
    if (img && img.dataset.index) {
        const index = parseInt(img.dataset.index, 10);
        // Check if the index is a valid number before opening
        if (!isNaN(index)) {
            openLightbox(index);
        }
    }
};
document.getElementById('nails-idea-gallery').addEventListener('click', galleryClickHandler);
document.getElementById('nails-idea-landing').addEventListener('click', galleryClickHandler);

// Main lightbox navigation (between different nail IDEAS)
lightboxCloseBtn.addEventListener('click', closeLightbox);
lightboxNextBtn.addEventListener('click', showNextIdea);
lightboxPrevBtn.addEventListener('click', showPrevIdea);

// Intra-lightbox navigation (between IMAGES of the same idea)
lightboxImageNextBtn.addEventListener('click', showNextImage);
lightboxImagePrevBtn.addEventListener('click', showPrevImage);

// Other lightbox controls
document.getElementById('lightbox-fullscreen-btn').addEventListener('click', toggleFullScreen);
document.getElementById('lightbox-rotate-btn').addEventListener('click', rotateImage);

document.addEventListener('keydown', (e) => {
    if (!nailIdeaLightbox.classList.contains('hidden')) {
        if (e.key === 'ArrowRight') showNextIdea();
        if (e.key === 'ArrowLeft') showPrevIdea();
        if (e.key === 'Escape') closeLightbox();
    }
});

nailIdeaLightbox.addEventListener('click', (e) => {
    if (e.target === nailIdeaLightbox) {
        closeLightbox();
    }
});


const openShareModal = (idea) => {
    const salonUrl = "http://www.nailsxpressky.com";
    const shareText = `Check out this amazing nail design from Nails Express: ${idea.name}!`;
    
    // **FIX**: Get the first image from the imageURLs array, with a fallback to the old imageURL property
    const imageUrl = (idea.imageURLs && idea.imageURLs[0]) || idea.imageURL;

    document.getElementById('share-facebook').href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(salonUrl)}`;
    document.getElementById('share-pinterest').href = `http://pinterest.com/pin/create/button/?url=${encodeURIComponent(salonUrl)}&media=${encodeURIComponent(imageUrl)}&description=${encodeURIComponent(shareText)}`;
    document.getElementById('share-twitter').href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(salonUrl)}`;
    document.getElementById('share-copy-link').onclick = () => { navigator.clipboard.writeText(salonUrl).then(() => alert('Link copied to clipboard!')); };
    
    shareModal.classList.remove('hidden');
    shareModal.classList.add('flex');
};

const closeShareModal = () => { shareModal.classList.add('hidden'); shareModal.classList.remove('flex'); };
document.getElementById('share-close-btn').addEventListener('click', closeShareModal);
document.querySelector('.share-modal-overlay').addEventListener('click', closeShareModal);





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

// --- Cart Persistence Functions ---

// --- Cart Persistence Functions (Use 'function' for Hoisting) ---

function saveCartToLocalStorage() {
    // Convert the JavaScript array to a JSON string and store it
    localStorage.setItem('nails_express_shopping_cart', JSON.stringify(shoppingCart));
}

function loadCartFromLocalStorage() {
    const savedCart = localStorage.getItem('nails_express_shopping_cart');
    // If a saved cart exists, parse it back into an array. Otherwise, return an empty array.
    return savedCart ? JSON.parse(savedCart) : [];
}

// ----------------------------------------------------------

// REPLACE your old openCardForPrint function with this one:
const openCardForPrint = (card) => {
    const expiryText = card.expiresAt ? `Expires: ${card.expiresAt.toDate().toLocaleDateString()}` : '';
    const cardHTML = `
        <html><head><title>Gift Card ${card.code}</title><script src="https://cdn.tailwindcss.com"><\/script><link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Poppins:wght@400;600&family=Parisienne&display=swap" rel="stylesheet">
        <style>
            body{font-family:'Poppins',sans-serif;display:flex;align-items:center;justify-content:center;margin:0;padding:20px;background-color:#f0f0f0;}
            .font-parisienne{font-family:'Parisienne',cursive;}
            .card-container{display:grid;grid-template-columns:repeat(2, 1fr);gap:20px;}
            .card{width:400px;height:228px;text-shadow:1px 1px 3px rgba(0,0,0,0.6);box-shadow: 0 4px 8px rgba(0,0,0,0.2);-webkit-print-color-adjust: exact !important; color-adjust: exact !important;}
            @media print { body { padding: 0; } .card-container { gap: 0; } }
        </style></head><body>
        <div class="card-container">
            <!-- Front of Card -->
            <div class="card rounded-lg p-4 flex flex-col justify-between bg-cover bg-center text-white" style="background-image: url('${card.backgroundUrl}');">
                <div class="flex justify-between items-start"><img src="https://placehold.co/100x100/d63384/FFFFFF?text=NE" class="w-12 h-12 rounded-full border-2 border-white" /><div class="text-right"><p class="font-parisienne text-3xl">Gift Card</p><p class="text-xs font-semibold tracking-wider">Nails Express</p></div></div>
                <div class="text-center"><p class="text-5xl font-bold">$${card.balance.toFixed(2)}</p></div>
                <div class="text-xs"><div class="flex justify-between font-semibold"><span style="display:${card.recipientName ? 'inline' : 'none'}">FOR: <span class="font-normal">${card.recipientName}</span></span><span style="display:${card.senderName ? 'inline' : 'none'}">FROM: <span class="font-normal">${card.senderName}</span></span></div><p class="mt-2 text-center font-mono tracking-widest text-sm">${card.code}</p><p class="mt-1 text-center text-[10px] opacity-80" style="display:${expiryText ? 'block' : 'none'}">${expiryText}</p></div>
            </div>
            <!-- Back of Card -->
            <div class="card rounded-lg p-4 flex flex-col justify-between bg-white text-gray-800" style="text-shadow: none;">
                <div class="w-full h-10 bg-black mt-2"></div>
                <p class="text-xs text-center text-gray-600 px-4 leading-relaxed">
                    This card is redeemable for services at Nails Express. Treat this card like cash; it is not replaceable if lost or stolen. This card is non-refundable and cannot be exchanged for cash.
                </p>
                <div class="text-center text-xs pb-2">
                    <p class="font-bold">Nails Express</p>
                    <p>1560 Hustonville Rd #345, Danville, KY 40422</p>
                    <p>(859) 236-2873</p>
                </div>
            </div>
        </div>
        </body></html>
    `;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(cardHTML);
    printWindow.document.close();
    printWindow.focus();
};

// REPLACE your old openMembershipCardForPrint function with this new one:
const openMembershipCardForPrint = (client, tier) => {
    // **** FIX: Add check for .toDate() function ****
let startDate = new Date().toLocaleDateString(); // Default to today if no date found
if (client.membership.startDate && typeof client.membership.startDate.toDate === 'function') {
    startDate = client.membership.startDate.toDate().toLocaleDateString();
}
    const memberId = client.id ? client.id.split('').map(char => char.charCodeAt(0)).join('').substring(0, 6) : 'N/A';
    let cardStyle = 'from-gray-700 via-gray-900 to-black';
    if (tier.name.toLowerCase().includes('silver')) cardStyle = 'from-gray-400 via-gray-500 to-gray-600';
    if (tier.name.toLowerCase().includes('gold')) cardStyle = 'from-yellow-400 via-yellow-500 to-yellow-600';
    if (tier.name.toLowerCase().includes('platinum')) cardStyle = 'from-indigo-500 via-purple-600 to-pink-600';

    const cardHTML = `
        <html><head><title>Membership Card - ${client.name}</title><script src="https://cdn.tailwindcss.com"><\/script><link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Poppins:wght@400;600&family=Parisienne&display=swap" rel="stylesheet">
        <style>
            body{font-family:'Poppins',sans-serif;display:flex;align-items:center;justify-content:center;margin:0;padding:20px;background-color:#f0f0f0;}
            .font-parisienne{font-family:'Parisienne',cursive;}
            .card-container{display:grid;grid-template-columns:repeat(2, 1fr);gap:20px;}
            .card{width:400px;height:228px;text-shadow:1px 1px 3px rgba(0,0,0,0.6);box-shadow: 0 4px 8px rgba(0,0,0,0.2);-webkit-print-color-adjust: exact !important; color-adjust: exact !important;}
            @media print { body { padding: 0; } .card-container { gap: 0; } }
        </style></head><body>
        <div class="card-container">
            <div class="card rounded-lg p-4 flex flex-col justify-between bg-gradient-to-br ${cardStyle} text-white">
                <div class="flex justify-between items-start">
                    <div class="font-bold text-lg"><p>${tier.name}</p><p class="text-xs font-normal opacity-80">MEMBERSHIP</p></div>
                    <p class="font-parisienne text-3xl">Nails Express</p>
                </div>
                <div class="flex justify-between items-end">
                    <div class="text-left"><p class="text-xs opacity-80">MEMBER</p><p class="text-2xl font-semibold tracking-wider">${client.name}</p></div>
                    <div class="text-right text-xs opacity-80">
                        <p>Member Since: ${startDate}</p>
                        <p>Member ID: ${memberId}</p>
                    </div>
                </div>
            </div>
            <div class="card rounded-lg p-4 flex flex-col justify-between bg-white text-gray-800" style="text-shadow: none;">
                <div class="text-xs text-center text-gray-600 px-4 leading-relaxed">
                    <p>
                        Welcome, VIP! This card must be presented to receive benefits. Membership is non-transferable.
                    </p>
                    <p class="font-bold mt-2">
                        Clients must pay with cash only to earn credit towards their cash reward.
                    </p>
                </div>
                
                <div class="px-4 pb-2 text-center">
                    <p class="font-parisienne text-2xl text-gray-700">${client.name}</p>
                    <div class="w-full border-t border-dashed border-gray-400 pt-1 mt-1"></div>
                    <p class="text-xs text-gray-500">Member Signature</p>
                </div>

                <div class="text-center text-xs pb-2">
                    <p class="font-bold">Nails Express</p>
                    <p>1560 Hustonville Rd #345, Danville, KY 40422</p>
                </div>
            </div>
        </div>
        </body></html>
    `;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(cardHTML);
    printWindow.document.close();
    printWindow.focus();
};

// PASTE THIS ENTIRE NEW FUNCTION
const isTechnicianAvailable = async (technicianName, proposedStartTime, newServiceDuration) => {
    // This is a client-side function now, it must call the cloud function
    try {
        const { getFunctions, httpsCallable } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-functions.js");
        const functions = getFunctions(app);
        const checkAvailability = httpsCallable(functions, 'checkAvailability');

        const result = await checkAvailability({ 
            technicianName, 
            proposedStartTime: proposedStartTime.toISOString(), 
            newServiceDuration 
        });

        return result.data; // The cloud function returns { available: true/false, message: '...' }
    } catch (error) {
        console.error("Error calling checkAvailability function:", error);
        return { available: false, message: "Could not verify schedule. Please try again." };
    }
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
// PASTE THESE TWO NEW FUNCTIONS
async function sendGiftCardConfirmationEmail(details) {
    if (!details.buyerEmail) return;
    try {
        const templateDoc = await getDoc(doc(db, "settings", "emailTemplates"));
        if (!templateDoc.exists()) return;
        const templates = templateDoc.data();

        let subject = templates.giftCardSubject || 'Your Gift Card Request from Nails Express';
        let body = templates.giftCardBody || 'Thank you, {clientName}, for your gift card purchase of {amount}.';

        body = body.replace(/{clientName}/g, details.buyerName)
            .replace(/{amount}/g, `$${(details.amount * details.quantity).toFixed(2)}`)
            .replace(/{recipientName}/g, details.recipientName)
            .replace(/{senderName}/g, details.senderName)
            .replace(/\n/g, '<br>');

        await addDoc(collection(db, "mail"), {
            to: details.buyerEmail,
            message: { subject: subject, html: body },
        });
    } catch (error) {
        console.error("Error sending gift card confirmation email:", error);
    }
}

async function sendMembershipConfirmationEmail(details) {
    if (!details.email) return;
    try {
        const templateDoc = await getDoc(doc(db, "settings", "emailTemplates"));
        if (!templateDoc.exists()) return;
        const templates = templateDoc.data();

        let subject = templates.membershipSubject || 'Welcome to the Nails Express VIP Membership!';
        let body = templates.membershipBody || 'Hi {clientName}, thank you for joining our {tierName} membership. Your request is pending payment confirmation.';

        body = body.replace(/{clientName}/g, details.name)
            .replace(/{tierName}/g, details.tierName)
            .replace(/\n/g, '<br>');

        await addDoc(collection(db, "mail"), {
            to: details.email,
            message: { subject: subject, html: body },
        });
    } catch (error) {
        console.error("Error sending membership confirmation email:", error);
    }
}

// PASTE THIS NEW FUNCTION in the Email Notification Logic section
async function sendAppointmentReminderEmail(appointmentData, clientEmail) {
    if (!clientEmail) {
        console.log("No client email found for reminder for:", appointmentData.name);
        return;
    }

    try {
        const templateDoc = await getDoc(doc(db, "settings", "emailTemplates"));
        if (!templateDoc.exists()) return;
        const templates = templateDoc.data();

        let subject = templates.reminderSubject || 'Your Upcoming Appointment at Nails Express';
        let body = templates.reminderBody || 'Hi {clientName}, this is a reminder for your appointment on {appointmentDate} at {appointmentTime}. We look forward to seeing you!';

        const appointmentDate = appointmentData.appointmentTimestamp.toDate();
        
        // Calculate reminder time (24 hours before appointment)
        const reminderTime = new Date(appointmentDate.getTime() - (24 * 60 * 60 * 1000));

        // If the reminder time is in the past, don't schedule it
        if (reminderTime < new Date()) {
            console.log("Skipping reminder for appointment in less than 24 hours.");
            return;
        }

        body = body.replace(/{clientName}/g, appointmentData.name)
            .replace(/{appointmentDate}/g, appointmentDate.toLocaleDateString())
            .replace(/{appointmentTime}/g, appointmentDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
            .replace(/{technician}/g, appointmentData.technician)
            .replace(/{services}/g, Array.isArray(appointmentData.services) ? appointmentData.services.join(', ') : appointmentData.services)
            .replace(/\n/g, '<br>');

        await addDoc(collection(db, "mail"), {
            to: clientEmail,
            message: { subject: subject, html: body },
            // This tells the Firebase Extension to send the email later
            delivery: {
                startTime: Timestamp.fromDate(reminderTime)
            }
        });
        console.log(`Reminder email scheduled for ${appointmentData.name}`);

    } catch (error) {
        console.error("Error scheduling appointment reminder email:", error);
    }
}

// --- Booking Validation Logic ---
// REPLACE the old isBookingTimeValid function with this one
function isBookingTimeValid(bookingDate) {
    // --- New Holiday Check ---
    const dateString = `${bookingDate.getFullYear()}-${String(bookingDate.getMonth() + 1).padStart(2, '0')}-${String(bookingDate.getDate()).padStart(2, '0')}`;
    if (holidaySettings.dates.includes(dateString)) {
        return { valid: false, message: holidaySettings.message || 'The salon is closed on the selected date.' };
    }
    // --- End Holiday Check ---

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
const openPolicyModal = () => { policyModal.classList.add('flex'); policyModal.classList.remove('hidden'); };
const closePolicyModal = () => { policyModal.classList.add('hidden'); policyModal.classList.remove('flex'); };
document.addEventListener('click', (e) => { if (e.target.closest('.view-policy-btn')) { openPolicyModal(); } });
document.getElementById('policy-close-btn').addEventListener('click', closePolicyModal);
document.querySelector('#policy-modal .policy-modal-overlay').addEventListener('click', closePolicyModal);

// REPLACE your old openAddAppointmentModal function with this one:
const openAddAppointmentModal = (date, clientData = null, appointmentData = null) => {
    addAppointmentForm.reset();
    const titleEl = document.getElementById('add-appointment-modal-title');
    const submitBtn = document.getElementById('add-appointment-submit-btn');
    const appointmentIdInput = document.getElementById('edit-appointment-id');
    const nameInput = document.getElementById('appointment-client-name');
    const phoneInput = document.getElementById('appointment-phone');
    const emailInput = document.getElementById('appointment-email');
    const peopleSelect = document.getElementById('appointment-people');
    const technicianSelect = document.getElementById('appointment-technician-select');

    // --- Populate Dropdowns (including the new service datalist) ---
    peopleSelect.innerHTML = '';
    for (let i = 1; i <= 20; i++) {
        peopleSelect.appendChild(new Option(i, i));
    }

    getDoc(doc(db, "public_data", "technicians")).then(docSnap => {
        if (docSnap.exists()) {
            const techNames = docSnap.data().names || [];
            technicianSelect.innerHTML = '<option>Any Technician</option>';
            techNames.forEach(name => {
                technicianSelect.appendChild(new Option(name, name));
            });
        }
    });

    const mainServicesList = document.getElementById('main-services-list');
    mainServicesList.innerHTML = Object.keys(servicesData).flatMap(category =>
        servicesData[category].map(service => `<option value="${service.p || ''}${service.name}${service.price ? ' ' + service.price : ''}"></option>`)
    ).join('');
    // --- End Dropdown Population ---

    nameInput.disabled = false;
    phoneInput.disabled = false;
    emailInput.disabled = false;

    if (appointmentData) {
        // Edit Mode
        titleEl.textContent = 'Edit Appointment';
        submitBtn.textContent = 'Update Appointment';
        appointmentIdInput.value = appointmentData.id;
        const apptDate = appointmentData.appointmentTimestamp.toDate();
        const year = apptDate.getFullYear();
        const month = String(apptDate.getMonth() + 1).padStart(2, '0');
        const day = String(apptDate.getDate()).padStart(2, '0');
        const hours = String(apptDate.getHours()).padStart(2, '0');
        const minutes = String(apptDate.getMinutes()).padStart(2, '0');
        document.getElementById('appointment-datetime').value = `${year}-${month}-${day}T${hours}:${minutes}`;
        nameInput.value = appointmentData.name || '';
        phoneInput.value = appointmentData.phone || '';
        emailInput.value = appointmentData.email || '';
        peopleSelect.value = appointmentData.people || 1;
        document.getElementById('appointment-booking-type').value = appointmentData.bookingType || 'Booked - Calendar';
        technicianSelect.value = appointmentData.technician || 'Any Technician';
        document.getElementById('appointment-notes').value = appointmentData.notes || '';
        // Handle single or multiple services for editing
        document.getElementById('appointment-services').value = Array.isArray(appointmentData.services) ? appointmentData.services.join(', ') : (appointmentData.services || '');

    } else {
        // Add New Mode
        titleEl.textContent = 'Add New Appointment';
        submitBtn.textContent = 'Save Appointment';
        appointmentIdInput.value = '';
        const now = new Date();
        const defaultDateTime = `${date}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        document.getElementById('appointment-datetime').value = defaultDateTime;

        if (clientData) {
            nameInput.value = clientData.name || '';
            phoneInput.value = clientData.phone || '';
            emailInput.value = clientData.email || '';
            nameInput.disabled = true;
            phoneInput.disabled = true;
            emailInput.disabled = true;
        }
    }
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
    if (client) { 
        document.getElementById('appointment-phone').value = client.phone;
        document.getElementById('appointment-email').value = client.email || '';
        }
});
document.getElementById('appointment-phone').addEventListener('input', (e) => {
    const client = allFinishedClients.find(c => c.phone === e.target.value);
    if (client) { 
        document.getElementById('appointment-client-name').value = client.name;
        document.getElementById('appointment-email').value = client.email || '';
     }
});

// --- END OF FUNCTION BODY ---
// Ensure you are selecting the correct form for the ADMIN modal
const addAppointmentForm = document.getElementById('add-appointment-form'); 

if (addAppointmentForm) {
    addAppointmentForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // --- 1. Reset UI State at start of submission ---
        const submitBtn = document.getElementById('add-appointment-submit-btn');
        const waitlistCta = document.getElementById('waitlist-cta');
        const waitlistMsg = document.getElementById('waitlist-message');
        
        if (waitlistCta) waitlistCta.classList.add('hidden');
        if (submitBtn) submitBtn.classList.remove('hidden');
        pendingWaitlistData = null; 


        // --- 2. Get Date/Time ---
        const localDateTimeInput = document.getElementById('appointment-datetime');
        
        if (!localDateTimeInput || !localDateTimeInput.value) {
            addNotification('error', 'Please select a date and time.');
            return;
        }
        
        const proposedStartTime = localDateTimeInput.value; 

        if (!proposedStartTime) {
            addNotification('error', "Invalid date/time selected.");
            return;
        }
        
        const bookingDate = new Date(proposedStartTime);
        // --- End Date/Time ---


        // --- 3. Validate Salon Hours & Minimum Notice ---
        const validation = isBookingTimeValid(bookingDate);
        if (!validation.valid) {
            addNotification('error', validation.message);
            return;
        }


        // --- 4. Get Technician and Services (Allow zero services) ---
        const technicianSelect = document.getElementById('appointment-technician-select');
        const servicesInput = document.getElementById('appointment-services'); 

        if (!technicianSelect || !servicesInput) {
             addNotification('error', 'Form elements missing. Cannot proceed.');
             return;
        }
        const technician = technicianSelect.value;
        const selectedServicesString = servicesInput.value;
        
        let totalDuration = 0;
        const serviceNames = selectedServicesString.split(',')
                                    .map(s => s.split(' $')[0].trim())
                                    .filter(name => name); 
                                    
        if (serviceNames.length === 0) {
            totalDuration = bookingSettings.defaultDuration; 
        } else {
            for (const name of serviceNames) {
                const service = allServicesList.find(s => s.name === name);
                totalDuration += service ? service.duration : bookingSettings.defaultDuration;
            }
        }
        // --- End Duration Calculation ---


        // --- 5. Availability Check ---
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Checking...';
        }
        addNotification('info', "Checking technician availability...");

        try {
            const availabilityCheck = await isTechnicianAvailable(technician, bookingDate, totalDuration);

            if (!availabilityCheck.available) {
                // CONFLICT: Show Waitlist UI with the specific message
                pendingWaitlistData = {
                    clientName: document.getElementById('appointment-client-name').value,
                    clientPhone: document.getElementById('appointment-phone').value,
                    services: serviceNames,
                    technician: technician,
                    date: proposedStartTime.split('T')[0]
                };

                // CRITICAL FIX: The detailed message from the availability function
                const conflictMessage = availabilityCheck.message || "This slot is busy. A conflict was detected.";
                
                if (waitlistMsg) waitlistMsg.textContent = conflictMessage;
                if (waitlistCta) waitlistCta.classList.remove('hidden');
                if (submitBtn) submitBtn.classList.add('hidden');
                
                // Show the specific conflict message in the notification area
                addNotification('warning', conflictMessage); 
                return; 

            } else {
                // AVAILABLE: Proceed to Save
                const appointmentData = {
                    name: document.getElementById('appointment-client-name').value,
                    phone: document.getElementById('appointment-phone').value,
                    email: document.getElementById('appointment-email').value,
                    people: document.getElementById('appointment-people').value,
                    bookingType: document.getElementById('appointment-booking-type').value,
                    services: serviceNames,
                    technician: technician,
                    notes: document.getElementById('appointment-notes').value,
                    appointmentTimestamp: Timestamp.fromDate(bookingDate)
                };

                const appointmentId = document.getElementById('edit-appointment-id').value;

                if (appointmentId) {
                    await updateDoc(doc(db, "appointments", appointmentId), appointmentData);
                    addNotification('success', "Appointment updated successfully!");
                } else {
                    const docRef = await addDoc(collection(db, "appointments"), appointmentData);
                    await sendBookingNotificationEmail(appointmentData);
                    if (appointmentData.email) {
                        await sendAppointmentReminderEmail(appointmentData, appointmentData.email);
                    }
                    addNotification('success', "Appointment saved successfully!");
                }
                closeAddAppointmentModal();
            }
        } catch (error) {
            // This catch block handles UNEXPECTED errors (network, Firebase failure, etc.)
            console.error("Error during admin booking submission:", error);
            
            // Show a generic error message for unexpected failures
            addNotification('error', "Could not verify schedule due to a system error. Please try again.");
            
            if (waitlistCta) waitlistCta.classList.add('hidden');
            if (submitBtn) submitBtn.classList.remove('hidden');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = document.getElementById('edit-appointment-id').value ? 'Update Appointment' : 'Save Appointment';
            }
        }
    });
}
// Located inside initLandingPage()
/**
 * Event listener for submitting the Landing Page Gift Card purchase form.
 * Handles two scenarios:
 * 1. Logged-in client: Creates gift cards directly, linked to their account.
 * 2. New/Anonymous user: Initiates account creation, stores purchase details
 * in sessionStorage, and relies on onAuthStateChanged to finalize the purchase
 * after account creation.
 */
purchaseForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // Prevent default form submission

    // --- 1. Get and Validate Form Inputs ---
    const amountInput = document.getElementById('gc-amount');
    const quantityInput = document.getElementById('gc-quantity');
    const amount = parseFloat(amountInput.value);
    const quantity = parseInt(quantityInput.value, 10);

    if (isNaN(amount) || amount <= 0 || isNaN(quantity) || quantity <= 0) {
        addNotification('error', 'Please enter a valid amount and quantity (at least 1).');
        return;
    }

    // --- 2. Update UI for Processing ---
    const submitBtn = document.getElementById('landing-gc-submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Processing...';

    // --- 3. Determine User State and Process Purchase ---
    let lastNumberUsed = globalLastUsedOnlineGcNumber; // Get the last used code number from global state

    try {
        // SCENARIO 1: User is already logged in (not anonymous)
        if (currentUserId && auth.currentUser && !auth.currentUser.isAnonymous) {
            const batch = writeBatch(db); // Use a batch for atomic writes
            const expiryDate = new Date();
            expiryDate.setMonth(expiryDate.getMonth() + 6); // Set a default expiry (e.g., 6 months)

            // Get buyer info directly (assuming these fields exist for logged-in user flow)
            const buyerInfo = {
                name: document.getElementById('gc-buyer-name').value || auth.currentUser.displayName || 'Unknown Buyer',
                email: document.getElementById('gc-buyer-email').value || auth.currentUser.email,
                phone: document.getElementById('gc-buyer-phone').value || 'N/A',
            };

            // Loop to create each gift card in the batch
            for (let i = 0; i < quantity; i++) {
                // Generate the next sequential code
                lastNumberUsed = Math.max(lastNumberUsed + 1, globalOnlineGcStartNumber); // Increment, ensuring minimum start number
                const newCode = String(lastNumberUsed).padStart(4, '0'); // Pad to 4 digits

                // Prepare card data
                const cardData = {
                    amount: amount,
                    balance: amount,
                    history: [], // Initialize transaction history
                    recipientName: document.getElementById('gc-show-to').checked ? document.getElementById('gc-to').value : buyerInfo.name,
                    senderName: document.getElementById('gc-show-from').checked ? document.getElementById('gc-from').value : buyerInfo.name,
                    backgroundUrl: document.getElementById('landing-gc-preview-card').style.backgroundImage.slice(5, -2).replace(/"/g, ""), // Get URL from preview
                    code: newCode,
                    status: 'Pending', // Cards start as Pending until payment confirmed
                    type: 'E-Gift',
                    createdBy: currentUserId, // Link card to the logged-in user
                    buyerInfo: buyerInfo,
                    createdAt: serverTimestamp(),
                    expiresAt: Timestamp.fromDate(expiryDate)
                };
                const newCardRef = doc(collection(db, "gift_cards")); // Create a reference for the new card
                batch.set(newCardRef, cardData); // Add card creation to the batch
            }

            // Update the last used code number in Firestore settings
            const settingsRef = doc(db, "settings", "ecommerce");
            batch.set(settingsRef, { lastUsedOnlineGcNumber: lastNumberUsed }, { merge: true }); // Add setting update to the batch

            // Commit all operations in the batch
            await batch.commit();
            addNotification('success', "Success! Your gift card request sent. Activation pending payment confirmation.");
            closePurchaseModal(); // Close the modal on success

        } else {
            // SCENARIO 2: New user or Anonymous user - Initiate signup/login flow
            const buyerName = document.getElementById('gc-buyer-name').value;
            const buyerPhone = document.getElementById('gc-buyer-phone').value;
            const buyerEmail = document.getElementById('gc-buyer-email').value;

            // Validate essential info for account creation
            if (!buyerName || !buyerPhone || !buyerEmail) {
                addNotification('error', 'Please fill out Name, Phone, and Email to create an account.');
                throw new Error("Missing buyer information for account creation."); // Throw error to be caught below
            }

            // Generate the required codes *before* attempting user creation
            const generatedCodes = [];
            let tempLastNumber = globalLastUsedOnlineGcNumber; // Use a temporary variable for this batch
            for (let i = 0; i < quantity; i++) {
                tempLastNumber = Math.max(tempLastNumber + 1, globalOnlineGcStartNumber);
                generatedCodes.push(String(tempLastNumber).padStart(4, '0'));
            }
            const finalLastNumber = tempLastNumber; // The last number used in this specific transaction

            // Store all necessary purchase details in sessionStorage for onAuthStateChanged
            const purchaseDetails = {
                buyerName,
                buyerPhone,
                buyerEmail,
                amount,
                quantity,
                recipientName: document.getElementById('gc-show-to').checked ? document.getElementById('gc-to').value : buyerName,
                senderName: document.getElementById('gc-show-from').checked ? document.getElementById('gc-from').value : buyerName,
                backgroundUrl: document.getElementById('landing-gc-preview-card').style.backgroundImage.slice(5, -2).replace(/"/g, ""),
                generatedCodes: generatedCodes, // Pass the generated codes
                finalLastNumber: finalLastNumber // Pass the last number used
            };
            sessionStorage.setItem('pendingGiftCardPurchase', JSON.stringify(purchaseDetails));

            // Attempt to create a new user account (using phone as a temporary password, adjust if needed)
            // The onAuthStateChanged listener will handle client document creation and gift card saving
            await createUserWithEmailAndPassword(auth, buyerEmail, buyerPhone);

            // Send confirmation email immediately (even before onAuthStateChanged runs)
            await sendGiftCardConfirmationEmail(purchaseDetails);
            closePurchaseModal(); // Close modal after initiating signup
        }
    } catch (error) {
        // --- 4. Handle Errors ---
        console.error("Error during gift card purchase:", error);
        if (error.code === 'auth/email-already-in-use') {
            addNotification('error', "Account exists. Please log in to purchase.");
            // Optionally, redirect to login modal here
        } else {
            addNotification('error', `Could not process request: ${error.message}`);
        }
        // Ensure purchase details are cleared from session if signup fails before onAuthStateChanged
        if (!auth.currentUser || auth.currentUser.isAnonymous) {
             sessionStorage.removeItem('pendingGiftCardPurchase');
        }
    } finally {
        // --- 5. Reset UI Regardless of Outcome ---
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Purchase Request';
        // Re-enable form fields only if they exist (safety check)
        const buyerNameInput = document.getElementById('gc-buyer-name');
        const buyerPhoneInput = document.getElementById('gc-buyer-phone');
        const buyerEmailInput = document.getElementById('gc-buyer-email');
        if (buyerNameInput) buyerNameInput.disabled = false;
        if (buyerPhoneInput) buyerPhoneInput.disabled = false;
        if (buyerEmailInput) buyerEmailInput.disabled = false;
    }
});

// --- GLOBAL MEMBERSHIP FUNCTIONS ---
const renderMembershipTiers = (tiers, containerId, isLoggedIn) => {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    tiers.forEach(tier => {
        const benefitsList = tier.benefits.split('\n').map(b => `<li class="flex items-start"><span class="text-green-500 mr-2">✔</span><span>${b}</span></li>`).join('');
        const buttonText = isLoggedIn ? 'Select Plan' : 'Become a Member';

        const tierEl = document.createElement('div');
        tierEl.className = 'border rounded-lg p-6 text-left flex flex-col hover:shadow-lg transition-shadow';
        tierEl.innerHTML = `
            <h3 class="text-2xl font-bold text-pink-700">${tier.name}</h3>
            <p class="text-4xl font-bold my-4">$${tier.price}<span class="text-lg font-normal text-gray-500">/month</span></p>
            <p class="text-sm text-gray-600 mb-4">${tier.discount}% off all additional services.</p>
            <ul class="space-y-2 text-gray-700 flex-grow">${benefitsList}</ul>
            <button data-tier-id="${tier.id}" class="purchase-membership-btn mt-6 w-full bg-pink-600 text-white font-bold py-3 rounded-lg hover:bg-pink-700">${buttonText}</button>
        `;
        container.appendChild(tierEl);
    });
};
// REPLACE your old initializeMembershipPurchaseForm function with this one

const initializeMembershipPurchaseForm = (selectedTierId, clientData = null) => {
    const form = document.getElementById('landing-membership-form');
    const tierSelect = document.getElementById('ms-tier-select');
    const amountInput = document.getElementById('ms-amount');
    const previewCard = document.getElementById('ms-preview-card');

    form.reset();

    // THIS BLOCK IS NOW CORRECTED TO HANDLE BOTH CASES
    if (clientData) {
        // For a logged-in client, pre-fill their info and hide the fields
        document.getElementById('ms-buyer-name').value = clientData.name;
        document.getElementById('ms-buyer-phone').value = clientData.phone || '';
        document.getElementById('ms-buyer-email').value = clientData.email;
        document.getElementById('membership-user-info-section').classList.add('hidden');
    } else {
        // For a new visitor, make sure the info fields are visible
        const userInfoSection = document.getElementById('membership-user-info-section');
        if (userInfoSection) {
            userInfoSection.classList.remove('hidden');
        }
    }

    tierSelect.innerHTML = '';

    allMembershipTiers.forEach(tier => {
        const isSelected = tier.id === selectedTierId ? 'selected' : '';
        tierSelect.innerHTML += `<option value="${tier.id}" ${isSelected}>${tier.name}</option>`;
    });

    const updatePreview = () => {
        const tierId = tierSelect.value;
        const tier = allMembershipTiers.find(t => t.id === tierId);
        const buyerName = document.getElementById('ms-buyer-name').value || '';

        if (tier) {
            amountInput.value = tier.price.toFixed(2);
            let cardStyle = 'from-gray-700 via-gray-900 to-black';
            if (tier.name.toLowerCase().includes('silver')) cardStyle = 'from-gray-400 via-gray-500 to-gray-600';
            if (tier.name.toLowerCase().includes('gold')) cardStyle = 'from-yellow-400 via-yellow-500 to-yellow-600';
            if (tier.name.toLowerCase().includes('platinum')) cardStyle = 'from-indigo-500 via-purple-600 to-pink-600';

            previewCard.className = `w-[350px] h-[200px] shadow-lg rounded-lg p-4 flex flex-col justify-between bg-gradient-to-br ${cardStyle} text-white transition-all duration-300`;
            previewCard.innerHTML = `
                 <div class="flex justify-between items-start">
        <div class="font-bold text-lg"><p>${tier.name}</p><p class="text-xs font-normal opacity-80">MEMBERSHIP</p></div>
        <p class="font-parisienne text-3xl">Nails Express</p>
    </div>
    <div class="flex justify-between items-end">
        <div class="text-left"><p class="text-xs opacity-80">MEMBER</p><p class="text-2xl font-semibold tracking-wider">${buyerName}</p></div>
        <div class="text-right text-xs opacity-80">
            <p>Member Since: ${new Date().toLocaleDateString()}</p>
            <p>Member ID: SAMPLE${Date.now().toString().slice(-4)}</p>
        </div>
    </div>
            `;
        }
    };

    tierSelect.addEventListener('change', updatePreview);
    document.getElementById('ms-buyer-name').addEventListener('input', updatePreview);
    updatePreview();
};

const openMembershipPurchaseModal = (tierId, clientData = null) => {
    initializeMembershipPurchaseForm(tierId, clientData);
    getDoc(doc(db, "settings", "paymentGuide")).then(docSnap => {
        const paymentGuideDisplay = document.getElementById('membership-payment-guide');
        if (docSnap.exists() && docSnap.data().text) {
            paymentGuideDisplay.innerHTML = `<p class="font-semibold mb-2">How to Pay:</p><p>${docSnap.data().text.replace(/\n/g, '<br>')}</p>`;
        } else {
            paymentGuideDisplay.textContent = 'Please contact the salon to complete your payment.';
        }
    });
    document.getElementById('membership-purchase-modal').classList.remove('hidden');
};

const closeMembershipPurchaseModal = () => {
    document.getElementById('membership-purchase-modal').classList.add('hidden');
};

const renderClientMembershipsTable = (members) => {
    const tbody = document.querySelector('#client-memberships-table tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    members.forEach(member => {
        // --- NEW: Calculate Total Spent and Total Reward from history ---
        // Accessing the rewardHistory array
        const history = member.membership?.rewardHistory || [];
        
        // Summing up all entries where type is 'reward'
        const totalRewardEarned = history
            .filter(item => item.type === 'reward')
            .reduce((sum, item) => sum + (item.rewardAmount || 0), 0);
            
        // Summing up all entries where type is 'spending' (cash payments)
        const totalCashSpent = history
            .filter(item => item.type === 'spending')
            .reduce((sum, item) => sum + (item.amount || 0), 0);
        // --- END NEW CALCULATION ---

        const row = tbody.insertRow();
        const status = member.membership.status || 'Active';
        const statusColor = status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800';

        // Action buttons logic (including the reward icon)
        let actionButtons = `
            <button data-id="${member.id}" class="reward-tracking-btn text-green-500 hover:text-green-700" title="Manage Cash Reward">
                <i class="fas fa-dollar-sign text-lg"></i>
            </button>
            <button data-id="${member.id}" class="print-membership-card-btn text-gray-500 hover:text-gray-700" title="View/Print Card">
                <i class="fas fa-id-card text-lg"></i>
            </button>
            <button data-id="${member.id}" class="delete-membership-record-btn text-red-500">
                <i class="fas fa-trash"></i>
            </button>
        `;
        if (status === 'Pending') {
            actionButtons = `<button data-id="${member.id}" class="activate-membership-btn text-green-500 mr-2"><i class="fas fa-check-circle"></i></button>` + actionButtons;
        }

        let startDate = 'Invalid Date';
        if (member.membership.startDate && typeof member.membership.startDate.toDate === 'function') {
            startDate = member.membership.startDate.toDate().toLocaleDateString();
        }
        const memberId = member.id ? member.id.split('').map(char => char.charCodeAt(0)).join('').substring(0, 6) : 'N/A';
        row.innerHTML = `
            <td class="px-6 py-4">${member.name}</td>
            <td class="px-6 py-4">${memberId}</td>
            <td class="px-6 py-4">${member.membership.tierName}</td>
            <td class="px-6 py-4 font-medium text-pink-600">$${totalCashSpent.toFixed(2)}</td>
            <td class="px-6 py-4 font-medium text-green-600">$${totalRewardEarned.toFixed(2)}</td>
            <td class="px-6 py-4">${startDate}</td>
            <td class="px-6 py-4"><span class="px-2 py-1 text-xs font-semibold rounded-full ${statusColor}">${status}</span></td>
            <td class="px-6 py-4 text-center space-x-2">${actionButtons}</td>
        `;
    });
};


// **** PASTE THESE TWO COMPLETE FUNCTIONS in place of your old initClientDashboard ****
// REPLACE your old renderClientMembership function with this new one:
const renderClientMembership = (clientData, clientId) => {
    const container = document.getElementById('client-membership-display');
    if (!container) return;

    if (clientData.membership && allMembershipTiers.length > 0) {
        const tier = allMembershipTiers.find(t => t.id === clientData.membership.tierId);
        if (tier) {
            let startDate = new Date().toLocaleDateString();
            if (clientData.membership.startDate && typeof clientData.membership.startDate.toDate === 'function') {
                startDate = clientData.membership.startDate.toDate().toLocaleDateString();
            }

            const memberId = clientId ? clientId.split('').map(char => char.charCodeAt(0)).join('').substring(0, 6) : 'N/A';

            const benefitsList = tier.benefits.split('\n').map(b => `<li class="flex items-start"><span class="text-green-500 mr-2">✔</span><span>${b}</span></li>`).join('');
            const status = clientData.membership.status || 'Active';
            const statusColor = status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800';

            let cardStyle = 'from-gray-700 via-gray-900 to-black';
            if (tier.name.toLowerCase().includes('silver')) cardStyle = 'from-gray-400 via-gray-500 to-gray-600';
            if (tier.name.toLowerCase().includes('gold')) cardStyle = 'from-yellow-400 via-yellow-500 to-yellow-600';
            if (tier.name.toLowerCase().includes('platinum')) cardStyle = 'from-indigo-500 via-purple-600 to-pink-600';

            // UPDATED: Changed grid-cols-3 to grid-cols-2 and removed col-span-2
            container.innerHTML = `
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    <div class="bg-white p-6 rounded-lg shadow-lg">
                        <div class="flex justify-between items-start mb-4">
                            <div>
                                <h3 class="text-2xl font-bold text-pink-700 flex items-end gap-3">
                                    <span>${tier.name} Tier</span>
                                    <span class="text-xl font-bold text-gray-600">$${tier.price}/month</span>
                                </h3>
                                <p class="text-sm text-gray-500">Member since ${startDate}</p>
                            </div>
                            <span class="px-3 py-1 text-sm font-semibold rounded-full ${statusColor}">${status}</span>
                        </div>
                        <div>
                            <h4 class="font-semibold text-gray-800 mb-2">Your Benefits:</h4>
                            <ul class="space-y-2 text-gray-700">${benefitsList}</ul>
                        </div>
                        ${status === 'Pending' ? '<p class="mt-4 text-center text-sm bg-yellow-100 text-yellow-800 p-3 rounded-lg">Your membership is pending approval. Please contact the salon to complete payment and activate your benefits.</p>' : ''}
                    </div>
                    <div class="space-y-3">
                        <div class="w-full h-[228px] shadow-lg rounded-lg p-4 flex flex-col justify-between bg-gradient-to-br ${cardStyle} text-white" style="text-shadow: 1px 1px 3px rgba(0,0,0,0.4);">
                            <div class="flex justify-between items-start">
                                <div class="font-bold text-lg"><p>${tier.name}</p><p class="text-xs font-normal opacity-80">MEMBERSHIP</p></div>
                                <p class="font-parisienne text-3xl">Nails Express</p>
                            </div>
                            <div class="text-center">
                                <p class="font-bold text-lg">${tier.discount}% off all additional services.</p>
                            </div>
                            <div class="flex justify-between items-end">
                                <div class="text-left"><p class="text-xs opacity-80">MEMBER</p><p class="text-xl font-semibold tracking-wider">${clientData.name}</p></div>
                                <div class="text-right text-xs opacity-80">
                                    <p>Since: ${startDate}</p>
                                    <p>ID: ${memberId}</p>
                                </div>
                            </div>
                        </div>
                        <div class="flex justify-between items-center pt-2 px-2">
                            <span class="text-sm text-gray-500">Your digital card</span>
                            <div class="flex gap-4">
                                <button data-client-id="${clientId}" class="download-membership-btn text-gray-500 hover:text-blue-600 text-xl" title="Download/Print"><i class="fas fa-download"></i></button>
                                <button data-client-id="${clientId}" class="share-membership-btn text-gray-500 hover:text-pink-600 text-xl" title="Share"><i class="fas fa-share-alt"></i></button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } else {
            container.innerHTML = '<p class="text-gray-500 text-center col-span-full">Your membership tier could not be found. Please contact the salon.</p>';
        }
    } else {
        container.innerHTML = `
            <div class="text-center p-8 bg-gray-50 rounded-lg">
                <h3 class="text-xl font-semibold text-gray-700">You are not a member yet.</h3>
                <p class="text-gray-500 mt-2 mb-4">Join our VIP program to enjoy exclusive discounts and benefits!</p>
                <button class="join-membership-btn bg-pink-600 text-white font-semibold py-2 px-5 rounded-lg hover:bg-pink-700">Join Our Membership</button>
            </div>
        `;
    }
};

// REPLACE your old initClientDashboard function with this corrected one:
async function initClientDashboard(clientId, clientData) {
    await getDocs(collection(db, "services")).then(servicesSnapshot => {
        servicesData = {};
        servicesSnapshot.forEach(doc => {
            servicesData[doc.id] = doc.data().items;
        });
    });

    const featuresDoc = await getDoc(doc(db, "settings", "features"));
    const features = featuresDoc.exists() ? featuresDoc.data() : { 
        showGiftCards: true, 
        showMemberships: true, 
        showRoyaltyCard: true 
    };

    document.getElementById('client-welcome-name').textContent = `Welcome back, ${clientData.name}!`;
    document.getElementById('client-sign-out-btn').addEventListener('click', () => signOut(auth));

    const openPurchaseModalForClient = (client) => {
        const purchaseModal = document.getElementById('gift-card-purchase-modal');
        const userInfoSection = document.getElementById('gc-user-info-section');
        initializeLandingGiftCardDesigner();
        if (userInfoSection) {
            userInfoSection.classList.add('hidden');
        }
        document.getElementById('gc-buyer-name').value = client.name;
        document.getElementById('gc-buyer-name').readOnly = true;
        document.getElementById('gc-buyer-phone').value = client.phone || '';
        document.getElementById('gc-buyer-phone').readOnly = true;
        document.getElementById('gc-buyer-email').value = clientData.email;
        document.getElementById('gc-buyer-email').readOnly = true;
        purchaseModal.classList.remove('hidden');
    };

const nameInput = document.getElementById('client-settings-name');
    if (nameInput) {
        nameInput.value = clientData.name || '';
    }

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
                <div class="w-full h-[200px] shadow-lg rounded-lg p-4 flex flex-col justify-between bg-cover bg-center text-white" style="background-image: url('${card.backgroundUrl}'); text-shadow: 1px 1px 3px rgba(0,0,0,0.6);"><div class="flex justify-between items-start"><img src="https://placehold.co/100x100/d63384/FFFFFF?text=NE" class="w-12 h-12 rounded-full border-2 border-white" /><div class="text-right"><p class="font-parisienne text-3xl">Gift Card</p><p class="text-xs font-semibold tracking-wider">Nails Express</p></div></div><div class="text-center"><p class="text-5xl font-bold">$${card.balance.toFixed(2)}</p></div><div class="text-xs"><div class="flex justify-between font-semibold"><span>FOR: <span class="font-normal">${card.recipientName}</span></span><span>FROM: <span class="font-normal">${card.senderName}</span></span></div><p class="mt-2 text-center font-mono tracking-widest text-sm">${card.code}</p><p class="mt-1 text-center text-[10px] opacity-80" style="display:${expiryText ? 'block' : 'none'}">${expiryText}</p></div></div><div class="flex justify-between items-center pt-2"><span class="px-2 py-1 text-xs font-semibold rounded-full ${card.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">${card.status}</span><div class="flex gap-2"><button data-card-id="${card.id}" class="download-card-btn text-gray-500 hover:text-blue-600" title="Download/Print"><i class="fas fa-download"></i></button><button data-card-id="${card.id}" class="share-card-btn text-gray-500 hover:text-pink-600" title="Share"><i class="fas fa-share-alt"></i></button></div></div>
            `;
            container.appendChild(cardEl);
        });
    };

    renderClientMembership(clientData, clientId);
    
    const renderClientRoyaltyCard = (clientData) => {
        const container = document.getElementById('royalty-card-content');
        if (!container) return;

        if (!clientData.royaltyCard) {
            container.innerHTML = `
                <div class="text-center p-8 bg-gray-50 rounded-lg">
                    <h3 class="text-xl font-semibold text-gray-700">You haven't joined the Royalty Program yet.</h3>
                    <p class="text-gray-500 mt-2 mb-4">Join for free to earn rewards with every visit!</p>
                </div>`;
            return;
        }
        
        const visits = clientData.royaltyCard.visits || 0;
        const visitsNeeded = royaltySettings.visitsNeeded;
        const rewardText = royaltySettings.rewardDescription;
        
        let stampsHTML = '';
        for (let i = 1; i <= visitsNeeded; i++) {
            const isStamped = i <= visits;
            stampsHTML += `<div class="stamp ${isStamped ? 'stamped' : ''}">${isStamped ? '<i class="fas fa-star"></i>' : i}</div>`;
        }

        const isRewardReady = visits >= visitsNeeded;
        const progressText = isRewardReady ? `Congrats! Your reward is ready: ${rewardText}!` : `${visitsNeeded - visits} more visits until your reward!`;

        container.innerHTML = `
            <div class="royalty-card-container">
                <h3 class="text-xl font-semibold text-gray-700 mb-4 text-center">Your Royalty Card</h3>
                <div class="royalty-card">
                    <div class="royalty-card-header">
                        <p class="font-parisienne text-3xl">Nails Express</p>
                        <p class="text-xs font-semibold tracking-wider">ROYALTY PROGRAM</p>
                    </div>
                    <div class="stamp-grid">
                        ${stampsHTML}
                    </div>
                    <div class="royalty-card-footer">
                        <p>${progressText}</p>
                    </div>
                </div>
            </div>
        `;
    };

// REPLACE your old setupClientNav function with this one
const setupClientNav = (featureSettings) => {
    const navContainer = document.getElementById('client-top-nav');
    const contentSections = document.querySelectorAll('.client-tab-content');
    
    // Add "Dashboard" to the beginning of the nav items
    let navItems = [
        { id: 'client-overview', text: 'Dashboard' },
        { id: 'appointments', text: 'Appointments' },
        { id: 'favorites', text: 'My Favorites' }
    ];

    if (featureSettings.showGiftCards) {
        navItems.push({ id: 'gift-cards', text: 'My Gift Cards' });
    }
    if (featureSettings.showMemberships) {
        navItems.push({ id: 'membership', text: 'My Membership' });
    }
    if (featureSettings.showRoyaltyCard) {
        navItems.push({ id: 'royalty-card', text: 'Royalty Card' });
    }
    navItems.push({ id: 'account-settings', text: 'Account Settings' });
    
    contentSections.forEach(content => content.classList.add('hidden'));

    navContainer.innerHTML = navItems.map(item => 
        `<button class="top-nav-btn" data-target="${item.id}-content">${item.text}</button>`
    ).join('');
    
    const navButtons = navContainer.querySelectorAll('.top-nav-btn');

    navContainer.addEventListener('click', (e) => {
        const button = e.target.closest('.top-nav-btn');
        if (!button) return;

        navButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        contentSections.forEach(content => content.classList.add('hidden'));
        const targetId = button.dataset.target;
        const targetContent = document.getElementById(targetId);
        if (targetContent) {
            targetContent.classList.remove('hidden');
        }
    });

    if (navButtons.length > 0) {
        navButtons[0].click(); // Click the first button (Dashboard) by default
    }
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

// PASTE these two new functions inside initClientDashboard

const renderClientDashboardCharts = (history, appointments) => {
    // 1. Calculate KPIs for the cards
    document.getElementById('client-total-visits').textContent = history.length;
    document.getElementById('client-last-visit').textContent = history.length > 0 ? history[0].checkOutTimestamp.toDate().toLocaleDateString() : 'N/A';

    const upcomingAppointments = appointments.filter(a => a.appointmentTimestamp.toDate() > new Date()).sort((a,b) => a.appointmentTimestamp.seconds - b.appointmentTimestamp.seconds);
    document.getElementById('client-next-appt').textContent = upcomingAppointments.length > 0 ? upcomingAppointments[0].appointmentTimestamp.toDate().toLocaleDateString() : 'None';

    // 2. Process data for Spending Chart
    const spendingByMonth = {};
    let totalSpent = 0;
    const serviceCounts = {};

    history.forEach(visit => {
        const visitDate = visit.checkOutTimestamp.toDate();
        const monthKey = `${visitDate.getFullYear()}-${String(visitDate.getMonth() + 1).padStart(2, '0')}`;
        
        let visitTotal = 0;
        const serviceNames = visit.services.split(', ').map(s => s.replace(/\s*\$\d+/, '').trim());

        serviceNames.forEach(name => {
            serviceCounts[name] = (serviceCounts[name] || 0) + 1;
            const servicePrice = allServicesList.find(s => s.name === name)?.price || 0;
            visitTotal += servicePrice;
        });
        
        spendingByMonth[monthKey] = (spendingByMonth[monthKey] || 0) + visitTotal;
        totalSpent += visitTotal;
    });

    document.getElementById('client-total-spent').textContent = `$${totalSpent.toFixed(2)}`;

    const sortedMonths = Object.keys(spendingByMonth).sort();
    const spendingLabels = sortedMonths.map(key => new Date(key + '-02').toLocaleString('default', { month: 'short', year: '2-digit' }));
    const spendingData = sortedMonths.map(key => spendingByMonth[key]);

    // 3. Render Spending Chart
    const spendingCtx = document.getElementById('client-spending-chart')?.getContext('2d');
    if (spendingCtx) {
        const spendingConfig = {
            labels: spendingLabels,
            datasets: [{
                label: 'Total Spent',
                data: spendingData,
                backgroundColor: 'rgba(219, 39, 119, 0.1)',
                borderColor: 'rgba(219, 39, 119, 1)',
                borderWidth: 2,
                tension: 0.2,
                fill: true
            }]
        };
        clientSpendingChart = initializeChart(clientSpendingChart, spendingCtx, 'line', spendingConfig, { responsive: true, maintainAspectRatio: false });
    }

    // 4. Process and Render Services Chart
    const sortedServices = Object.entries(serviceCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const serviceLabels = sortedServices.map(entry => entry[0]);
    const serviceData = sortedServices.map(entry => entry[1]);

    const servicesCtx = document.getElementById('client-services-chart')?.getContext('2d');
    if (servicesCtx) {
        const servicesConfig = {
            labels: serviceLabels,
            datasets: [{
                label: 'Service Count',
                data: serviceData,
                backgroundColor: colorPalette.map(c => c.bg),
                borderColor: colorPalette.map(c => c.border),
                borderWidth: 1
            }]
        };
        clientServicesChart = initializeChart(clientServicesChart, servicesCtx, 'doughnut', servicesConfig, { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } } });
    }
};

    const renderClientHistory = (history) => {
        const container = document.getElementById('client-appointment-history');
        if (!container) return;

        container.innerHTML = '';
        if (history.length === 0) {
            container.innerHTML = '<p class="text-gray-500">You have no past appointments.</p>';
            return;
        }
        history.forEach(visit => {
            const el = document.createElement('div');
            el.className = 'bg-white p-4 rounded-lg shadow';
            el.innerHTML = `
                <div class="flex justify-between items-start">
                    <div>
                        <p class="font-bold">${new Date(visit.checkOutTimestamp.seconds * 1000).toLocaleDateString()}</p>
                        <p>${visit.services}</p>
                        <p class="text-sm text-gray-600">With: ${visit.technician}</p>
                        ${visit.colorCode ? `<p class="text-sm text-gray-600">Color: ${visit.colorCode}</p>` : ''}
                    </div>
                    <div>
                        ${!visit.rating ? `<button data-id="${visit.id}" class="leave-review-btn text-sm bg-pink-100 text-pink-700 font-semibold py-1 px-3 rounded-full hover:bg-pink-200">Leave Review</button>` : `<div class="text-yellow-400">${'★'.repeat(visit.rating)}${'☆'.repeat(5-visit.rating)}</div>`}
                    </div>
                </div>
            `;
            container.appendChild(el);
        });
    };

const reviewModal = document.getElementById('review-modal');
    const reviewForm = document.getElementById('review-form');
    const starRatingContainer = document.getElementById('star-rating-container');
    
    document.getElementById('client-appointment-history').addEventListener('click', (e) => {
        const btn = e.target.closest('.leave-review-btn');
        if (btn) {
            reviewForm.reset();
            starRatingContainer.querySelectorAll('i').forEach(s => s.classList.remove('text-yellow-400'));
            document.getElementById('review-finished-id').value = btn.dataset.id;
            reviewModal.classList.remove('hidden');
        }
    });
    
    document.getElementById('close-review-modal-btn').addEventListener('click', () => reviewModal.classList.add('hidden'));

    starRatingContainer.addEventListener('click', e => {
        const star = e.target.closest('.fa-star');
        if (!star) return;
        const rating = parseInt(star.dataset.value, 10);
        document.getElementById('rating-value').value = rating;
        starRatingContainer.querySelectorAll('i').forEach((s, i) => {
            s.classList.toggle('text-yellow-400', i < rating);
        });
    });

    reviewForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const finishedId = document.getElementById('review-finished-id').value;
        const rating = parseInt(document.getElementById('rating-value').value, 10);
        const reviewText = document.getElementById('review-text').value;

        if (!finishedId || !rating) {
            alert("Please provide a star rating.");
            return;
        }

        try {
            await updateDoc(doc(db, "finished_clients", finishedId), {
                rating: rating,
                review: reviewText,
                isFeatured: false
            });
            reviewModal.classList.add('hidden');
            alert("Thank you for your review!");
        } catch (error) {
            console.error("Error submitting review:", error);
            alert("Could not submit your review.");
        }
    });


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
    
// Inside initClientDashboard
onSnapshot(query(collection(db, "appointments"), where("name", "==", clientData.name)), (snapshot) => {
    const appointments = snapshot.docs.map(doc => ({...doc.data(), id: doc.id}));
    renderClientAppointments(appointments);

    // ADD THIS LINE
    if (allFinishedClients.length > 0) renderClientDashboardCharts(allFinishedClients, appointments);
});

    onSnapshot(query(collection(db, "finished_clients"), where("name", "==", clientData.name)), (snapshot) => {
        const history = snapshot.docs.map(doc => {
            const data = doc.data();
            const servicesRaw = data.services;
            const servicesString = Array.isArray(servicesRaw) ? servicesRaw.join(', ') : (servicesRaw || '');
            
            return {
                id: doc.id,
                ...data,
                services: servicesString
            };
        }).sort((a, b) => b.checkOutTimestamp.seconds - a.checkOutTimestamp.seconds);

        allFinishedClients = history;
        renderClientHistory(history);
        calculateAndRenderFavorites(history);
        // ADD THIS LINE - fetch current appointments to pass to the function
    const currentAppointments = allAppointments.filter(a => a.name === clientData.name);
    renderClientDashboardCharts(history, currentAppointments);

    }, (error) => {
        console.error("Error fetching client history:", error);
        const container = document.getElementById('client-appointment-history');
        if (container) {
            container.innerHTML = '<p class="text-red-500">Could not load appointment history due to a permission issue.</p>';
        }
    });

    let allClientGiftCards = [];
    onSnapshot(query(collection(db, "gift_cards"), where("createdBy", "==", clientId), orderBy("createdAt", "desc")), (snapshot) => {
        allClientGiftCards = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        renderClientGiftCards(allClientGiftCards);
    });

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

    clientDashboardContent.addEventListener('click', (e) => {
        const joinBtn = e.target.closest('.join-membership-btn');
        if (joinBtn) {
            openMembershipPurchaseModal(null, clientData);
        }
    });

    document.getElementById('client-membership-display').addEventListener('click', (e) => {
        const downloadBtn = e.target.closest('.download-membership-btn');
        const shareBtn = e.target.closest('.share-membership-btn');

        if (downloadBtn) {
            const tier = allMembershipTiers.find(t => t.id === clientData.membership.tierId);
            if (clientData && tier) {
                openMembershipCardForPrint({ ...clientData, id: clientId }, tier);
            }
        }
        if (shareBtn) {
            const tier = allMembershipTiers.find(t => t.id === clientData.membership.tierId);
            if (navigator.share && clientData && tier) {
                navigator.share({
                    title: 'Nails Express VIP Membership',
                    text: `Check out my ${tier.name} VIP Membership at Nails Express!`,
                    url: window.location.href,
                }).catch(console.error);
            } else {
                alert('Sharing is not supported on this browser. Try the download button!');
            }
        }
    });

    document.getElementById('client-book-new-btn').addEventListener('click', () => {
        openAddAppointmentModal(getLocalDateString(), clientData);
    });

    document.getElementById('client-buy-gift-card-btn').addEventListener('click', () => {
        openPurchaseModalForClient(clientData);
    });
    
    getDoc(doc(db, "settings", "royaltyProgram")).then(docSnap => {
        if (docSnap.exists() && docSnap.data().visitsNeeded) {
            royaltySettings = docSnap.data();
        }
        renderClientRoyaltyCard(clientData);
    });

    // Add this logic inside your initClientApp function:
// Find this block in your script.js:
document.getElementById('client-settings-save-btn').addEventListener('click', async () => {
    
    const newName = document.getElementById('client-settings-name').value.trim();
    
    if (!newName) {
        addNotification('error', 'Name cannot be empty.');
        return;
    }

    // *** FIX: Get the Client ID reliably from Firebase Auth ***
    const user = auth.currentUser;
    if (!user) {
        addNotification('error', 'Authentication failed. Please log in again.');
        return;
    }
    // Use the Auth UID as the document ID
    const currentClientDocId = user.uid; 
    
    // Fallback: If your client documents are NOT keyed by the Auth UID, 
    // try to get the ID from a global variable or local storage, but prioritize user.uid.
    // const currentClientDocId = localStorage.getItem('currentClientDocId') || user.uid; 
    
    if (!currentClientDocId) {
        addNotification('error', 'Client ID not found. Please log in again.');
        return;
    }
    
    try {
        const clientDocRef = doc(db, 'clients', currentClientDocId);
        
        await updateDoc(clientDocRef, {
            name: newName,
            lastUpdated: serverTimestamp()
        });
        
        // Update the input field immediately to reflect the change
        document.getElementById('client-settings-name').value = newName; 
        addNotification('success', 'Name updated successfully!');
        
    } catch (error) {
        console.error('Error updating client name:', error);
        addNotification('error', 'Failed to update name. Please check Firestore rules and try again.');
    }
});
    // --- NEW EVENT LISTENERS FOR ACCOUNT SETTINGS ---
    const changeEmailForm = document.getElementById('client-change-email-form');
    if (changeEmailForm) {
        changeEmailForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newEmail = document.getElementById('client-new-email').value;
            const user = auth.currentUser;
            if (!user) return;

            const password = prompt("For your security, please enter your current password to change your email.");
            if (!password) return;

            try {
                const credential = EmailAuthProvider.credential(user.email, password);
                await reauthenticateWithCredential(user, credential);
                await updateEmail(user, newEmail);
                await updateDoc(doc(db, "clients", user.uid), { email: newEmail });
                alert("Your email has been updated successfully!");
                changeEmailForm.reset();
            } catch (error) {
                console.error("Error updating email:", error);
                alert(`Could not update email. Error: ${error.message}`);
            }
        });
    }

    const changePasswordForm = document.getElementById('client-change-password-form');
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const currentPassword = document.getElementById('client-current-password').value;
            const newPassword = document.getElementById('client-new-password').value;
            const user = auth.currentUser;
            if (!user) return;

            try {
                const credential = EmailAuthProvider.credential(user.email, currentPassword);
                await reauthenticateWithCredential(user, credential);
                await updatePassword(user, newPassword);
                alert("Your password has been updated successfully!");
                changePasswordForm.reset();
            } catch (error) {
                console.error("Error updating password:", error);
                alert(`Could not update password. Error: ${error.message}`);
            }
        });
    }

    setupClientNav(features);
}

// REPLACE your old 'landing-membership-form' submit listener with this one

document.getElementById('landing-membership-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('landing-ms-submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Processing...';

    const tierId = document.getElementById('ms-tier-select').value;
    const tier = allMembershipTiers.find(t => t.id === tierId);

    if (!tier) {
        addNotification('error' , "Please select a valid membership tier.");
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Membership Request';
        return;
    }

    try {
        // SCENARIO 1: USER IS ALREADY LOGGED IN
        if (currentUserId && auth.currentUser && !auth.currentUser.isAnonymous) {
            const clientDocRef = doc(db, "clients", currentUserId);
            const membershipData = {
                tierId: tier.id,
                tierName: tier.name,
                startDate: serverTimestamp(),
                status: 'Pending'
            };

            await updateDoc(clientDocRef, {
                membership: membershipData
            });

            addNotification('success' , "Success! Your membership request has been sent. It will be activated once payment is confirmed.");
            closeMembershipPurchaseModal();

        } else {
            // SCENARIO 2: NEW VISITOR
            const name = document.getElementById('ms-buyer-name').value;
            const email = document.getElementById('ms-buyer-email').value;
            const phone = document.getElementById('ms-buyer-phone').value;

            if (!name || !email || !phone) {
                addNotification('error' , "Please fill out all your information to create an account.");
                throw new Error("Missing buyer info");
            }

            sessionStorage.setItem('pendingMembershipPurchase', tierId);
            sessionStorage.setItem('signupDetails', JSON.stringify({ name, email, phone }));
            await createUserWithEmailAndPassword(auth, email, phone);
            await sendMembershipConfirmationEmail({ name, email, phone, tierName: tier.name });
            closeMembershipPurchaseModal();
            // onAuthStateChanged will handle the rest
        }

    } catch (error) {
        if (error.code === 'auth/email-already-in-use') {
            addNotification('error' , "An account with this email already exists. Please log in to purchase a membership.");
        } else {
            console.error("Error during membership purchase:", error);
            alert(`Could not process your request. Error: ${error.message}`);
        }
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Membership Request';
    }
});

// --- LANDING PAGE SCRIPT ---
async function initLandingPage() {
    // --- E-COMMERCE SHOP LOGIC (LANDING PAGE) ---
    const shopContainer = document.getElementById('shop-products-container');
    const cartButton = document.getElementById('cart-button');
    const cartModal = document.getElementById('cart-modal');
    const closeCartModalBtn = document.getElementById('close-cart-modal-btn');
    const cartItemsContainer = document.getElementById('cart-items-container');
    const cartBadge = document.getElementById('cart-badge');
    const cartSubtotalEl = document.getElementById('cart-subtotal');
const cartShippingFeeEl = document.getElementById('cart-shipping-fee');
const cartTaxRateEl = document.getElementById('cart-tax-rate');
const cartTaxEl = document.getElementById('cart-tax');
const cartGrandTotalEl = document.getElementById('cart-grand-total');
    const checkoutBtn = document.getElementById('checkout-btn');
    const confirmationModal = document.getElementById('order-confirmation-modal');
    const closeConfirmationBtn = document.getElementById('close-confirmation-modal-btn');

    const renderShopProducts = () => {
        if (!shopContainer) return;
        shopContainer.innerHTML = '';
        allShopProducts.forEach(product => {
            const isOutOfStock = product.stock <= 0;
            const card = document.createElement('div');
            card.className = `product-card bg-white rounded-lg shadow-md overflow-hidden relative ${isOutOfStock ? 'out-of-stock' : ''}`;
            const firstImage = (product.imageURLs && product.imageURLs[0]) 
    ? product.imageURLs[0] 
    : 'https://placehold.co/300x300/f8bbd0/ffffff?text=Nail+Product';

card.innerHTML = `
    <img src="${firstImage}" alt="${product.name}" class="w-full h-48 object-cover">
    <div class="p-4">
        <h3 class="font-bold text-lg truncate">${product.name}</h3>
        <p class="text-sm text-gray-500 h-10 overflow-hidden">${product.description}</p>
        <div class="flex justify-between items-center mt-4">
            <span class="text-xl font-bold text-pink-600">$${product.price.toFixed(2)}</span>
            <button data-id="${product.id}" class="add-to-cart-btn bg-pink-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-pink-700 disabled:bg-gray-400" ${isOutOfStock ? 'disabled' : ''}>
                <i class="fas fa-cart-plus mr-2"></i>Add
            </button>
        </div>
    </div>
    <div class="out-of-stock-overlay absolute inset-0 bg-white/70 flex items-center justify-center">
        <span class="font-bold text-gray-500 bg-gray-200 px-4 py-2 rounded-full">Out of Stock</span>
    </div>
`;
            shopContainer.appendChild(card);
        });
    };

    const updateCartBadge = () => {
        const totalItems = shoppingCart.reduce((sum, item) => sum + item.quantity, 0);
        if (totalItems > 0) {
            cartBadge.textContent = totalItems;
            cartBadge.classList.remove('hidden');
        } else {
            cartBadge.classList.add('hidden');
        }
    };

const renderCart = () => {
    let cartHtml = '';
    let totalItems = 0;

    // --- 1. RENDER CART ITEMS AND CALCULATE SUB-TOTAL ---
    
    // Calculate subtotal from cart contents (before fees)
    let subtotal = shoppingCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    if (shoppingCart.length === 0) {
        cartHtml = '<p class="text-center text-gray-500 py-8">Your cart is empty.</p>';
        checkoutBtn.disabled = true;
        checkoutBtn.classList.add('opacity-50', 'cursor-not-allowed');
    } else {
        shoppingCart.forEach(item => {
cartHtml += `
                <div class="flex justify-between items-center py-3 border-b border-gray-100">
                    <div class="flex items-center space-x-4 flex-grow">
                        <span class="text-gray-800 font-medium">${item.name}</span>
                    </div>
                    
                    <div class="flex items-center space-x-3 min-w-[150px]">
                        
                        <div class="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                            <button onclick="updateCartQuantity('${item.id}', ${item.quantity - 1})" 
                                class="p-2 text-pink-600 hover:bg-gray-100 disabled:opacity-50"
                                ${item.quantity <= 1 ? 'disabled' : ''}>
                                <i class="fas fa-minus text-xs"></i>
                            </button>
                            
                            <input type="number" 
                                value="${item.quantity}" 
                                min="1" 
                                onchange="updateCartQuantity('${item.id}', parseInt(this.value))" 
                                class="w-10 text-center border-none focus:ring-0 p-0 text-sm"/>
                            
                            <button onclick="updateCartQuantity('${item.id}', ${item.quantity + 1})" 
                                class="p-2 text-pink-600 hover:bg-gray-100">
                                <i class="fas fa-plus text-xs"></i>
                            </button>
                        </div>
                        <span class="text-gray-800 font-semibold w-[60px] text-right">$${(item.price * item.quantity).toFixed(2)}</span>
                        
                        <button onclick="removeFromCart('${item.id}')" 
                                class="text-red-500 hover:text-red-700 transition duration-150 p-1">
                            <i class="fas fa-trash-alt text-sm"></i>
                        </button>
                    </div>
                </div>
            `;
            totalItems += item.quantity;
        });
        checkoutBtn.disabled = false;
        checkoutBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    }

    // Update the cart items container and badge
    cartItemsContainer.innerHTML = cartHtml;
    updateCartBadge(totalItems);
    
    // --- 2. CALCULATE AND DISPLAY FEES & TOTAL ---

    // Calculate Tax and Shipping
    // Shipping is only applied if the cart is not empty
    const shippingFee = shoppingCart.length > 0 ? globalShippingFee : 0; 

    // Tax is applied to the subtotal
    const taxAmount = subtotal * globalTaxRate;

    // Calculate Grand Total
    const grandTotal = subtotal + shippingFee + taxAmount;

    // 4. Update the HTML elements (Display)
    
    // Update Subtotal element (already existed)
    cartSubtotalEl.textContent = `$${subtotal.toFixed(2)}`;

    // NEW: Update Tax and Shipping elements
    cartShippingFeeEl.textContent = `$${shippingFee.toFixed(2)}`;
    
    // Display the tax rate as a percentage with 2 decimal places
    cartTaxRateEl.textContent = `${(globalTaxRate * 100).toFixed(2)}%`; 
    
    cartTaxEl.textContent = `$${taxAmount.toFixed(2)}`;
    
    // Update Grand Total element
    cartGrandTotalEl.textContent = `$${grandTotal.toFixed(2)}`;
};
    const addToCart = (productId) => {
        const product = allShopProducts.find(p => p.id === productId);
        if (!product) return;

        const existingItem = shoppingCart.find(item => item.id === productId);
        if (existingItem) {
            if(existingItem.quantity < product.stock) {
                existingItem.quantity++;
            } else {
                alert("No more stock available for this item.");
            }
        } else {
             if(product.stock > 0){
                shoppingCart.push({ ...product, quantity: 1 });
             } else {
                 alert("This item is out of stock.");
             }
        }
        updateCartBadge();
        renderCart();
        saveCartToLocalStorage();
    };

// Change const to function:
// Add this function to the global window object
window.updateCartQuantity = (productId, newQuantity) => {
    // 1. Ensure the new quantity is a valid number (at least 1)
    newQuantity = Math.max(1, parseInt(newQuantity)); 

    // 2. Find the index of the product in the shoppingCart array
    const itemIndex = shoppingCart.findIndex(item => item.id === productId);

if (itemIndex > -1) {
        shoppingCart[itemIndex].quantity = newQuantity;
        renderCart();
        
        // <<< ADD THIS LINE
        saveCartToLocalStorage(); 
    } else {
       // console.error(`Product with ID ${productId} not found in cart.`);
    }
};

// Expose the function globally so it can be called from HTML onclick attributes
window.removeFromCart = (productId) => {
    // 1. Find the index of the product in the shoppingCart array
    const itemIndex = shoppingCart.findIndex(item => item.id === productId);

    if (itemIndex > -1) {
        // 2. Remove the item from the cart array
        shoppingCart.splice(itemIndex, 1);

        // 3. Re-render the cart to update totals and the UI
        renderCart();
        
        // OPTIONAL: Update cart data in localStorage or session storage if you use it
        saveCartToLocalStorage();
    } else {
       // console.error(`Product with ID ${productId} not found in cart.`);
    }
};

    onSnapshot(collection(db, "products"), (snapshot) => {
       allShopProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderShopProducts();
    });

// Inside the initLandingPage function
cartButton?.addEventListener('click', () => {
    // ADD THIS BLOCK
    getDoc(doc(db, "settings", "paymentGuide")).then(docSnap => {
        const paymentGuideEl = document.getElementById('cart-payment-guide');
        if (docSnap.exists() && docSnap.data().text) {
            paymentGuideEl.innerHTML = `<p class="font-semibold mb-1">How to Pay:</p><p>${docSnap.data().text.replace(/\n/g, '<br>')}</p>`;
            paymentGuideEl.classList.remove('hidden');
        } else {
            paymentGuideEl.classList.add('hidden');
        }
    });

    cartModal.classList.remove('hidden'); // This line already exists
});
    closeCartModalBtn?.addEventListener('click', () => cartModal.classList.add('hidden'));
    cartModal?.querySelector('.modal-overlay').addEventListener('click', () => cartModal.classList.add('hidden'));

    shopContainer?.addEventListener('click', (e) => {
        const btn = e.target.closest('.add-to-cart-btn');
        if (btn) {
            addToCart(btn.dataset.id);
        }
    });

    cartItemsContainer?.addEventListener('click', e => {
        const target = e.target.closest('button');
        if (!target) return;
        const id = target.dataset.id;
        const itemIndex = shoppingCart.findIndex(item => item.id === id);
        const productInStock = allShopProducts.find(p => p.id === id);


        if (target.classList.contains('increase-qty')) {
            if(shoppingCart[itemIndex].quantity < productInStock.stock){
               shoppingCart[itemIndex].quantity++;
            } else {
                alert("No more stock available for this item.");
            }
        } else if (target.classList.contains('decrease-qty')) {
            if (shoppingCart[itemIndex].quantity > 1) {
                shoppingCart[itemIndex].quantity--;
            } else {
                shoppingCart.splice(itemIndex, 1);
            }
        } else if (target.classList.contains('remove-from-cart-btn')) {
            shoppingCart.splice(itemIndex, 1);
        }
        renderCart();
        updateCartBadge();
    });

document.getElementById('checkout-btn')?.addEventListener('click', async () => {
    // -------------------------------------------------------------------------
    // 1. RE-CALCULATE AND GATHER FINAL VALUES
    // -------------------------------------------------------------------------

    // a. Recalculate Subtotal, Fees, and Grand Total to ensure accuracy before saving
    let subtotal = shoppingCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shippingFee = shoppingCart.length > 0 ? globalShippingFee : 0; 
    const taxAmount = subtotal * globalTaxRate;
    const grandTotal = subtotal + shippingFee + taxAmount;

    // Optional: Re-render the UI one last time in case the global settings changed
    // while the modal was open (If your renderCart doesn't update UI, include the DOM updates here)
    // cartSubtotalEl.textContent = `$${subtotal.toFixed(2)}`;
    // ... update other elements ...

    // Gather client details (make sure 'clientDetails' is defined or gathered here)
    const clientDetails = {
        name: prompt("Please enter your full name:"),
        phone: prompt("Please enter your phone number:"),
    };

    if (!clientDetails.name || !clientDetails.phone) {
        alert("Name and phone number are required to place an order.");
        return;
    }

    // -------------------------------------------------------------------------
    // 2. DEFINE AND SAVE THE ORDER OBJECT
    // -------------------------------------------------------------------------
    
    const order = {
        customer: clientDetails,
        items: shoppingCart,
        // **USE THE FINAL CALCULATED grandTotal HERE**
        total: grandTotal, 
        // **Save the breakdown for records**
        subtotal: subtotal,
        taxRate: globalTaxRate,
        taxAmount: taxAmount,
        shippingFee: shippingFee,
        // ------------------------------------
        status: 'Pending',
        createdAt: serverTimestamp(),
    };

    try {
        await addDoc(collection(db, "orders"), order);

        // Clear the cart and show confirmation
        shoppingCart = [];
        renderCart(); 
        updateCartBadge();
        cartModal.classList.add('hidden');
        confirmationModal.classList.remove('hidden');

    } catch (error) {
        console.error("Error placing order:", error);
        alert("Could not place your order. Please try again.");
    }
});


    closeConfirmationBtn?.addEventListener('click', () => confirmationModal.classList.add('hidden'));
// --- PRODUCT DETAIL MODAL LOGIC ---
const productDetailModal = document.getElementById('product-detail-modal');
const closeProductDetailBtn = document.getElementById('close-product-detail-modal-btn');

const openProductDetailModal = (productId) => {
    const product = allShopProducts.find(p => p.id === productId);
    if (!product) return;

    // Populate text content
    document.getElementById('product-modal-name').textContent = product.name;
    document.getElementById('product-modal-price').textContent = `$${product.price.toFixed(2)}`;
    document.getElementById('product-modal-description').textContent = product.description;

    // Update stock status and Add to Cart button
    const stockStatusEl = document.getElementById('product-modal-stock-status');
    const addToCartBtn = document.getElementById('product-modal-add-to-cart-btn');
    addToCartBtn.dataset.id = productId;

    if (product.stock > 0) {
        stockStatusEl.innerHTML = `<span class="text-green-600 font-semibold">In Stock (${product.stock} available)</span>`;
        addToCartBtn.disabled = false;
    } else {
        stockStatusEl.innerHTML = `<span class="text-red-600 font-semibold">Out of Stock</span>`;
        addToCartBtn.disabled = true;
    }

    // Image gallery logic
    currentProductModalImageIndex = 0;
    const displayImage = () => {
        const images = product.imageURLs || [];
        const imageEl = document.getElementById('product-modal-image');
        const prevBtn = document.getElementById('product-modal-prev-btn');
        const nextBtn = document.getElementById('product-modal-next-btn');
        const counterEl = document.getElementById('product-modal-counter');

        if (images.length > 0) {
            imageEl.src = images[currentProductModalImageIndex];
            const hasMultiple = images.length > 1;
            prevBtn.classList.toggle('hidden', !hasMultiple || currentProductModalImageIndex === 0);
            nextBtn.classList.toggle('hidden', !hasMultiple || currentProductModalImageIndex === images.length - 1);
            counterEl.classList.toggle('hidden', !hasMultiple);
            if (hasMultiple) {
                counterEl.textContent = `${currentProductModalImageIndex + 1} / ${images.length}`;
            }
        } else {
            imageEl.src = 'https://placehold.co/400x400/f8bbd0/ffffff?text=No+Image';
            [prevBtn, nextBtn, counterEl].forEach(el => el.classList.add('hidden'));
        }
    };
    displayImage();
    productDetailModal.classList.remove('hidden');
};

// Event listeners for the new modal
shopContainer?.addEventListener('click', (e) => {
    const productCard = e.target.closest('.product-card');
    const isAddToCartButton = e.target.closest('.add-to-cart-btn');

    // Only open modal if the click is on the card itself, not the add button
    if (productCard && !isAddToCartButton) {
        const buttonInsideCard = productCard.querySelector('.add-to-cart-btn');
        if (buttonInsideCard?.dataset.id) {
            openProductDetailModal(buttonInsideCard.dataset.id);
        }
    }
});

const closeProductDetailModal = () => productDetailModal.classList.add('hidden');
closeProductDetailBtn.addEventListener('click', closeProductDetailModal);
productDetailModal.addEventListener('click', (e) => {
    if (e.target.id === 'product-detail-modal') closeProductDetailModal();
});

document.getElementById('product-modal-add-to-cart-btn').addEventListener('click', (e) => {
    addToCart(e.target.dataset.id);
    e.target.textContent = 'Added!';
    setTimeout(() => { e.target.textContent = 'Add to Cart'; }, 1500);
});

document.getElementById('product-modal-next-btn').addEventListener('click', () => {
    const productId = document.getElementById('product-modal-add-to-cart-btn').dataset.id;
    const product = allShopProducts.find(p => p.id === productId);
    if (product && currentProductModalImageIndex < product.imageURLs.length - 1) {
        currentProductModalImageIndex++;
        openProductDetailModal(productId); // Re-call to refresh everything
    }
});

document.getElementById('product-modal-prev-btn').addEventListener('click', () => {
    if (currentProductModalImageIndex > 0) {
        currentProductModalImageIndex--;
        const productId = document.getElementById('product-modal-add-to-cart-btn').dataset.id;
        openProductDetailModal(productId); // Re-call to refresh everything
    }
});


onSnapshot(query(collection(db, "finished_clients"), where("isFeatured", "==", true)), (snapshot) => {
    // This line now correctly updates the globally/modally declared variable
    allFeaturedReviews = snapshot.docs.map(doc => doc.data()); 
    
    const container = document.getElementById('testimonials-container');
    if (!container) return;
    container.innerHTML = '';
    
    // The rest of the logic remains the same
    const validReviews = allFeaturedReviews.filter(r => r.rating && r.review);

    if (validReviews.length === 0) {
        container.innerHTML = '<p class="text-gray-600 col-span-full text-center">No featured reviews yet. Check back soon!</p>';
        return;
    }
    
    validReviews.forEach(review => {
        const reviewEl = document.createElement('div');
        reviewEl.className = 'bg-white p-6 rounded-xl shadow-lg border-t-4 border-pink-500'; 
        
        reviewEl.innerHTML = `
            <i class="fas fa-quote-left text-pink-300 text-2xl mb-3"></i>
            ${renderStars(review.rating)}
            <p class="text-gray-700 italic mb-4">"${review.review}"</p>
            <div class="text-sm font-semibold text-gray-800">
                ${review.name || 'Anonymous Client'}
            </div>
            <p class="text-xs text-gray-500">${new Date(review.checkOutTimestamp.seconds * 1000).toLocaleDateString()}</p>
        `;
        container.appendChild(reviewEl);
    });
});

    // PASTE THIS AT THE VERY TOP of the initLandingPage() function
const announcementModal = document.getElementById('announcement-modal');

const showAnnouncement = async () => {
    // Check if the announcement has already been shown in this session
    if (sessionStorage.getItem('announcementShown')) {
        return;
    }

    try {
        const docSnap = await getDoc(doc(db, "settings", "announcement"));
        if (docSnap.exists()) {
            const settings = docSnap.data();
            if (settings.isEnabled) {
                document.getElementById('announcement-title').textContent = settings.title || '';
                document.getElementById('announcement-text').textContent = settings.text || '';
                
                const imgEl = document.getElementById('announcement-image');
                if (settings.imageURL) {
                    imgEl.src = settings.imageURL;
                    imgEl.classList.remove('hidden');
                } else {
                    imgEl.classList.add('hidden');
                }

                announcementModal.classList.remove('hidden');
                sessionStorage.setItem('announcementShown', 'true');
            }
        }
    } catch (error) {
        console.error("Error fetching announcement:", error);
    }
};

const closeAnnouncement = () => announcementModal.classList.add('hidden');
document.getElementById('close-announcement-modal-btn').addEventListener('click', closeAnnouncement);
document.getElementById('announcement-modal-overlay').addEventListener('click', closeAnnouncement);

showAnnouncement(); // Call the function to check on page load


    // PASTE THIS AT THE START OF initLandingPage()
    const royaltyModal = document.getElementById('royalty-card-modal');
    const openRoyaltyBtn = document.getElementById('join-royalty-btn');
    const closeRoyaltyBtn = document.getElementById('close-royalty-card-modal-btn');
    const royaltyForm = document.getElementById('royalty-card-form');

    const openRoyaltyModal = () => royaltyModal.classList.remove('hidden');
    const closeRoyaltyModal = () => royaltyModal.classList.add('hidden');

    openRoyaltyBtn.addEventListener('click', openRoyaltyModal);
    closeRoyaltyBtn.addEventListener('click', closeRoyaltyModal);
    royaltyModal.querySelector('.modal-overlay').addEventListener('click', closeRoyaltyModal);

    royaltyForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('rc-buyer-name').value;
        const phone = document.getElementById('rc-buyer-phone').value;
        const email = document.getElementById('rc-buyer-email').value;

        if (!name || !phone || !email) {
            alert("Please fill out all fields.");
            return;
        }

        sessionStorage.setItem('pendingRoyaltyCard', JSON.stringify({ name, phone, email }));

        try {
            await createUserWithEmailAndPassword(auth, email, phone); // Using phone as temp password
            closeRoyaltyModal();
        } catch (error) {
            if (error.code === 'auth/email-already-in-use') {
                alert("An account with this email already exists. Please log in to your dashboard to manage your royalty card.");
            } else {
                alert(`Could not create account. Error: ${error.message}`);
            }
            sessionStorage.removeItem('pendingRoyaltyCard');
        }
    });
    // PASTE THIS INSIDE initLandingPage()
    // ADD THIS LINE inside initLandingPage()
    document.getElementById('nails-idea-landing').addEventListener('click', galleryClickHandler);
    onSnapshot(query(collection(db, "promotions"), orderBy("startDate", "desc")), (snapshot) => {
        allPromotions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderPromotionsLanding(allPromotions);
    });

    onSnapshot(query(collection(db, "nail_ideas"), orderBy("createdAt", "desc")), (snapshot) => {
        allNailIdeas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderNailIdeasGallery(allNailIdeas);
    });
    const signupLoginModal = document.getElementById('signup-login-modal');
    const userIcon = document.getElementById('user-icon');
    const closeSignupLoginModalBtn = document.getElementById('close-signup-login-modal-btn');
    const landingLoginForm = document.getElementById('landing-login-form');
    const landingSignupForm = document.getElementById('landing-signup-form');
    const addAppointmentFormLanding = document.getElementById('add-appointment-form-landing');
    const lockoutMessageDiv = document.getElementById('login-lockout-message');
    // **** ADD THIS LINE ****
    renderMembershipTiers(allMembershipTiers, 'landing-memberships-container', false);
    // **** END OF FIX ****
    // --- NEW E-COMMERCE GIFT CARD LOGIC ---
    const purchaseModal = document.getElementById('gift-card-purchase-modal');
    const buyGiftCardBtn = document.getElementById('buy-gift-card-btn');
    const closePurchaseModalBtn = document.getElementById('close-gift-card-purchase-modal-btn');

    const previewCard = document.getElementById('landing-gc-preview-card');



    // UPDATED listener to open the new purchase modal
    document.getElementById('landing-memberships-container').addEventListener('click', (e) => {
        const btn = e.target.closest('.purchase-membership-btn');
        if (btn) {
            openMembershipPurchaseModal(btn.dataset.tierId);
        }
    });

renderCart();

    // Listeners for the new modal
    document.getElementById('close-membership-purchase-modal-btn').addEventListener('click', closeMembershipPurchaseModal);
    document.getElementById('membership-purchase-modal').querySelector('.modal-overlay').addEventListener('click', closeMembershipPurchaseModal);

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
        if (firstTab) {
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

    // Located inside initLandingPage()

    // REPLACE the landingSignupForm listener with this one
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
            // Store signup details in session storage before creating user
            const signupDetails = { name, email, phone: password }; // Using password as phone is a placeholder from your code
            sessionStorage.setItem('signupDetails', JSON.stringify(signupDetails));

            await createUserWithEmailAndPassword(auth, email, password);
            // The onAuthStateChanged listener will now handle creating the client document

            // This was the missing improvement:
            closeAuthModal();
        } catch (error) {
            alert(`Sign Up Failed: ${error.message}`);
            sessionStorage.removeItem('signupDetails'); // Clean up on failure
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
        document.getElementById('waitlist-cta-landing').classList.add('hidden'); // Hide waitlist
         const submitBtnLanding = document.querySelector('#add-appointment-form-landing button[type="submit"]');
         const prevBtnLanding = document.getElementById('booking-prev-btn');
         if (submitBtnLanding) submitBtnLanding.classList.remove('hidden'); // Show submit
         if (prevBtnLanding) prevBtnLanding.classList.remove('hidden'); // Show prev
    });
    document.getElementById('booking-prev-btn').addEventListener('click', () => {
        step2.classList.add('hidden');
        step1.classList.remove('hidden');
        document.getElementById('waitlist-cta-landing').classList.add('hidden'); // Hide waitlist
        const submitBtnLanding = document.querySelector('#add-appointment-form-landing button[type="submit"]');
        const prevBtnLanding = document.getElementById('booking-prev-btn');
         if (submitBtnLanding) submitBtnLanding.classList.remove('hidden'); // Ensure submit is visible for when they return
         if (prevBtnLanding) prevBtnLanding.classList.remove('hidden'); // Ensure prev is visible
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

  // --- NEW: Event Listener for the Landing Page Waitlist Button ---
// --- NEW: Event Listener for the Landing Page Waitlist Button ---
    const joinWaitlistBtnLanding = document.getElementById('join-waitlist-btn-landing');
    if (joinWaitlistBtnLanding) {
        joinWaitlistBtnLanding.addEventListener('click', async () => {
            // Read all necessary data directly from the LANDING PAGE form fields
            const name = document.getElementById('appointment-client-name-landing').value;
            const phone = document.getElementById('appointment-phone-landing').value;
            // Get selected services from the hidden checkboxes for the landing page
            const selectedServices = Array.from(document.querySelectorAll('#hidden-checkbox-container-landing input[name="service-landing"]:checked')).map(el => el.value);
            const tech = document.getElementById('appointment-technician-select-landing').value;
            const dateTimeString = document.getElementById('appointment-datetime-landing').value;

            // Basic validation
            if (!name || !phone || selectedServices.length === 0 || !dateTimeString) {
                addNotification('error', "Please ensure Name, Phone, Date/Time, and Services are filled to join the waitlist.");
                return;
            }

            const waitlistData = {
                clientName: name,
                clientPhone: phone,
                services: selectedServices,
                technician: tech, // This now correctly captures the selected technician
                date: dateTimeString.split('T')[0], // Just the date part is needed for the waitlist collection
                createdAt: serverTimestamp(),
                status: 'active' // Initial status
            };

            const btn = joinWaitlistBtnLanding;
            btn.disabled = true;
            btn.textContent = 'Adding...';

            try {
                await addDoc(collection(db, "waitlist"), waitlistData);
                addNotification('success', "Success! You've been added to the waitlist. We will contact you if a spot opens up.");

                // --- Reset the form and UI elements ---
                addAppointmentFormLanding.reset();
                document.getElementById('waitlist-cta-landing').classList.add('hidden');

                // Show original buttons again
                const submitBtnLanding = document.querySelector('#add-appointment-form-landing button[type="submit"]');
                const prevBtnLanding = document.getElementById('booking-prev-btn');
                if (submitBtnLanding) submitBtnLanding.classList.remove('hidden');
                if (prevBtnLanding) prevBtnLanding.classList.remove('hidden');

                // Reset service selection display
                document.querySelectorAll('#services-container-landing .selection-count').forEach(badge => badge.classList.add('hidden'));
                document.querySelectorAll('#hidden-checkbox-container-landing input').forEach(cb => cb.checked = false);

                // Go back to step 1 of the booking form
                document.getElementById('booking-step-2').classList.add('hidden');
                document.getElementById('booking-step-1').classList.remove('hidden');

            } catch (error) {
                console.error("Error adding to waitlist from landing page:", error);
                addNotification('error', "Could not add to waitlist. Please try again.");
            } finally {
                btn.disabled = false;
                btn.textContent = 'Join Waitlist';
            }
        });
    }
    // --- END of new event listener ---

// Located inside initLandingPage()
    addAppointmentFormLanding.addEventListener('submit', async (e) => {
        e.preventDefault();
        const services = Array.from(document.querySelectorAll('#hidden-checkbox-container-landing input[name="service-landing"]:checked')).map(el => el.value);
        const datetimeString = document.getElementById('appointment-datetime-landing').value;
        const technician = document.getElementById('appointment-technician-select-landing').value;
        const submitBtnLanding = document.querySelector('#add-appointment-form-landing button[type="submit"]');
        const prevBtnLanding = document.getElementById('booking-prev-btn');
        const waitlistCtaLanding = document.getElementById('waitlist-cta-landing');
        const waitlistMsgLanding = document.getElementById('waitlist-message-landing');

        // --- Basic Validation ---
        if (!datetimeString) {
            addNotification('error', 'Please select a date and time.');
            return;
        }
        if (services.length === 0) {
            addNotification('error', 'Please select at least one service.');
            // Ensure UI is correct even on validation failure
            waitlistCtaLanding.classList.add('hidden');
            if (submitBtnLanding) submitBtnLanding.classList.remove('hidden');
            if (prevBtnLanding) prevBtnLanding.classList.remove('hidden');
            return;
        }

        const bookingDate = new Date(datetimeString);

        // --- Check if Salon is Open ---
        const validation = isBookingTimeValid(bookingDate);
        if (!validation.valid) {
            addNotification('error', validation.message);
            // Ensure UI is correct even on validation failure
            waitlistCtaLanding.classList.add('hidden');
            if (submitBtnLanding) submitBtnLanding.classList.remove('hidden');
            if (prevBtnLanding) prevBtnLanding.classList.remove('hidden');
            return;
        }

        // --- START: ROBUST SERVICE LOADING CHECK & DURATION CALCULATION ---
        let localServicesList = allServicesList;
        let localBookingSettings = bookingSettings; // Use global settings

        // 1. Check if the global list is empty. If so, fetch data synchronously.
        //    (Your existing code already handles this well - included for completeness)
        if (!localServicesList || localServicesList.length === 0) {
            addNotification('info', "Loading service data, please wait...");
            try {
                const [servicesSnapshot, settingsDoc] = await Promise.all([
                    getDocs(collection(db, "services")),
                    getDoc(doc(db, "settings", "booking"))
                ]);
                localBookingSettings = settingsDoc.exists() ? settingsDoc.data() : { defaultDuration: 40 };
                bookingSettings = localBookingSettings; // Update global state
                localServicesList = [];
                servicesSnapshot.forEach(docSnap => {
                    const categoryItems = docSnap.data().items || [];
                    categoryItems.forEach(service => {
                        if (service.name && service.price) {
                            const priceValue = parseFloat(String(service.price).replace(/[^0-9.]/g, ''));
                            if (!isNaN(priceValue)) {
                                localServicesList.push({
                                    name: service.name,
                                    duration: service.duration || localBookingSettings.defaultDuration,
                                    price: priceValue // Ensure price is stored if needed later
                                });
                            }
                        }
                    });
                });
                allServicesList = localServicesList; // Update global list

                if (localServicesList.length === 0) {
                    addNotification('error', "No services configured. Cannot proceed with booking.");
                    return;
                }
            } catch (error) {
                console.error("Failed to fetch services on submit:", error);
                addNotification('error', "Failed to load service data. Please refresh and try again.");
                return;
            }
        }

        // 2. Calculate total duration using the now-guaranteed service list
        let totalDuration = 0;
        for (const serviceValue of services) {
            const serviceName = serviceValue.split(' $')[0].trim();
            const service = localServicesList.find(s => s.name === serviceName);
            totalDuration += service ? service.duration : localBookingSettings.defaultDuration;
        }
        // --- END: ROBUST SERVICE LOADING CHECK & DURATION CALCULATION ---

        // --- AVAILABILITY CHECK ---
        // Disable buttons during check
        if (submitBtnLanding) submitBtnLanding.disabled = true;
        if (prevBtnLanding) prevBtnLanding.disabled = true;
        addNotification('info', "Checking technician availability...");

        try { // Wrap the check and save logic in a try...finally block
            console.log("Checking availability for:", { technician, bookingDate, totalDuration });
            const availabilityCheck = await isTechnicianAvailable(technician, bookingDate, totalDuration);
            console.log("Availability check result:", availabilityCheck);

            if (!availabilityCheck.available) {
                // A conflict was found, so show the waitlist option
                waitlistMsgLanding.textContent = availabilityCheck.message || "This time slot is unavailable."; // Use message from function
                waitlistCtaLanding.classList.remove('hidden');

                // Hide the normal booking buttons
                if (submitBtnLanding) submitBtnLanding.classList.add('hidden');
                if (prevBtnLanding) prevBtnLanding.classList.add('hidden');

                addNotification('error', "That time slot is unavailable. Join the waitlist?");
                return; // Stop the booking from being saved

            } else {
                // Time is available, proceed to save
                waitlistCtaLanding.classList.add('hidden'); // Ensure waitlist is hidden
                if (submitBtnLanding) submitBtnLanding.classList.remove('hidden'); // Ensure submit is visible
                if (prevBtnLanding) prevBtnLanding.classList.remove('hidden'); // Ensure previous is visible

                const appointmentData = {
                    name: document.getElementById('appointment-client-name-landing').value,
                    phone: document.getElementById('appointment-phone-landing').value,
                    email: document.getElementById('appointment-email-landing').value,
                    people: document.getElementById('appointment-people-landing').value,
                    technician: technician,
                    appointmentTimestamp: Timestamp.fromDate(bookingDate),
                    notes: document.getElementById('appointment-notes-landing').value,
                    services: services,
                    bookingType: 'Online' // Specific to landing page booking
                };

                // Save the appointment
                await addDoc(collection(db, "appointments"), appointmentData);
                await sendBookingNotificationEmail(appointmentData); // Send email notification

                // Schedule reminder if email provided
                if (appointmentData.email) {
                    await sendAppointmentReminderEmail(appointmentData, appointmentData.email);
                }

                addNotification('success', 'Appointment booked successfully!');
                addAppointmentFormLanding.reset(); // Reset the whole form
                // Reset service selections visually
                document.querySelectorAll('#services-container-landing .selection-count').forEach(badge => badge.classList.add('hidden'));
                document.querySelectorAll('#hidden-checkbox-container-landing input').forEach(cb => cb.checked = false);
                // Go back to step 1
                document.getElementById('booking-step-2').classList.add('hidden');
                document.getElementById('booking-step-1').classList.remove('hidden');
            }

        } catch (error) {
            console.error("Error booking appointment or checking availability:", error);
            addNotification('error', "Could not complete booking. Please try again.");
            // Ensure UI is reset correctly on error
            waitlistCtaLanding.classList.add('hidden');
            if (submitBtnLanding) submitBtnLanding.classList.remove('hidden');
            if (prevBtnLanding) prevBtnLanding.classList.remove('hidden');
        } finally {
            // Re-enable buttons regardless of outcome
            if (submitBtnLanding) submitBtnLanding.disabled = false;
            if (prevBtnLanding) prevBtnLanding.disabled = false;
        }
    });

    // REPLACE this function inside initLandingPage
    const updateFeatureVisibility = (settings) => {
        const showShop = settings.showShop !== false; // Add this line
        const showClientRegistration = settings.showClientLogin !== false;
        const showPromos = settings.showPromotions !== false;
        const showGiftCards = settings.showGiftCards !== false;
        const showNailArt = settings.showNailArt !== false;
        const showMemberships = settings.showMemberships !== false;
        const showRoyaltyCard = settings.showRoyaltyCard !== false; // This line was missing

        const signupTab = document.getElementById('signup-tab-btn').parentElement;
        if (signupTab) {
            signupTab.style.display = showClientRegistration ? 'block' : 'none';
        }
         // Add this new block
            const shopSection = document.getElementById('shop-landing');
            const shopCart = document.getElementById('cart-button');
            const shopNavLink = document.querySelector('a[href="#shop-landing"]');
            if (shopSection) shopSection.style.display = showShop ? '' : 'none';
            if (shopCart) shopCart.style.display = showShop ? '' : 'none';
            if (shopNavLink) shopNavLink.style.display = showShop ? '' : 'none';
            
        document.getElementById('promotions-landing').style.display = showPromos ? '' : 'none';
        document.querySelector('.nav-item-promotions').style.display = showPromos ? '' : 'none';

        document.getElementById('gift-card-landing').style.display = showGiftCards ? '' : 'none';
        document.querySelector('.nav-item-gift-card').style.display = showGiftCards ? '' : 'none';

        document.getElementById('nails-idea-landing').style.display = showNailArt ? '' : 'none';
        document.querySelector('.nav-item-nails-idea').style.display = showNailArt ? '' : 'none';

        const membershipSection = document.getElementById('memberships-landing');
        const membershipNavLink = document.querySelector('a[href="#memberships-landing"]');
        if (membershipSection) membershipSection.style.display = showMemberships ? '' : 'none';
        if (membershipNavLink) membershipNavLink.style.display = showMemberships ? '' : 'none';

        // This block was missing
        const royaltySection = document.getElementById('royalty-card-landing');
        const royaltyNavLink = document.querySelector('a[href="#royalty-card-landing"]');
        if (royaltySection) royaltySection.style.display = showRoyaltyCard ? '' : 'none';
        if (royaltyNavLink) royaltyNavLink.style.display = showRoyaltyCard ? '' : 'none';
    };
    // Located at the end of initLandingPage()
    onSnapshot(doc(db, "settings", "features"), (docSnap) => {
        if (docSnap.exists()) {
            updateFeatureVisibility(docSnap.data());
        } else {
            // FIX IS HERE: Added showMemberships to the default object
            updateFeatureVisibility({
                showClientLogin: true,
                showPromotions: true,
                showGiftCards: true,
                showNailArt: true,
                showMemberships: true,
                showRoyaltyCard: true
            });
        }
    });
}

// --- MAIN CHECK-IN APP SCRIPT ---
async function initMainApp(userRole, userName) {

    // --- E-COMMERCE MANAGEMENT (ADMIN) ---
    const initEcommerceManagement = () => {
        const productForm = document.getElementById('ecomm-add-product-form');
        const productsAdminTableBody = document.querySelector('#products-admin-table tbody');
        const ordersAdminTableBody = document.querySelector('#orders-admin-table tbody');

        const renderProductsAdminTable = () => {
            if(!productsAdminTableBody) return;
            productsAdminTableBody.innerHTML = '';
            allEcommProducts.forEach(p => {
                const row = productsAdminTableBody.insertRow();
                row.innerHTML = `
                    <td class="px-4 py-2"><img src="${(p.imageURLs && p.imageURLs[0]) || 'https://placehold.co/64x64/f8bbd0/ffffff?text=Nail+Product'}" class="w-12 h-12 object-cover rounded"></td>
                    <td class="px-4 py-2 font-medium">${p.name}</td>
                    <td class="px-4 py-2">$${p.price.toFixed(2)}</td>
                    <td class="px-4 py-2">${p.stock}</td>
                    <td class="px-4 py-2 text-center">
                        <button data-id="${p.id}" class="ecomm-edit-product-btn text-blue-500 mr-2"><i class="fas fa-edit"></i></button>
                        <button data-id="${p.id}" class="ecomm-delete-product-btn text-red-500"><i class="fas fa-trash"></i></button>
                    </td>
                `;
            });
        };

        const renderOrdersAdminTable = () => {
            if(!ordersAdminTableBody) return;
            ordersAdminTableBody.innerHTML = '';
            allEcommOrders.forEach(o => {
                const row = ordersAdminTableBody.insertRow();
                const itemsSummary = o.items.map(i => `${i.quantity}x ${i.name}`).join('<br>');
                row.innerHTML = `
                    <td class="px-4 py-2">${o.createdAt.toDate().toLocaleDateString()}</td>
                    <td class="px-4 py-2">${o.customer.name}<br><span class="text-xs text-gray-500">${o.customer.phone}</span></td>
                    <td class="px-4 py-2 text-xs">${itemsSummary}</td>
                    <td class="px-4 py-2 font-bold">$${o.total.toFixed(2)}</td>
                    <td class="px-4 py-2">${o.status}</td>
                    <td class="px-4 py-2 text-center">
                        <select data-id="${o.id}" class="order-status-select form-select text-sm p-1">
                            <option value="Pending" ${o.status === 'Pending' ? 'selected' : ''}>Pending</option>
                            <option value="Shipped" ${o.status === 'Shipped' ? 'selected' : ''}>Shipped</option>
                            <option value="Completed" ${o.status === 'Completed' ? 'selected' : ''}>Completed</option>
                            <option value="Cancelled" ${o.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                        </select>
                    </td>
                `;
            });
        };

        onSnapshot(query(collection(db, "products"), orderBy("name")), (snapshot) => {
            allEcommProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderProductsAdminTable();
        });

        onSnapshot(query(collection(db, "orders"), orderBy("createdAt", "desc")), (snapshot) => {
            allEcommOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderOrdersAdminTable();
        });

        productForm?.addEventListener('submit', async e => {
            e.preventDefault();
            const id = document.getElementById('ecomm-edit-product-id').value;
           const imageUrlsText = document.getElementById('ecomm-product-image-urls').value;
            const imageURLs = imageUrlsText.split('\n').map(url => url.trim()).filter(Boolean);

            const data = {
                name: document.getElementById('ecomm-product-name').value,
                description: document.getElementById('ecomm-product-desc').value,
                price: parseFloat(document.getElementById('ecomm-product-price').value),
                stock: parseInt(document.getElementById('ecomm-product-stock').value, 10),
                imageURLs: imageURLs // Save as an array
            };

            try {
                if (id) {
                    await updateDoc(doc(db, "products", id), data);
                } else {
                    await addDoc(collection(db, "products"), data);
                }
                resetEcommProductForm();
            } catch (error) { console.error("Error saving product", error); }
        });

        const resetEcommProductForm = () => {
            productForm.reset();
            document.getElementById('ecomm-edit-product-id').value = '';
            document.getElementById('ecomm-current-image-info').textContent = '';
            document.getElementById('ecomm-current-image-info').dataset.url = '';
            document.getElementById('ecomm-add-product-btn').textContent = 'Add Product';
            document.getElementById('ecomm-cancel-edit-btn').classList.add('hidden');
        };

        document.getElementById('ecomm-cancel-edit-btn')?.addEventListener('click', resetEcommProductForm);

        productsAdminTableBody?.addEventListener('click', e => {
            const editBtn = e.target.closest('.ecomm-edit-product-btn');
            const deleteBtn = e.target.closest('.ecomm-delete-product-btn');

            if (editBtn) {
                const product = allEcommProducts.find(p => p.id === editBtn.dataset.id);
                document.getElementById('ecomm-edit-product-id').value = product.id;
                document.getElementById('ecomm-product-name').value = product.name;
                document.getElementById('ecomm-product-desc').value = product.description;
                document.getElementById('ecomm-product-price').value = product.price;
                document.getElementById('ecomm-product-stock').value = product.stock;
                const imageUrlsTextarea = document.getElementById('ecomm-product-image-urls');
                if (product.imageURLs && Array.isArray(product.imageURLs)) {
                    imageUrlsTextarea.value = product.imageURLs.join('\n');
                } else {
                    imageUrlsTextarea.value = '';
                }'';
                document.getElementById('ecomm-add-product-btn').textContent = 'Update Product';
                document.getElementById('ecomm-cancel-edit-btn').classList.remove('hidden');
            } else if (deleteBtn) {
                showConfirmModal("Delete this product?", async () => {
                    await deleteDoc(doc(db, "products", deleteBtn.dataset.id));
                });
            }
        });

        ordersAdminTableBody?.addEventListener('change', async e => {
            if (e.target.classList.contains('order-status-select')) {
                const orderId = e.target.dataset.id;
                const newStatus = e.target.value;
                await updateDoc(doc(db, "orders", orderId), { status: newStatus });
            }
        });
    };


    // PASTE THIS ENTIRE FUNCTION block inside initMainApp()

const initAnnouncementManagement = () => {
    const form = document.getElementById('announcement-form');
    let currentSettings = {};

    // Load current settings into the form
    onSnapshot(doc(db, "settings", "announcement"), (docSnap) => {
        if (docSnap.exists()) {
            currentSettings = docSnap.data();
            document.getElementById('toggle-announcement').checked = currentSettings.isEnabled || false;
            document.getElementById('announcement-form-title').value = currentSettings.title || '';
            document.getElementById('announcement-form-text').value = currentSettings.text || '';
            
            const imgWrapper = document.getElementById('current-announcement-image-wrapper');
            const imgEl = document.getElementById('current-announcement-image');
            if (currentSettings.imageURL) {
                imgEl.src = currentSettings.imageURL;
                imgWrapper.classList.remove('hidden');
            } else {
                imgWrapper.classList.add('hidden');
            }
        }
    });

    // Handle form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const file = document.getElementById('announcement-form-image').files[0];
        let newImageURL = currentSettings.imageURL || null;

        const btn = form.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = 'Saving...';

        try {
            // Upload new image if one is selected
            if (file) {
                // If there's an old image, delete it from storage first
                if (currentSettings.imageURL) {
                    try {
                        const oldImageRef = ref(storage, currentSettings.imageURL);
                        await deleteObject(oldImageRef);
                    } catch (storageError) {
                        console.warn("Could not delete old image, it may already be gone:", storageError);
                    }
                }
                
                const storageRef = ref(storage, `announcements/${Date.now()}_${file.name}`);
                await uploadBytes(storageRef, file);
                newImageURL = await getDownloadURL(storageRef);
            }

            const updatedData = {
                isEnabled: document.getElementById('toggle-announcement').checked,
                title: document.getElementById('announcement-form-title').value,
                text: document.getElementById('announcement-form-text').value,
                imageURL: newImageURL
            };

            await setDoc(doc(db, "settings", "announcement"), updatedData);
            alert("Announcement saved successfully!");

        } catch (error) {
            console.error("Error saving announcement:", error);
            alert("Could not save the announcement.");
        } finally {
            btn.disabled = false;
            btn.textContent = 'Save Announcement';
            document.getElementById('announcement-form-image').value = ''; // Clear file input
        }
    });

    // Handle image removal
    document.getElementById('remove-announcement-image-btn').addEventListener('click', async () => {
        if (!currentSettings.imageURL) return;

        if (confirm("Are you sure you want to remove the current image?")) {
            try {
                const imageRef = ref(storage, currentSettings.imageURL);
                await deleteObject(imageRef);
                await updateDoc(doc(db, "settings", "announcement"), { imageURL: null });
                alert("Image removed.");
            } catch (error) {
                console.error("Error removing image:", error);
                alert("Could not remove the image.");
            }
        }
    });
};

// --- BIRTHDAY REWARDS SETTINGS ---
const birthdayRewardsForm = document.getElementById('birthday-rewards-form');
if (birthdayRewardsForm) {
    birthdayRewardsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const settings = {
            enabled: document.getElementById('toggle-birthday-rewards').checked,
            subject: document.getElementById('birthday-email-subject').value,
            body: document.getElementById('birthday-email-body').value
        };
        try {
            await setDoc(doc(db, "settings", "birthday_rewards"), settings);
            alert("Birthday reward settings saved successfully!");
        } catch (error) {
            console.error("Error saving birthday settings:", error);
            alert("Could not save birthday settings.");
        }
    });
}
     // PASTE THE FUNCTION DEFINITION RIGHT HERE
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
    const waitlistCountSpan = document.getElementById('waitlist-count');
    const appLoadTimestamp = Timestamp.now();
    const adminDashboardView = document.getElementById('admin-dashboard-view');
    const staffDashboardView = document.getElementById('staff-dashboard-view');

    // Role-based Dashboard View
    if (userRole === 'admin') {
        adminDashboardView.classList.remove('hidden');
        staffDashboardView.classList.add('hidden');
        // ADD THIS LINE
         initAnnouncementManagement();
    } else {
        adminDashboardView.classList.add('hidden');
        staffDashboardView.classList.remove('hidden');
        const welcomeHeading = document.getElementById('staff-welcome-heading');
        if (welcomeHeading) {
            welcomeHeading.textContent = `My Earning Details`;
        }
    }


    onSnapshot(query(collection(db, "waitlist"), orderBy("createdAt", "desc")), (snapshot) => {
    allWaitlistEntries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const activeEntries = allWaitlistEntries.filter(e => e.status !== 'contacted');

    if (waitlistCountSpan) {
        if (activeEntries.length > 0) {
            waitlistCountSpan.textContent = activeEntries.length;
            waitlistCountSpan.classList.remove('hidden');
        } else {
            waitlistCountSpan.classList.add('hidden');
        }
    }
    renderWaitlistAdminTable();
});

// Inside initMainApp, add the new render function for the admin table (around line 4300)
const renderWaitlistAdminTable = () => {
    const tbody = document.querySelector('#waitlist-table tbody');
    if (!tbody) return;

    const dateFilter = document.getElementById('waitlist-date-filter').value;
    let filteredEntries = allWaitlistEntries;
    if (dateFilter) {
        filteredEntries = allWaitlistEntries.filter(e => e.date === dateFilter);
    }

    tbody.innerHTML = '';
    if (filteredEntries.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="py-6 text-center text-gray-400">No clients on the waitlist for the selected date.</td></tr>`;
        return;
    }

filteredEntries.forEach(entry => {
    const row = tbody.insertRow();
    row.className = 'bg-white border-b';
    // Replace this line:
    row.innerHTML = `
        <td class="px-6 py-4">${new Date(entry.date + 'T00:00:00').toLocaleDateString()}</td>
        <td class="px-6 py-4 font-medium">${entry.clientName}</td>
        <td class="px-6 py-4">${entry.clientPhone}</td>
        <td class="px-6 py-4 text-xs">${Array.isArray(entry.services) ? entry.services.join(', ') : entry.services}</td>
        <td class="px-6 py-4">${entry.technician}</td>
        <td class="px-6 py-4 text-center space-x-4">
            <button data-id="${entry.id}" class="check-in-waitlist-btn text-green-500 hover:text-green-700" title="Check In Client"><i class="fas fa-sign-in-alt text-lg"></i></button>
            <button data-id="${entry.id}" class="check-out-waitlist-btn text-blue-500 hover:text-blue-700" title="Check Out Client"><i class="fas fa-check-circle text-lg"></i></button>
            <button data-id="${entry.id}" class="remove-waitlist-btn text-red-500 hover:text-red-700" title="Remove from Waitlist"><i class="fas fa-trash text-lg"></i></button>
        </td>
    `;
});
};

// Inside initMainApp, add event listeners for the new waitlist table (around line 4350)
document.getElementById('waitlist-date-filter').addEventListener('input', renderWaitlistAdminTable);

document.querySelector('#waitlist-table tbody')?.addEventListener('click', async (e) => {
    const removeBtn = e.target.closest('.remove-waitlist-btn');
    const checkInBtn = e.target.closest('.check-in-waitlist-btn');
    const checkOutBtn = e.target.closest('.check-out-waitlist-btn');

    if (removeBtn) {
        showConfirmModal("Remove this client from the waitlist?", async () => {
            await deleteDoc(doc(db, "waitlist", removeBtn.dataset.id));
        });
    }

    if (checkInBtn) {
        const waitlistId = checkInBtn.dataset.id;
        const entry = allWaitlistEntries.find(e => e.id === waitlistId);
        if (!entry) return;

        try {
            // Create a new client in the active queue
            await addDoc(collection(db, "active_queue"), {
                name: entry.clientName,
                phone: entry.clientPhone,
                people: entry.people || 1,
                bookingType: 'Waitlist',
                services: entry.services,
                technician: entry.technician,
                notes: entry.notes || '',
                checkInTimestamp: serverTimestamp(),
                status: 'waiting'
            });

            // Remove the client from the waitlist
            await deleteDoc(doc(db, "waitlist", waitlistId));
            addNotification('success', `${entry.clientName} has been checked in from the waitlist.`);
        } catch (error) {
            console.error("Error checking in from waitlist:", error);
            addNotification('error', "Could not check in the client.");
        }
    }

    if (checkOutBtn) {
        const waitlistId = checkOutBtn.dataset.id;
        const entry = allWaitlistEntries.find(e => e.id === waitlistId);
        if (!entry) return;

        // Pre-fill and open the checkout modal
        document.getElementById('technician-name-select').value = entry.technician;
        document.getElementById('checkout-client-id').value = waitlistId;
        document.getElementById('checkout-source-collection').value = 'waitlist'; // Set the source
        checkoutModal.classList.remove('hidden');
        checkoutModal.classList.add('flex');
    }
});

// Inside initMainApp, update the closeAddAppointmentModal function (around line 995)
const closeAddAppointmentModal = () => {
    addAppointmentModal.classList.add('hidden');
    addAppointmentModal.classList.remove('flex');
    document.getElementById('waitlist-cta').classList.add('hidden');
    document.getElementById('add-appointment-submit-btn').classList.remove('hidden');
    pendingWaitlistData = null; // Add this line to clear temporary data
};

document.getElementById('join-waitlist-btn').addEventListener('click', async () => {
    if (!pendingWaitlistData) {
        alert("Error: Waitlist data not found. Please try again.");
        return;
    }

    const waitlistData = {
        ...pendingWaitlistData,
        createdAt: serverTimestamp(),
        status: 'active'
    };

    if (!waitlistData.clientName || !waitlistData.clientPhone) {
        alert("Please enter a name and phone number to join the waitlist.");
        return;
    }

    try {
        await addDoc(collection(db, "waitlist"), waitlistData);
        alert("Success! You have been added to the waitlist. We will contact you if a spot opens up.");
        closeAddAppointmentModal();
    } catch (error) {
        console.error("Error adding to waitlist:", error);
        alert("Could not add to waitlist. Please try again.");
    } finally {
        pendingWaitlistData = null; // Important: Clear the temporary data
    }
});



    // Located inside initMainApp()
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

        // *** FIX IS HERE: Filter for future appointments before counting ***
        const bookingCount = allAppointments.filter(a => a.appointmentTimestamp.toDate() > new Date()).length;

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
                // **NEW** Add this line to pre-load memberships for the admin panel
               if (currentUserRole === 'admin') {
                initMembershipManagement();
                initEcommerceManagement(); // Ensure this is called
            }
            break;
        }
    };


    const renderHolidayCalendar = () => {
        const grid = document.getElementById('holiday-calendar-grid');
        const monthYearEl = document.getElementById('holiday-month-year');
        if (!grid || !monthYearEl) return;

        monthYearEl.textContent = new Date(holidayCalYear, holidayCalMonth).toLocaleString('default', { month: 'long', year: 'numeric' });
        grid.innerHTML = '<div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>'; // Headers

        const firstDay = new Date(holidayCalYear, holidayCalMonth, 1).getDay();
        const daysInMonth = new Date(holidayCalYear, holidayCalMonth + 1, 0).getDate();

        for (let i = 0; i < firstDay; i++) { grid.insertAdjacentHTML('beforeend', '<div></div>'); }

        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${holidayCalYear}-${String(holidayCalMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isHoliday = holidaySettings.dates.includes(dateStr);
            const isToday = new Date().toDateString() === new Date(holidayCalYear, holidayCalMonth, day).toDateString();
            
            const cell = document.createElement('div');
            cell.textContent = day;
            cell.dataset.date = dateStr;
            cell.className = `day-cell ${isHoliday ? 'is-holiday' : ''} ${isToday ? 'is-today' : ''}`;
            grid.appendChild(cell);
        }
    };

    const renderHolidayList = () => {
        const listEl = document.getElementById('holiday-list-admin');
        if (!listEl) return;
        const upcoming = holidaySettings.dates
            .filter(d => new Date(d) >= new Date().setHours(0,0,0,0))
            .sort();
        
        if (upcoming.length > 0) {
            listEl.innerHTML = upcoming.map(d => `<div>${new Date(d+'T00:00:00').toLocaleDateString([], {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'})}</div>`).join('');
        } else {
            listEl.innerHTML = '<p class="text-gray-500">No upcoming closures scheduled.</p>';
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
    const shareModal = document.getElementById('share-modal'); 
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
    // PASTE THIS CODE BLOCK
    const emailTemplatesForm = document.getElementById('email-templates-form');
// REPLACE your old emailTemplatesForm listener with this one
if (emailTemplatesForm) {
    getDoc(doc(db, "settings", "emailTemplates")).then(docSnap => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            document.getElementById('gift-card-subject').value = data.giftCardSubject || '';
            document.getElementById('gift-card-body').value = data.giftCardBody || '';
            document.getElementById('membership-subject').value = data.membershipSubject || '';
            document.getElementById('membership-body').value = data.membershipBody || '';
            // New lines for reminder template
            document.getElementById('reminder-subject').value = data.reminderSubject || '';
            document.getElementById('reminder-body').value = data.reminderBody || '';
        }
    });

    emailTemplatesForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const templateData = {
            giftCardSubject: document.getElementById('gift-card-subject').value,
            giftCardBody: document.getElementById('gift-card-body').value,
            membershipSubject: document.getElementById('membership-subject').value,
            membershipBody: document.getElementById('membership-body').value,
            // New lines for reminder template
            reminderSubject: document.getElementById('reminder-subject').value,
            reminderBody: document.getElementById('reminder-body').value,
        };
        try {
            await setDoc(doc(db, "settings", "emailTemplates"), templateData);
            alert("Email templates saved successfully!");
        } catch (error) {
            console.error("Error saving email templates:", error);
            alert("Could not save email templates.");
        }
    });
}

// --- Add this block inside your initMainApp function ---

    // --- Membership Reward Settings Logic ---
   const rewardSettingsForm = document.getElementById('membership-reward-settings-form');
    if (rewardSettingsForm) {
        const thresholdInput = document.getElementById('membership-reward-threshold');
        const typeInput = document.getElementById('membership-reward-type');
        const valueInput = document.getElementById('membership-reward-value');

        // 1. Load existing settings
        onSnapshot(doc(db, "settings", "membershipReward"), (docSnap) => {
            if (docSnap.exists()) {
                const settings = docSnap.data();
                membershipRewardSettings = settings; // Update global variable
                thresholdInput.value = settings.threshold || '';
                typeInput.value = settings.type || 'fixed';
                valueInput.value = settings.value || '';
            }
        });

        // 2. Save new settings
        rewardSettingsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const threshold = parseFloat(thresholdInput.value);
            const type = typeInput.value;
            const value = parseFloat(valueInput.value);

            if (isNaN(threshold) || isNaN(value)) {
                addNotification('error', 'Please enter valid numbers for threshold and reward.');
                return;
            }

            try {
                const newSettings = { threshold, type, value };
                await setDoc(doc(db, "settings", "membershipReward"), newSettings);
                membershipRewardSettings = newSettings; // Update global variable
                addNotification('success', 'Membership reward settings saved!');
            } catch (error) {
                console.error("Error saving reward settings:", error);
                addNotification('error', 'Could not save settings.');
            }
        });
    }
    // --- End of Membership Reward Settings Logic ---

    // 1. Event listener for ALL 'View Profile' buttons (handles Report and Dashboard)
    document.addEventListener('click', (e) => {
        const button = e.target.closest('.view-profile-btn');
        if (button) {
            const clientName = button.getAttribute('data-client-name');
            if (!clientName || clientName === "null") return;
            
            // Find the full client object from your global 'aggregatedClients' array
            const clientObject = aggregatedClients.find(c => c.name === clientName);

            if (clientObject) {
                // Call your EXISTING function with the full client object
                openClientProfileModal(clientObject); 
            } else {
                // This handles new clients (like online bookings)
                const partialClient = {
                    id: null, name: clientName,
                    phone: button.getAttribute('data-client-phone') || '', // Get phone if available
                    email: button.getAttribute('data-client-email') || '', // Get email if available
                    membership: null, notes: [] 
                };
                openClientProfileModal(partialClient);
            }
        }
    });

    // 2. Listener for the Modal's Close button (if not already present)
    const closeProfileBtn = document.getElementById('close-client-profile-modal-btn');
    if (closeProfileBtn) {
        closeProfileBtn.addEventListener('click', () => {
            clientProfileModal.classList.add('hidden');
        });
    }

    // 3. Listener for the Modal's Save Notes button
    const saveNotesBtn = document.getElementById('save-new-client-note-btn'); // (Make sure your HTML button has this ID)
    if (saveNotesBtn) {
        saveNotesBtn.addEventListener('click', async () => {
            const clientId = document.getElementById('note-client-id').value;
            const noteText = document.getElementById('new-client-note-text').value; // (Make sure your textarea has this ID)
            const clientName = document.getElementById('profile-client-name').textContent;

            if (!noteText) {
                 addNotification('warning', 'Note text cannot be empty.');
                 return;
            }

            try {
                let docRef;
                if (clientId && clientId !== "null") {
                    // Client already exists, update their notes
                    docRef = doc(db, "clients", clientId);
                    await updateDoc(docRef, {
                        notes: arrayUnion({
                            text: noteText,
                            timestamp: Timestamp.now()
                        })
                    });
                } else {
                    // Client does not exist, create a new client document
                    const newClientData = {
                        name: clientName,
                        phone: document.getElementById('profile-client-phone').textContent,
                        email: document.getElementById('profile-client-email').textContent,
                        dob: '',
                        createdAt: serverTimestamp(),
                        notes: [
                            {
                                text: noteText,
                                timestamp: Timestamp.now()
                            }
                        ]
                    };
                    const newDoc = await addDoc(collection(db, "clients"), newClientData);
                    document.getElementById('note-client-id').value = newDoc.id; // Store new ID for next save
                }
                
                addNotification('success', 'Note saved successfully!');
                document.getElementById('new-client-note-text').value = ''; // Clear textarea
                
                // Refresh the modal to show the new note
                const clientObject = aggregatedClients.find(c => c.name === clientName) || {id: clientId, name: clientName};
                openClientProfileModal(clientObject);

            } catch (error) {
                console.error("Error saving note:", error);
                addNotification('error', 'Failed to save note.');
            }
        });
    }
// --- End of CRM Listeners block ---

    document.addEventListener('click', async (e) => {
        const deleteBtn = e.target.closest('.delete-note-btn');
        if (deleteBtn) {
            const clientId = deleteBtn.dataset.clientId;
            const noteTimeSeconds = parseInt(deleteBtn.dataset.noteTime); 

            if (!clientId) {
                addNotification('error', 'Cannot delete note: Client ID is missing.');
                return;
            }

            const isConfirmed = window.confirm("Are you sure you want to permanently delete this note?");
            
            if (isConfirmed) {
                try {
                    const clientRef = doc(db, "clients", clientId);
                    const docSnap = await getDoc(clientRef);
                    
                    if (docSnap.exists()) {
                        let notes = docSnap.data().notes || [];
                        
                        // Find the note object that matches the timestamp
                        const noteToRemove = notes.find(note => 
                            // CRITICAL FIX: Ensure we match the note by the exact Firestore Timestamp object
                            // and not just the property value.
                            // We use the 'seconds' value which is consistent.
                            note.timestamp && note.timestamp.seconds === noteTimeSeconds
                        );

                        if (noteToRemove) {
                            // Use arrayRemove with the exact object found in the array
                            await updateDoc(clientRef, {
                                notes: arrayRemove(noteToRemove)
                            });
                            
                            addNotification('success', 'Note successfully deleted.');

                            // --- REFRESH MODAL LOGIC ---
                            // Find the client object from the global list (which should be updated by onSnapshot)
                            const clientName = document.getElementById('profile-client-name').textContent;
                            const clientToRefresh = aggregatedClients.find(c => c.name === clientName);

                            if (clientToRefresh) {
                                openClientProfileModal(clientToRefresh);
                            } else {
                                // Fallback: just close and let onSnapshot redraw the data later
                                clientProfileModal.classList.add('hidden');
                            }
                        } else {
                            addNotification('error', 'Error: Could not find matching note object in database.');
                        }
                    } else {
                        addNotification('error', 'Client document not found.');
                    }
                } catch (error) {
                    console.error("Error deleting note:", error);
                    addNotification('error', 'Failed to delete note due to a database error.');
                }
            }
        }
    });
    // PASTE THIS ENTIRE BLOCK inside your initMainApp function

    const royaltySettingsForm = document.getElementById('royalty-settings-form');
    if (royaltySettingsForm) {
        // Load existing settings when the form is displayed
        getDoc(doc(db, "settings", "royaltyProgram")).then(docSnap => {
            if (docSnap.exists() && docSnap.data().visitsNeeded) {
                const data = docSnap.data();
                document.getElementById('royalty-visits-needed').value = data.visitsNeeded;
                document.getElementById('royalty-reward-description').value = data.rewardDescription;
                // Update the global settings variable as well
                royaltySettings = data;
            }
        });

        // Save settings when the form is submitted
        royaltySettingsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const visitsNeeded = parseInt(document.getElementById('royalty-visits-needed').value, 10);
            const rewardDescription = document.getElementById('royalty-reward-description').value;

            if (isNaN(visitsNeeded) || visitsNeeded < 1) {
                alert("Please enter a valid number of visits.");
                return;
            }

            const newSettings = {
                visitsNeeded: visitsNeeded,
                rewardDescription: rewardDescription
            };

            try {
                await setDoc(doc(db, "settings", "royaltyProgram"), newSettings);
                // Update the global settings variable so the changes are reflected immediately
                royaltySettings = newSettings;
                alert("Royalty program settings saved successfully!");
                // Also re-initialize the designer to reflect new settings
                initializeRoyaltyCardDesigner();
            } catch (error) {
                console.error("Error saving royalty settings:", error);
                alert("Could not save settings.");
            }
        });

        // PASTE THIS ENTIRE NEW BLOCK OF CODE

        // --- ROYALTY CARD ADMIN REPORT LOGIC ---
        const royaltyCardsTableBody = document.querySelector('#royalty-cards-table tbody');
        const searchRoyaltyCardsInput = document.getElementById('search-royalty-cards');
        // PASTE THIS NEW CODE BLOCK
        const addRoyaltyCardModal = document.getElementById('add-royalty-card-modal');
        const addRoyaltyCardBtn = document.getElementById('add-royalty-card-btn');
        const closeAddRoyaltyCardBtn = document.getElementById('close-add-royalty-card-modal-btn');
        const addRoyaltyCardForm = document.getElementById('add-royalty-card-form');
        const addRcClientList = document.getElementById('add-rc-client-list');

        const openAddRoyaltyCardModal = () => {
            addRcClientList.innerHTML = '';
            const clientsWithoutRoyalty = allClients.filter(c => !c.royaltyCard);
            clientsWithoutRoyalty.forEach(client => {
                addRcClientList.innerHTML += `<option value="${client.name}"></option>`;
            });
            addRoyaltyCardModal.classList.remove('hidden');
        };

        const closeAddRoyaltyCardModal = () => {
            addRoyaltyCardForm.reset();
            addRoyaltyCardModal.classList.add('hidden');
        };

        addRoyaltyCardBtn.addEventListener('click', openAddRoyaltyCardModal);
        closeAddRoyaltyCardBtn.addEventListener('click', closeAddRoyaltyCardModal);
        addRoyaltyCardModal.querySelector('.modal-overlay').addEventListener('click', closeAddRoyaltyCardModal);

        addRoyaltyCardForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const clientName = document.getElementById('add-rc-client-name').value;
            const selectedClient = allClients.find(c => c.name === clientName);

            if (!selectedClient) {
                alert("Please select a valid client from the list.");
                return;
            }

            if (selectedClient.royaltyCard) {
                alert(`${selectedClient.name} already has a royalty card.`);
                return;
            }

            try {
                const clientDocRef = doc(db, "clients", selectedClient.id);
                await updateDoc(clientDocRef, {
                    royaltyCard: {
                        visits: 0,
                        lastVisit: null
                    }
                });
                alert(`Royalty card created for ${selectedClient.name}!`);
                closeAddRoyaltyCardModal();
            } catch (error) {
                console.error("Error adding royalty card:", error);
                alert("Could not create royalty card for this client.");
            }
        });

        const renderRoyaltyCardsAdminTable = () => {
            if (!royaltyCardsTableBody) return;

            const searchTerm = searchRoyaltyCardsInput.value.toLowerCase();
            const filteredCards = allRoyaltyCards.filter(client =>
                client.name.toLowerCase().includes(searchTerm) ||
                (client.phone && client.phone.toLowerCase().includes(searchTerm))
            );

            royaltyCardsTableBody.innerHTML = '';
            if (filteredCards.length === 0) {
                royaltyCardsTableBody.innerHTML = `<tr><td colspan="5" class="py-6 text-center text-gray-400">No royalty card clients found.</td></tr>`;
                return;
            }

            filteredCards.forEach(client => {
                const visits = client.royaltyCard.visits || 0;
                const visitsNeeded = royaltySettings.visitsNeeded;
                const isRewardReady = visits >= visitsNeeded;

                const statusText = isRewardReady ? 'Reward Ready' : `${visits} / ${visitsNeeded}`;
                const statusColor = isRewardReady ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800';

                const row = royaltyCardsTableBody.insertRow();
                row.innerHTML = `
            <td class="px-6 py-4 font-medium"><span data-client-name="${client.name}" 
                          class="view-profile-btn cursor-pointer text-indigo-700 hover:text-indigo-900 hover:underline font-semibold">
                        ${client.name}
                    </span></td>
            <td class="px-6 py-4">${client.phone || 'N/A'}</td>
            <td class="px-6 py-4 text-center font-bold">${visits}</td>
            <td class="px-6 py-4 text-center"><span class="px-2 py-1 text-xs font-semibold rounded-full ${statusColor}">${statusText}</span></td>
            <td class="px-6 py-4 text-center space-x-2">
                <button data-id="${client.id}" class="stamp-royalty-card-btn text-green-500 hover:text-green-700" title="Add Visit Stamp"><i class="fas fa-stamp"></i></button>
                <button data-id="${client.id}" class="reset-royalty-card-btn text-yellow-500 hover:text-yellow-700" title="Reset Visits (After Reward)"><i class="fas fa-undo"></i></button>
                <button data-id="${client.id}" class="delete-royalty-card-btn text-red-500 hover:text-red-700" title="Remove Royalty Card"><i class="fas fa-trash"></i></button>
            </td>
        `;
            });
        };

        // Listen for all clients that have a royalty card
        onSnapshot(query(collection(db, "clients"), where("royaltyCard", "!=", null)), (snapshot) => {
            allRoyaltyCards = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderRoyaltyCardsAdminTable();
        });

        searchRoyaltyCardsInput.addEventListener('input', renderRoyaltyCardsAdminTable);

        royaltyCardsTableBody.addEventListener('click', async (e) => {
            const stampBtn = e.target.closest('.stamp-royalty-card-btn');
            const resetBtn = e.target.closest('.reset-royalty-card-btn');
            const deleteBtn = e.target.closest('.delete-royalty-card-btn');
            const clientRef = (stampBtn || resetBtn || deleteBtn)?.dataset.id;
            if (!clientRef) return;

            const clientDocRef = doc(db, "clients", clientRef);

            if (stampBtn) {
                const client = allRoyaltyCards.find(c => c.id === clientRef);
                const currentVisits = client.royaltyCard.visits || 0;
                await updateDoc(clientDocRef, {
                    "royaltyCard.visits": currentVisits + 1,
                    "royaltyCard.lastVisit": serverTimestamp()
                });
            } else if (resetBtn) {
                showConfirmModal("Are you sure you want to reset this card's visits to 0? This is usually done after a client redeems their reward.", async () => {
                    await updateDoc(clientDocRef, { "royaltyCard.visits": 0 });
                }, "Reset Card");
            } else if (deleteBtn) {
                showConfirmModal("Are you sure you want to remove the royalty card from this client? Their visit history will be lost.", async () => {
                    await updateDoc(clientDocRef, { royaltyCard: null });
                }, "Remove Card");
            }
        });

        // PASTE THIS ENTIRE NEW BLOCK OF CODE

        // --- BACKUP & RESTORE LOGIC ---
        const backupDataBtn = document.getElementById('backup-data-btn');
        const restoreDataInput = document.getElementById('restore-data-input');
        const autoBackupSelect = document.getElementById('auto-backup-frequency');
        const lastBackupStatusEl = document.getElementById('last-backup-status');

        const collectionsToBackup = [
            'users', 'clients', 'appointments', 'finished_clients', 'earnings', 'salon_earnings',
            'expenses', 'inventory', 'promotions', 'services', 'nail_ideas', 'gift_cards',
            'memberships', 'suppliers', 'color_brands', 'expense_categories', 'payment_accounts'
        ];

        // Helper to convert Firestore Timestamps to strings
        const processDataForBackup = (data) => {
            if (data instanceof Timestamp) {
                return { __fsTimestamp: true, value: data.toDate().toISOString() };
            }
            if (Array.isArray(data)) {
                return data.map(processDataForBackup);
            }
            if (data !== null && typeof data === 'object') {
                const newData = {};
                for (const key in data) {
                    newData[key] = processDataForBackup(data[key]);
                }
                return newData;
            }
            return data;
        };

        // Helper to convert strings back to Firestore Timestamps
        const processDataForRestore = (data) => {
            if (data && data.__fsTimestamp) {
                return Timestamp.fromDate(new Date(data.value));
            }
            if (Array.isArray(data)) {
                return data.map(processDataForRestore);
            }
            if (data !== null && typeof data === 'object') {
                const newData = {};
                for (const key in data) {
                    newData[key] = processDataForRestore(data[key]);
                }
                return newData;
            }
            return data;
        };

        const backupAllData = async () => {
            alert("Starting backup process. This may take a moment. Your download will begin automatically.");
            backupDataBtn.disabled = true;
            backupDataBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Backing up...';

            const backupObject = {};
            try {
                for (const collectionName of collectionsToBackup) {
                    const querySnapshot = await getDocs(collection(db, collectionName));
                    backupObject[collectionName] = querySnapshot.docs.map(doc => ({
                        id: doc.id,
                        ...processDataForBackup(doc.data())
                    }));
                }

                const jsonString = JSON.stringify(backupObject, null, 2);
                const blob = new Blob([jsonString], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `nailexpress_backup_${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                // Update last backup timestamp
                const now = Timestamp.now();
                await setDoc(doc(db, "settings", "backup"), { ...backupSettings, lastBackup: now }, { merge: true });

            } catch (error) {
                console.error("Backup failed:", error);
                alert("Backup failed. Please check the console for details.");
            } finally {
                backupDataBtn.disabled = false;
                backupDataBtn.innerHTML = '<i class="fas fa-download mr-2"></i> Backup All Data';
            }
        };

        const handleRestore = (event) => {
            const file = event.target.files[0];
            if (!file) return;

            const confirmation = prompt('This is a highly destructive action that will overwrite ALL existing data. To confirm, please type "RESTORE" in the box below.');
            if (confirmation !== "RESTORE") {
                alert("Restore cancelled.");
                restoreDataInput.value = ''; // Clear the input
                return;
            }

            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    alert("Restore process starting. The app will be unresponsive until it is complete. You will be alerted upon completion.");

                    for (const collectionName in data) {
                        if (data.hasOwnProperty(collectionName)) {
                            const collectionData = data[collectionName];
                            const batch = writeBatch(db);
                            for (const docData of collectionData) {
                                const { id, ...restOfData } = docData;
                                const processedData = processDataForRestore(restOfData);
                                const docRef = doc(db, collectionName, id);
                                batch.set(docRef, processedData);
                            }
                            await batch.commit();
                        }
                    }
                    alert("Data restore completed successfully! The page will now reload.");
                    window.location.reload();
                } catch (error) {
                    console.error("Restore failed:", error);
                    alert("Restore failed. The backup file may be corrupt. Please check the console for details.");
                } finally {
                    restoreDataInput.value = '';
                }
            };
            reader.readAsText(file);
        };

        const checkAutoBackup = () => {
            if (backupSettings.frequency === 'off' || !backupSettings.lastBackup) {
                return;
            }
            const lastBackupDate = backupSettings.lastBackup.toDate();
            const now = new Date();
            let daysSinceLastBackup = (now - lastBackupDate) / (1000 * 60 * 60 * 24);

            let shouldBackup = false;
            if (backupSettings.frequency === 'daily' && daysSinceLastBackup >= 1) {
                shouldBackup = true;
            } else if (backupSettings.frequency === 'weekly' && daysSinceLastBackup >= 7) {
                shouldBackup = true;
            } else if (backupSettings.frequency === 'monthly' && daysSinceLastBackup >= 30) {
                shouldBackup = true;
            }

            if (shouldBackup) {
                if (confirm("It's time for your scheduled backup. Do you want to download the backup file now?")) {
                    backupAllData();
                }
            }
        };

        backupDataBtn.addEventListener('click', backupAllData);
        restoreDataInput.addEventListener('change', handleRestore);

        autoBackupSelect.addEventListener('change', async (e) => {
            const newFrequency = e.target.value;
            try {
                await setDoc(doc(db, "settings", "backup"), { frequency: newFrequency }, { merge: true });
                backupSettings.frequency = newFrequency;
            } catch (error) {
                console.error("Failed to save backup frequency:", error);
            }
        });

        onSnapshot(doc(db, "settings", "backup"), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                backupSettings = data;
                autoBackupSelect.value = data.frequency || 'weekly';
                if (data.lastBackup) {
                    lastBackupStatusEl.textContent = `Last backup: ${data.lastBackup.toDate().toLocaleString()}`;
                } else {
                    lastBackupStatusEl.textContent = 'No backup recorded.';
                }
                // Run check on first load for admin
                if (currentUserRole === 'admin') {
                    checkAutoBackup();
                }
            }
        });

// --- NEW E-COMMERCE SETTINGS LISTENER ---
// --- END E-COMMERCE SETTINGS LISTENER ---

        // PASTE THIS ENTIRE NEW BLOCK OF CODE
        // --- TASK MANAGER LOGIC ---
        const addTaskForm = document.getElementById('add-task-form');
        const taskListContainer = document.getElementById('task-list-container');
        const editTaskModal = document.getElementById('edit-task-modal');
        const editTaskForm = document.getElementById('edit-task-form');
        const closeEditTaskBtn = document.getElementById('close-edit-task-modal-btn');

        const renderTasks = () => {
            const supplyContainer = document.getElementById('task-list-supply');
            const maintenanceContainer = document.getElementById('task-list-maintenance');
            const otherContainer = document.getElementById('task-list-other');

            if (!supplyContainer || !maintenanceContainer || !otherContainer) return;

            supplyContainer.innerHTML = '';
            maintenanceContainer.innerHTML = '';
            otherContainer.innerHTML = '';

            const tasksByCategory = {
                'Nails Supply': allTasks.filter(t => t.category === 'Nails Supply').sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0)),
                'Maintenance': allTasks.filter(t => t.category === 'Maintenance').sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0)),
                'Other': allTasks.filter(t => t.category === 'Other').sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0))
            };

            const createTaskElement = (task) => {
                const categoryStyles = {
                    'Nails Supply': { border: 'border-blue-500', bg: 'bg-blue-50', icon: 'fa-shopping-cart' },
                    'Maintenance': { border: 'border-yellow-500', bg: 'bg-yellow-50', icon: 'fa-tools' },
                    'Other': { border: 'border-gray-400', bg: 'bg-gray-50', icon: 'fa-clipboard-list' }
                };
                const styles = categoryStyles[task.category] || categoryStyles['Other'];

                const taskEl = document.createElement('div');
                taskEl.className = `task-item flex items-center justify-between p-3 rounded-lg border-l-4 ${styles.border} ${styles.bg}`;
                taskEl.innerHTML = `
            <div class="flex items-center flex-grow min-w-0">
                <i class="fas ${styles.icon} mr-3 text-gray-500"></i>
                <span class="task-description flex-grow ${task.completed ? 'completed' : ''} truncate">${task.description}</span>
            </div>
            <div class="task-actions flex items-center gap-3 ml-4 flex-shrink-0">
                <button data-id="${task.id}" class="edit-task-btn text-blue-500 hover:text-blue-700" title="Edit Task"><i class="fas fa-edit"></i></button>
                <button data-id="${task.id}" class="complete-task-btn text-green-500 hover:text-green-700" title="Complete Task"><i class="fas ${task.completed ? 'fa-check-square' : 'fa-square'}"></i></button>
                <button data-id="${task.id}" class="delete-task-btn text-red-500 hover:text-red-700" title="Delete Task"><i class="fas fa-trash"></i></button>
            </div>
        `;
                return taskEl;
            };

            if (tasksByCategory['Nails Supply'].length > 0) {
                tasksByCategory['Nails Supply'].forEach(task => supplyContainer.appendChild(createTaskElement(task)));
            } else {
                supplyContainer.innerHTML = '<p class="text-xs text-center text-gray-400 py-2">No supply tasks.</p>';
            }

            if (tasksByCategory['Maintenance'].length > 0) {
                tasksByCategory['Maintenance'].forEach(task => maintenanceContainer.appendChild(createTaskElement(task)));
            } else {
                maintenanceContainer.innerHTML = '<p class="text-xs text-center text-gray-400 py-2">No maintenance tasks.</p>';
            }

            if (tasksByCategory['Other'].length > 0) {
                tasksByCategory['Other'].forEach(task => otherContainer.appendChild(createTaskElement(task)));
            } else {
                otherContainer.innerHTML = '<p class="text-xs text-center text-gray-400 py-2">No other tasks.</p>';
            }
        };

        if (addTaskForm) {
            addTaskForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const descriptionInput = document.getElementById('task-description');
                const category = document.getElementById('task-category').value;
                const description = descriptionInput.value.trim();

                if (description) {
                    try {
                        await addDoc(collection(db, "tasks"), { description, category, completed: false, createdAt: serverTimestamp() });
                        descriptionInput.value = '';
                    } catch (error) {
                        console.error("Error adding task:", error);
                        alert("Could not add the task.");
                    }
                }
            });
        }

        if (taskListContainer) {
            taskListContainer.addEventListener('click', async (e) => {
                const completeBtn = e.target.closest('.complete-task-btn');
                const deleteBtn = e.target.closest('.delete-task-btn');
                const editBtn = e.target.closest('.edit-task-btn');

                if (editBtn) {
                    const taskId = editBtn.dataset.id;
                    const task = allTasks.find(t => t.id === taskId);
                    if (task) {
                        openEditTaskModal(task);
                    }
                } else if (completeBtn) {
                    const taskId = completeBtn.dataset.id;
                    const task = allTasks.find(t => t.id === taskId);
                    if (task) {
                        await updateDoc(doc(db, "tasks", taskId), { completed: !task.completed });
                    }
                } else if (deleteBtn) {
                    const taskId = deleteBtn.dataset.id;
                    showConfirmModal("Are you sure you want to delete this task?", async () => {
                        await deleteDoc(doc(db, "tasks", taskId));
                    });
                }
            });
        }

        const openEditTaskModal = (task) => {
            editTaskForm.reset();
            document.getElementById('edit-task-id').value = task.id;
            document.getElementById('edit-task-description').value = task.description;
            document.getElementById('edit-task-category').value = task.category;
            editTaskModal.classList.remove('hidden');
        };

        const closeEditTaskModal = () => {
            editTaskModal.classList.add('hidden');
        };

        if (closeEditTaskBtn) {
            closeEditTaskBtn.addEventListener('click', closeEditTaskModal);
        }
        if (editTaskModal) {
            editTaskModal.querySelector('.modal-overlay').addEventListener('click', closeEditTaskModal);
        }

        if (editTaskForm) {
            editTaskForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const taskId = document.getElementById('edit-task-id').value;
                const newDescription = document.getElementById('edit-task-description').value;
                const newCategory = document.getElementById('edit-task-category').value;

                if (taskId && newDescription) {
                    try {
                        await updateDoc(doc(db, "tasks", taskId), {
                            description: newDescription,
                            category: newCategory
                        });
                        closeEditTaskModal();
                    } catch (error) {
                        console.error("Error updating task:", error);
                        alert("Could not update task.");
                    }
                }
            });
        }

        onSnapshot(query(collection(db, "tasks"), orderBy("createdAt", "desc")), (snapshot) => {
            allTasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderTasks();
        });

        // --- END TASK MANAGER LOGIC ---  

// PASTE THIS inside initMainApp()
// --- NEW FUNCTION TO SAVE E-COMMERCE SETTINGS ---
const saveEcommerceSettings = async (e) => {
    e.preventDefault();
    const taxRateInput = document.getElementById('admin-tax-rate').value;
    const shippingFeeInput = document.getElementById('admin-shipping-fee').value;
    // --- FIX: Read and save online GC start number ---
    const onlineGcStart = parseInt(document.getElementById('online-gc-start-number').value, 10);
    if (isNaN(onlineGcStart) || onlineGcStart < 1000) {
        alert("Online Gift Card Start Number must be a number and at least 1000.");
        return;
    }
    // --- End fix ---
    // Convert percentage input (e.g., 8.25) to a decimal (e.g., 0.0825) for storage
    const taxRate = parseFloat(taxRateInput) / 100; 
    const shippingFee = parseFloat(shippingFeeInput);

    if (isNaN(taxRate) || isNaN(shippingFee)) {
        alert("Please enter valid numbers for Tax Rate and Shipping Fee.");
        return;
    }

    try {
        const settingsRef = doc(db, "settings", "ecommerce");
       // --- FIX: Add onlineGcStartNumber to saved data ---
        await setDoc(settingsRef, {
            taxRate: taxRate,
            shippingFee: shippingFee,
            onlineGcStartNumber: onlineGcStart // Save the start number
            // We'll update lastUsedOnlineGcNumber separately when a card is generated
        }, { merge: true });
        // --- End fix ---

        alert("E-commerce fee settings saved successfully! Cart totals will now update.");
    } catch (error) {
        console.error("Error saving E-commerce settings: ", error);
        alert("Failed to save settings. Check console for details.");
    }
};

// ATTACH THE EVENT LISTENER (e.g., at the end of initMainApp)
document.getElementById('ecommerce-settings-form')?.addEventListener('submit', saveEcommerceSettings);
// --- END SAVE LOGIC ---

// PASTE THIS ENTIRE BLOCK inside initMainApp()

if (userRole === 'admin') {
    let holidayCalYear = new Date().getFullYear();
    let holidayCalMonth = new Date().getMonth();

    document.getElementById('prev-holiday-month-btn')?.addEventListener('click', () => {
        holidayCalMonth--;
        if (holidayCalMonth < 0) { holidayCalMonth = 11; holidayCalYear--; }
        renderHolidayCalendar();
    });

    document.getElementById('next-holiday-month-btn')?.addEventListener('click', () => {
        holidayCalMonth++;
        if (holidayCalMonth > 11) { holidayCalMonth = 0; holidayCalYear++; }
        renderHolidayCalendar();
    });

    document.getElementById('holiday-calendar-grid')?.addEventListener('click', async (e) => {
        const cell = e.target.closest('.day-cell');
        if (cell && cell.dataset.date) {
            const dateStr = cell.dataset.date;
            let updatedDates = [...holidaySettings.dates];
            if (updatedDates.includes(dateStr)) {
                updatedDates = updatedDates.filter(d => d !== dateStr); // Remove date
            } else {
                updatedDates.push(dateStr); // Add date
            }
            try {
                await setDoc(doc(db, "settings", "holidays"), { ...holidaySettings, dates: updatedDates });
            } catch (error) {
                console.error("Error updating holidays:", error);
                alert("Could not update holiday dates.");
            }
        }
    });

    document.getElementById('save-holiday-message-btn')?.addEventListener('click', async () => {
        const newMessage = document.getElementById('holiday-message').value;
        try {
            await setDoc(doc(db, "settings", "holidays"), { ...holidaySettings, message: newMessage });
            alert("Closure message saved!");
        } catch (error) {
            console.error("Error saving holiday message:", error);
            alert("Could not save message.");
        }
    });

    const holidayMessageTextarea = document.getElementById('holiday-message');
    if (holidayMessageTextarea) holidayMessageTextarea.value = holidaySettings.message;

    renderHolidayCalendar();
    renderHolidayList();
}

// PASTE THIS NEW BLOCK inside initMainApp()
const checkDateForHoliday = (e) => {
    const input = e.target;
    const warningElId = input.id.includes('landing') ? 'holiday-warning-landing' : 'holiday-warning-modal';
    const warningEl = document.getElementById(warningElId);

    if (!warningEl) return; // <-- ADD THIS LINE to prevent the error

    if (input.value) {
        const selectedDate = new Date(input.value);
        const validation = isBookingTimeValid(selectedDate);
        if (!validation.valid && validation.message.includes('closed')) {
            warningEl.textContent = validation.message;
            warningEl.classList.remove('hidden');
        } else {
            warningEl.classList.add('hidden');
        }
    } else {
        warningEl.classList.add('hidden');
    }
};

document.getElementById('appointment-datetime-landing')?.addEventListener('input', checkDateForHoliday);
document.getElementById('appointment-datetime')?.addEventListener('input', checkDateForHoliday);


onSnapshot(doc(db, "settings", "holidays"), (docSnap) => {
    if (docSnap.exists()) {
        holidaySettings = docSnap.data();
    } else {
        // If it doesn't exist, create it with defaults
        setDoc(doc(db, "settings", "holidays"), holidaySettings);
    }
    // Re-render calendars if they are visible
    if (currentUserRole === 'admin') {
        renderHolidayCalendar();
        renderHolidayList();
    }
    renderCalendar(currentYear, currentMonth, currentTechFilterCalendar);
});

        // END OF initMainApp }
    }
    // PASTE THESE NEW FUNCTIONS inside initMainApp, after the royalty settings form listener

    const royaltyCardDesignerForm = document.getElementById('royalty-card-designer-form');
    const printRoyaltyCardsBtn = document.getElementById('print-royalty-cards-btn');

    const initializeRoyaltyCardDesigner = () => {
        const visitsNeeded = royaltySettings.visitsNeeded || 10;
        const rewardText = royaltySettings.rewardDescription || 'Free Service';

        // --- Generate Preview Stamps ---
        let previewStampsHTML = '';
        for (let i = 1; i <= visitsNeeded; i++) {
            previewStampsHTML += `<div class="stamp-outline">${i}</div>`;
        }

        // --- Populate Front Preview ---
        const frontPreview = document.getElementById('royalty-card-preview-front');
        frontPreview.innerHTML = `
        <div class="royalty-card-header">
            <p class="font-parisienne text-3xl">Nails Express</p>
            <p class="text-xs font-semibold tracking-wider">ROYALTY CARD</p>
        </div>
        <div class="stamp-grid-designer">
            ${previewStampsHTML}
        </div>
        <div class="royalty-card-footer text-center">
            <p class="text-xs">Complete all visits to earn a ${rewardText}!</p>
        </div>
    `;

        // --- Populate Back Preview ---
        const backPreview = document.getElementById('royalty-card-preview-back');
        backPreview.innerHTML = `
        <div class="text-center pt-4">
             <p class="font-bold">Royalty Program Rules</p>
        </div>
        <p class="text-xs text-center text-gray-600 px-4 leading-relaxed">
            One stamp per visit. This card is non-transferable and has no cash value. Cannot be combined with other offers. Lost cards cannot be replaced.
        </p>
        <div class="text-center text-xs pb-2">
            <p class="font-bold">Nails Express</p>
            <p>1560 Hustonville Rd #345, Danville, KY 40422</p>
        </div>
    `;
    };

    // REPLACE your old handlePrintRoyaltyCards function with this new one:
    const handlePrintRoyaltyCards = () => {
        const quantity = parseInt(document.getElementById('designer-royalty-quantity').value, 10);
        if (isNaN(quantity) || quantity < 1) {
            alert("Please enter a valid quantity.");
            return;
        }

        const visitsNeeded = royaltySettings.visitsNeeded || 10;
        const rewardText = royaltySettings.rewardDescription || 'Free Service';

        let stampsHTML = '';
        for (let i = 1; i <= visitsNeeded; i++) {
            stampsHTML += `<div class="stamp-outline">${i}</div>`;
        }

        let printHTML = `
        <html><head><title>Print Royalty Cards</title><script src="https://cdn.tailwindcss.com"><\/script><link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Poppins:wght@400;600&family=Parisienne&display=swap" rel="stylesheet">
        <style>
            body{font-family:'Poppins',sans-serif;margin:0;background-color:#f0f0f0;}
            .font-parisienne{font-family:'Parisienne',cursive;}
            .print-page { display: flex; flex-wrap: wrap; justify-content: start; align-content: start; gap: 10mm; padding: 10mm; page-break-after: always; }
            .card-container{display:grid;grid-template-columns:repeat(2, 1fr);gap:0; width: fit-content;}
            .card{width:400px;height:228px;box-shadow: 0 4px 8px rgba(0,0,0,0.2);-webkit-print-color-adjust: exact !important; color-adjust: exact !important;}
            .royalty-card-header { text-align: center; padding-top: 8px; color: #831843;}
            .stamp-grid-designer { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; padding: 0 16px;}
            .stamp-outline { width: 40px; height: 40px; border: 2px dashed #fb7185; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: bold; color: #fb7185; margin: auto; }
            @media print {
                body { padding: 0; background-color: #fff; }
                .card { box-shadow: none; border: 1px solid #eee; }
            }
        </style></head><body><div class="print-page">
    `;

        for (let i = 0; i < quantity; i++) {
            printHTML += `
            <div class="card-container">
                <!-- Front of Card -->
                <div class="card rounded-lg p-4 flex flex-col justify-between bg-gradient-to-br from-pink-50 to-pink-200 text-pink-900">
                    <div class="royalty-card-header">
                        <p class="font-parisienne text-3xl">Nails Express</p>
                        <p class="text-xs font-semibold tracking-wider">ROYALTY CARD</p>
                    </div>
                    <div class="stamp-grid-designer">${stampsHTML}</div>
                    <div class="royalty-card-footer text-center"><p class="text-xs">Complete all visits to earn a ${rewardText}!</p></div>
                </div>
                <!-- Back of Card -->
                <div class="card rounded-lg p-4 flex flex-col justify-between bg-white text-gray-800" style="text-shadow: none;">
                    <div class="w-full h-10 bg-black mt-2"></div> 
                    <div class="text-center pt-2"><p class="font-bold">Royalty Program Rules</p></div>
                    <p class="text-xs text-center text-gray-600 px-4 leading-relaxed">
                        One stamp per visit. This card is non-transferable and has no cash value. Cannot be combined with other offers. Lost cards cannot be replaced.
                    </p>
                    <div class="text-center text-xs pb-2"><p class="font-bold">Nails Express</p><p>1560 Hustonville Rd #345, Danville, KY 40422</p></div>
                </div>
            </div>
        `;
        }

        printHTML += '</div></body></html>';

        const printWindow = window.open('', '_blank');
        printWindow.document.write(printHTML);
        printWindow.document.close();
        printWindow.focus();
    };

    printRoyaltyCardsBtn.addEventListener('click', handlePrintRoyaltyCards);

    // Call the initializer to draw the preview when the page loads
    initializeRoyaltyCardDesigner();
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
    let aggregatedClients = [], allEarnings = [], allSalonEarnings = [], allExpenses = [], allInventory = [], allNailIdeas = [], allInventoryUsage = [], allGiftCards = [], allPromotions = [], technicianColorMap = {}, sentReminderIds = [], allMemberships = [], currentRotation = 0;
    let allEcommProducts = [], allEcommOrders = []; // <-- ADD THIS LINE

    // ... more variables
    let allExpenseCategories = [], allPaymentAccounts = [], allSuppliers = [];
    // Add these two new variables
    let currentExpenseCategoryFilter = 'all';
    let currentExpenseSupplierFilter = 'all';
    // ADD THIS ENTIRE NEW BLOCK for the lightbox
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

// --- ADD THIS ENTIRE NEW BLOCK FOR THE REVIEW MODAL ---
const viewReviewModal = document.getElementById('view-review-modal');

const openViewReviewModal = (client) => {
    if (!client || !client.rating) return; // Don't open if there is no rating

    document.getElementById('view-review-modal-title').textContent = `Review from ${client.name}`;

    // Reuse your existing renderStars function to show the rating
    document.getElementById('view-review-stars').innerHTML = renderStars(client.rating);

    // Display the review text, or a default message if none was left
    document.getElementById('view-review-text').textContent = client.review || "No written review was provided.";

    viewReviewModal.classList.remove('hidden');
};

const closeViewReviewModal = () => {
    viewReviewModal.classList.add('hidden');
};

// Add event listeners to close the new modal
document.getElementById('close-view-review-modal-btn').addEventListener('click', closeViewReviewModal);
viewReviewModal.querySelector('.modal-overlay').addEventListener('click', closeViewReviewModal);
// --- END OF NEW BLOCK ---


    // REPLACE your old getDateRange function with this corrected one:
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
                break; // <-- This was missing
            case 'last-year':
                const lastYear = now.getFullYear() - 1;
                startDate = new Date(lastYear, 0, 1);
                endDate = new Date(lastYear, 11, 31, 23, 59, 59, 999);
                break; // <-- This was also missing
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


    // --- ADD THIS ENTIRE NEW BLOCK inside initMainApp() ---
    
    let profitChart;
    const renderProfitDashboard = () => {
        const rangeFilter = document.getElementById('profit-dashboard-range-filter').value;
        const dateFilter = document.getElementById('profit-dashboard-date-filter').value;
        
        const { startDate, endDate } = getDateRange(rangeFilter, dateFilter);
        if (!startDate) return;

        // 1. Filter Data
        const filteredExpenses = allExpenses.filter(ex => {
            const expDate = ex.date.toDate();
            return expDate >= startDate && expDate <= endDate;
        });
        const filteredSalonEarnings = allSalonEarnings.filter(e => {
            const earnDate = e.date.toDate();
            return earnDate >= startDate && earnDate <= endDate;
        });

        // 2. Calculate KPIs
        const totalExpenses = filteredExpenses.reduce((sum, ex) => sum + ex.amount, 0);
        
        const totalRevenue = filteredSalonEarnings.reduce((sum, earning) => {
            let dailyTotal = 0;
            techniciansAndStaff.forEach(tech => {
                dailyTotal += earning[tech.name.toLowerCase()] || 0;
            });
            dailyTotal += earning.sellGiftCard || 0;
            return sum + dailyTotal;
        }, 0);

        const netProfit = totalRevenue - totalExpenses;
        const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
        
        document.getElementById('profit-total-revenue').textContent = `$${totalRevenue.toFixed(2)}`;
        document.getElementById('profit-total-expenses').textContent = `$${totalExpenses.toFixed(2)}`;
        document.getElementById('profit-net-profit').textContent = `$${netProfit.toFixed(2)}`;
        document.getElementById('profit-margin').textContent = `${profitMargin.toFixed(1)}%`;
        
        // 3. Prepare Chart Data
        const dataMap = new Map();
        const addData = (date, revenue = 0, expense = 0) => {
            const key = getLocalDateString(date);
            if (!dataMap.has(key)) {
                dataMap.set(key, { revenue: 0, expense: 0 });
            }
            const entry = dataMap.get(key);
            entry.revenue += revenue;
            entry.expense += expense;
        };
        
        filteredSalonEarnings.forEach(earning => {
            let dailyTotal = 0;
            techniciansAndStaff.forEach(tech => { dailyTotal += earning[tech.name.toLowerCase()] || 0; });
            dailyTotal += earning.sellGiftCard || 0;
            addData(earning.date.toDate(), dailyTotal, 0);
        });

        filteredExpenses.forEach(expense => {
            addData(expense.date.toDate(), 0, expense.amount);
        });

        const sortedData = Array.from(dataMap.entries()).sort((a, b) => new Date(a[0]) - new Date(b[0]));
        
        const labels = sortedData.map(entry => new Date(entry[0] + 'T00:00:00').toLocaleDateString());
        const revenueData = sortedData.map(entry => entry[1].revenue);
        const expenseData = sortedData.map(entry => entry[1].expense);

        // 4. Render Chart
        const ctx = document.getElementById('profit-chart')?.getContext('2d');
        if (!ctx) return;
        
        const chartConfig = {
            labels,
            datasets: [
                {
                    label: 'Total Revenue',
                    data: revenueData,
                    backgroundColor: 'rgba(54, 162, 235, 0.5)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 2,
                    tension: 0.1,
                    fill: true
                },
                {
                    label: 'Total Expenses',
                    data: expenseData,
                    backgroundColor: 'rgba(255, 99, 132, 0.5)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 2,
                    tension: 0.1,
                    fill: true
                }
            ]
        };
        profitChart = initializeChart(profitChart, ctx, 'line', chartConfig, { responsive: true, maintainAspectRatio: false });
    };

    // --- Setup the filter for the new dashboard ---
    setupReportDateFilters('profit-dashboard-range-filter', 'profit-dashboard-date-filter', renderProfitDashboard);
    document.getElementById('profit-dashboard-range-filter').value = String(new Date().getMonth());

    
    // --- NEW DASHBOARD LOGIC ---

    
    const updateDashboard = () => {
        if (currentUserRole === 'admin') {
            updateAdminDashboard();
        } else {
            updateStaffDashboard();
        }
    };
    // DELETE the old cardColors array and REPLACE it with this new palette


    const updateStaffEarningsReport = (filteredSalonData) => {
        const staffContainer = document.getElementById('staff-earning-cards-container');
        const ctx = document.getElementById('staff-earnings-chart')?.getContext('2d');
        if (!staffContainer || !ctx) return;

        const staffTotals = {};
        const staffExcludingAdmins = techniciansAndStaff.filter(user => user.role !== 'admin');
        staffExcludingAdmins.forEach(staff => { staffTotals[staff.name] = 0; });
        filteredSalonData.forEach(earning => {
            staffExcludingAdmins.forEach(staff => {
                if (earning[staff.name.toLowerCase()]) {
                    staffTotals[staff.name] += earning[staff.name.toLowerCase()];
                }
            });
        });

        staffContainer.innerHTML = '';
        staffExcludingAdmins.forEach((staff, index) => {
            const payoutType = staff.payoutType || 'standard';
            const totalEarning = staffTotals[staff.name] || 0;
            let totalPayout;

            if (payoutType === 'commission_plus_tips') {
                const { startDate, endDate } = getDateRange(currentDashboardRangeFilter, currentDashboardDateFilter);
                const staffPeriodEarnings = allEarnings.filter(e => {
                    const earnDate = e.date.toDate();
                    return e.staffName === staff.name && earnDate >= startDate && earnDate <= endDate;
                });
                const totalTip = staffPeriodEarnings.reduce((sum, e) => sum + (e.tip || 0), 0);
                totalPayout = (totalEarning * 0.70) + totalTip;
            } else {
                totalPayout = totalEarning * 0.70;
            }

            const checkPayout = totalPayout * 0.70;
            const cashPayout = totalPayout - checkPayout;
            const colorTheme = colorPalette[index % colorPalette.length];
            const cardHTML = `
            <div class="dashboard-card ${colorTheme.card} p-4 flex flex-col">
                <div><h4 class="font-bold ${colorTheme.text} truncate">${staff.name}</h4><p class="text-2xl font-bold text-gray-700 mb-2">$${totalEarning.toFixed(2)}</p></div>
                <div class="mt-auto space-y-1 text-xs text-gray-600 border-t border-gray-400/20 pt-2">
                    <div class="flex justify-between"><span>Total Payout:</span><span class="font-semibold text-gray-800">$${totalPayout.toFixed(2)}</span></div>
                    <div class="flex justify-between"><span>Check Payout:</span><span class="font-semibold text-gray-800">$${checkPayout.toFixed(2)}</span></div>
                    <div class="flex justify-between"><span>Cash Payout:</span><span class="font-semibold text-gray-800">$${cashPayout.toFixed(2)}</span></div>
                </div>
            </div>`;
            staffContainer.innerHTML += cardHTML;
        });
        // Chart rendering logic remains the same
        const labels = Object.keys(staffTotals);
        const data = Object.values(staffTotals);
        const backgroundColors = labels.map((_, index) => colorPalette[index % colorPalette.length].bg);
        const borderColors = labels.map((_, index) => colorPalette[index % colorPalette.length].border);
        staffEarningsChart = initializeChart(staffEarningsChart, ctx, 'bar', { labels, datasets: [{ label: 'Total Earnings', data, backgroundColor: backgroundColors, borderColor: borderColors, borderWidth: 1 }] }, { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } });
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
        const { startDate, endDate } = getDateRange(currentStaffDashboardRangeFilter, currentStaffDashboardDateFilter);
        if (!startDate) return;

        const mySalonEarnings = allSalonEarnings.filter(e => e.date.toDate() >= startDate && e.date.toDate() <= endDate);
        const myFilteredEarnings = allEarnings.filter(e => e.staffName === currentUserName && e.date.toDate() >= startDate && e.date.toDate() <= endDate);

        const staffNameLower = currentUserName.toLowerCase();
        const myTotalEarning = mySalonEarnings.reduce((sum, e) => sum + (e[staffNameLower] || 0), 0);
        const myTotalTips = myFilteredEarnings.reduce((sum, e) => sum + (e.tip || 0), 0);

        const staffMember = techniciansAndStaff.find(s => s.name === currentUserName);
        const payoutType = staffMember ? staffMember.payoutType : 'standard';
        let myTotalPayout;
        if (payoutType === 'commission_plus_tips') {
            myTotalPayout = (myTotalEarning * 0.70) + myTotalTips;
        } else {
            myTotalPayout = myTotalEarning * 0.70;
        }
        const myCheckPayout = myTotalPayout * 0.70;
        const myCashPayout = myTotalPayout - myCheckPayout;

        document.getElementById('my-earning-card').textContent = `$${myTotalEarning.toFixed(2)}`;
        document.getElementById('my-total-payout-card').textContent = `$${myTotalPayout.toFixed(2)}`;
        document.getElementById('my-cash-payout-card').textContent = `$${myCashPayout.toFixed(2)}`;
        document.getElementById('my-check-payout-card').textContent = `$${myCheckPayout.toFixed(2)}`;
        document.getElementById('my-tips-card').textContent = `$${myTotalTips.toFixed(2)}`;

        const myUpcomingAppointments = allAppointments.filter(appt => appt.technician === currentUserName && appt.appointmentTimestamp.toDate() > new Date());
        const myClientNames = new Set(allFinishedClients.filter(client => client.technician === currentUserName).map(client => client.name));
        document.getElementById('my-appointments-card').textContent = myUpcomingAppointments.length;
        document.getElementById('my-clients-card').textContent = myClientNames.size;

        updateMyEarningsChart(mySalonEarnings, currentStaffDashboardRangeFilter, currentUserName);

        const detailsDateFilter = document.getElementById('staff-details-date-filter').value;
        let myPayoutDetails = allEarnings.filter(e => e.staffName === currentUserName);
        if (detailsDateFilter) {
            const specificDate = new Date(detailsDateFilter + 'T00:00:00');
            myPayoutDetails = myPayoutDetails.filter(e => e.date.toDate() >= specificDate && e.date.toDate() < new Date(specificDate.getTime() + 24 * 60 * 60 * 1000));
        }
        document.getElementById('staff-details-title').textContent = `My Earning Details (${myPayoutDetails.length} Client${myPayoutDetails.length === 1 ? '' : 's'})`;
        const { totalEarning, totalTip } = renderStaffEarningsTable(myPayoutDetails, 'staff-dashboard-earning-table', 'staff-dashboard-total-earning', 'staff-dashboard-total-tip');
        document.getElementById('staff-dashboard-filtered-earning-total-main').textContent = `Total ($${totalEarning.toFixed(2)})`;
        document.getElementById('staff-dashboard-filtered-earning-total-tip').textContent = `Tip ($${totalTip.toFixed(2)})`;
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
                <td class="px-6 py-3 font-medium">
                    <span data-client-name="${appt.name}" 
                          class="view-profile-btn cursor-pointer text-indigo-700 hover:text-indigo-900 hover:underline font-semibold">
                        ${appt.name}
                    </span>
                </td>
                <td class="px-6 py-3">${Array.isArray(appt.services) ? appt.services.join(', ') : appt.services}</td>
                <td class="px-6 py-3">${appt.technician}</td>
                <td class="px-6 py-3 text-center">${appt.people || 1}</td>
                <td class="px-6 py-3">${new Date(appt.appointmentTimestamp.seconds * 1000).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</td>
                
                <!-- UPDATED ACTION CELL -->
                <td class="px-6 py-3 text-center space-x-4">
                    <!-- 1. NEW "VIEW PROFILE" BUTTON -->
                    <button data-client-name="${appt.name}" 
                            class="view-profile-btn text-indigo-500 hover:text-indigo-700" 
                            title="View Client Profile">
                        <i class="fas fa-user-circle text-lg"></i>
                    </button>
                    
                    <!-- 2. EXISTING "CHECK IN" BUTTON -->
                    <button data-id="${appt.id}" class="checkin-today-btn text-blue-500 hover:underline">Check In</button>
                </td>
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

    // --- THIS BLOCK IS NOW CORRECTLY PLACED AND UPDATED ---
    allServicesList = []; // Reset the list
    Object.values(servicesData).forEach(categoryItems => {
        categoryItems.forEach(service => {
            if (service.name && service.price) {
                const priceValue = parseFloat(String(service.price).replace(/[^0-9.]/g, ''));
                if (!isNaN(priceValue)) {
                    allServicesList.push({
                        name: service.name,
                        price: priceValue,
                        duration: service.duration || bookingSettings.defaultDuration
                    });
                }
            }
        });
    });
    // --- END OF BLOCK ---

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
        
        // 1. Update the colspan to 7 (6 previous columns + 1 Technician column)
        tbody.innerHTML = clients.length === 0 ? `<tr><td colspan="7" class="py-6 text-center text-gray-400">No clients in the queue.</td></tr>` : '';
        
        clients.forEach((client, index) => {
            // Get the technician name, defaulting to 'Unassigned' if the field is empty
            const assignedTech = client.technician || 'Unassigned'; 

            const row = tbody.insertRow();
            row.className = 'bg-white border-b';
            
            // 2. Update row.innerHTML with the new column
            row.innerHTML = `
                <td class="px-6 py-4 text-center font-medium text-gray-900">${index + 1}</td>
                <td class="px-6 py-4">
                    <span data-client-name="${client.name}" class="view-profile-btn cursor-pointer text-indigo-700 hover:text-indigo-900 hover:underline font-semibold">
                        ${client.name}
                    </span>
                </td>
                
                <td class="px-6 py-4 text-center">${client.people || 1}</td>
                
                <td class="px-6 py-4">${assignedTech}</td>
                
                <td class="px-6 py-4">${client.services}</td>
                
                <td class="px-6 py-4">${client.checkInTime}</td>
                
                <td class="px-6 py-4 text-center space-x-4">
                    <button data-id="${client.id}" class="check-out-btn-processing" title="Fast Check Out"><i class="fas fa-receipt text-lg text-green-500 hover:text-green-700"></i></button>
                    
                    <button data-id="${client.id}" class="move-to-processing-btn" title="Move to Processing"><i class="fas fa-arrow-right text-lg text-blue-500 hover:text-blue-700"></i></button>
                    
                    <button data-id="${client.id}" class="detail-btn-active" title="View Details"><i class="fas fa-info-circle text-lg text-gray-500 hover:text-gray-700"></i></button>
                </td>
            `;
        });
    };

    const renderProcessingClients = (clients) => {
        const tbody = document.querySelector('#processing-table tbody');
        if (!tbody) return;
        tbody.innerHTML = clients.length === 0 ? `<tr><td colspan="6" class="py-6 text-center text-gray-400">No clients are being processed.</td></tr>` : '';
        clients.forEach((client, index) => {
            const row = tbody.insertRow();
            row.className = 'bg-white border-b';
            row.innerHTML = `<td class="px-6 py-4 text-center font-medium text-gray-900">${index + 1}</td><td class="px-6 py-4"><span data-client-name="${client.name}" 
                          class="view-profile-btn cursor-pointer text-indigo-700 hover:text-indigo-900 hover:underline font-semibold">
                        ${client.name}
                    </span></td><td class="px-6 py-4 text-center">${client.people || 1}</td> <td class="px-6 py-4">${client.technician}</td><td class="px-6 py-4">${client.services}</td><td class="px-6 py-4">${client.checkInTime}</td><td class="px-6 py-4 text-center"><button data-id="${client.id}" class="check-out-btn-processing" title="Check Out"><i class="fas fa-check-circle text-lg text-green-500 hover:text-green-700"></i></button> </td>`;
        });
    };

    const renderFinishedClients = (clients) => {
        const tbody = document.querySelector('#finished-clients-table tbody');
        if (!tbody) return;
       tbody.innerHTML = clients.length === 0 ? `<tr><td colspan="7" class="py-6 text-center text-gray-400">No finished clients found.</td></tr>` : '';
       clients.forEach((client, index) => {
            const row = tbody.insertRow();
            row.className = 'bg-white border-b';
row.innerHTML = `
    <td class="px-6 py-4 text-center font-medium text-gray-900">${index + 1}</td>
    <td class="px-6 py-4"><span data-client-name="${client.name}" 
                          class="view-profile-btn cursor-pointer text-indigo-700 hover:text-indigo-900 hover:underline font-semibold">
                        ${client.name}
                    </span></td>
    <td class="px-6 py-4">${client.people}</td>
    <td class="px-6 py-4">${client.services}</td>
    <td class="px-6 py-4">${client.checkInTime}</td>
    <td class="px-6 py-4 text-center text-yellow-400 ${client.rating ? 'cursor-pointer view-review-rating' : ''}" data-id="${client.id}">${client.rating ? '★'.repeat(client.rating) : 'N/A'}</td>
    <td class="px-6 py-4 text-center space-x-2">
        ${client.review ? `<button data-id="${client.id}" class="feature-review-btn text-lg ${client.isFeatured ? 'text-green-500' : 'text-gray-400'}" title="Feature on Homepage"><i class="fas fa-certificate"></i></button>` : ''}
        <button data-id="${client.id}" class="view-feedback-btn" title="View Details"><i class="fas fa-info-circle text-lg text-gray-500 hover:text-gray-700"></i></button>
        <button data-id="${client.id}" class="delete-btn-finished" title="Delete"><i class="fas fa-trash-alt text-lg text-red-500 hover:text-red-700"></i></button>
    </td>`;

        });
    };

const checkoutStarRatingContainer = document.getElementById('checkout-star-rating-container');
    if (checkoutStarRatingContainer) {
        checkoutStarRatingContainer.addEventListener('click', e => {
            const star = e.target.closest('.fa-star');
            if (!star) return;
            const rating = parseInt(star.dataset.value, 10);
            document.getElementById('checkout-rating-value').value = rating; // Use the new hidden input ID
            checkoutStarRatingContainer.querySelectorAll('i').forEach((s, i) => { // Target stars within this container
                s.classList.toggle('text-yellow-400', i < rating);
            });
        });
    }


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
            row.innerHTML = `<td class="px-6 py-3 font-medium">
                    <span data-client-name="${client.name}" 
                          class="view-profile-btn cursor-pointer text-indigo-700 hover:text-indigo-900 hover:underline font-semibold">
                        ${client.name}
                    </span>
                </td><td class="px-6 py-4">${client.phone || 'N/A'}</td><td class="px-6 py-4">${client.email || 'N/A'}</td><td class="px-6 py-4">${client.lastVisit ? new Date(client.lastVisit).toLocaleDateString() : 'N/A'}</td><td class="px-6 py-4 text-center space-x-2"><button data-id="${client.id}" class="text-indigo-500 hover:text-indigo-700 view-client-profile-btn" title="View Profile"><i class="fas fa-user-circle text-lg"></i></button><button data-id="${client.id}" class="text-blue-500 hover:text-blue-700 edit-client-btn" title="Edit Client"><i class="fas fa-edit text-lg"></i></button><button data-id="${client.id}" class="text-red-500 hover:text-red-700 delete-client-btn" title="Delete Client"><i class="fas fa-trash-alt text-lg"></i></button></td>`;
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
    if (!tbody) return { totalEarning: 0, totalTip: 0 };

    // FIX: Update colspan to 6 (non-admin) or 7 (admin) to account for the new 'NO.' column.
    // Columns are: NO., Date, Staff, Service, Earning, Tip (6 data columns)
    const colspan = userRole === 'admin' ? 7 : 6; 
    
    tbody.innerHTML = earnings.length === 0 ? `<tr><td colspan="${colspan}" class="py-6 text-center text-gray-400">No earnings found.</td></tr>` : '';

    // Sort by newest date first (descending)
    earnings.sort((a, b) => b.date.seconds - a.date.seconds).forEach((earning, index) => {
        const row = tbody.insertRow();
        row.className = 'bg-white border-b';

        // Add a safety check for the date object
        const earningDate = earning.date ? new Date(earning.date.seconds * 1000) : null;
        const dateString = earningDate ? earningDate.toLocaleDateString() : 'N/A';
        
        let rowHTML = `
            <td class="px-6 py-4">${index + 1}</td> <td class="px-6 py-4">${dateString}</td> <td class="px-6 py-4 font-medium text-gray-900">${earning.staffName || 'N/A'}</td>
            <td class="px-6 py-4">${earning.service || ''}</td>
            <td class="px-6 py-4">$${earning.earning ? earning.earning.toFixed(2) : '0.00'}</td>
            <td class="px-6 py-4">$${earning.tip ? earning.tip.toFixed(2) : '0.00'}</td>
        `;
        
        if (userRole === 'admin') {
            rowHTML += `<td class="px-6 py-4 text-center space-x-2"><button data-id="${earning.id}" class="edit-earning-btn text-blue-500 hover:text-blue-700" title="Edit Earning"><i class="fas fa-edit text-lg"></i></button><button data-id="${earning.id}" class="delete-earning-btn text-red-500 hover:text-red-700" title="Delete Earning"><i class="fas fa-trash-alt text-lg"></i></button></td>`;
        }
        row.innerHTML = rowHTML;
    });

    // Ensure reduce handles potential null/undefined values
    const totalEarning = earnings.reduce((sum, e) => sum + (e.earning || 0), 0);
    const totalTip = earnings.reduce((sum, e) => sum + (e.tip || 0), 0);

    const totalEarningEl = document.getElementById(totalEarningId);
    const totalTipEl = document.getElementById(totalTipId);
    if (totalEarningEl) totalEarningEl.textContent = `$${totalEarning.toFixed(2)}`;
    if (totalTipEl) totalTipEl.textContent = `$${totalTip.toFixed(2)}`;

    return { totalEarning, totalTip };
};
    // Located inside initMainApp()
    const renderAllStaffEarnings = () => {
        // Render for Report Page
        const reportFiltered = applyEarningFilters(allEarnings, currentEarningTechFilter, currentEarningDateFilter, currentEarningRangeFilter, userRole, userName);
        const { totalEarning: reportTotalEarning, totalTip: reportTotalTip } = renderStaffEarningsTable(reportFiltered, 'staff-earning-table', 'total-earning', 'total-tip');

        const reportTotalMainSpan = document.getElementById('filtered-earning-total-main');
        const reportTotalTipSpan = document.getElementById('filtered-earning-total-tip');
        if (reportTotalMainSpan) reportTotalMainSpan.textContent = `Total ($${reportTotalEarning.toFixed(2)})`;
        if (reportTotalTipSpan) reportTotalTipSpan.textContent = `Tip ($${reportTotalTip.toFixed(2)})`;


        // Render for Dashboard Page
        const dashboardFiltered = applyEarningFilters(allEarnings, currentDashboardEarningTechFilter, currentDashboardEarningDateFilter, currentDashboardEarningRangeFilter, userRole, userName);
        const { totalEarning: dashTotalEarning, totalTip: dashTotalTip } = renderStaffEarningsTable(dashboardFiltered, 'dashboard-staff-earning-table-full', 'dashboard-total-earning', 'dashboard-total-tip');

        const dashTotalMainSpan = document.getElementById('dashboard-filtered-earning-total-main');
        const dashTotalTipSpan = document.getElementById('dashboard-filtered-earning-total-tip');
        if (dashTotalMainSpan) dashTotalMainSpan.textContent = `Total ($${dashTotalEarning.toFixed(2)})`;
        if (dashTotalTipSpan) dashTotalTipSpan.textContent = `Tip ($${dashTotalTip.toFixed(2)})`;

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

    // REPLACE your old, broken renderSalonEarnings function with this complete one:
    const renderSalonEarnings = (earnings) => {
        const tbody = document.querySelector('#salon-earning-table tbody');
        const tfoot = document.querySelector('#salon-earning-table-foot');
        if (!tbody || !tfoot) return;

        tbody.innerHTML = '';
        const staffAndTechNames = techniciansAndStaff.map(t => t.name.toLowerCase());

        // Clear footer totals before doing anything else
        const allFooterIds = [...staffAndTechNames, 'sell-gc', 'return-gc', 'check', 'no-credit', 'total-credit', 'venmo', 'square', 'total', 'cash'];
        allFooterIds.forEach(id => {
            const el = document.getElementById(`total-${id.replace(/_/g, '-')}`);
            if (el) el.textContent = id === 'no-credit' ? '0' : '$0.00';
        });
        staffAndTechNames.forEach(name => {
            document.getElementById(`commission-${name}`).textContent = '$0.00';
            document.getElementById(`check70-${name}`).textContent = '$0.00';
            document.getElementById(`cash30-${name}`).textContent = '$0.00';
        });


        if (earnings.length === 0) {
            tbody.innerHTML = `<tr><td colspan="${staffAndTechNames.length + 10}" class="py-6 text-center text-gray-400">No salon earnings found for this period.</td></tr>`;
            return;
        }

        let grandTotals = {};
        staffAndTechNames.forEach(name => grandTotals[name] = 0); // Initialize all staff totals
        grandTotals.sellGiftCard = 0;
        grandTotals.returnGiftCard = 0;
        grandTotals.check = 0;
        grandTotals.noOfCredit = 0;
        grandTotals.totalCredit = 0;
        grandTotals.venmo = 0;
        grandTotals.square = 0;
        grandTotals.total = 0;
        grandTotals.cash = 0;

        // This is the main loop that was missing the row rendering part. It's now fixed.
        earnings.sort((a, b) => b.date.seconds - a.date.seconds).forEach(earning => {
            const row = tbody.insertRow();
            row.className = 'bg-white border-b';
            let rowHTML = `<td class="px-6 py-4">${new Date(earning.date.seconds * 1000).toLocaleDateString()}</td>`;

            let rowStaffTotal = 0;
            staffAndTechNames.forEach(name => {
                const techEarning = earning[name] || 0;
                rowHTML += `<td class="px-6 py-4">$${techEarning.toFixed(2)}</td>`;
                rowStaffTotal += techEarning;
                grandTotals[name] += techEarning;
            });

            const rowTotal = rowStaffTotal + (earning.sellGiftCard || 0);
            const cash = rowTotal - ((earning.totalCredit || 0) + (earning.check || 0) + (earning.returnGiftCard || 0) + (earning.venmo || 0) + (earning.square || 0));

            rowHTML += `
            <td class="px-6 py-4">$${(earning.sellGiftCard || 0).toFixed(2)}</td>
            <td class="px-6 py-4">$${(earning.returnGiftCard || 0).toFixed(2)}</td>
            <td class="px-6 py-4">$${(earning.check || 0).toFixed(2)}</td>
            <td class="px-6 py-4">${earning.noOfCredit || 0}</td>
            <td class="px-6 py-4">$${(earning.totalCredit || 0).toFixed(2)}</td>
            <td class="px-6 py-4">$${(earning.venmo || 0).toFixed(2)}</td>
            <td class="px-6 py-4">$${(earning.square || 0).toFixed(2)}</td>
            <td class="px-6 py-4 font-bold">$${rowTotal.toFixed(2)}</td>
            <td class="px-6 py-4 font-bold">$${cash.toFixed(2)}</td>
            <td class="px-6 py-4 text-center space-x-2">
                <button data-id="${earning.id}" class="edit-salon-earning-btn text-blue-500 hover:text-blue-700" title="Edit Salon Earning"><i class="fas fa-edit text-lg"></i></button>
                <button data-id="${earning.id}" class="delete-salon-earning-btn text-red-500 hover:text-red-700" title="Delete Salon Earning"><i class="fas fa-trash-alt text-lg"></i></button>
            </td>`;
            row.innerHTML = rowHTML;

            // Accumulate grand totals
            grandTotals.sellGiftCard += earning.sellGiftCard || 0;
            grandTotals.returnGiftCard += earning.returnGiftCard || 0;
            grandTotals.check += earning.check || 0;
            grandTotals.noOfCredit += earning.noOfCredit || 0;
            grandTotals.totalCredit += earning.totalCredit || 0;
            grandTotals.venmo += earning.venmo || 0;
            grandTotals.square += earning.square || 0;
            grandTotals.total += rowTotal;
            grandTotals.cash += cash;
        });

        // Update the main footer totals
        document.getElementById('total-sell-gc').textContent = `$${grandTotals.sellGiftCard.toFixed(2)}`;
        document.getElementById('total-return-gc').textContent = `$${grandTotals.returnGiftCard.toFixed(2)}`;
        document.getElementById('total-check').textContent = `$${grandTotals.check.toFixed(2)}`;
        document.getElementById('total-no-credit').textContent = grandTotals.noOfCredit;
        document.getElementById('total-total-credit').textContent = `$${grandTotals.totalCredit.toFixed(2)}`;
        document.getElementById('total-venmo').textContent = `$${grandTotals.venmo.toFixed(2)}`;
        document.getElementById('total-square').textContent = `$${grandTotals.square.toFixed(2)}`;
        document.getElementById('total-total').textContent = `$${grandTotals.total.toFixed(2)}`;
        document.getElementById('total-cash').textContent = `$${grandTotals.cash.toFixed(2)}`;
        staffAndTechNames.forEach(name => {
            document.getElementById(`total-${name}`).textContent = `$${(grandTotals[name] || 0).toFixed(2)}`;
        });

        // Update the payout footer totals with the new logic
        staffAndTechNames.forEach(name => {
            const staffMember = techniciansAndStaff.find(s => s.name.toLowerCase() === name);
            const payoutType = staffMember ? staffMember.payoutType : 'standard';
            const totalEarningForStaff = grandTotals[name] || 0;
            let totalPayout;

            if (payoutType === 'commission_plus_tips') {
                const { startDate, endDate } = getDateRange(currentSalonEarningRangeFilter, currentSalonEarningDateFilter);
                const staffPeriodEarnings = allEarnings.filter(e => e.staffName.toLowerCase() === name && e.date.toDate() >= startDate && e.date.toDate() <= endDate);
                const totalTipForStaff = staffPeriodEarnings.reduce((sum, e) => sum + (e.tip || 0), 0);
                totalPayout = (totalEarningForStaff * 0.70) + totalTipForStaff;
            } else {
                totalPayout = totalEarningForStaff * 0.70;
            }

            const check70 = totalPayout * 0.70;
            const cash30 = totalPayout - check70;

            document.getElementById(`commission-${name}`).textContent = `$${totalPayout.toFixed(2)}`;
            document.getElementById(`check70-${name}`).textContent = `$${check70.toFixed(2)}`;
            document.getElementById(`cash30-${name}`).textContent = `$${cash30.toFixed(2)}`;
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
            // FIX: Added data-source-container to link modal checkboxes to their origin
            label.innerHTML = `<input type="checkbox" class="form-checkbox modal-checkbox" data-source-container="hidden-checkbox-container" value="${val}" ${sourceCb && sourceCb.checked ? 'checked' : ''}><span class="ml-3 text-gray-700 flex-grow">${service.name}</span>${service.price ? `<span class="font-semibold">${service.price}</span>` : ''}`;
            modalContent.appendChild(label);
        });
        serviceModal.classList.add('flex'); serviceModal.classList.remove('hidden');
    };

    // REPLACE the old closeServiceModal function with this one:
    const closeServiceModal = () => {
        const firstCheckbox = modalContent.querySelector('.modal-checkbox');

        // FIX: Gracefully exit if the modal is empty to prevent errors.
        if (!firstCheckbox) {
            serviceModal.classList.add('hidden');
            serviceModal.classList.remove('flex');
            return;
        }

        const sourceContainerId = firstCheckbox.dataset.sourceContainer || 'hidden-checkbox-container';
        const sourceContainer = document.getElementById(sourceContainerId);
        const categoryButtonContainerId = sourceContainerId === 'appointment-hidden-checkboxes' ? 'appointment-services-container' : 'services-container';
        const categoryButtonContainer = document.getElementById(categoryButtonContainerId);

        modalContent.querySelectorAll('.modal-checkbox').forEach(modalCb => {
            const sourceCb = sourceContainer.querySelector(`input[value="${modalCb.value}"]`);
            if (sourceCb) sourceCb.checked = modalCb.checked;
        });

        serviceModal.classList.add('hidden');
        serviceModal.classList.remove('flex');

        if (categoryButtonContainer) {
            categoryButtonContainer.querySelectorAll('.category-button').forEach(button => {
                const cat = button.dataset.category;
                const count = sourceContainer.querySelectorAll(`input[data-category="${cat}"]:checked`).length;
                const badge = button.querySelector('.selection-count');
                if (count > 0) {
                    badge.textContent = `${count} selected`;
                    badge.classList.remove('hidden');
                } else {
                    badge.classList.add('hidden');
                }
            });
        }
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
            //const client = allProcessingClients.find(c => c.id === clientId);
            if (client) { document.getElementById('technician-name-select').value = client.technician; }
            document.getElementById('checkout-client-id').value = clientId;

            document.getElementById('checkout-source-collection').value = 'active_queue';
            //document.getElementById('checkout-source-collection').value = 'processing_queue';
            checkoutModal.classList.remove('hidden'); checkoutModal.classList.add('flex');
        }
    });
    // ADD THIS NEW BLOCK OF CODE to handle checkout from the Active Queue (#clients-table)

document.addEventListener('click', async (e) => {
    // Target the check-out button specifically within the Active Queue table
    const checkOutBtn = e.target.closest('#clients-table .check-out-btn-processing'); 

    // Ensure the button was clicked and it belongs to the active queue table
    if (checkOutBtn) {
        e.preventDefault(); 
        
        const clientId = checkOutBtn.dataset.id;
        
        // 1. Find the client data (using the same global list as your processing tab)
        const client = allActiveClients.find(c => c.id === clientId);

        // 2. Populate Technician field
        if (client) { 
            // NOTE: Assuming technician-name-select and checkoutModal are globally accessible
            document.getElementById('technician-name-select').value = client.technician; 
        }
        
        // 3. Set the hidden client ID
        document.getElementById('checkout-client-id').value = clientId;
        
        // 4. Set the source collection to 'active_queue'
        document.getElementById('checkout-source-collection').value = 'active_queue'; 
        
        // 5. Open the modal directly (replicating your Processing tab logic)
        checkoutModal.classList.remove('hidden'); 
        checkoutModal.classList.add('flex');
    }
});

// --- START: NEW EVENT LISTENER FOR ACTIVE QUEUE CHECKOUT ---
// --- END: NEW EVENT LISTENER FOR ACTIVE QUEUE CHECKOUT ---
    // Located inside initMainApp()
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
        const lastFinished = allFinishedClients.filter(c => c.name === client.name && c.id !== client.id).sort((a, b) => b.checkOutTimestamp.toMillis() - a.checkOutTimestamp.toMillis())[0];
        let lastVisitHTML = '';
        if (lastFinished) { lastVisitHTML = `<div class="space-y-2"><h4 class="text-lg font-semibold text-gray-800 border-b pb-1">Previous Visit</h4><div><strong class="font-semibold text-gray-700">Date:</strong> ${new Date(lastFinished.checkOutTimestamp.seconds * 1000).toLocaleString()}</div><div><strong class="font-semibold text-gray-700">Services:</strong> ${lastFinished.services || 'N/A'}</div><div><strong class="font-semibold text-gray-700">Color Code:</strong> ${lastFinished.colorCode || 'N/A'}</div><div><strong class="font-semibold text-gray-700">Technician:</strong> ${lastFinished.technician || 'N/A'}</div>${lastFinished.notes ? `<div><strong class="font-semibold text-gray-700">Notes:</strong> ${lastFinished.notes}</div>` : ''}</div>`; }
        const nextAppointment = allAppointments.filter(appt => appt.name === client.name && appt.appointmentTimestamp.toMillis() > Date.now()).sort((a, b) => a.appointmentTimestamp.toMillis() - b.appointmentTimestamp.toMillis())[0];
        let nextAppointmentHTML = `<div class="space-y-2"><h4 class="text-lg font-semibold text-gray-800 border-b pb-1">Next Appointment</h4><div class="font-bold text-pink-600">${nextAppointment ? new Date(nextAppointment.appointmentTimestamp.seconds * 1000).toLocaleString() : 'Not scheduled'}</div></div>`;
        content.innerHTML = `<div class="space-y-2"><h4 class="text-lg font-semibold text-gray-800 border-b pb-1">Client Details</h4><div><strong class="font-semibold text-gray-700">Name:</strong> ${client.name || 'N/A'}</div><div><strong class="font-semibold text-gray-700">Phone:</strong> ${client.phone || 'N/A'}</div><div><strong class="font-semibold text-gray-700">Group Size:</strong> ${client.people || '1'}</div></div>${appointmentDetailsHTML}${lastVisitHTML}${nextAppointmentHTML}`;

        // *** UPDATED ACTIONS HTML ***
        actions.innerHTML = '<button type="button" id="view-detail-close-btn" class="bg-gray-200 text-gray-800 font-semibold py-2 px-6 rounded-lg">Close</button>';
        if (client.appointmentTimestamp && client.status !== 'waiting' && client.status !== 'processing') {
            actions.insertAdjacentHTML('afterbegin',
                `<button type="button" data-id="${client.id}" class="bg-yellow-500 text-white font-semibold py-2 px-4 rounded-lg booking-action-btn" data-action="edit">Edit</button>
             <button type="button" data-id="${client.id}" class="bg-blue-500 text-white font-semibold py-2 px-4 rounded-lg booking-action-btn" data-action="checkin">Check In</button>
             <button type="button" data-id="${client.id}" class="bg-red-500 text-white font-semibold py-2 px-4 rounded-lg booking-action-btn" data-action="cancel">No Show</button>`
            );
        }

        document.getElementById('view-detail-close-btn').addEventListener('click', closeViewDetailModal);
        viewDetailModal.classList.remove('hidden'); viewDetailModal.classList.add('flex');
    };
    const closeViewDetailModal = () => { viewDetailModal.classList.add('hidden'); viewDetailModal.classList.remove('flex'); };
    document.getElementById('view-detail-close-btn').addEventListener('click', closeViewDetailModal);
    document.querySelector('.view-detail-modal-overlay').addEventListener('click', closeViewDetailModal);

    // Located inside initMainApp()
    document.getElementById('view-detail-actions').addEventListener('click', async (e) => {
        if (e.target.classList.contains('booking-action-btn')) {
            const action = e.target.dataset.action;
            const bookingId = e.target.dataset.id;
            const appointment = allAppointments.find(a => a.id === bookingId);
            if (!appointment) return;

            if (action === 'cancel') {
                showConfirmModal("Are you sure you want to cancel this booking?", async () => { await deleteDoc(doc(db, "appointments", bookingId)); });
            } else if (action === 'checkin') {
                await addDoc(collection(db, "active_queue"), { name: appointment.name, phone: appointment.phone, people: appointment.people || 1, bookingType: 'Booked - Calendar', services: Array.isArray(appointment.services) ? appointment.services : [appointment.services], technician: appointment.technician, notes: appointment.notes || '', checkInTimestamp: serverTimestamp(), status: 'waiting' });
                await deleteDoc(doc(db, "appointments", bookingId));
            } else if (action === 'edit') { // *** ADD THIS EDIT LOGIC ***
                openAddAppointmentModal(null, null, appointment);
            }

            closeViewDetailModal();
        }
    });

 const openClientProfileModal = async (client) => {
    // Find the most up-to-date client data from the master list
    const clientData = allClients.find(c => c.id === client.id);
    if (!clientData) {
        console.error("Could not find data for client:", client.id);
        alert("Could not load client profile.");
        return;
    }

    const clientHistory = allFinishedClients.filter(c => c.name === clientData.name);
    const clientAppointments = allAppointments.filter(c => c.name === clientData.name && c.appointmentTimestamp.toDate() > new Date());
    
    let serviceSpent = clientHistory.reduce((sum, visit) => {
        const servicesString = Array.isArray(visit.services) ? visit.services.join(', ') : visit.services;
        const prices = (servicesString.match(/\$\d+/g) || []).map(p => Number(p.slice(1)));
        return sum + prices.reduce((a, b) => a + b, 0);
    }, 0);

    const giftCardsPurchased = allGiftCards.filter(gc => gc.createdBy === client.id);
    let giftCardSpent = giftCardsPurchased.reduce((sum, gc) => sum + gc.amount, 0);

    let membershipSpent = 0;
    if (clientData.membership && clientData.membership.tierId) {
        const tier = allMembershipTiers.find(t => t.id === clientData.membership.tierId);
        if (tier) {
            membershipSpent = tier.price; // Simplified for display
        }
    }
    const totalSpent = serviceSpent + giftCardSpent + membershipSpent;
    
    // Set the client ID in the hidden input for the new note form
    document.getElementById('note-client-id').value = clientData.id || '';

    document.getElementById('profile-client-name').textContent = clientData.name;
    document.getElementById('profile-client-phone').textContent = clientData.phone || 'No phone number';
    document.getElementById('profile-total-visits').textContent = clientHistory.length;
    document.getElementById('profile-total-spent').textContent = `$${totalSpent.toFixed(2)}`;
    
    const aggregatedClientData = aggregatedClients.find(c => c.id === client.id) || {};
    document.getElementById('profile-fav-tech').textContent = aggregatedClientData.favoriteTech || 'N/A';
    document.getElementById('profile-fav-color').textContent = aggregatedClientData.favoriteColor || 'N/A';

    const historyBody = document.getElementById('profile-history-table-body');
    historyBody.innerHTML = clientHistory.length > 0 ? clientHistory.map(v =>
        `<tr>
            <td class="px-4 py-2">${v.checkOutTimestamp.toDate().toLocaleDateString()}</td>
            <td class="px-4 py-2">${Array.isArray(v.services) ? v.services.join(', ') : v.services}</td>
            <td class="px-4 py-2">${v.technician}</td>
        </tr>`
    ).join('') : '<tr><td colspan="3" class="text-center p-4 text-gray-500">No visit history found.</td></tr>';

    const apptsContainer = document.getElementById('profile-upcoming-appts');
    apptsContainer.innerHTML = clientAppointments.length > 0
        ? clientAppointments.map(a => `<div class="bg-blue-50 p-2 rounded-md"><p class="font-semibold">${a.appointmentTimestamp.toDate().toLocaleString()}</p><p class="text-sm">${a.services.join(', ')}</p></div>`).join('')
        : '<p class="text-sm text-gray-500">No upcoming appointments.</p>';
        
    // --- NEW: RENDER CLIENT NOTES ---
    const notesListContainer = document.getElementById('profile-client-notes-list');
    notesListContainer.innerHTML = ''; // Clear previous notes
    if (clientData.notes && clientData.notes.length > 0) {
        // Sort notes newest first
        const sortedNotes = clientData.notes.sort((a, b) => b.timestamp.seconds - a.timestamp.seconds);
        sortedNotes.forEach(note => {
            const noteEl = document.createElement('div');
            noteEl.className = 'bg-yellow-50 p-3 rounded-lg border-l-4 border-yellow-300';
            const deleteButtonHTML = clientData.id 
                ? `
                    <button data-client-id="${clientData.id}"
                            data-note-time="${note.timestamp.seconds}"
                            class="delete-note-btn text-red-500 hover:text-red-700 ml-2 p-1 rounded-full hover:bg-red-50 transition duration-150"
                            title="Delete Note">
                        <i class="fas fa-trash-alt text-sm"></i>
                    </button>
                  ` 
                : '';
            noteEl.innerHTML = `
                <p class="text-sm text-gray-800">${note.text}</p>
                <p class="text-xs text-gray-500 mt-1 text-right">${new Date(note.timestamp.seconds * 1000).toLocaleString()}  ${deleteButtonHTML}</p>
            `;
            notesListContainer.appendChild(noteEl);
        });
    } else {
        notesListContainer.innerHTML = '<p class="text-sm text-gray-500 text-center">No notes for this client yet.</p>';
    }

    clientProfileModal.classList.remove('hidden');
};

/**
 * Renders the reward history in the modal.
 */
function renderRewardHistory(containerId, history) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    if (!history || history.length === 0) {
        container.innerHTML = '<p class="text-sm text-gray-500 text-center">No history found.</p>';
        return;
    }
    
    // Sort newest first
    history.sort((a, b) => b.timestamp.seconds - a.timestamp.seconds);
    
    history.forEach(item => {
        const itemEl = document.createElement('div');
        const date = item.timestamp.toDate().toLocaleDateString();
        if (item.type === 'reward') {
            itemEl.className = 'p-3 rounded-lg bg-green-100 border-l-4 border-green-500';
            itemEl.innerHTML = `
                <div class="flex justify-between items-center">
                    <span class="font-bold text-green-700">REWARD EARNED</span>
                    <span class="font-bold text-green-700">-${item.rewardAmount.toFixed(2)} (Threshold Met)</span>
                </div>
                <p class="text-xs text-gray-500">${date}</p>`;
        } else {
            itemEl.className = 'p-3 rounded-lg bg-white border';
            itemEl.innerHTML = `
                <div class="flex justify-between items-center">
                    <span class="font-medium text-gray-700">Cash Payment Logged</span>
                    <span class="font-medium text-gray-900">+$${item.amount.toFixed(2)}</span>
                </div>
                <p class="text-xs text-gray-500">${date}</p>`;
        }
        container.appendChild(itemEl);
    });
}

const openMembershipRewardModal = async (client) => {
    if (!client || !client.id) {
        addNotification('error', 'Cannot open reward tracker: Invalid client data.');
        return;
    }
    
    const modal = document.getElementById('membership-reward-modal');
    document.getElementById('reward-client-id').value = client.id;
    document.getElementById('log-cash-spending-form').reset();
    
    // Fetch the client's full, up-to-date data
    const clientRef = doc(db, "clients", client.id);
    const clientSnap = await getDoc(clientRef);
    if (!clientSnap.exists()) {
        addNotification('error', 'Client document not found.');
        return;
    }
    
    const clientData = clientSnap.data();
    const progress = clientData.membership?.rewardProgress || 0;
    const history = clientData.membership?.rewardHistory || [];
    const threshold = membershipRewardSettings.threshold || 500; // Use global setting

    // --- UPDATED LOGIC: Calculate Total Reward Earned and Total Spent ---
    const totalRewardEarned = history
        .filter(item => item.type === 'reward')
        .reduce((sum, item) => sum + (item.rewardAmount || 0), 0);
        
    const totalCashSpent = history
        .filter(item => item.type === 'spending')
        .reduce((sum, item) => sum + (item.amount || 0), 0);
    // --- END UPDATED LOGIC ---

    // Update Client Name + Reward/Spend Display
    const clientNameElement = document.getElementById('reward-client-name');
    clientNameElement.innerHTML = `
        ${client.name} 
        
        <span class="text-base font-normal text-green-600 ml-2 py-1 px-3 bg-green-50 rounded-full shadow-inner">
            Reward Earned: $${totalRewardEarned.toFixed(2)}
        </span>

        <span class="text-base font-normal text-pink-600 ml-2 py-1 px-3 bg-pink-50 rounded-full shadow-inner">
            Total Cash Spent: $${totalCashSpent.toFixed(2)}
        </span>
    `;

    // Update Progress Bar
    const progressPercent = Math.min(100, (progress / threshold) * 100);
    document.getElementById('reward-progress-text').textContent = `$${progress.toFixed(2)} / $${threshold.toFixed(2)}`;
    document.getElementById('reward-progress-bar').style.width = `${progressPercent}%`;

    // Render History
    renderRewardHistory('reward-history-container', history);
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');
};

const handleLogCashSpending = async (e) => {
    e.preventDefault();
    const clientId = document.getElementById('reward-client-id').value;
    const amountInput = document.getElementById('cash-spending-amount');
    const amount = parseFloat(amountInput.value);

    if (!clientId || isNaN(amount) || amount <= 0) {
        addNotification('error', 'Please enter a valid positive amount.');
        return;
    }

    const clientRef = doc(db, "clients", clientId);

    try {
        await runTransaction(db, async (transaction) => {
            const clientSnap = await transaction.get(clientRef);
            if (!clientSnap.exists()) {
                throw "Client document not found.";
            }

            const clientData = clientSnap.data();
            const membership = clientData.membership || {};
            let currentProgress = membership.rewardProgress || 0;
            let currentHistory = membership.rewardHistory || [];

            // 1. Add the new spending to progress
            currentProgress += amount;
            
            // 2. Add spending entry to history
            currentHistory.push({
                type: 'spending',
                amount: amount,
                timestamp: Timestamp.now()
            });

            // 3. Check if threshold is met or exceeded
            if (currentProgress >= membershipRewardSettings.threshold) {
                let rewardValue = 0;
                if (membershipRewardSettings.type === 'fixed') {
                    rewardValue = membershipRewardSettings.value;
                } else if (membershipRewardSettings.type === 'percent') {
                    // Reward is % of the spending that triggered it
                    rewardValue = amount * (membershipRewardSettings.value / 100); 
                }
                
                // 4. Add reward entry to history
                currentHistory.push({
                    type: 'reward',
                    rewardAmount: rewardValue,
                    timestamp: Timestamp.now()
                });
                
                // 5. Reset progress (subtract threshold)
                currentProgress -= membershipRewardSettings.threshold; 
            }
            
            // 6. Update the client document
            transaction.update(clientRef, {
                "membership.rewardProgress": currentProgress,
                "membership.rewardHistory": currentHistory
            });
        });
        
        addNotification('success', 'Cash spending logged successfully!');
        // Manually refresh the modal data
        const client = allClients.find(c => c.id === clientId); // Use global list
        if (client) {
            openMembershipRewardModal(client);
        } else {
            document.getElementById('membership-reward-modal').classList.add('hidden');
        }

    } catch (error) {
        console.error("Error logging cash spending:", error);
        addNotification('error', 'Failed to log spending.');
    }
};


    document.getElementById('finished-content').addEventListener('click', async (e) => {
        const deleteBtn = e.target.closest('.delete-btn-finished');
        const feedbackBtn = e.target.closest('.view-feedback-btn');
        const draftSmsBtn = e.target.closest('.draft-sms-btn');
        const featureBtn = e.target.closest('.feature-review-btn');
        const reviewRatingCell = e.target.closest('.view-review-rating');
        if (reviewRatingCell) { // Add this 'if' block
        const clientId = reviewRatingCell.dataset.id;
        const client = allFinishedClients.find(c => c.id === clientId);
        if (client) {
            openViewReviewModal(client);
        }
    } else if (featureBtn) {
                const finishedId = featureBtn.dataset.id;
                const client = allFinishedClients.find(c => c.id === finishedId);
                if (client) {
                    try {
                        await updateDoc(doc(db, "finished_clients", finishedId), {
                            isFeatured: !client.isFeatured
                        });
                    } catch (error) {
                        console.error("Error toggling feature status:", error);
                    }
                }
            }
            
        else if (deleteBtn) { showConfirmModal("Are you sure you want to delete this client record?", async () => { try { await deleteDoc(doc(db, "finished_clients", deleteBtn.dataset.id)); } catch (err) { console.error("Error deleting finished client: ", err); alert("Could not delete finished client."); } }); }
        else if (feedbackBtn) { const client = allFinishedClients.find(c => c.id === feedbackBtn.dataset.id); if (client) openViewDetailModal(client, `Booking Detail`); }
        
        else if (draftSmsBtn) { const client = allFinishedClients.find(c => c.id === draftSmsBtn.dataset.id); if (client) generateSmsMessage(client); }
    });

    const closeCheckoutModal = () => {
        checkoutForm.reset(); //
        rebookOtherInput.classList.add('hidden'); //
        checkoutModal.classList.add('hidden'); //
        checkoutModal.classList.remove('flex'); //

        // --- START: Reset Rating/Review in Checkout Modal ---
        const checkoutStars = document.querySelectorAll('#checkout-star-rating-container i'); //
        if (checkoutStars) {
            checkoutStars.forEach(s => s.classList.remove('text-yellow-400')); //
        }
        const checkoutRatingInput = document.getElementById('checkout-rating-value'); //
        if (checkoutRatingInput) {
            checkoutRatingInput.value = ''; // Clear hidden rating value
        }
        // Textarea is cleared by checkoutForm.reset()
        // --- END: Reset Rating/Review ---
    };

    rebookSelect.addEventListener('change', (e) => { if (e.target.value === 'other') { rebookOtherInput.classList.remove('hidden'); } else { rebookOtherInput.classList.add('hidden'); } });
    const technicianNameSelect = document.getElementById('technician-name-select');
    const technicianNameOther = document.getElementById('technician-name-other');
    technicianNameSelect.addEventListener('change', (e) => { if (e.target.value === 'other') { technicianNameOther.classList.remove('hidden'); } else { technicianNameOther.classList.add('hidden'); } });

    checkoutForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const clientId = document.getElementById('checkout-client-id').value;
    const sourceCollection = document.getElementById('checkout-source-collection').value;

    let client;
    // Get the client data from the correct source array
    if (sourceCollection === 'waitlist') {
        const entry = allWaitlistEntries.find(e => e.id === clientId);
        client = {
            name: entry.clientName,
            phone: entry.clientPhone,
            people: entry.people || 1,
            bookingType: 'Waitlist',
            services: entry.services,
            technician: entry.technician,
            notes: entry.notes || '',
            checkInTimestamp: entry.createdAt
        };
    } else { // Default to 'active_queue'
        client = allActiveClients.find(c => c.id === clientId);
    }

    if (client) {
        try {
            // Check if client exists in main 'clients' list, if not, add them
            const q = query(collection(db, "clients"), where("name", "==", client.name));
            const clientSnapshot = await getDocs(q);
            if (clientSnapshot.empty) {
                await addDoc(collection(db, "clients"), { name: client.name, phone: client.phone || '', dob: '' });
            }

            // Construct the 'finished_clients' document data
            const finishedClientData = { ...client };
            if (finishedClientData.id) delete finishedClientData.id;

            finishedClientData.checkOutTimestamp = serverTimestamp();
            finishedClientData.colorCode = document.getElementById('color-code').value || '';
            let technicianValue = document.getElementById('technician-name-select').value;
            if (technicianValue === 'other') { 
                technicianValue = document.getElementById('technician-name-other').value; 
            }
            finishedClientData.technician = technicianValue;

            // Rebooking logic...
            let rebookInfo = rebookSelect.value;
            if (rebookInfo === '2w' || rebookInfo === '3w') {
                const interval = (rebookInfo === '2w' ? 14 : 21);
                let nextAppointmentDate = new Date();
                nextAppointmentDate.setDate(nextAppointmentDate.getDate() + interval);
                finishedClientData.rebook = nextAppointmentDate.toLocaleString();
                await addDoc(collection(db, "appointments"), { name: client.name, phone: client.phone, people: client.people, bookingType: 'Rebooked', services: client.services, technician: finishedClientData.technician, appointmentTimestamp: Timestamp.fromDate(nextAppointmentDate) });
            } else if (rebookInfo === 'other') {
                const otherDateValue = document.getElementById('rebook-other-input').value;
                if (otherDateValue) {
                    finishedClientData.rebook = new Date(otherDateValue).toLocaleString();
                    await addDoc(collection(db, "appointments"), { name: client.name, phone: client.phone, people: client.people, bookingType: 'Rebooked', services: client.services, technician: finishedClientData.technician, appointmentTimestamp: Timestamp.fromDate(new Date(otherDateValue)) });
                } else {
                    finishedClientData.rebook = 'Other';
                }
            } else {
                finishedClientData.rebook = 'No';
            }

            // Rating and review logic...
            const rating = parseInt(document.getElementById('checkout-rating-value').value, 10) || null;
            const review = document.getElementById('checkout-review-text').value.trim() || '';
            finishedClientData.rating = rating;
            finishedClientData.review = review;
            finishedClientData.isFeatured = false;

            // Save to finished_clients collection
            await addDoc(collection(db, "finished_clients"), finishedClientData);

            // Delete from the correct source collection
            if (sourceCollection === 'waitlist') {
                await deleteDoc(doc(db, "waitlist", clientId));
            } else {
                await deleteDoc(doc(db, "active_queue", clientId));
            }

            closeCheckoutModal();
            addNotification('success', `${client.name} has been checked out.`);
        } catch (err) { 
            console.error("Error checking out client: ", err); 
            addNotification('error', "Could not check out client."); 
        }
    } else {
        addNotification('error', "Could not find the client data to check out.");
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
        if (clientList) clientList.innerHTML = nameOptionsHtml;
        if (checkinClientList) checkinClientList.innerHTML = nameOptionsHtml;
        if (appointmentPhoneList) appointmentPhoneList.innerHTML = phoneOptionsHtml;
        if (checkinPhoneList) checkinPhoneList.innerHTML = phoneOptionsHtml;
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


    // REPLACE your old renderCalendar function with this new one:
// REPLACE your old renderCalendar function with this new one
function renderCalendar(year, month, technicianFilter = 'All') {
    monthYearDisplay.textContent = `${new Date(year, month).toLocaleString('default', { month: 'long' })} ${year}`;
    calendarGrid.innerHTML = '';
    const today = new Date(); 

    for (let i = 0; i < new Date(year, month, 1).getDay(); i++) { calendarGrid.insertAdjacentHTML('beforeend', '<div></div>'); }

    for (let day = 1; day <= new Date(year, month + 1, 0).getDate(); day++) {
        const dayCell = document.createElement('div');
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        dayCell.className = 'calendar-day border p-2';
        if (day === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
            dayCell.classList.add('is-today');
        }
        // New holiday check
        if (holidaySettings.dates.includes(dateStr)) {
            dayCell.classList.add('is-holiday');
        }
        
        dayCell.dataset.date = dateStr;
        dayCell.innerHTML = `<div class="font-bold">${day}</div><div id="day-${day}" class="appointments"></div>`;
        calendarGrid.appendChild(dayCell);
    }

    let filteredAppointments = allAppointments.filter(appt => {
        const apptDate = appt.appointmentTimestamp.toDate();
        return apptDate.getFullYear() === year && apptDate.getMonth() === month;
    });

    if (technicianFilter !== 'All' && technicianFilter !== 'Any Technician') {
        filteredAppointments = filteredAppointments.filter(appt => appt.technician === technicianFilter);
    } else if (technicianFilter === 'Any Technician') {
        filteredAppointments = filteredAppointments.filter(appt => appt.technician === 'Any Technician');
    }

    filteredAppointments.sort((a, b) => a.appointmentTimestamp.seconds - b.appointmentTimestamp.seconds);

    filteredAppointments.forEach(appt => {
        const apptDate = appt.appointmentTimestamp.toDate();
        const dayCell = document.getElementById(`day-${apptDate.getDate()}`);
        if (dayCell) {
            const timeString = apptDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
            const serviceString = Array.isArray(appt.services) ? appt.services[0] : appt.services;
            const technicianName = appt.technician;
            let colorTheme = technicianColorMap[technicianName] || { card: 'bg-gray-100', text: 'text-gray-800' };
            
            const entryHTML = `
            <div class="appointment-entry ${colorTheme.card} p-1" data-id="${appt.id}" data-type="appointment">
                <p class="font-semibold text-xs ${colorTheme.text} truncate">${timeString} - ${appt.name}</p>
                <p class="text-xs text-gray-600 truncate">${serviceString || 'Service not specified'}</p>
            </div>`;
            dayCell.insertAdjacentHTML('beforeend', entryHTML);
        }
    });

    if (calendarCountSpan) {
        calendarCountSpan.textContent = calendarGrid.querySelectorAll('.appointment-entry').length;
    }
}
    document.getElementById('prev-month-btn').addEventListener('click', () => { currentMonth--; if (currentMonth < 0) { currentMonth = 11; currentYear--; } renderCalendar(currentYear, currentMonth, currentTechFilterCalendar); });
    document.getElementById('next-month-btn').addEventListener('click', () => { currentMonth++; if (currentMonth > 11) { currentMonth = 0; currentYear++; } renderCalendar(currentYear, currentMonth, currentTechFilterCalendar); });
    
    // REPLACE the calendarGrid click listener with this one

calendarGrid.addEventListener('click', (e) => {
    const appointmentEntry = e.target.closest('.appointment-entry');
    const dayCell = e.target.closest('.calendar-day');

    if (appointmentEntry) {
        const client = allAppointments.find(a => a.id === appointmentEntry.dataset.id);
        if (client) {
            openViewDetailModal(client, "Booking Detail");
        }
    } else if (dayCell) {
        // New check for holiday class
        if (dayCell.classList.contains('is-holiday')) {
            alert(holidaySettings.message || "The salon is closed on this date and cannot be booked.");
            return;
        }
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
        if (isNaN(earning) || !date) { return alert('Please ensure Date, and Earning fields are filled out correctly.'); }
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
        if (deleteBtn) { showConfirmModal("Delete this earning entry?", async () => { await deleteDoc(doc(db, "earnings", deleteBtn.dataset.id)); }); }
        else if (editBtn) { const earning = allEarnings.find(e => e.id === editBtn.dataset.id); if (earning) { openEditEarningModal(earning); } }
    });
    document.getElementById('dashboard-staff-earning-table-full').addEventListener('click', async (e) => {
        const deleteBtn = e.target.closest('.delete-earning-btn');
        const editBtn = e.target.closest('.edit-earning-btn');
        if (deleteBtn) { showConfirmModal("Delete this earning entry?", async () => { await deleteDoc(doc(db, "earnings", deleteBtn.dataset.id)); }); }
        else if (editBtn) { const earning = allEarnings.find(e => e.id === editBtn.dataset.id); if (earning) { openEditEarningModal(earning); } }
    });

    document.getElementById('salon-earning-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const date = document.getElementById('salon-earning-date').value;
        if (!date) { return alert('Please select a date.'); }
        const salonEarningData = { date: Timestamp.fromDate(new Date(date + 'T12:00:00')), sellGiftCard: parseFloat(document.getElementById('sell-gift-card').value) || 0, returnGiftCard: parseFloat(document.getElementById('return-gift-card').value) || 0, check: parseFloat(document.getElementById('check-payment').value) || 0, noOfCredit: parseInt(document.getElementById('no-of-credit').value) || 0, totalCredit: parseFloat(document.getElementById('total-credit').value) || 0, venmo: parseFloat(document.getElementById('venmo-payment').value) || 0, square: parseFloat(document.getElementById('square-payment').value) || 0 };
        techniciansAndStaff.forEach(tech => { const input = document.getElementById(`salon-earning-${tech.name.toLowerCase()}`); if (input) { salonEarningData[tech.name.toLowerCase()] = parseFloat(input.value) || 0; } });
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
        if (deleteBtn) { showConfirmModal("Delete this salon earning entry?", async () => { await deleteDoc(doc(db, "salon_earnings", deleteBtn.dataset.id)); }); }
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
    // --- Located inside initMainApp() ---
// --- Add these inside initMainApp() ---
// --- NEW: Printable Membership Card Designer Logic (Final Update) ---

// Get common elements once for efficiency
const membershipDesignerForm = document.getElementById('membership-card-designer-form');
const tierSelectDesigner = document.getElementById('designer-ms-tier-select');
const frontPreviewCard = document.getElementById('ms-card-preview-front');
const backPreviewCard = document.getElementById('ms-card-preview-back'); // Get the back card element
const backPreviewName = document.getElementById('ms-back-signature-name');
const startDateInput = document.getElementById('designer-ms-start-date');
const noStartDateCheckbox = document.getElementById('designer-ms-no-start-date');

const getLocalDateString = () => {
    // Helper function to get today's date in YYYY-MM-DD format for input[type="date"]
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const initializeMembershipCardDesigner = () => {
    membershipDesignerForm.reset();
    startDateInput.value = getLocalDateString(); // Default to today
    noStartDateCheckbox.checked = false;
    startDateInput.disabled = false;
    document.getElementById('designer-ms-quantity').value = 1;

    // Populate Tier Select dropdown (assuming allMembershipTiers is a global variable)
    tierSelectDesigner.innerHTML = '<option value="">Select Tier...</option>';
    if (typeof allMembershipTiers !== 'undefined' && allMembershipTiers.length > 0) {
        allMembershipTiers.forEach(tier => {
            tierSelectDesigner.innerHTML += `<option value="${tier.id}" data-name="${tier.name}" data-price="${tier.price}" data-discount="${tier.discount}">${tier.name}</option>`;
        });
    }

    updateMembershipCardPreview(); // Initial preview render
};

/**
 * Toggles the state of the start date input and updates the preview.
 */
const handleNoStartDateToggle = () => {
    const isChecked = noStartDateCheckbox.checked;
    startDateInput.disabled = isChecked;
    startDateInput.required = !isChecked; // Date is not required if 'Write Later' is checked

    if (isChecked) {
        startDateInput.value = ''; // Clear the date input visually
    } else if (!startDateInput.value) {
        startDateInput.value = getLocalDateString(); // Set back to today if unchecking and value is empty
    }
    updateMembershipCardPreview();
};

/**
 * Updates the visual preview of the membership card based on form inputs.
 */
const updateMembershipCardPreview = () => {
    const selectedOption = tierSelectDesigner.options[tierSelectDesigner.selectedIndex];
    
    // FIX: Safely determine tierName. If selectedOption is null, or data.name is undefined, use 'Select Tier'.
    const tierName = (selectedOption && selectedOption.dataset.name) ? selectedOption.dataset.name : 'Select Tier';
    // The previous implementation was breaking here if data.name was undefined.

    // 1. Client Name Logic
    const clientNameInput = document.getElementById('designer-ms-client-name').value.trim();
    // Use blank space for better layout when name is blank
    const clientNameDisplay = clientNameInput || '&nbsp;'; 

    // 2. Start Date Logic
    const isDateToBeWrittenLater = noStartDateCheckbox.checked;
    let startDateDisplay;
    let startDateValue = startDateInput.value;

    if (isDateToBeWrittenLater || !startDateValue) {
        startDateDisplay = '...../...../.....'; 
    } else {
        startDateDisplay = new Date(startDateValue + 'T00:00:00').toLocaleDateString();
    }
    
    // 3. Member ID Logic
    const manualId = document.getElementById('designer-ms-id').value.trim();
    const memberIdDisplay = manualId || '................'; 

    // Update back card signature line with blank if input is blank
    backPreviewName.textContent = clientNameInput || '';
    
    // Back card padding adjustment (for preview)
    if (!clientNameInput) {
        backPreviewName.style.minHeight = '24px'; 
        backPreviewName.style.display = 'block';
    } else {
        backPreviewName.style.minHeight = '0';
    }


    // Update front card styling based on tier name
    let cardStyle = 'from-gray-700 via-gray-900 to-black';
    
    // ERROR FIX APPLIED HERE: tierName is guaranteed to be a string now.
    if (tierName.toLowerCase().includes('silver')) cardStyle = 'from-gray-400 via-gray-500 to-gray-600';
    if (tierName.toLowerCase().includes('gold')) cardStyle = 'from-yellow-400 via-yellow-500 to-yellow-600';
    if (tierName.toLowerCase().includes('platinum')) cardStyle = 'from-indigo-500 via-purple-600 to-pink-600';

    // Apply styles to the card element
    frontPreviewCard.className = `card rounded-lg p-4 flex flex-col justify-between bg-gradient-to-br ${cardStyle} text-white`;
    frontPreviewCard.style.width = '400px';
    frontPreviewCard.style.height = '228px';
    frontPreviewCard.style.textShadow = '1px 1px 3px rgba(0,0,0,0.4)';

    // Update the front card content
    frontPreviewCard.innerHTML = `
        <div class="flex justify-between items-start">
            <div class="font-bold text-lg"><p>${tierName}</p><p class="text-xs font-normal opacity-80">MEMBERSHIP</p></div>
            <p class="font-parisienne text-3xl">Nails Express</p>
        </div>
        <div class="flex justify-between items-end">
            <div class="text-left"><p class="text-xs opacity-80">MEMBER</p><p class="text-2xl font-semibold tracking-wider">${clientNameDisplay}</p></div>
            <div class="text-right text-xs opacity-80">
                <p>Member Since: ${startDateDisplay}</p>
                <p>Member ID: ${memberIdDisplay}</p>
            </div>
        </div>
    `;

};

/**
 * Handles generating and printing the membership cards.
 */
const handlePrintMembershipCards = async () => {
    const quantity = parseInt(document.getElementById('designer-ms-quantity').value, 10);
    const clientNameInput = document.getElementById('designer-ms-client-name').value.trim();
    const tierId = document.getElementById('designer-ms-tier-select').value;
    const manualId = document.getElementById('designer-ms-id').value.trim();
    const isDateToBeWrittenLater = noStartDateCheckbox.checked;
    const startDateValue = startDateInput.value;

    if (!isDateToBeWrittenLater && !startDateValue) {
        addNotification('error', "Please select a Start Date or check 'Write Later'.");
        return;
    }

    if (isNaN(quantity) || quantity < 1 || !tierId) {
        addNotification('error', "Please fill in Membership Tier and Quantity.");
        return;
    }

    const tier = allMembershipTiers.find(t => t.id === tierId);
    if (!tier) { addNotification('error', "Selected tier not found."); return; }
    
    // Determine the text to show on the printed card
    let startDateDisplay;
    if (isDateToBeWrittenLater || !startDateValue) {
        startDateDisplay = '...../...../.....'; 
    } else {
        startDateDisplay = new Date(startDateValue + 'T00:00:00').toLocaleDateString();
    }
    
    const clientNameForCard = clientNameInput || '&nbsp;'; // Use blank space
    const memberIdDisplay = (quantity === 1 && manualId) ? manualId : '................';


    let printHTML = `
        <html>
        <head>
            <title>Print Membership Cards</title>
            <style>
                /* Reuse your existing print styles here */
                @media print {
                    @page { size: A4 landscape; margin: 10mm; }
                    body { font-family: 'Poppins', sans-serif; }
                    .print-page { display: flex; flex-wrap: wrap; gap: 20px; justify-content: flex-start; }
                    .card-container { width: 420px; height: 260px; break-inside: avoid; display: flex; flex-direction: column; gap: 4px; }
                    .card { width: 400px; height: 228px; border: 1px solid #ccc; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border-radius: 12px; padding: 16px; box-sizing: border-box; font-size: 14px; position: relative; }
                    .bg-gradient-to-br { background: linear-gradient(to bottom right, #333, #111); }
                    .text-white { color: white; }
                    .text-gray-800 { color: #1f2937; }
                    .font-parisienne { font-family: 'Parisienne', cursive; }
                }
            </style>
        </head>
        <body>
        <div class="print-page">
    `;

    for (let i = 0; i < quantity; i++) {
        
        // Get card style based on tier name
        let cardStyleClasses = 'from-gray-700 via-gray-900 to-black';
        if (tier.name.toLowerCase().includes('silver')) cardStyleClasses = 'from-gray-400 via-gray-500 to-gray-600';
        if (tier.name.toLowerCase().includes('gold')) cardStyleClasses = 'from-yellow-400 via-yellow-500 to-yellow-600';
        if (tier.name.toLowerCase().includes('platinum')) cardStyleClasses = 'from-indigo-500 via-purple-600 to-pink-600';

        // Set the signature area style for the back card
        const signatureText = clientNameInput || `<span style="font-size: 0.1px;">.</span>`; // Use tiny dot for space
        const signatureStyle = clientNameInput ? '' : 'style="padding-top: 10px;"'; // Add padding if name is blank

        printHTML += `
            <div class="card-container">
                <div class="card rounded-lg p-4 flex flex-col justify-between bg-gradient-to-br ${cardStyleClasses} text-white">
                     <div class="flex justify-between items-start">
                        <div class="font-bold text-lg"><p>${tier.name}</p><p class="text-xs font-normal opacity-80">MEMBERSHIP</p></div>
                        <p class="font-parisienne text-3xl">Nails Express</p>
                    </div>
                    <div class="flex justify-between items-end">
                        <div class="text-left"><p class="text-xs opacity-80">MEMBER</p><p class="text-2xl font-semibold tracking-wider">${clientNameForCard}</p></div>
                        <div class="text-right text-xs opacity-80">
                            <p>Member Since: ${startDateDisplay}</p>
                            <p>Member ID: ${memberIdDisplay}</p>
                        </div>
                    </div>
                </div>
                <div class="card rounded-lg p-4 flex flex-col justify-between bg-white text-gray-800 border" style="text-shadow: none;">
                    <div class="text-xs text-center text-gray-600 px-4 leading-relaxed">
                    <p>
                        Welcome, VIP! This card must be presented to receive benefits. Membership is non-transferable.
                    </p>
                    <p class="font-bold mt-2">
                        Clients must pay with cash only to earn credit towards their cash reward.
                    </p>
                </div>
                    <div class="px-4 pb-2 text-center" ${signatureStyle}>
                        <p class="font-parisienne text-2xl text-gray-700">${signatureText}</p> 
                        <div class="w-full border-t border-dashed border-gray-400 pt-1 mt-1"></div>
                        <p class="text-xs text-gray-500">Member Signature</p>
                    </div>
                    <div class="text-center text-xs pb-2">
                        <p class="font-bold">Nails Express</p>
                        <p>1560 Hustonville Rd #345, Danville, KY 40422</p>
                    </div>
                </div>
            </div>
        `;
    }
    printHTML += `</div></body></html>`;

    // NOTE: Firestore saving logic is unchanged (requires designer-client-id selection)
    if (quantity === 1 && manualId && clientNameInput && document.getElementById('designer-client-id').value) {
        // ... (your existing Firestore saving logic here) ...
    }

    // Open print window
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printHTML);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
};

// Add/Update Event Listeners
membershipDesignerForm.addEventListener('input', updateMembershipCardPreview);
noStartDateCheckbox.addEventListener('change', handleNoStartDateToggle);
document.getElementById('generate-print-ms-cards-btn').addEventListener('click', handlePrintMembershipCards);
document.getElementById('membership-management-tab').addEventListener('click', initializeMembershipCardDesigner); 
// Ensure download-ms-card-images-btn listener is defined or included if needed

/**
 * Generic utility to render a given HTML element's content and trigger a PNG download.
 * @param {string} elementId - The ID of the element to be rendered (e.g., 'ms-card-preview-front').
 * @param {string} filename - The complete filename for the downloaded file (e.g., 'Membership_Front_John_MEM123.png').
 */
const downloadCardAsImage = async (elementId, filename) => {
    const cardElement = document.getElementById(elementId);
    if (!cardElement) {
        console.error(`Element with ID ${elementId} not found for download.`);
        addNotification('error', `Download failed: Preview card element not found.`);
        return;
    }

    try {
        // Clone the element to a temporary, hidden container for a clean, styled capture
        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'absolute';
        tempContainer.style.left = '-9999px';
        tempContainer.style.width = '400px'; 
        tempContainer.style.height = '228px'; // Assuming this is your card size
        
        const clonedCard = cardElement.cloneNode(true);
        if (clonedCard.style.display === 'none') {
            clonedCard.style.display = 'block';
        }
        tempContainer.appendChild(clonedCard);
        document.body.appendChild(tempContainer);

        // Use html2canvas to capture the image
        const canvas = await html2canvas(clonedCard, {
            scale: 3, 
            logging: false,
            useCORS: true 
        });

        document.body.removeChild(tempContainer); // Cleanup

        const imageURL = canvas.toDataURL("image/png");
        const downloadLink = document.createElement('a');
        downloadLink.href = imageURL;
        downloadLink.download = filename;
        
        // Trigger the browser download
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        
        addNotification('info', `${filename} download initiated.`);

    } catch (error) {
        console.error(`Error generating image for ${filename}:`, error);
        addNotification('error', `Failed to download ${filename}. Check console for details.`);
    }
};

/**
 * Orchestrates the download of both the front and back membership card images.
 * Uses the correct element IDs: 'ms-card-preview-front' and 'ms-card-preview-back'.
 */
const downloadMembershipCardForPrint = async () => {
    // 1. Get data from the form inputs
    const name = document.getElementById('designer-ms-name')?.value || 'Client';
    const cardId = document.getElementById('designer-ms-id')?.value || 'MEM-XXXXX';
    const tierSelect = document.getElementById('designer-ms-tier-select');
    const tierName = tierSelect?.options[tierSelect.selectedIndex]?.dataset.name || 'Membership';
    
    // Create a safe, descriptive filename prefix
    const safeFilename = `${tierName.replace(/\s/g, '_')}_${name.replace(/\s/g, '_')}_${cardId}`;

    addNotification('info', 'Starting Membership Card image download...');
    
    // --- 1. FRONT CARD DOWNLOAD ---
    // Note: 'ms-card-preview-front' is the expected ID for the front preview DIV
    await downloadCardAsImage('ms-card-preview-front', `${safeFilename}_FRONT.png`);

    // --- 2. BACK CARD DOWNLOAD ---
    // A small delay is required for some browsers to handle two sequential downloads
    await new Promise(resolve => setTimeout(resolve, 500)); 

    // Note: 'ms-card-preview-back' is the expected ID for the back preview DIV
    await downloadCardAsImage('ms-card-preview-back', `${safeFilename}_BACK.png`);
    
    addNotification('success', 'Membership Card downloads complete.');
};


// Locate this section: // --- NEW: Printable Membership Card Designer Logic (Final Update) ---
// Add the listener below the initialization function call:

const downloadMsCardBtn = document.getElementById('download-ms-card-images-btn');
    if (downloadMsCardBtn) {
        downloadMsCardBtn.addEventListener('click', downloadMembershipCardForPrint);
    }

const downloadGiftCardForPrint = async () => {
    // 1. Get dynamic names for the filename from the designer form inputs
    const recipient = document.getElementById('designer-gc-recipient')?.value || 'Recipient';
    const amount = document.getElementById('designer-gc-amount')?.value || '0';
    
    // Create a safe, descriptive filename prefix
    const safeFilename = `GiftCard_Value${amount}_${recipient.replace(/\s/g, '_')}`;

    addNotification('info', 'Starting Gift Card image download...');
    
    // --- 1. FRONT CARD DOWNLOAD (FIXED ID) ---
    // Use the correct ID 'printable-gift-card' as confirmed in your HTML
    await downloadCardAsImage('printable-gift-card', `${safeFilename}_FRONT.png`);

    // --- 2. BACK CARD DOWNLOAD ---
    await new Promise(resolve => setTimeout(resolve, 500)); 

    await downloadCardAsImage('gc-card-preview-back', `${safeFilename}_BACK.png`);
    
    addNotification('success', 'Gift Card downloads complete.');
};

// --- Gift Card Download Listener (NEW) ---
    const downloadGcCardBtn = document.getElementById('download-gc-images-btn');
    if (downloadGcCardBtn) {
        downloadGcCardBtn.addEventListener('click', downloadGiftCardForPrint);
    }
// --- Located inside initMainApp() ---

    document.getElementById('print-salon-earnings-btn').addEventListener('click', () => {
        const originalTable = document.getElementById('salon-earning-table');
        if (!originalTable) return;

        const printTable = document.createElement('table');
        printTable.className = originalTable.className;

        const staffAndTechNames = techniciansAndStaff.map(t => t.name);

        const originalThead = originalTable.querySelector('thead');
        const newThead = originalThead.cloneNode(true);
        const headerRow = newThead.querySelector('tr');
        headerRow.innerHTML = '';
        headerRow.insertAdjacentHTML('beforeend', '<th scope="col" class="px-2 py-1">Date</th>');
        staffAndTechNames.forEach(name => {
            headerRow.insertAdjacentHTML('beforeend', `<th scope="col" class="px-2 py-1">${name}</th>`);
        });
        printTable.appendChild(newThead);

        const originalTbody = originalTable.querySelector('tbody');
        const newTbody = document.createElement('tbody');
        originalTbody.querySelectorAll('tr').forEach(row => {
            const newRow = newTbody.insertRow();
            newRow.appendChild(row.cells[0].cloneNode(true));
            staffAndTechNames.forEach(name => {
                const originalHeaderIndex = Array.from(originalThead.querySelectorAll('th')).findIndex(th => th.textContent === name);
                if (originalHeaderIndex > -1) {
                    newRow.appendChild(row.cells[originalHeaderIndex].cloneNode(true));
                }
            });
        });
        printTable.appendChild(newTbody);

        const originalTfoot = originalTable.querySelector('tfoot');
        const newTfoot = originalTfoot.cloneNode(true);
        newTfoot.querySelectorAll('tr').forEach((row, rowIndex) => {
            if (rowIndex > 0) {
                const firstCell = row.querySelector('td');
                firstCell.colSpan = 1;
                while (row.cells.length > staffAndTechNames.length + 1) {
                    row.deleteCell(-1);
                }
            } else {
                while (row.cells.length > staffAndTechNames.length + 1) {
                    row.deleteCell(-1);
                }
            }
        });
        printTable.appendChild(newTfoot);

        const reportTitle = "Staff Earning Report";
        const now = new Date();
        const datePrinted = `Printed on: ${now.toLocaleDateString()} at ${now.toLocaleTimeString()}`;
        const logoUrl = "https://placehold.co/100x100/d63384/FFFFFF?text=NE";

        const printWindow = window.open('', '_blank', 'height=800,width=1000');
        printWindow.document.write('<html><head><title>Print Staff Earnings</title>');
        printWindow.document.write('<script src="https://cdn.tailwindcss.com"><\/script>');

        // --- THIS STYLE BLOCK IS UPDATED ---
        printWindow.document.write(`
            <style> 
                body { padding: 15px; font-family: sans-serif; } 
                table { width: 100%; border-collapse: collapse; font-size: 10px; } 
                th, td { border: 1px solid #ddd; padding: 2px 4px; text-align: left; } 
                thead { background-color: #f2f2f2; } 
                tfoot { font-weight: bold; }
                @media print { 
                    body { -webkit-print-color-adjust: exact; padding: 10px; } 
                    h1 { font-size: 1.25rem; }
                    p { font-size: 0.75rem; }
                } 
            </style>
        `);

        printWindow.document.write('</head><body>');
        printWindow.document.write(`
            <div class="flex justify-between items-center mb-4 border-b pb-2">
                <div>
                    <h1 class="text-xl font-bold mb-1">${reportTitle}</h1>
                    <p class="text-xs text-gray-500">${datePrinted}</p>
                </div>
                <img src="${logoUrl}" alt="Salon Logo" class="h-12 w-12 rounded-full">
            </div>
        `);
        printWindow.document.write(printTable.outerHTML);
        printWindow.document.write('</body></html>');

        printWindow.document.close();
        printWindow.focus();

        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 500);
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
        } catch (err) { console.error("Error updating earning:", err); alert("Could not update earning."); }
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
        techniciansAndStaff.forEach(tech => { const input = document.getElementById(`edit-${tech.name.toLowerCase()}-earning`); if (input) { updatedData[tech.name.toLowerCase()] = parseFloat(input.value) || 0; } });
        try {
            await updateDoc(doc(db, "salon_earnings", earningId), updatedData);
            closeEditSalonEarningModal();
        } catch (err) { console.error("Error updating salon earning:", err); alert("Could not update salon earning."); }
    });

    // REPLACE the old renderAllBookingsList function with this one
    const renderAllBookingsList = () => {
        todayCountSpan.textContent = allAppointments.filter(a => a.appointmentTimestamp.toDate() > new Date()).length;
        renderDetailedAppointmentsList('today-bookings-table-container', allAppointments, currentTechFilterCalendar);
    };

    document.getElementById('today-btn').addEventListener('click', () => { document.getElementById('month-view').classList.add('hidden'); document.getElementById('month-nav').classList.add('hidden'); document.getElementById('list-view').classList.remove('hidden'); document.getElementById('today-btn').classList.add('hidden'); document.getElementById('month-view-btn').classList.remove('hidden'); renderAllBookingsList(); });
    document.getElementById('month-view-btn').addEventListener('click', () => { document.getElementById('list-view').classList.add('hidden'); document.getElementById('month-view-btn').classList.add('hidden'); document.getElementById('month-view').classList.remove('hidden'); document.getElementById('month-nav').classList.remove('hidden'); document.getElementById('today-btn').classList.remove('hidden'); });

// FIX: Add a safety check for the table element
    const todayBookingsTable = document.getElementById('today-bookings-table');
    if (todayBookingsTable) { // This 'if' block prevents the error
        todayBookingsTable.addEventListener('click', async (e) => {
            if (e.target.classList.contains('checkin-today-btn')) {
                const appointment = allAppointments.find(a => a.id === e.target.dataset.id);
                if (!appointment) return;
                try {
                    await addDoc(collection(db, "active_queue"), { name: appointment.name, phone: appointment.phone, people: appointment.people || 1, bookingType: 'Booked - Calendar', services: Array.isArray(appointment.services) ? appointment.services : [appointment.services], technician: appointment.technician, notes: appointment.notes || '', checkInTimestamp: serverTimestamp(), status: 'waiting' });
                    await deleteDoc(doc(db, "appointments", e.target.dataset.id));
                } catch (err) { console.error("Error checking in from today's view:", err); alert("Could not check in this client."); }
            }
        });
    }

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
            if (client) {
                openClientProfileModal(client);
            } else {
                console.warn("Could not find client data for ID:", viewProfileBtn.dataset.id);
            }
        }
        else if (editBtn) {
            const client = aggregatedClients.find(c => c.id === editBtn.dataset.id);
            if (client) {
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
const staffDetailsFilter = document.getElementById('staff-details-date-filter');
if (staffDetailsFilter) {
    staffDetailsFilter.addEventListener('change', updateStaffDashboard);
}
    const addUserForm = document.getElementById('add-user-form');
    const usersTableBody = document.querySelector('#users-table tbody');
    // Replace the entire renderUsers function
    const renderUsers = (users) => {
        usersTableBody.innerHTML = '';
        users.forEach(user => {
            const row = usersTableBody.insertRow();
            const payoutText = (user.payoutType === 'commission_plus_tips') ? 'Comm. + Tips' : 'Standard';
            row.innerHTML = `<td class="px-6 py-4">${user.name}</td><td class="px-6 py-4">${user.email}</td><td class="px-6 py-4">${user.phone}</td><td class="px-6 py-4">${user.role}</td><td class="px-6 py-4">${payoutText}</td><td class="px-6 py-4 text-center space-x-2"><button data-id="${user.id}" class="edit-user-btn text-blue-500"><i class="fas fa-edit"></i></button><button data-id="${user.id}" class="delete-user-btn text-red-500"><i class="fas fa-trash"></i></button></td>`;
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
            if (firstOption && (firstOption.value === 'Any Technician' || firstOption.value === '')) { select.appendChild(firstOption); }
            userList.forEach(tech => { select.appendChild(new Option(tech.name, tech.name)); });
            if (select.id === 'technician-name-select') { select.appendChild(new Option("Other", "other")); }

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
        let commissionHTML = `<tr class="text-center"><td class="px-6 py-3 text-right font-bold border-t-2 border-gray-300">Total Payout:</td>`, check70HTML = `<tr class="text-center"><td class="px-6 py-3 text-right font-bold">Check Payout:</td>`, cash30HTML = `<tr class="text-center"><td class="px-6 py-3 text-right font-bold">Cash Payout:</td>`;
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
        const payoutType = document.getElementById('payout-type').value; // Add this line
        if (userId) {
            await setDoc(doc(db, "users", userId), { name, phone, email, role, payoutType }); // Add payoutType here
            alert("User updated.");
        } else {
            if (!password || password.length < 6) { return alert("Password must be at least 6 characters."); }
            try {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                await setDoc(doc(db, "users", userCredential.user.uid), { name, phone, email, role, payoutType }); // And here
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
                document.getElementById('payout-type').value = user.payoutType || 'standard'; // Add this line
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

        if (lowStockItems.length === 0) {
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

    // REPLACE this function inside initMainApp
    const loadFeatureToggles = async () => {
        const settingsDoc = await getDoc(doc(db, "settings", "features"));
        if (settingsDoc.exists()) {
            const settings = settingsDoc.data();
            document.getElementById('toggle-shop').checked = settings.showShop !== false; // Add this line
            document.getElementById('toggle-client-login').checked = settings.showClientLogin !== false;
            document.getElementById('toggle-promotions').checked = settings.showPromotions !== false;
            document.getElementById('toggle-gift-card').checked = settings.showGiftCards !== false;
            document.getElementById('toggle-nails-idea').checked = settings.showNailArt !== false;
            document.getElementById('toggle-memberships').checked = settings.showMemberships !== false;
            document.getElementById('toggle-royalty-card').checked = settings.showRoyaltyCard !== false; // This line was missing
        } else {
            // Default all to true if no settings exist yet
            document.getElementById('toggle-shop').checked = true; // Add this line
            document.getElementById('toggle-client-login').checked = true;
            document.getElementById('toggle-promotions').checked = true;
            document.getElementById('toggle-gift-card').checked = true;
            document.getElementById('toggle-nails-idea').checked = true;
            document.getElementById('toggle-memberships').checked = true;
            document.getElementById('toggle-royalty-card').checked = true; // This line was missing
        }
    };
    // REPLACE this event listener inside initMainApp
    featureTogglesForm.addEventListener('change', async (e) => {
        if (e.target.type === 'checkbox') {
            const settings = {
                showShop: document.getElementById('toggle-shop').checked,
                showClientLogin: document.getElementById('toggle-client-login').checked,
                showPromotions: document.getElementById('toggle-promotions').checked,
                showGiftCards: document.getElementById('toggle-gift-card').checked,
                showNailArt: document.getElementById('toggle-nails-idea').checked,
                showMemberships: document.getElementById('toggle-memberships').checked,
                showRoyaltyCard: document.getElementById('toggle-royalty-card').checked,
            };
            await setDoc(doc(db, "settings", "features"), settings, { merge: true });
        }
    });
const loadSettings = async () => {
    const bookingSnap = await getDoc(doc(db, "settings", "booking"));
    if (bookingSnap.exists()) { 
        const data = bookingSnap.data();
        bookingSettings = { ...bookingSettings, ...data }; // Merge with defaults
    }
    // Set form values from the final settings object
    minBookingHoursInput.value = bookingSettings.minBookingHours;
    document.getElementById('default-service-duration').value = bookingSettings.defaultDuration;
    document.getElementById('booking-buffer-time').value = bookingSettings.bufferTime;

    const securitySnap = await getDoc(doc(db, "settings", "security"));
    if (securitySnap.exists()) { 
        const data = securitySnap.data(); 
        loginSecuritySettings = data; 
        maxLoginAttemptsInput.value = data.maxAttempts || 3; 
        loginLockoutMinutesInput.value = data.lockoutMinutes || 120; 
    }
    // Inside the loadSettings function
const birthdaySnap = await getDoc(doc(db, "settings", "birthday_rewards"));
if (birthdaySnap.exists()) {
    const data = birthdaySnap.data();
    document.getElementById('toggle-birthday-rewards').checked = data.enabled || false;
    document.getElementById('birthday-email-subject').value = data.subject || 'A Special Birthday Gift from Nails Express!';
    document.getElementById('birthday-email-body').value = data.body || 'Hi {clientName},\n\nHappy birthday from all of us at Nails Express! To celebrate, we\'d like to offer you 15% off your next visit.\n\nWe hope to see you soon!\n\nThe Nails Express Team';
} else {
    // Pre-fill with default text if no settings exist yet
     document.getElementById('birthday-email-subject').value = 'A Special Birthday Gift from Nails Express!';
     document.getElementById('birthday-email-body').value = 'Hi {clientName},\n\nHappy birthday from all of us at Nails Express! To celebrate, we\'d like to offer you 15% off your next visit.\n\nWe hope to see you soon!\n\nThe Nails Express Team';
}
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
    const defaultDuration = parseInt(document.getElementById('default-service-duration').value, 10);
    const bufferTime = parseInt(document.getElementById('booking-buffer-time').value, 10);
    const maxAttempts = parseInt(maxLoginAttemptsInput.value, 10);
    const lockoutMinutes = parseInt(loginLockoutMinutesInput.value, 10);

    if (isNaN(hours) || hours < 0 || isNaN(defaultDuration) || isNaN(bufferTime) || isNaN(maxAttempts) || maxAttempts < 1 || isNaN(lockoutMinutes) || lockoutMinutes < 1) {
        return alert("Please enter valid, positive numbers for all settings.");
    }
    try {
        await setDoc(doc(db, "settings", "booking"), { 
            minBookingHours: hours,
            defaultDuration: defaultDuration,
            bufferTime: bufferTime
        });
        await setDoc(doc(db, "settings", "security"), { 
            maxAttempts: maxAttempts, 
            lockoutMinutes: lockoutMinutes 
        });
        
        // Update global state
        bookingSettings = { minBookingHours: hours, defaultDuration, bufferTime };
        loginSecuritySettings = { maxAttempts, lockoutMinutes };

        alert("Settings saved!");
    } catch (error) {
        console.error("Error saving settings: ", error);
        alert("Could not save settings.");
    }
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

    // REPLACE your old populateExpenseDropdowns function with this one:
    const populateExpenseDropdowns = () => {
        const categorySelect = document.getElementById('expense-category');
        const supplierSelect = document.getElementById('expense-supplier');
        const paymentSelect = document.getElementById('expense-payment-account');

        // New filter dropdowns
        const categoryFilterSelect = document.getElementById('expense-category-filter');
        const supplierFilterSelect = document.getElementById('expense-supplier-filter');

        const populate = (select, data, defaultOptionText) => {
            if (!select) return;
            const first = select.options[0] || document.createElement('option');
            first.value = defaultOptionText === "All" ? "all" : "";
            first.textContent = defaultOptionText === "All" ? `All ${select.id.includes('category') ? 'Categories' : 'Suppliers'}` : `Select ${defaultOptionText}`;
            select.innerHTML = '';
            select.appendChild(first);
            data.forEach(item => select.appendChild(new Option(item.name, item.name)));
        };

        populate(categorySelect, allExpenseCategories, 'Category');
        populate(supplierSelect, allSuppliers, 'Supplier');
        populate(paymentSelect, allPaymentAccounts, 'Account');

        populate(categoryFilterSelect, allExpenseCategories, 'All');
        populate(supplierFilterSelect, allSuppliers, 'All');
    };

   function populateExpenseMonthFilter() {
        const months = [...new Set(allExpenses.map(exp => { const d = new Date(exp.date.seconds * 1000); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; }))].sort().reverse();
        expenseMonthFilter.innerHTML = '<option value="all">All Months</option>';
        months.forEach(monthYear => { const [year, month] = monthYear.split('-'); expenseMonthFilter.innerHTML += `<option value="${monthYear}">${new Date(year, month - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' })}</option>`; });
        expenseMonthFilter.value = currentExpenseMonthFilter || 'all';
    };

    // REPLACE your old renderExpenses function with this one:
    const renderExpenses = () => {
        let filtered = allExpenses;

        // Filter by Month
        if (currentExpenseMonthFilter && currentExpenseMonthFilter !== 'all') {
            const [year, month] = currentExpenseMonthFilter.split('-').map(Number);
            filtered = filtered.filter(exp => { const d = new Date(exp.date.seconds * 1000); return d.getFullYear() === year && d.getMonth() + 1 === month; });
        }

        // Filter by Category
        if (currentExpenseCategoryFilter && currentExpenseCategoryFilter !== 'all') {
            filtered = filtered.filter(exp => exp.category === currentExpenseCategoryFilter);
        }

        // Filter by Supplier
        if (currentExpenseSupplierFilter && currentExpenseSupplierFilter !== 'all') {
            filtered = filtered.filter(exp => exp.supplier === currentExpenseSupplierFilter);
        }

        expenseTableBody.innerHTML = filtered.length === 0 ? `<tr><td colspan="8" class="py-6 text-center text-gray-400">No expenses found for the selected filters.</td></tr>` : '';
        filtered.forEach(exp => {
            const row = expenseTableBody.insertRow();
            row.className = 'bg-white border-b';
            row.innerHTML = `<td class="px-6 py-4">${new Date(exp.date.seconds * 1000).toLocaleDateString()}</td><td class="px-6 py-4">${exp.name}</td><td class="px-6 py-4">${exp.category || ''}</td><td class="px-6 py-4">${exp.supplier || ''}</td><td class="px-6 py-4">${exp.paymentAccount || ''}</td><td class="px-6 py-4">${exp.attachmentURL ? `<a href="${exp.attachmentURL}" target="_blank" class="text-blue-500 hover:underline">View</a>` : 'N/A'}</td><td class="px-6 py-4 text-right">$${exp.amount.toFixed(2)}</td><td class="px-6 py-4 text-center space-x-2"><button data-id="${exp.id}" class="edit-expense-btn text-blue-500"><i class="fas fa-edit"></i></button><button data-id="${exp.id}" class="delete-expense-btn text-red-500"><i class="fas fa-trash"></i></button></td>`;
        });
        totalExpenseEl.textContent = `$${filtered.reduce((sum, exp) => sum + exp.amount, 0).toFixed(2)}`;
    };

    expenseMonthFilter.addEventListener('change', (e) => { currentExpenseMonthFilter = e.target.value; renderExpenses(); });
    // Add these two new event listeners
    document.getElementById('expense-category-filter').addEventListener('change', (e) => {
        currentExpenseCategoryFilter = e.target.value;
        renderExpenses();
    });
    document.getElementById('expense-supplier-filter').addEventListener('change', (e) => {
        currentExpenseSupplierFilter = e.target.value;
        renderExpenses();
    });

    // PASTE THIS ENTIRE NEW BLOCK inside the if (userRole === 'admin') block

    const exportExpensesBtn = document.getElementById('export-expenses-btn');
    if (exportExpensesBtn) {
        exportExpensesBtn.addEventListener('click', () => {
            // 1. Get the currently filtered data
            let filteredExpenses = [...allExpenses];
            if (currentExpenseMonthFilter && currentExpenseMonthFilter !== 'all') {
                const [year, month] = currentExpenseMonthFilter.split('-').map(Number);
                filteredExpenses = filteredExpenses.filter(exp => {
                    const d = new Date(exp.date.seconds * 1000);
                    return d.getFullYear() === year && d.getMonth() + 1 === month;
                });
            }
            if (currentExpenseCategoryFilter && currentExpenseCategoryFilter !== 'all') {
                filteredExpenses = filteredExpenses.filter(exp => exp.category === currentExpenseCategoryFilter);
            }
            if (currentExpenseSupplierFilter && currentExpenseSupplierFilter !== 'all') {
                filteredExpenses = filteredExpenses.filter(exp => exp.supplier === currentExpenseSupplierFilter);
            }

            if (filteredExpenses.length === 0) {
                alert("There is no data to export for the current filters.");
                return;
            }

            // 2. Prepare the data for the worksheet
            const dataToExport = filteredExpenses.map(exp => ({
                'Date': new Date(exp.date.seconds * 1000).toLocaleDateString(),
                'Expense Name': exp.name,
                'Category': exp.category || '',
                'Supplier': exp.supplier || '',
                'Paid Via': exp.paymentAccount || '',
                'Amount': exp.amount
            }));

            // 3. Add a total row at the bottom
            const totalAmount = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
            dataToExport.push({}); // Add a blank row for spacing
            dataToExport.push({
                'Date': 'Total:',
                'Amount': totalAmount
            });

            // 4. Create the worksheet and workbook
            const worksheet = XLSX.utils.json_to_sheet(dataToExport);

            // Optional: Set column widths for better readability
            worksheet['!cols'] = [
                { wch: 12 }, { wch: 30 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 12 }
            ];

            // Format the 'Amount' column as currency
            const amountColumnIndex = 'F';
            for (let i = 2; i <= dataToExport.length + 1; i++) {
                const cellRef = `${amountColumnIndex}${i}`;
                if (worksheet[cellRef] && typeof worksheet[cellRef].v === 'number') {
                    worksheet[cellRef].t = 'n'; // Set type to number
                    worksheet[cellRef].z = '$#,##0.00'; // Set format to currency
                }
            }

            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Expenses Report");

            // 5. Trigger the download
            XLSX.writeFile(workbook, `NailsExpress_Expenses_${new Date().toISOString().split('T')[0]}.xlsx`);
        });
    }

    // --- Located inside initMainApp() ---

    // --- Located inside initMainApp() ---

    const printExpensesBtn = document.getElementById('print-expenses-btn');
    if (printExpensesBtn) {
        printExpensesBtn.addEventListener('click', () => {
            const expenseTable = document.getElementById('expense-table');
            if (expenseTable) {
                const reportTitle = "Expense Report";
                const now = new Date();
                const datePrinted = `Printed on: ${now.toLocaleDateString()} at ${now.toLocaleTimeString()}`;

                // --- This is the new line for your logo URL ---
                const logoUrl = "https://placehold.co/100x100/d63384/FFFFFF?text=NE";

                const tableHTML = expenseTable.outerHTML;

                const printWindow = window.open('', '_blank', 'height=800,width=1000');
                printWindow.document.write('<html><head><title>Nails Express-Print Expenses</title>');
                printWindow.document.write('<script src="https://cdn.tailwindcss.com"><\/script>');
                printWindow.document.write('<style> body { padding: 20px; font-family: sans-serif; } @media print { body { -webkit-print-color-adjust: exact; } .no-print { display: none; } } </style>');
                printWindow.document.write('</head><body>');

                // --- This block is updated to include the logo ---
                printWindow.document.write(`
                    <div class="flex justify-between items-center mb-4 border-b pb-4">
                        <div>
                            <h1 class="text-2xl font-bold mb-2">${reportTitle}</h1>
                            <p class="text-sm text-gray-500">${datePrinted}</p>
                        </div>
                        <img src="${logoUrl}" alt="Salon Logo" class="h-16 w-16 rounded-full">
                    </div>
                `);

                printWindow.document.write(tableHTML);
                printWindow.document.write('</body></html>');

                printWindow.document.close();
                printWindow.focus();

                setTimeout(() => {
                    printWindow.print();
                    printWindow.close();
                }, 500);
            }
        });
    }



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
            categoryDiv.innerHTML = `<div class="flex justify-between items-center mb-2"><h4 class="font-bold">${categoryName}</h4><div><button class="add-service-to-category-btn text-green-500 mr-2" data-category="${categoryName}"><i class="fas fa-plus-circle"></i></button><button class="edit-category-btn text-blue-500 mr-2" data-category="${categoryName}"><i class="fas fa-edit"></i></button><button class="delete-category-btn text-red-500" data-category="${categoryName}"><i class="fas fa-trash"></i></button></div></div><ul class="service-list space-y-1 pl-4">${items.map((item, index) => `<li class="flex justify-between items-center text-sm"><span>${item.name} - ${item.price} (${item.duration || 'N/A'} min)</span><div><button class="edit-service-btn text-blue-500 mr-2" data-category="${categoryName}" data-index="${index}"><i class="fas fa-edit"></i></button><button class="delete-service-btn text-red-500" data-category="${categoryName}" data-index="${index}"><i class="fas fa-times-circle"></i></button></div></li>`).join('')}</ul>`;
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
        if (editSvcBtn) { const category = editSvcBtn.dataset.category, index = editSvcBtn.dataset.index, service = servicesData[category][index]; addServiceForm.reset(); document.getElementById('edit-category-id').value = category; document.getElementById('edit-service-index').value = index; document.getElementById('service-prefix').value = service.p || ''; document.getElementById('service-name').value = service.name; document.getElementById('service-price').value = service.price; document.getElementById('service-duration').value = service.duration || ''; document.getElementById('edit-service-title').textContent = `Edit Service in ${category}`; editServiceSection.classList.remove('hidden'); }
        if (delSvcBtn) { const category = delSvcBtn.dataset.category, index = parseInt(delSvcBtn.dataset.index, 10); showConfirmModal('Delete this service?', async () => { const updatedItems = [...servicesData[category]]; updatedItems.splice(index, 1); await updateDoc(doc(db, "services", category), { items: updatedItems }); }); }
    });
    addServiceForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const category = document.getElementById('edit-category-id').value, index = document.getElementById('edit-service-index').value;
        const newService = { p: document.getElementById('service-prefix').value, name: document.getElementById('service-name').value, price: document.getElementById('service-price').value, duration: parseInt(document.getElementById('service-duration').value, 10) || 40 };
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



    const renderNailIdeasAdminTable = (ideas) => {
        nailIdeasTableBody.innerHTML = '';
        ideas.forEach(idea => {
            const row = nailIdeasTableBody.insertRow();
            row.innerHTML = `<td class="px-6 py-4"><img src="${(idea.imageURLs && idea.imageURLs[0]) || idea.imageURL}" alt="${idea.name}" class="w-16 h-16 object-cover rounded"></td><td class="px-6 py-4">${idea.name}</td><td class="px-6 py-4">${idea.shape}</td><td class="px-6 py-4">${idea.categories.join(', ')}</td><td class="px-6 py-4 text-center space-x-2"><button data-id="${idea.id}" class="edit-nail-idea-btn text-blue-500"><i class="fas fa-edit"></i></button><button data-id="${idea.id}" class="delete-nail-idea-btn text-red-500"><i class="fas fa-trash"></i></button></td>`;
        
        });
    };

    const applyNailIdeaFilters = () => {
        const searchTerm = document.getElementById('nail-idea-search').value.toLowerCase();
        const shapeFilter = document.getElementById('nail-idea-shape-filter').value;

        // --- UPDATED to read from the new tag buttons ---
        const activeTagButton = document.querySelector('#nail-idea-tag-filter-container .tech-filter-btn.active');
        const categoryFilter = activeTagButton ? activeTagButton.dataset.category : "";

        const filteredIdeas = allNailIdeas.filter(idea => {
            const matchesSearch = idea.name.toLowerCase().includes(searchTerm) || idea.categories.some(cat => cat.toLowerCase().includes(searchTerm));
            const matchesShape = !shapeFilter || idea.shape === shapeFilter;
            const matchesCategory = !categoryFilter || idea.categories.includes(categoryFilter);
            return matchesSearch && matchesShape && matchesCategory;
        });
        renderNailIdeasGallery(filteredIdeas);
    };

    // --- NEW Event Listener for Tag Filtering ---
    const tagContainer = document.getElementById('nail-idea-tag-filter-container');
    if (tagContainer) {
        tagContainer.addEventListener('click', (e) => {
            const button = e.target.closest('.tech-filter-btn');
            if (button) {
                // Remove active state from all buttons
                tagContainer.querySelectorAll('.tech-filter-btn').forEach(btn => btn.classList.remove('active'));
                // Add active state to the clicked button
                button.classList.add('active');
                // Re-apply the filters
                applyNailIdeaFilters();
            }
        });
    }

    onSnapshot(query(collection(db, "nail_ideas"), orderBy("createdAt", "desc")), (snapshot) => {
        allNailIdeas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const shapesDatalist = document.getElementById('nail-shapes-list');
        if (shapesDatalist) {
            const uniqueShapes = [...new Set(allNailIdeas.map(idea => idea.shape).filter(Boolean))];
            shapesDatalist.innerHTML = uniqueShapes.map(shape => `<option value="${shape}"></option>`).join('');
        }
        const shapes = [...new Set(allNailIdeas.map(i => i.shape).filter(Boolean))];
        const shapeFilter = document.getElementById('nail-idea-shape-filter');
        shapeFilter.innerHTML = '<option value="">All Shapes</option>' + shapes.map(s => `<option value="${s}">${s}</option>`).join('');

        // --- NEW TAG GENERATION LOGIC ---
        const categories = [...new Set(allNailIdeas.flatMap(i => i.categories).filter(Boolean))];
        const tagContainer = document.getElementById('nail-idea-tag-filter-container');
        // Clear existing tags but keep the "Tags:" label
        tagContainer.innerHTML = '<span class="text-sm font-semibold text-gray-600 mr-2">Tags:</span>';

        const allBtn = document.createElement('button');
        allBtn.className = 'tech-filter-btn px-3 py-1 rounded-full text-sm active'; // Active by default
        allBtn.dataset.category = ""; // Empty value for "All"
        allBtn.textContent = "All";
        tagContainer.appendChild(allBtn);

        categories.sort().forEach(cat => {
            const btn = document.createElement('button');
            btn.className = 'tech-filter-btn px-3 py-1 rounded-full text-sm';
            btn.dataset.category = cat;
            btn.textContent = cat;
            tagContainer.appendChild(btn);
        });
        // --- END NEW LOGIC ---

        applyNailIdeaFilters();
        renderNailIdeasAdminTable(allNailIdeas);
    });

    document.getElementById('nail-idea-search').addEventListener('input', applyNailIdeaFilters);
    document.getElementById('nail-idea-shape-filter').addEventListener('change', applyNailIdeaFilters);

// REPLACE the old addNailIdeaForm 'submit' listener with this one
addNailIdeaForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const ideaId = document.getElementById('edit-nail-idea-id').value;
    const imageSource = document.querySelector('input[name="imageSource"]:checked').value;
    const file = document.getElementById('nail-idea-image').files[0];
    const imageUrlsText = document.getElementById('nail-idea-image-url').value;
    let finalImageURLs = [];

    const btn = document.getElementById('add-nail-idea-btn');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
        if (imageSource === 'upload') {
            if (!ideaId && !file) {
                throw new Error('Please select an image to upload.');
            }
            if (file) {
                const storageRef = ref(storage, `nail_ideas/${Date.now()}_${file.name}`);
                await uploadBytes(storageRef, file);
                finalImageURLs.push(await getDownloadURL(storageRef));
            }
        } else { // imageSource === 'url'
            finalImageURLs = imageUrlsText.split('\n').map(url => url.trim()).filter(Boolean);
            if (finalImageURLs.length === 0) {
                throw new Error('Please enter at least one image URL.');
            }
        }

        const ideaData = {
            name: document.getElementById('nail-idea-name').value,
            description: document.getElementById('nail-idea-description').value,
            color: document.getElementById('nail-idea-color').value,
            shape: document.getElementById('nail-idea-shape').value,
            categories: document.getElementById('nail-idea-categories').value.split(',').map(s => s.trim()).filter(Boolean),
        };

        if (ideaId) { // Editing
            const existingIdea = allNailIdeas.find(i => i.id === ideaId);
            if (finalImageURLs.length > 0) { // If a new image/URLs were provided
                ideaData.imageURLs = finalImageURLs;
                // If the old image was an upload, delete it from storage
                if (existingIdea.imageURLs && existingIdea.imageURLs[0] && existingIdea.imageURLs[0].includes('firebasestorage')) {
                    try {
                        const oldImageRef = ref(storage, existingIdea.imageURLs[0]);
                        await deleteObject(oldImageRef);
                    } catch (storageError) {
                        console.warn("Could not delete old image, it might not exist:", storageError);
                    }
                }
            }
            await updateDoc(doc(db, "nail_ideas", ideaId), ideaData);
        } else { // Adding new
            ideaData.imageURLs = finalImageURLs;
            ideaData.createdAt = serverTimestamp();
            await addDoc(collection(db, "nail_ideas"), ideaData);
        }
        resetNailIdeaForm();
    } catch (error) {
        console.error("Error saving nail idea:", error);
        alert(`Could not save nail idea: ${error.message}`);
    } finally {
        btn.disabled = false;
        btn.textContent = document.getElementById('edit-nail-idea-id').value ? 'Update Idea' : 'Add Idea';
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
                // ADD THIS LOGIC to handle populating the URL textarea
        const imageUrlTextarea = document.getElementById('nail-idea-image-url');
        if (idea.imageURLs && idea.imageURLs.length > 0) {
            imageUrlTextarea.value = idea.imageURLs.join('\n');
        } else if (idea.imageURL) { // For legacy data
            imageUrlTextarea.value = idea.imageURL;
        }
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
            "DND": [ ],
            "DC": [ ],
            "DD": [ ],
            "Royal Cat Eye": []
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

        // ADD THIS NEW CODE BLOCK
        const nailShapes = {
            'Almond': '<svg viewBox="0 0 100 150"><path class="nail" d="M50,0 C10,0 0,60 0,130 L100,130 C100,60 90,0 50,0 Z"/></svg>',
            'Square': '<svg viewBox="0 0 100 150"><path class="nail" d="M5,0 L95,0 C98,0 100,2 100,5 L100,150 L0,150 L0,5 C0,2 2,0 5,0 Z"/></svg>',
            'Squoval': '<svg viewBox="0 0 100 150"><path class="nail" d="M20,0 L80,0 C91,0 100,9 100,20 L100,150 L0,150 L0,20 C0,9 9,0 20,0 Z"/></svg>',
            'Round': '<svg viewBox="0 0 100 150"><path class="nail" d="M100,150 L0,150 L0,50 C0,22.4 22.4,0 50,0 C77.6,0 100,22.4 100,50 Z"/></svg>',
            'Stiletto': '<svg viewBox="0 0 100 150"><path class="nail" d="M50,0 C50,0 100,130 100,130 L100,150 L0,150 L0,130 C0,130 50,0 50,0 Z"/></svg>',
            'Coffin': '<svg viewBox="0 0 100 150"><path class="nail" d="M30,0 L70,0 L100,150 L0,150 Z"/></svg>'
        };

        const shapeContainer = document.getElementById('nail-shape-preview-container');
        shapeContainer.innerHTML = '';

        let shapeHTML = '<div class="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-6">';
        for (const shapeName in nailShapes) {
            shapeHTML += `
        <div class="text-center">
            <div class="nail-shape-svg-wrapper">${nailShapes[shapeName]}</div>
            <p class="text-xs font-semibold text-gray-600 mt-1">${shapeName}</p>
        </div>
    `;
        }
        shapeHTML += '</div>';
        shapeContainer.innerHTML = shapeHTML;
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

        // ... and CHANGE it to this:
        document.getElementById('color-swatches-container').addEventListener('click', (e) => {
            const swatch = e.target.closest('.color-swatch');
            if (swatch) {
                const color = swatch.dataset.color;
                document.querySelectorAll('#nail-shape-preview-container .nail').forEach(nailPath => {
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
        if (!container) return;

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
            if (colorChartInitialized) {
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

                let actionButtons = `<button data-id="${card.id}" class="print-gift-card-btn text-gray-500 hover:text-gray-700" title="View/Print Card"><i class="fas fa-print text-lg"></i></button>
                     <button data-id="${card.id}" class="edit-gift-card-btn text-blue-500 hover:text-blue-700" title="Manage Card"><i class="fas fa-edit text-lg"></i></button>
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

// PASTE THIS ENTIRE BLOCK inside initMainApp()

const emailMarketingModal = document.getElementById('email-marketing-modal');
const emailMarketingForm = document.getElementById('email-marketing-form');

const openEmailMarketingModal = (promo = null) => {
    emailMarketingForm.reset();
    if (promo) {
        document.getElementById('email-marketing-modal-title').textContent = `Email Campaign for "${promo.title}"`;
        document.getElementById('email-marketing-subject').value = promo.title;
        document.getElementById('email-marketing-body').value = promo.description;
    } else {
        document.getElementById('email-marketing-modal-title').textContent = 'Create Email Campaign';
    }
    emailMarketingModal.classList.remove('hidden');
};

const closeEmailMarketingModal = () => emailMarketingModal.classList.add('hidden');

document.getElementById('open-email-marketing-btn').addEventListener('click', () => openEmailMarketingModal());
document.getElementById('close-email-marketing-modal-btn').addEventListener('click', closeEmailMarketingModal);
emailMarketingModal.querySelector('.modal-overlay').addEventListener('click', closeEmailMarketingModal);

promotionsTableBody.addEventListener('click', (e) => {
    const emailBtn = e.target.closest('.email-promo-btn');
    if (emailBtn) {
        const promo = allPromotions.find(p => p.id === emailBtn.dataset.id);
        if (promo) openEmailMarketingModal(promo);
    }
});

emailMarketingForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const subject = document.getElementById('email-marketing-subject').value;
    const body = document.getElementById('email-marketing-body').value;

    const clientsWithEmail = allClients.filter(c => c.email);

    if (clientsWithEmail.length === 0) {
        alert("No clients with email addresses found.");
        return;
    }

    if (!confirm(`This will send an email to ${clientsWithEmail.length} clients. Are you sure you want to proceed?`)) {
        return;
    }

    try {
        const batch = writeBatch(db);
        clientsWithEmail.forEach(client => {
            const mailRef = doc(collection(db, "mail"));
            const personalizedBody = body.replace(/{clientName}/g, client.name).replace(/\n/g, '<br>');
            batch.set(mailRef, {
                to: client.email,
                message: {
                    subject: subject,
                    html: personalizedBody
                }
            });
        });

        await batch.commit();
        alert(`Email campaign has been queued for ${clientsWithEmail.length} clients!`);
        closeEmailMarketingModal();

    } catch (error) {
        console.error("Error sending email campaign:", error);
        alert("Could not send the email campaign. Please check the console for details.");
    }
});

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
        // Inside renderPromotionsAdminTable, find the row.innerHTML assignment
// and REPLACE the actionButtons part with this
let actionButtons = `
    <button data-id="${promo.id}" class="send-promo-notification-btn text-purple-500" title="Send In-App Notification"><i class="fas fa-bell"></i></button>
    <button data-id="${promo.id}" class="email-promo-btn text-blue-500" title="Create Email Campaign"><i class="fas fa-paper-plane"></i></button>
    <button data-id="${promo.id}" class="edit-promotion-btn text-yellow-500"><i class="fas fa-edit"></i></button>
    <button data-id="${promo.id}" class="delete-promotion-btn text-red-500"><i class="fas fa-trash"></i></button>
`;
row.innerHTML = `<td class="px-6 py-4">${promo.title}</td><td class="px-6 py-4">${promo.description}</td><td class="px-6 py-4">${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}</td><td class="px-6 py-4 font-bold ${statusColor}">${status}</td><td class="px-6 py-4 text-center space-x-3">${actionButtons}</td>`;

         });
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
        } else if (deleteBtn) {
            showConfirmModal("Are you sure you want to delete this promotion?", async () => { await deleteDoc(doc(db, "promotions", deleteBtn.dataset.id)); });
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

    // REPLACE your old openClientModal function with this new one:
const openClientModal = (client = null) => {
    clientForm.reset();
    const modalTitle = document.getElementById('client-form-title');
    if (client) {
        modalTitle.textContent = 'Edit Client Information';
        // This line is crucial: it stores the existing client's document ID.
        document.getElementById('edit-client-id').value = client.id;
        document.getElementById('client-form-name').value = client.name;
        document.getElementById('client-form-phone').value = client.phone || '';
        document.getElementById('client-form-email').value = client.email || '';
        document.getElementById('client-form-dob').value = client.dob || '';
    } else {
        modalTitle.textContent = 'Create New Client';
        // This line is crucial: it clears the ID for new clients.
        document.getElementById('edit-client-id').value = '';
    }
    clientFormModal.classList.remove('hidden');
    clientFormModal.classList.add('flex');
};

    const closeClientModal = () => { clientFormModal.classList.add('hidden'); clientFormModal.classList.remove('flex'); };
    document.getElementById('create-new-client-btn').addEventListener('click', () => openClientModal());
    document.getElementById('client-form-cancel-btn').addEventListener('click', closeClientModal);
    document.querySelector('.client-form-modal-overlay').addEventListener('click', closeClientModal);

    // REPLACE your old clientForm event listener with this new one:
clientForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Trim the ID to ensure an empty string ('') is correctly treated as falsy.
    const clientId = document.getElementById('edit-client-id').value.trim();
    
    const clientData = {
        name: document.getElementById('client-form-name').value.trim(),
        phone: document.getElementById('client-form-phone').value.trim() || '',
        email: document.getElementById('client-form-email').value.trim() || '',
        dob: document.getElementById('client-form-dob').value.trim() || '',
    };
    
    if (!clientData.name) {
        alert('Client name is required.');
        return;
    }
    
    try {
        if (clientId) {
            // EDITING EXISTING CLIENT: Use updateDoc with the ID
            // Add a timestamp for tracking when the client was last updated
            clientData.lastUpdated = serverTimestamp();
            await updateDoc(doc(db, "clients", clientId), clientData);
            // Optionally add a notification here
        } else {
            // CREATING NEW CLIENT: Use addDoc
            // Add a timestamp for tracking creation date
            clientData.createdAt = serverTimestamp();
            await addDoc(collection(db, "clients"), clientData);
            // Optionally add a notification here
        }
        
        closeClientModal();
        
    } catch (error) {
        console.error("Error saving client:", error);
        alert("Could not save client data.");
    }
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
    // PASTE THIS ENTIRE NEW EVENT LISTENER BLOCK

    // REPLACE your old editGiftCardForm event listener with this new one:
    editGiftCardForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const cardId = document.getElementById('edit-gift-card-id').value;
        const card = allGiftCards.find(c => c.id === cardId);
        if (!card) {
            alert("Could not find the gift card to update.");
            return;
        }

        const transactionType = document.getElementById('edit-gc-transaction-type').value;
        const amount = parseFloat(document.getElementById('edit-gc-transaction-amount').value);
        const notes = document.getElementById('edit-gc-transaction-notes').value.trim();
// --- FIX: Get the updated code ---
    const newCode = document.getElementById('edit-gc-code-input').value.trim();
    if (!newCode) {
        alert("Gift card code cannot be empty.");
        return;
    }
    // --- End fix ---
        if (isNaN(amount) || amount <= 0) {
            alert("Please enter a valid, positive amount for the transaction.");
            return;
        }

        let newBalance = card.balance;
        if (transactionType === 'redeem') {
            if (amount > card.balance) {
                alert("Cannot redeem an amount greater than the current balance.");
                return;
            }
            newBalance -= amount;
        } else { // 'add'
            newBalance += amount;
        }

        const newTransaction = {
            type: transactionType,
            amount: amount,
            notes: notes,
            timestamp: Timestamp.now() // <-- THIS IS THE FIX (changed from serverTimestamp())
        };

        let newStatus = newBalance <= 0 ? 'Depleted' : 'Active';

        try {
            const cardDocRef = doc(db, "gift_cards", cardId);
            // --- FIX: Add the code to the update data ---
        await updateDoc(cardDocRef, {
            balance: newBalance,
            status: newStatus,
            history: arrayUnion(newTransaction),
            code: newCode // Save the potentially updated code
        });
        // --- End fix ---
            alert("Transaction applied successfully!");
            editGiftCardModal.classList.add('hidden');
        } catch (error) {
            console.error("Error applying transaction:", error);
            alert("Could not apply the transaction. Please try again.");
        }
    });

    // REPLACE the entire updateDesignerPreview function with this one:
    const updateDesignerPreview = () => {
        const showTo = document.getElementById('designer-show-to').checked;
        const showFrom = document.getElementById('designer-show-from').checked;
        const setExpiry = document.getElementById('designer-set-expiry').checked;
        const noExpiry = document.getElementById('designer-no-expiry').checked;

        document.getElementById('preview-to').parentElement.style.display = showTo ? '' : 'none';
        document.getElementById('preview-from').parentElement.style.display = showFrom ? '' : 'none';
        document.getElementById('designer-to-wrapper').style.display = showTo ? '' : 'none';
        document.getElementById('designer-from-wrapper').style.display = showFrom ? '' : 'none';

        document.getElementById('preview-to').textContent = document.getElementById('designer-to').value || 'Recipient';
        document.getElementById('preview-from').textContent = document.getElementById('designer-from').value || 'Sender';

        const amount = parseFloat(document.getElementById('designer-amount').value) || 0;
        document.getElementById('preview-amount').textContent = `$${amount.toFixed(2)}`;
        // --- FIX: Read the manual code input ---
    const manualCodeInput = document.getElementById('designer-code').value.trim();
    const previewCodeEl = document.getElementById('preview-code');
    if (manualCodeInput) {
        previewCodeEl.textContent = manualCodeInput; // Show entered code
    } else {
        previewCodeEl.textContent = 'GC-'; // Show placeholder
    }
    // --- End code fix ---
        const expiryPreview = document.getElementById('preview-expiry');
        if (noExpiry) {
            expiryPreview.textContent = 'Expires: ____/____/____';
            expiryPreview.style.display = 'block';
        } else if (setExpiry) {
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
        if (firstTab) {
            firstTab.classList.add('bg-gray-200', 'border-gray-300', 'border-b-0');
            populateBackgrounds(firstTab.dataset.category);
        }

        const setExpiryCheck = document.getElementById('designer-set-expiry');
        const noExpiryCheck = document.getElementById('designer-no-expiry');
        const expiryInputs = document.getElementById('designer-expiry-inputs');

        setExpiryCheck.addEventListener('change', (e) => {
            if (e.target.checked) {
                noExpiryCheck.checked = false;
            }
            expiryInputs.classList.toggle('hidden', !e.target.checked);
            updateDesignerPreview();
        });

        noExpiryCheck.addEventListener('change', (e) => {
            if (e.target.checked) {
                setExpiryCheck.checked = false;
                expiryInputs.classList.add('hidden');
            }
            updateDesignerPreview();
        });

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

    // REPLACE your old handleSaveAndPrint function with this new one:
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
        const setExpiry = document.getElementById('designer-set-expiry').checked;
        const noExpiry = document.getElementById('designer-no-expiry').checked;
       // --- FIX: Get manual code ---
    const manualCodeInput = document.getElementById('designer-code').value.trim();
    // --- End code fix ---
        for (let i = 0; i < quantity; i++) {
            // --- FIX: Determine code to save ---
        let finalCode = '';
        if (manualCodeInput) {
            // If manual code entered, use it ONLY for the first card if quantity is 1
            // Otherwise, warn the user or use placeholders. Let's use placeholders for batches.
            if (quantity === 1) {
                finalCode = manualCodeInput;
            } else {
                // For batch printing without manual code, use GC-
                finalCode = `GC-`; // Placeholder for manual writing
            }
        } else {
            // Default placeholder if no manual code
            finalCode = `GC-`; // Placeholder for manual writing
        }
        // --- End code determination ---

        const cardData = {
            amount: amount,
            balance: amount,
            history: [],
            recipientName: document.getElementById('designer-show-to').checked ? document.getElementById('designer-to').value : '',
            senderName: document.getElementById('designer-show-from').checked ? document.getElementById('designer-from').value : '',
            code: finalCode, // Use the determined code
            status: 'Active', // Printable cards are usually active immediately
            type: 'Physical',
            createdAt: serverTimestamp(),
            backgroundUrl: printableCard.style.backgroundImage.slice(5, -2).replace(/"/g, "")
        };
if (setExpiry) {
             const value = parseInt(document.getElementById('designer-expiry-value').value, 10);
             const unit = document.getElementById('designer-expiry-unit').value;
             const expiryDate = new Date();
             if (unit === 'months') expiryDate.setMonth(expiryDate.getMonth() + value);
             else expiryDate.setFullYear(expiryDate.getFullYear() + value);
             cardData.expiresAt = Timestamp.fromDate(expiryDate);
        }

        const newCardRef = doc(collection(db, "gift_cards"));
        // Only save to DB if a specific code was generated/entered
        // If it's just 'GC-', we only prepare for printing, not saving yet.
        if (finalCode !== 'GC-') {
             batch.set(newCardRef, cardData);
        }
        // Add to print list regardless of saving
        cardsToPrint.push(cardData);
    }

    try {
        // Only commit if there were cards with actual codes to save
        if (cardsToPrint.some(card => card.code !== 'GC-')) {
            await batch.commit();
        }

            let printHTML = `
            <html><head><title>Print Gift Cards</title><script src="https://cdn.tailwindcss.com"><\/script><link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Poppins:wght@400;600&family=Parisienne&display=swap" rel="stylesheet">
            <style>
                body{font-family:'Poppins',sans-serif;margin:0;background-color:#f0f0f0;}
                .font-parisienne{font-family:'Parisienne',cursive;}
                .print-page { display: flex; flex-wrap: wrap; justify-content: start; align-content: start; gap: 10mm; padding: 10mm; page-break-after: always; }
                .card-container{display:grid;grid-template-columns:repeat(2, 1fr);gap:0; width: fit-content;}
                .card{width:400px;height:228px;text-shadow:1px 1px 3px rgba(0,0,0,0.6);box-shadow: 0 4px 8px rgba(0,0,0,0.2);-webkit-print-color-adjust: exact !important; color-adjust: exact !important;}
                @media print {
                    body { padding: 0; background-color: #fff; }
                    .card { box-shadow: none; border: 1px solid #eee; }
                }
            </style></head><body><div class="print-page">
        `;

            cardsToPrint.forEach(card => {
                let expiryText = '';
                let expiryDisplay = 'none';

                if (noExpiry) {
                    expiryText = 'Expires: ____/____/____';
                    expiryDisplay = 'block';
                } else if (card.expiresAt) {
                    expiryText = `Expires: ${card.expiresAt.toDate().toLocaleDateString()}`;
                    expiryDisplay = 'block';
                }

                printHTML += `
                <div class="card-container">
                    <div class="card rounded-lg p-4 flex flex-col justify-between bg-cover bg-center text-white" style="background-image: url('${card.backgroundUrl}');">
                        <div class="flex justify-between items-start"><img src="https://placehold.co/100x100/d63384/FFFFFF?text=NE" class="w-12 h-12 rounded-full border-2 border-white" /><div class="text-right"><p class="font-parisienne text-3xl">Gift Card</p><p class="text-xs font-semibold tracking-wider">Nails Express</p></div></div>
                        <div class="text-center"><p class="text-5xl font-bold">$${card.amount.toFixed(2)}</p></div>
                        <div class="text-xs"><div class="flex justify-between font-semibold"><span style="display:${card.recipientName ? 'inline' : 'none'}">FOR: <span class="font-normal">${card.recipientName}</span></span><span style="display:${card.senderName ? 'inline' : 'none'}">FROM: <span class="font-normal">${card.senderName}</span></span></div><p class="mt-2 text-center font-mono tracking-widest text-sm">${card.code}</p><p class="mt-1 text-center text-[10px] opacity-80" style="display:${expiryDisplay}">${expiryText}</p></div>
                    </div>
                    <div class="card rounded-lg p-4 flex flex-col justify-between bg-white text-gray-800" style="text-shadow: none;">
                        <div class="w-full h-10 bg-black mt-2"></div>
                        <p class="text-xs text-center text-gray-600 px-4 leading-relaxed">
                            This card is redeemable for services at Nails Express. Treat this card like cash; it is not replaceable if lost or stolen. This card is non-refundable and cannot be exchanged for cash.
                        </p>
                        <div class="text-center text-xs pb-2">
                            <p class="font-bold">Nails Express</p>
                            <p>1560 Hustonville Rd #345, Danville, KY 40422</p>
                            <p>(859) 236-2873</p>
                        </div>
                    </div>
                </div>
            `;
            });

            printHTML += '</div></body></html>';

            const printWindow = window.open('', '_blank');
            printWindow.document.write(printHTML);
            printWindow.document.close();
            printWindow.focus();

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
        // --- FIX: Populate the new input field ---
    document.getElementById('edit-gc-code-input').value = card.code || ''; // Populate the input
    // --- End fix ---
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
                // Add the new variable and if-block right below:
                const printBtn = e.target.closest('.print-gift-card-btn'); // <-- ADD THIS

                if (printBtn) { // <-- ADD THIS BLOCK
                    const cardId = printBtn.dataset.id;
                    const card = allGiftCards.find(c => c.id === cardId);
                    if (card) {
                        openCardForPrint(card);
                    }
                } if (activateBtn) {
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


    // ADD ALL THIS CODE AT THE END OF THE initMainApp FUNCTION


    
    onSnapshot(query(collection(db, "clients"), where("membership", "!=", null)), (snapshot) => {
        allClientMemberships = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const searchTerm = document.getElementById('search-memberships').value.toLowerCase();
        const filtered = allClientMemberships.filter(m =>
            m.name.toLowerCase().includes(searchTerm) ||
            m.membership.tierName.toLowerCase().includes(searchTerm)
        );
        renderClientMembershipsTable(filtered);
    });

    document.getElementById('search-memberships').addEventListener('input', () => {
        const searchTerm = document.getElementById('search-memberships').value.toLowerCase();
        const filtered = allClientMemberships.filter(m =>
            m.name.toLowerCase().includes(searchTerm) ||
            m.membership.tierName.toLowerCase().includes(searchTerm)
        );
        renderClientMembershipsTable(filtered);
    });

 // Ensure this listener is placed within a scope where 'allClientMemberships' and 'allMembershipTiers' are accessible
document.querySelector('#client-memberships-table tbody')?.addEventListener('click', async (e) => {
    const activateBtn = e.target.closest('.activate-membership-btn');
    const printBtn = e.target.closest('.print-membership-card-btn');
    const deleteBtn = e.target.closest('.delete-membership-record-btn');
  const rewardBtn = e.target.closest('.reward-tracking-btn');
    if (rewardBtn) {
        const clientId = rewardBtn.dataset.id;
        
        // FIX: Corrected typo from 'allClientMembersships' to 'allClientMemberships'
        const client = allClientMemberships.find(m => m.id === clientId); 
        
        if (client) {
            openMembershipRewardModal(client);
        } else {
            // Fallback notification if client data isn't immediately found
            addNotification('error', 'Client data not yet loaded. Please try again.');
        }
    }
    // --- Handle Print Button ---
    else if (printBtn) {
        const clientId = printBtn.dataset.id;
        // Find the client data from the list used to render the table
        const client = allClientMemberships.find(m => m.id === clientId);
        if (client && client.membership) {
            // Find the corresponding tier details
            const tier = allMembershipTiers.find(t => t.id === client.membership.tierId);
            if (tier) {
                openMembershipCardForPrint(client, tier); // Call the print function
            } else {
                console.error("Membership tier details not found for tier ID:", client.membership.tierId);
                addNotification('error', "Could not find tier details to print the card.");
            }
        } else {
            console.error("Client or membership data not found for printing card, ID:", clientId);
            addNotification('error', "Could not find client data to print the card.");
        }
    }
    // --- Handle Activate Button ---
    else if (activateBtn) {
        const clientId = activateBtn.dataset.id;
        const client = allClientMemberships.find(m => m.id === clientId); // Get client name for confirmation message
        const clientName = client ? client.name : 'this client';

        showConfirmModal(`Activate membership for ${clientName}?`, async () => {
            try {
                await updateDoc(doc(db, "clients", clientId), {
                    "membership.status": "Active"
                });
                addNotification('success', `Membership for ${clientName} activated!`);
            } catch (error) {
                console.error("Error activating membership:", error);
                addNotification('error', "Could not activate membership. Please try again.");
            }
        }, "Activate"); // Use "Activate" as the confirmation button text
    }
    // --- Handle Delete Button ---
    else if (deleteBtn) {
        const clientId = deleteBtn.dataset.id;
        const client = allClientMemberships.find(m => m.id === clientId); // Get client name for confirmation message
        const clientName = client ? client.name : 'this client';

        showConfirmModal(`Remove membership record for ${clientName}?`, async () => {
            try {
                // Set the membership field to null to remove it
                await updateDoc(doc(db, "clients", clientId), {
                    membership: null
                });
                addNotification('success', `Membership removed for ${clientName}.`);
            } catch (error) {
                console.error("Error removing membership:", error);
                addNotification('error', "Could not remove membership. Please try again.");
            }
        }); // Default confirmation button text is "Delete"
    }
});

document.getElementById('close-membership-reward-modal-btn')?.addEventListener('click', () => {
        document.getElementById('membership-reward-modal').classList.add('hidden');
    });
    document.getElementById('log-cash-spending-form')?.addEventListener('submit', handleLogCashSpending);


    // --- MEMBERSHIP MANAGEMENT (ADMIN) ---
    const membershipModal = document.getElementById('membership-tier-modal');
    const membershipForm = document.getElementById('membership-tier-form');

    const renderMembershipsAdmin = (tiers) => {
        const tbody = document.querySelector('#memberships-table tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        tiers.forEach(tier => {
            const row = tbody.insertRow();
            row.innerHTML = `
            <td class="px-6 py-4 font-bold">${tier.name}</td>
            <td class="px-6 py-4">$${tier.price}/month</td>
            <td class="px-6 py-4">${tier.discount}%</td>
            <td class="px-6 py-4 whitespace-pre-line">${tier.benefits}</td>
            <td class="px-6 py-4 text-center">
                <button data-id="${tier.id}" class="edit-membership-btn text-blue-500 mr-2"><i class="fas fa-edit"></i></button>
                <button data-id="${tier.id}" class="delete-membership-btn text-red-500"><i class="fas fa-trash"></i></button>
            </td>
        `;
        });
    };

    const openMembershipTierModal = (tier = null) => {
        membershipForm.reset();
        if (tier) {
            document.getElementById('membership-tier-modal-title').textContent = 'Edit Tier';
            document.getElementById('edit-membership-tier-id').value = tier.id;
            document.getElementById('tier-name').value = tier.name;
            document.getElementById('tier-price').value = tier.price;
            document.getElementById('tier-discount').value = tier.discount;
            document.getElementById('tier-benefits').value = tier.benefits;
        } else {
            document.getElementById('membership-tier-modal-title').textContent = 'Add New Tier';
            document.getElementById('edit-membership-tier-id').value = '';
        }
        membershipModal.classList.remove('hidden');
    };

    const initMembershipManagement = () => {
        onSnapshot(query(collection(db, "memberships"), orderBy("price")), (snapshot) => {
            allMembershipTiers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderMembershipsAdmin(allMembershipTiers);
        });

        document.getElementById('add-new-membership-tier-btn').addEventListener('click', () => openMembershipTierModal());
        document.getElementById('cancel-membership-tier-btn').addEventListener('click', () => membershipModal.classList.add('hidden'));

        membershipForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const tierId = document.getElementById('edit-membership-tier-id').value;
            const data = {
                name: document.getElementById('tier-name').value,
                price: parseFloat(document.getElementById('tier-price').value),
                discount: parseInt(document.getElementById('tier-discount').value, 10),
                benefits: document.getElementById('tier-benefits').value,
            };
            try {
                if (tierId) {
                    await updateDoc(doc(db, "memberships", tierId), data);
                } else {
                    await addDoc(collection(db, "memberships"), data);
                }
                membershipModal.classList.add('hidden');
            } catch (error) {
                alert("Could not save tier.");
                console.error(error);
            }
        });

        document.querySelector('#memberships-table tbody').addEventListener('click', (e) => {
            const editBtn = e.target.closest('.edit-membership-btn');
            if (editBtn) openMembershipTierModal(allMembershipTiers.find(t => t.id === editBtn.dataset.id));

            const deleteBtn = e.target.closest('.delete-membership-btn');
            if (deleteBtn) {
                showConfirmModal("Delete this tier?", async () => {
                    await deleteDoc(doc(db, "memberships", deleteBtn.dataset.id));
                });
            }
        });



    };
// --- START: Add Client Membership Modal Logic (NEW) ---

// 1. Get elements for the new modal
const addClientMembershipModal = document.getElementById('add-client-membership-modal');
const addClientMembershipBtn = document.getElementById('add-client-membership-btn');
const closeAddClientMembershipBtn = document.getElementById('close-add-client-membership-modal-btn');
const cancelAddClientMembershipBtn = document.getElementById('add-client-membership-cancel-btn');
const addClientMembershipForm = document.getElementById('add-client-membership-form');
const addCmClientList = document.getElementById('add-cm-client-list');
const addCmTierSelect = document.getElementById('add-cm-tier-select');

// 2. Create the 'open' function
const openAddClientMembershipModal = () => {
    // Reset form just in case
    addClientMembershipForm.reset();

    // Populate clients datalist (Fulfills Requirement #3)
    addCmClientList.innerHTML = '';
    // Filter 'allClients' to find those *without* a membership
    const clientsWithoutMembership = allClients.filter(c => !c.membership);
    clientsWithoutMembership.forEach(client => {
        // Use client.name for the value, which is what the input will show
        addCmClientList.innerHTML += `<option value="${client.name}"></option>`;
    });

    // Populate tiers select from your global 'allMembershipTiers'
    addCmTierSelect.innerHTML = '<option value="">Select a tier...</option>';
    allMembershipTiers.forEach(tier => {
        addCmTierSelect.innerHTML += `<option value="${tier.id}">${tier.name} ($${tier.price}/month)</option>`;
    });

    // Show the modal
    addClientMembershipModal.classList.remove('hidden');
};

// 3. Create the 'close' function
const closeAddClientMembershipModal = () => {
    addClientMembershipForm.reset();
    addClientMembershipModal.classList.add('hidden');
};

// 4. Add event listeners to open/close the modal
if (addClientMembershipBtn) {
    addClientMembershipBtn.addEventListener('click', openAddClientMembershipModal);
}
if (closeAddClientMembershipBtn) {
    closeAddClientMembershipBtn.addEventListener('click', closeAddClientMembershipModal);
}
if (cancelAddClientMembershipBtn) {
    cancelAddClientMembershipBtn.addEventListener('click', closeAddClientMembershipModal);
}
if (addClientMembershipModal) {
    addClientMembershipModal.querySelector('.modal-overlay').addEventListener('click', closeAddClientMembershipModal);
}

// 5. Add the form submit logic
if (addClientMembershipForm) {
    addClientMembershipForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const clientName = document.getElementById('add-cm-client-name').value;
        const tierId = document.getElementById('add-cm-tier-select').value;

        // Find the full client object from the global 'allClients' list
        const selectedClient = allClients.find(c => c.name === clientName);
        // Find the full tier object from the global 'allMembershipTiers' list
        const selectedTier = allMembershipTiers.find(t => t.id === tierId);

        if (!selectedClient) {
            addNotification('error', 'Please select a valid client from the datalist.');
            return;
        }

        if (!selectedTier) {
            addNotification('error', 'Please select a valid membership tier.');
            return;
        }

        // Double-check they don't already have a membership
        if (selectedClient.membership) {
            addNotification('warning', `${selectedClient.name} already has a membership. You can manage it from the table.`);
            return;
        }

        // Prepare the new membership data object
        const membershipData = {
            tierId: selectedTier.id,
            tierName: selectedTier.name,
            startDate: serverTimestamp(), // Sets start date to now
            status: 'Active' // Admin-created are active by default
        };

        try {
            // Get the Firestore document reference using the client's unique ID
            const clientDocRef = doc(db, "clients", selectedClient.id);

            // Update the client's document with the new membership object
            await updateDoc(clientDocRef, {
                membership: membershipData
            });

            addNotification('success', `Membership created for ${selectedClient.name}!`);
            closeAddClientMembershipModal();

        } catch (error) {
            console.error("Error adding client membership:", error);
            addNotification('error', 'Could not create membership for this client.');
        }
    });
}

// --- END: Add Client Membership Modal Logic (NEW) ---
    // --- Located inside initMainApp(), before loadAndRenderServices() ---

    const addClientNoteForm = document.getElementById('add-client-note-form');
    if (addClientNoteForm) {
        addClientNoteForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const clientId = document.getElementById('note-client-id').value;
            const noteTextarea = document.getElementById('new-client-note');
            const noteText = noteTextarea.value.trim();

            if (!clientId || !noteText) {
                alert("Cannot save an empty note.");
                return;
            }

            const newNote = {
                text: noteText,
                timestamp: Timestamp.now(),
                // You could add author: currentUserName here if needed
            };

            try {
                const clientDocRef = doc(db, "clients", clientId);
                await updateDoc(clientDocRef, {
                    notes: arrayUnion(newNote)
                });
                noteTextarea.value = ''; // Clear the textarea
                
                // Manually refresh the modal view after adding a note
                const updatedClientData = allClients.find(c => c.id === clientId);
                if (updatedClientData) {
                    // Re-open/refresh the modal to show the new note instantly
                    openClientProfileModal(updatedClientData);
                }

            } catch (error) {
                console.error("Error saving client note:", error);
                alert("Could not save the note.");
            }
        });
    }



    loadAndRenderServices();
    initializeGiftCardDesigner();
    const todayString = getLocalDateString();
    /**
 * Converts a local date-time string (can be YYYY-MM-DDTHH:MM or MM/DD/YYYY HH:MM)
 * into a timezone-aware ISO string (YYYY-MM-DDTHH:MM:SS±HH:MM).
 * This is crucial for Firebase Timestamps to correctly interpret the local time.
 */
function formatLocalToISOWithOffset(localDateTimeString) {
    if (!localDateTimeString) return null;

    // 1. Standardize separator and split into date and time parts
    // Converts 'YYYY-MM-DD HH:MM' or 'MM/DD/YYYY HH:MM' into ['DatePart', 'TimePart']
    const parts = localDateTimeString.replace(' ', 'T').split('T');
    if (parts.length < 2) return null; // Must have date and time

    let [datePart, timePart] = parts;
    let year, month, day;

    // 2. Detect and reorder MM/DD/YYYY format
    if (datePart.includes('/')) {
        // Input is MM/DD/YYYY (or MM/D/YYYY)
        [month, day, year] = datePart.split('/');
    } else {
        // Input is assumed to be ISO YYYY-MM-DD (or YYYY-M-D)
        [year, month, day] = datePart.split('-');
    }

    // 3. Reconstruct into unambiguous YYYY-MM-DDTHH:MM format
    // Use the required padding (padStart) for single-digit months/days
    const unambiguousLocalString = 
        `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${timePart}`;

    // 4. Create local Date object
    const date = new Date(unambiguousLocalString); 

    // Check for invalid date
    if (isNaN(date.getTime())) return null;

    // 5. Calculate Offset (Standard logic remains the same)
    const offsetMinutes = date.getTimezoneOffset();
    const sign = offsetMinutes < 0 ? '+' : '-';
    const absOffset = Math.abs(offsetMinutes);
    const offsetHours = String(Math.floor(absOffset / 60)).padStart(2, '0');
    const offsetMins = String(absOffset % 60).padStart(2, '0');
    const offsetString = `${sign}${offsetHours}:${offsetMins}`;

    // 6. Get final components (ensuring they match the date before offset)
    const finalYear = date.getFullYear();
    const finalMonth = String(date.getMonth() + 1).padStart(2, '0');
    const finalDay = String(date.getDate()).padStart(2, '0');
    const finalHours = String(date.getHours()).padStart(2, '0');
    const finalMinutes = String(date.getMinutes()).padStart(2, '0');

    // 7. Return ISO 8601 with offset
    return `${finalYear}-${finalMonth}-${finalDay}T${finalHours}:${finalMinutes}:00${offsetString}`;
}

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
