import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import { getDatabase, ref, set, onValue, update } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-database.js";

// --- 1. CONFIGURATION ---
const firebaseConfig = {
    apiKey: "AIzaSyDD3uJlu_rT4DA4jnjyzixRRYc_69r8SL0",
    authDomain: "stationery-dispenser.firebaseapp.com",
    projectId: "stationery-dispenser",
    storageBucket: "stationery-dispenser.firebasestorage.app",
    messagingSenderId: "57000519693",
    appId: "1:57000519693:web:748481665644e9c5124d44",
    databaseURL: "https://stationery-dispenser-default-rtdb.asia-southeast1.firebasedatabase.app"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getDatabase(app);

document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENT SELECTORS ---
    const logoutBtn = document.getElementById('logoutBtn');
    const itemsContainer = document.querySelector('.items-container');
    const tableBody = document.getElementById('table-body');
    const menuButton = document.getElementById('menu-button');

    // 2. Add a 'click' event listener
    menuButton.addEventListener('click', function () {
        // 3. Change the window location to your menu page
        window.location.href = 'menu.html';
    });


    logoutBtn.addEventListener('click', () => {
            signOut(auth).then(() => {
                window.location.replace("login.html");
            });
        });

    // --- 3. LOAD LOGIN HISTORY DATA (REAL-TIME) ---
const historyRef = ref(db, 'loginHistory/');

onValue(historyRef, (snapshot) => {
    const data = snapshot.val();
    tableBody.innerHTML = ''; // Clear table before reloading

    if (data) {
        // 1. Convert object to array so we can reverse it (Newest on top)
        const historyEntries = Object.keys(data).map(key => data[key]);
        
        // 2. Reverse the array to show the most recent login at the top
        historyEntries.reverse();

        // 3. Loop through and create rows
        historyEntries.forEach(entry => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${entry.name || 'Unknown'}</td>
                <td>${entry.uid || 'N/A'}</td>
                <td>${entry.date || '-'}</td>
                <td>${entry.time || '-'}</td>
                <td>${entry.item || '-'}</td>
                <td>${entry.points || '-'}</td>
            `;
            tableBody.appendChild(tr);
        });
    } else {
        tableBody.innerHTML = '<tr><td colspan="4">No login history found.</td></tr>';
    }
});

    // --- 4. EVENT DELEGATION (EDIT & DELETE) ---


    // Firebase Update Helper
    function updateAccount(uid, updateData) {
        const userRef = ref(db, 'accounts/' + uid);
        update(userRef, updateData)
            .then(() => console.log("Update Success"))
            .catch((err) => alert("Update failed: " + err.message));
    }

    // --- 5. NEW ACCOUNT CREATION ---


    // --- 6. INVENTORY EDITING LOGIC ---


    function updateUI(itemName, value) {
        document.querySelectorAll('.item-card').forEach(card => {
            const nameOnPage = card.querySelector('.item-name').innerText.trim().toUpperCase().replace(/\n/g, ' ');
            if (nameOnPage === itemName) {
                card.querySelector('.price-value').textContent = value;
                updateArrowVisuals(card, value);
            }
        });
    }

    function findPriceInHTML(itemName) {
        let price = 10;
        document.querySelectorAll('.item-card').forEach(card => {
            const nameOnPage = card.querySelector('.item-name').innerText.trim().toUpperCase().replace(/\n/g, ' ');
            if (nameOnPage === itemName) price = card.querySelector('.price-value').textContent;
        });
        return price;
    }

    itemsContainer.addEventListener('click', (e) => {
        const button = e.target;
        if (!button.classList.contains('arrow-btn') || editBtn.textContent === 'EDIT') return;

        const card = button.closest('.item-card');
        const priceDisplay = card.querySelector('.price-value');
        let currentPrice = parseInt(priceDisplay.textContent);

        if (button.textContent === '▶' && currentPrice < 100) currentPrice++;
        else if (button.textContent === '◀' && currentPrice > 1) currentPrice--;

        priceDisplay.textContent = currentPrice;
        updateArrowVisuals(card, currentPrice);
    });

    function updateArrowVisuals(card, price) {
        const leftArrow = card.querySelector('.arrow-btn:first-of-type');
        if (leftArrow) {
            leftArrow.style.opacity = price <= 1 ? "0.5" : "1";
            leftArrow.style.cursor = price <= 1 ? "not-allowed" : "pointer";
        }
    }

});




// --- 8. ROUTE GUARD ---
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.replace("login.html");
    } else {
        console.log("Admin Session Active");
    }
});