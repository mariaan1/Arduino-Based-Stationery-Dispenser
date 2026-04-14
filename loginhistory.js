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

// --- 2. INITIALIZATION ---
const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getDatabase(app);

document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logoutBtn');
    const tableBody = document.getElementById('table-body');
    const menuButton = document.getElementById('menu-button');

    // Navigation logic
    if (menuButton) {
        menuButton.addEventListener('click', () => {
            window.location.href = 'menu.html';
        });
    }

    // Logout logic
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            signOut(auth).then(() => {
                window.location.replace("login.html");
            });
        });
    }

    // --- 3. LOAD & MERGE LOGIN HISTORY ---
    const dbRef = ref(db);

    onValue(dbRef, (snapshot) => {
        const data = snapshot.val();
        
        if (!data) {
            tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No data available.</td></tr>';
            return;
        }

        tableBody.innerHTML = '';
        let combinedLogs = [];

        // Pull from standard loginHistory
        if (data.loginHistory) {
            Object.keys(data.loginHistory).forEach(key => {
                combinedLogs.push({ ...data.loginHistory[key], isOffline: false });
            });
        }

        // Pull from offlineLogs (matches ESP8266 path)
        if (data.offlineLogs) {
            Object.keys(data.offlineLogs).forEach(key => {
                combinedLogs.push({ ...data.offlineLogs[key], isOffline: true });
            });
        }

        if (combinedLogs.length > 0) {
            // --- 4. SORTING LOGIC (Latest on Top) ---
            combinedLogs.sort((a, b) => {
                const normalizeForSort = (dateStr) => {
                    if (!dateStr) return "0000-00-00";
                    const parts = dateStr.split('/');
                    if (parts.length < 3) return "0000-00-00";
                    // Format DD/MM/YYYY to YYYY-MM-DD
                    const day = parts[0].padStart(2, '0');   
                    const month = parts[1].padStart(2, '0'); 
                    const year = parts[2];
                    return `${year}-${month}-${day}`;
                };

                const isoA = `${normalizeForSort(a.date)}T${a.time || '00:00'}`;
                const isoB = `${normalizeForSort(b.date)}T${b.time || '00:00'}`;
                return new Date(isoB) - new Date(isoA);
            });

            // --- 5. RENDER TABLE ---
            combinedLogs.forEach(entry => {
                const tr = document.createElement('tr');

                // Apply Red Font if the log is from an offline sync
                const textStyle = entry.isOffline ? 'color: #ff0000; font-weight: bold;' : 'color: inherit;';

                // Formatting Date for Display (MM/DD/YYYY)
                let dateDisplay = 'N/A';
                if (entry.date) {
                    const dateParts = entry.date.split('/');
                    if (dateParts.length === 3) {
                        dateDisplay = `${dateParts[1].padStart(2, '0')}/${dateParts[0].padStart(2, '0')}/${dateParts[2]}`;
                    }
                }

                const timeDisplay = entry.time ? entry.time.split(':').slice(0, 2).join(':') : '-';

                tr.innerHTML = `
                    <td style="${textStyle}">${entry.name || 'Unknown'} ${entry.isOffline ? '(Offline)' : ''}</td>
                    <td style="${textStyle}">${entry.uid || 'N/A'}</td>
                    <td style="${textStyle}">${dateDisplay}</td>
                    <td style="${textStyle}">${timeDisplay}</td>
                `;
                tableBody.appendChild(tr);
            });
        } else {
            tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No login history found.</td></tr>';
        }
    });
});

// Auth Guard
onAuthStateChanged(auth, (user) => {
    if (!user) window.location.replace("login.html");
});