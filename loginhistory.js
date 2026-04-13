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
    const logoutBtn = document.getElementById('logoutBtn');
    const tableBody = document.getElementById('table-body');
    const menuButton = document.getElementById('menu-button');

    menuButton.addEventListener('click', () => {
        window.location.href = 'menu.html';
    });

    logoutBtn.addEventListener('click', () => {
        signOut(auth).then(() => {
            window.location.replace("login.html");
        });
    });

    // --- 3. LOAD COMBINED LOGIN HISTORY ---
    const dbRef = ref(db);

    onValue(dbRef, (snapshot) => {
        const data = snapshot.val();
        tableBody.innerHTML = '';

        let combinedLogs = [];

        // 1. MERGE: Online Logs
        if (data && data.loginHistory) {
            Object.keys(data.loginHistory).forEach(key => {
                combinedLogs.push({ ...data.loginHistory[key], isOffline: false });
            });
        }

        // 2. MERGE: Offline Logs
        if (data && data.offlineLogins) {
            Object.keys(data.offlineLogins).forEach(key => {
                combinedLogs.push({ ...data.offlineLogins[key], isOffline: true });
            });
        }

        if (combinedLogs.length > 0) {
            // 3. SORT: Latest on Top
            combinedLogs.sort((a, b) => {
                // Convert DD/MM/YYYY to YYYY-MM-DD for reliable parsing
                const partA = a.date.split('/');
                const partB = b.date.split('/');

                // Format: YYYY-MM-DDTHH:mm:ss
                const isoA = `${partA[2]}-${partA[1]}-${partA[0]}T${a.time}`;
                const isoB = `${partB[2]}-${partB[1]}-${partB[0]}T${b.time}`;

                const dateTimeA = new Date(isoA);
                const dateTimeB = new Date(isoB);

                // Descending order (Latest - Earliest)
                return dateTimeB - dateTimeA;
            });

            // 4. DISPLAY
            combinedLogs.forEach(entry => {
                const tr = document.createElement('tr');

                // Visual Indicators
                if (entry.uid === 'ADMIN_001') {
                    tr.style.color = "#007bff";
                    tr.style.fontWeight = "bold";
                } else if (entry.isOffline) {
                    tr.style.color = "#ff4d4d"; // Red for Offline
                    tr.style.fontWeight = "bold";
                }

                // Remove seconds for cleaner UI
                const timeNoSeconds = entry.time ? entry.time.split(':').slice(0, 2).join(':') : '-';

                tr.innerHTML = `
                <td>${entry.name || 'Unknown'} ${entry.isOffline ? '(Offline)' : ''}</td>
                <td>${entry.uid || 'N/A'}</td>
                <td>${entry.date || '-'}</td>
                <td>${timeNoSeconds}</td>
            `;
                tableBody.appendChild(tr);
            });
        } else {
            tableBody.innerHTML = '<tr><td colspan="4">No login history found.</td></tr>';
        }
    });
});

onAuthStateChanged(auth, (user) => {
    if (!user) window.location.replace("login.html");
});