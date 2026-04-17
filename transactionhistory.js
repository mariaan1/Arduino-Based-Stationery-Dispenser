import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-database.js";

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
    const historyRef = ref(db, 'transactions/');

    onValue(historyRef, (snapshot) => {
        const data = snapshot.val();
        tableBody.innerHTML = ''; 

        if (data) {
            // Using a Map for De-duplication
            // Key fingerprint: UID + Date + Time
            let transactionMap = new Map();

            Object.keys(data).forEach(key => {
                const entry = data[key];
                // Unique fingerprint prevents exact same transaction from appearing twice
                const fingerprint = `${entry.uid}-${entry.date}-${entry.time}`;
                
                transactionMap.set(fingerprint, {
                    id: key,
                    ...entry
                });
            });

            // Convert Map values to array for sorting
            const historyEntries = Array.from(transactionMap.values());

            // Sort by Date and Time (Latest First)
            historyEntries.sort((a, b) => {
                const dateTimeA = parseDateTime(a.date, a.time);
                const dateTimeB = parseDateTime(b.date, b.time);
                return dateTimeB - dateTimeA; 
            });

            // Populate Table
            historyEntries.forEach(entry => {
                const tr = document.createElement('tr');
                
                const pointsValue = entry.pointsDeducted || 0;
                const pointsStyle = pointsValue > 0 ? 'style="color: #dd0000; font-weight: bold;"' : '';
                const displayPrefix = pointsValue > 0 ? '-' : '';

                // entry.time will now display hh:mm:ss if provided by Arduino
                tr.innerHTML = `
                    <td>${entry.name || 'Unknown'}</td>
                    <td>${entry.uid || 'N/A'}</td>
                    <td>${entry.date || '-'}</td>
                    <td>${entry.time || '-'}</td>
                    <td>${entry.item || '-'}</td>
                    <td ${pointsStyle}>${displayPrefix}${pointsValue}</td>
                `;
                tableBody.appendChild(tr);
            });
        } else {
            tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px;">No transaction history found.</td></tr>';
        }
    });

    // --- UPDATED HELPER: Now handles hh:mm:ss ---
    function parseDateTime(dateStr, timeStr) {
        if (!dateStr || !timeStr) return 0;
        
        const [day, month, year] = dateStr.split('/').map(Number);
        
        // Split time and handle cases where seconds might be missing (legacy logs)
        const timeParts = timeStr.split(':').map(Number);
        const hours = timeParts[0] || 0;
        const minutes = timeParts[1] || 0;
        const seconds = timeParts[2] || 0; // Default to 0 if Arduino hadn't sent seconds yet

        return new Date(year, month - 1, day, hours, minutes, seconds).getTime();
    }
});

// --- 3. ROUTE GUARD ---
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.replace("login.html");
    } else {
        console.log("Admin Session Active");
    }
});