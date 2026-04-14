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
            // Internal Helper to turn "DD/MM/YYYY" into "YYYY-MM-DD" for accurate sorting
            const normalizeForSort = (dateStr) => {
                const parts = dateStr.split('/');
                const day = parts[0].padStart(2, '0');   
                const month = parts[1].padStart(2, '0'); 
                const year = parts[2];
                return `${year}-${month}-${day}`;
            };

            const isoA = `${normalizeForSort(a.date)}T${a.time}`;
            const isoB = `${normalizeForSort(b.date)}T${b.time}`;
            return new Date(isoB) - new Date(isoA);
        });

        // 4. DISPLAY
        combinedLogs.forEach(entry => {
            const tr = document.createElement('tr');

            // --- RED COLOR LOGIC ---
            // This ensures if it's offline, the entire row text turns red
            if (entry.isOffline) {
                tr.style.color = "#ff4d4d"; 
                tr.style.fontWeight = "bold";
            } else if (entry.uid === 'ADMIN_001') {
                tr.style.color = "#007bff"; // Blue for Admin
                tr.style.fontWeight = "bold";
            }

            // --- MONTH FIRST DISPLAY LOGIC ---
            // Turns "DD/MM/YYYY" into "MM/DD/YYYY"
            const dateParts = entry.date.split('/');
            const monthFirst = `${dateParts[1].padStart(2, '0')}/${dateParts[0].padStart(2, '0')}/${dateParts[2]}`;

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