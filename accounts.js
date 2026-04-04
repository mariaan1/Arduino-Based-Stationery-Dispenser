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
    const pricesRef = ref(db, 'inventory/');

    // This function runs automatically whenever you refresh or data changes in the cloud
    onValue(pricesRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            console.log("Data received from Firebase:", data);
            // We pass the name exactly as it appears in the HTML (but uppercase)
            updateUI('PEN', data.pen);
            updateUI('MARKER', data.marker);
            updateUI('YELLOW PAPER', data.yellowpaper);
        }
    }, (error) => {
        console.error("Error fetching data:", error);
    });

    // Updates the number on the screen based on the name of the item
    function updateUI(itemName, value) {
        document.querySelectorAll('.item-card').forEach(card => {
            const nameOnPage = card.querySelector('.item-name').innerText.trim().toUpperCase().replace(/\n/g, ' ');

            if (nameOnPage === itemName) {
                card.querySelector('.price-value').textContent = value;
                updateArrowVisuals(card, value);
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

        if (!isEditing) {
            // User just clicked "DONE" - Push data to Firebase
            const penPrice = parseInt(findPriceInHTML('PEN'));
            const markerPrice = parseInt(findPriceInHTML('MARKER'));
            const paperPrice = parseInt(findPriceInHTML('YELLOW PAPER'));

            set(ref(db, 'inventory/'), {
                pen: penPrice,
                marker: markerPrice,
                yellowpaper: paperPrice
            }).then(() => {
                console.log("Success: Prices synced to the cloud!");
            }).catch((error) => {
                console.error("Firebase Save Error:", error);
                alert("Failed to save. Check your internet or Firebase Rules.");
            });
        }

        // Toggle UI Visuals
        editBtn.textContent = isEditing ? 'DONE' : 'EDIT';
        document.querySelectorAll('.arrow-btn').forEach(arrow => {
            arrow.classList.toggle('green', isEditing);
        });
    });

    // Helper to scrape the current number from the HTML elements
    function findPriceInHTML(itemName) {
        let price = 10;
        document.querySelectorAll('.item-card').forEach(card => {
            const nameOnPage = card.querySelector('.item-name').innerText.trim().toUpperCase().replace(/\n/g, ' ');
            if (nameOnPage === itemName) {
                price = card.querySelector('.price-value').textContent;
            }
        });
        return price;
    }

    // --- 4. ARROW CLICK LOGIC ---
    itemsContainer.addEventListener('click', (e) => {
        const button = e.target;
        if (!button.classList.contains('arrow-btn')) return;

        // Block clicks if the user hasn't pressed EDIT yet
        if (editBtn.textContent === 'EDIT') {
            console.log("Click 'EDIT' first to change prices.");
            return;
        }

        const card = button.closest('.item-card');
        const priceDisplay = card.querySelector('.price-value');
        let currentPrice = parseInt(priceDisplay.textContent);

        if (button.textContent === '▶') {
            if (currentPrice < 100) currentPrice++;
        } else if (button.textContent === '◀') {
            if (currentPrice > 1) currentPrice--;
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



const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTpfkuTmithO8UCmnRxHRaetizV3V1FKSGydKxvrbJBxD7w5F1R7g6qHu4y-O1t_6UdpYs1oaKYo6m4/pub?gid=0&single=true&output=csv';

async function fetchSheetData() {
    try {
        const response = await fetch(csvUrl);
        const data = await response.text();
        
        // Split by line, then skip the header row (index 0)
        const rows = data.split('\n').slice(1);
        const tableBody = document.getElementById('table-body');
        tableBody.innerHTML = ''; // Clear loading text

        rows.forEach(row => {
    const columns = row.split(','); 
    
    // Check if the row has enough data (at least 4 columns)
    if (columns.length >= 4) {
        const tr = document.createElement('tr');
        
        // Index [0]: UID
        // Index [1]: PASSWORD
        // Index [2]: NAME
        // Index [3]: POINTS
        tr.innerHTML = `
            <td>${columns[2]}</td>
            <td>${columns[0]}</td>
            <td>${columns[1]}</td> 
            <td>${columns[3]}</td>
        `;
        tableBody.appendChild(tr);
    }
});
    } catch (error) {
        console.error('Error fetching sheet:', error);
    }
}

// Call the function when page loads
fetchSheetData();

























// --- 6. ROUTE GUARD (Redirects if not logged in) ---
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.replace("login.html");
    } else {
        console.log("Admin logged in as:", user.email);
    }
});