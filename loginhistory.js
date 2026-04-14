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
    // --- 3. LOAD COMBINED LOGIN HISTORY ---
const dbRef = ref(db);

onValue(dbRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) {
        tableBody.innerHTML = '<tr><td colspan="4">No data available.</td></tr>';
        return;
    }

    tableBody.innerHTML = '';
    let combinedLogs = [];

    // 1. MERGE: Online Logs (matches Firebase path "/loginHistory")
    if (data.loginHistory) {
        Object.keys(data.loginHistory).forEach(key => {
            combinedLogs.push({ ...data.loginHistory[key], isOffline: false });
        });
    }

    // 2. MERGE: Offline Logs (UPDATED to match ESP code path "/offlineLogs")
    if (data.offlineLogs) { // Changed from offlineLogins to offlineLogs
        Object.keys(data.offlineLogs).forEach(key => {
            combinedLogs.push({ ...data.offlineLogs[key], isOffline: true });
        });
    }

    if (combinedLogs.length > 0) {
        // 3. SORT: Latest on Top
        combinedLogs.sort((a, b) => {
            const normalizeForSort = (dateStr) => {
                if (!dateStr) return "0000-00-00";
                const parts = dateStr.split('/');
                if (parts.length < 3) return "0000-00-00";
                const day = parts[0].padStart(2, '0');   
                const month = parts[1].padStart(2, '0'); 
                const year = parts[2];
                return `${year}-${month}-${day}`;
            };

            const isoA = `${normalizeForSort(a.date)}T${a.time || '00:00'}`;
            const isoB = `${normalizeForSort(b.date)}T${b.time || '00:00'}`;
            return new Date(isoB) - new Date(isoA);
        });

        // 4. DISPLAY
        combinedLogs.forEach(entry => {
            const tr = document.createElement('tr');

            if (entry.isOffline) {
                tr.style.color = "#ff4d4d"; 
                tr.style.fontWeight = "bold";
            } else if (entry.uid === 'ADMIN_001') {
                tr.style.color = "#007bff"; 
                tr.style.fontWeight = "bold";
            }

            // Formatting Date for Display (MM/DD/YYYY)
            let monthFirst = 'N/A';
            if (entry.date) {
                const dateParts = entry.date.split('/');
                if (dateParts.length === 3) {
                    monthFirst = `${dateParts[1].padStart(2, '0')}/${dateParts[0].padStart(2, '0')}/${dateParts[2]}`;
                }
            }

            const timeNoSeconds = entry.time ? entry.time.split(':').slice(0, 2).join(':') : '-';

            tr.innerHTML = `
                <td>${entry.name || 'Unknown'} ${entry.isOffline ? '(Offline)' : ''}</td>
                <td>${entry.uid || 'N/A'}</td>
                <td>${monthFirst}</td>
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