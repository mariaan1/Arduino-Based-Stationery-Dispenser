import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import { getDatabase, ref, onValue, update } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-database.js";

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
    const tableBody = document.getElementById('table-body');
    const menuButton = document.getElementById('menu-button');
    const itemsContainer = document.querySelector('.items-container');

    // --- NAVIGATION ---
    if (menuButton) {
        menuButton.addEventListener('click', () => {
            window.location.href = 'menu.html';
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            signOut(auth).then(() => {
                window.location.replace("login.html");
            });
        });
    }

    // --- 2. LOAD TRANSACTION HISTORY (REAL-TIME) ---
    // Path updated to 'transactions' to match your Firebase structure
    const historyRef = ref(db, 'transactions/');

    onValue(historyRef, (snapshot) => {
        const data = snapshot.val();
        tableBody.innerHTML = ''; 

        if (data) {
            // Convert object to array
            const historyEntries = Object.keys(data).map(key => ({
                id: key,
                ...data[key]
            }));

            // Sort by Date and Time (Latest First)
            historyEntries.sort((a, b) => {
                const dateTimeA = parseDateTime(a.date, a.time);
                const dateTimeB = parseDateTime(b.date, b.time);
                return dateTimeB - dateTimeA; 
            });

            // Populate Table
            historyEntries.forEach(entry => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${entry.name || 'Unknown'}</td>
                    <td>${entry.uid || 'N/A'}</td>
                    <td>${entry.date || '-'}</td>
                    <td>${entry.time || '-'}</td>
                    <td>${entry.item || '-'}</td>
                    <td>${entry.pointsDeducted || '0'}</td>
                `;
                tableBody.appendChild(tr);
            });
        } else {
            tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px;">No transaction history found.</td></tr>';
        }
    });

    // Helper to turn your date strings (DD/MM/YYYY) into sortable numbers
    function parseDateTime(dateStr, timeStr) {
        if (!dateStr || !timeStr) return 0;
        const [day, month, year] = dateStr.split('/').map(Number);
        const [hours, minutes] = timeStr.split(':').map(Number);
        return new Date(year, month - 1, day, hours, minutes).getTime();
    }

    // --- 3. INVENTORY LOGIC (IF APPLICABLE TO THIS PAGE) ---
    if (itemsContainer) {
        itemsContainer.addEventListener('click', (e) => {
            const button = e.target;
            if (!button.classList.contains('arrow-btn')) return;

            const card = button.closest('.item-card');
            const priceDisplay = card.querySelector('.price-value');
            let currentPrice = parseInt(priceDisplay.textContent);

            if (button.textContent === '▶' && currentPrice < 100) currentPrice++;
            else if (button.textContent === '◀' && currentPrice > 1) currentPrice--;

            priceDisplay.textContent = currentPrice;
            updateArrowVisuals(card, currentPrice);
        });
    }

    function updateArrowVisuals(card, price) {
        const leftArrow = card.querySelector('.arrow-btn:first-of-type');
        if (leftArrow) {
            leftArrow.style.opacity = price <= 1 ? "0.5" : "1";
            leftArrow.style.cursor = price <= 1 ? "not-allowed" : "pointer";
        }
    }
});

// --- 4. ROUTE GUARD ---
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.replace("login.html");
    } else {
        console.log("Admin Session Active:", user.email);
    }
});