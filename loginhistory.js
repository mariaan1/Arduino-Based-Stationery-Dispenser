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

    // Navigation
    menuButton.addEventListener('click', () => {
        window.location.href = 'menu.html';
    });

    // Logout
    logoutBtn.addEventListener('click', () => {
        signOut(auth).then(() => {
            window.location.replace("login.html");
        });
    });

    // --- 3. LOAD COMBINED LOGIN HISTORY (LIVE + OFFLINE) ---
    const dbRef = ref(db);

    onValue(dbRef, (snapshot) => {
        const data = snapshot.val();
        tableBody.innerHTML = ''; 

        let combinedLogs = [];

        // Pull standard logs
        if (data && data.loginHistory) {
            Object.keys(data.loginHistory).forEach(key => {
                combinedLogs.push({ ...data.loginHistory[key], isOffline: false });
            });
        }

        // Pull offline logs
        if (data && data.offlineLogins) {
            Object.keys(data.offlineLogins).forEach(key => {
                combinedLogs.push({ ...data.offlineLogins[key], isOffline: true });
            });
        }

        if (combinedLogs.length > 0) {
            // Sort by Date and Time (Newest First)
            combinedLogs.sort((a, b) => {
                // Convert DD/MM/YYYY to YYYY-MM-DD for standard parsing
                const dateA = a.date.split('/').reverse().join('-');
                const dateB = b.date.split('/').reverse().join('-');
                
                const dateTimeA = new Date(`${dateA}T${a.time}`);
                const dateTimeB = new Date(`${dateB}T${b.time}`);
                
                return dateTimeB - dateTimeA;
            });

            // Render Rows
            combinedLogs.forEach(entry => {
                const tr = document.createElement('tr');
                
                // Apply red styling if the log was made offline
                if (entry.isOffline) {
                    tr.style.color = "#ff4d4d";
                    tr.style.fontWeight = "bold";
                }

                tr.innerHTML = `
                    <td>${entry.name || 'Unknown'}</td>
                    <td>${entry.uid || 'N/A'}</td>
                    <td>${entry.date || '-'}</td>
                    <td>${entry.time || '-'}</td>
                `;
                tableBody.appendChild(tr);
            });
        } else {
            tableBody.innerHTML = '<tr><td colspan="4">No login history found.</td></tr>';
        }
    });

    // --- 4. FIREBASE UPDATE HELPER ---
    window.updateAccount = function(uid, updateData) {
        const userRef = ref(db, 'accounts/' + uid);
        update(userRef, updateData)
            .then(() => console.log("Update Success"))
            .catch((err) => alert("Update failed: " + err.message));
    };
});

// --- 5. ROUTE GUARD ---
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.replace("login.html");
    } else {
        console.log("Admin Session Active");
    }
});