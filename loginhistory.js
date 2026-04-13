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

        if (data && data.loginHistory) {
            Object.keys(data.loginHistory).forEach(key => {
                combinedLogs.push({ ...data.loginHistory[key], isOffline: false });
            });
        }

        if (data && data.offlineLogins) {
            Object.keys(data.offlineLogins).forEach(key => {
                combinedLogs.push({ ...data.offlineLogins[key], isOffline: true });
            });
        }

        if (combinedLogs.length > 0) {
            // Sort by Date and Time (using full time string for precision)
            combinedLogs.sort((a, b) => {
                const dateA = a.date.split('/').reverse().join('-');
                const dateB = b.date.split('/').reverse().join('-');
                const dateTimeA = new Date(`${dateA}T${a.time}`);
                const dateTimeB = new Date(`${dateB}T${b.time}`);
                return dateTimeB - dateTimeA;
            });

            combinedLogs.forEach(entry => {
                const tr = document.createElement('tr');

                if (entry.uid === 'ADMIN_001') {
                    tr.style.color = "#007bff"; // Blue for Admin
                    tr.style.fontWeight = "bold";
                } else if (entry.isOffline) {
                    tr.style.color = "#ff4d4d"; // Red for Offline
                    tr.style.fontWeight = "bold";
                }

                if (entry.isOffline) {
                    tr.style.color = "#ff4d4d";
                    tr.style.fontWeight = "bold";
                }

                // --- LOGIC TO REMOVE SECONDS ---
                // If time is "14:30:05", split(':') gives ["14", "30", "05"]
                // slice(0, 2) takes ["14", "30"], and join(':') makes it "14:30"
                const timeNoSeconds = entry.time ? entry.time.split(':').slice(0, 2).join(':') : '-';

                tr.innerHTML = `
                    <td>${entry.name || 'Unknown'}</td>
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