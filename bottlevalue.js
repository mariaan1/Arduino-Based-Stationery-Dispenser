import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-database.js";

// --- 1. CONFIGURATION ---
// IMPORTANT: Triple-check that this databaseURL matches your Firebase Console exactly!
const firebaseConfig = {
    apiKey: "AIzaSyDD3uJlu_rT4DA4jnjyzixRRYc_69r8SL0",
    authDomain: "stationery-dispenser.firebaseapp.com",
    projectId: "stationery-dispenser",
    storageBucket: "stationery-dispenser.firebasestorage.app",
    messagingSenderId: "57000519693",
    appId: "1:57000519693:web:748481665644e9c5124d44",
    databaseURL: "https://stationery-dispenser-default-rtdb.asia-southeast1.firebasedatabase.app"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getDatabase(app);

document.addEventListener('DOMContentLoaded', () => {
    const editBtn = document.getElementById('edit');
    const logoutBtn = document.getElementById('logoutBtn');
    const itemsContainer = document.querySelector('.items-container');

    // --- 2. LOAD DATA FROM FIREBASE (The "Pull") ---
    const pricesRef = ref(db, 'bottlevalue/');

    // This function runs automatically whenever you refresh or data changes in the cloud
    onValue(pricesRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            console.log("Data received from Firebase:", data);
            // We pass the name exactly as it appears in the HTML (but uppercase)
            updateUI('1000ml', data.ml1000);
            updateUI('500ml', data.ml500);
            updateUI('350ml', data.ml350);
        }
    }, (error) => {
        console.error("Error fetching data:", error);
    });

    // Updates the number on the screen based on the name of the item
    function updateUI(itemName, value) {
        document.querySelectorAll('.item-card').forEach(card => {
        const nameOnPage = card.querySelector('.item-name').innerText.trim().toUpperCase().replace(/\n/g, ' ');
        if (nameOnPage === itemName) {
            // Update the value property of the input field
            card.querySelector('.price-input').value = parseFloat(value).toFixed(1);
        }
    });
    }


    const menuButton = document.getElementById('menu-button');

    // 2. Add a 'click' event listener
    menuButton.addEventListener('click', function () {
        // 3. Change the window location to your menu page
        window.location.href = 'menu.html';
    });

    // --- 3. EDIT / DONE TOGGLE & SAVE ---
    editBtn.addEventListener('click', () => {
        const isEditing = editBtn.textContent === 'EDIT';
    const inputs = document.querySelectorAll('.price-input');

    if (!isEditing) {
        // Saving data
        const ml1000 = parseFloat(findPriceInHTML('1000ml'));
        const ml500 = parseFloat(findPriceInHTML('500ml'));
        const ml350 = parseFloat(findPriceInHTML('350ml'));

        set(ref(db, 'bottlevalue/'), {
            ml1000: ml1000,
            ml500: ml500,
            ml350: ml350,
        }).then(() => {
            console.log("Success: Prices synced!");
        });
    }

    // Toggle input disabled state
    inputs.forEach(input => {
        input.disabled = !isEditing; 
    });

    editBtn.textContent = isEditing ? 'DONE' : 'EDIT';
    });

    // Helper to scrape the current number from the HTML elements
    function findPriceInHTML(itemName) {
    let price = 0; 
    document.querySelectorAll('.item-card').forEach(card => {
        // You are converting the HTML text to UPPERCASE here
        const nameOnPage = card.querySelector('.item-name').innerText.trim().toUpperCase().replace(/\n/g, ' ');
        
        // So this comparison must be in UPPERCASE too
        if (nameOnPage === itemName.toUpperCase()) { 
            price = card.querySelector('.price-input').value;
        }
    });
    return parseFloat(price) || 0;
}

    // --- 4. ARROW CLICK LOGIC (Updated) ---
itemsContainer.addEventListener('click', (e) => {
    const button = e.target;
    if (!button.classList.contains('arrow-btn')) return;

    if (editBtn.textContent === 'EDIT') return;

    const card = button.closest('.item-card');
    const priceDisplay = card.querySelector('.price-value');
    let currentPrice = parseInt(priceDisplay.textContent);

    // Get the direction from the data attribute
    const direction = button.getAttribute('data-dir'); 

    if (direction === 'up') {
        currentPrice++;
    } else if (direction === 'down') {
        if (currentPrice > 0) currentPrice--;
    }

    priceDisplay.textContent = currentPrice;
    updateArrowVisuals(card, currentPrice);
});

    // Handles the grayed-out look for the left arrow at minimum value
    function updateArrowVisuals(card, price) {
        const leftArrow = card.querySelector('.arrow-btn:first-of-type');
        if (price <= 1) {
            leftArrow.style.opacity = "0.5";
            leftArrow.style.cursor = "not-allowed";
        } else {
            leftArrow.style.opacity = "1";
            leftArrow.style.cursor = "pointer";
        }
    }

    // --- 5. LOGOUT ---
    logoutBtn.addEventListener('click', () => {
        signOut(auth).then(() => {
            window.location.replace("login.html");
        });
    });
});

// --- 6. ROUTE GUARD (Redirects if not logged in) ---
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.replace("login.html");
    } else {
        console.log("Admin logged in as:", user.email);
    }
});
