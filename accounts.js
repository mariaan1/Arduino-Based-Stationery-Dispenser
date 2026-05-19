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
 const editBtn = document.getElementById('edit');
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
 // Add User Form Selectors
 const addAccountBtn = document.getElementById('addAccountBtn');
 const newNameInput = document.getElementById('newName');
 const newUIDInput = document.getElementById('newUID');
 const newPassInput = document.getElementById('newPass');

 // --- 2. LOAD INVENTORY DATA ---
 const inventoryRef = ref(db, 'inventory/');
 onValue(inventoryRef, (snapshot) => {
 const data = snapshot.val();
 if (data) {
 updateUI('PEN', data.pen);
 updateUI('MARKER', data.marker);
 updateUI('YELLOW PAPER', data.yellowpaper);
 }
 });

 // --- 3. LOAD ACCOUNTS DATA (REAL-TIME TABLE) ---
 // --- 3. LOAD ACCOUNTS DATA (SORTED ALPHABETICALLY) ---
 const accountsRef = ref(db, 'accounts/');
 onValue(accountsRef, (snapshot) => {
 const data = snapshot.val();
 tableBody.innerHTML = '';

 if (data) {
 // 1. Get the UIDs and sort them based on the 'name' property
 const sortedUids = Object.keys(data).sort((a, b) => {
 const nameA = data[a].name.toUpperCase(); // ignore upper and lowercase
 const nameB = data[b].name.toUpperCase(); // ignore upper and lowercase

 if (nameA < nameB) return -1;
 if (nameA > nameB) return 1;
 return 0;
 });

 // 2. Loop through the sorted UIDs
 sortedUids.forEach(uid => {
 const user = data[uid];
 const tr = document.createElement('tr');
 tr.innerHTML = `
 <td>${user.name}</td>
 <td>${uid}</td>
 <td>${user.password}</td>
 <td><strong>${user.points}</strong></td>
 <td>
 <button class="edit-action-btn" data-uid="${uid}" data-type="name">Edit Name</button>
 <button class="edit-action-btn" data-uid="${uid}" data-type="pass">Edit Pass</button>
 <button class="edit-action-btn" data-uid="${uid}" data-type="points">Edit Pts</button>
 <button class="edit-action-btn delete-btn" data-uid="${uid}" data-type="delete" style="background-color: #ff4d4d; color: white; border: 1px solid darkred;">Delete</button>
 </td>
 `;
 tableBody.appendChild(tr);
 });
 } else {
 tableBody.innerHTML = '<tr><td colspan="5">No accounts found.</td></tr>';
 }
 });

 // --- 4. EVENT DELEGATION (EDIT & DELETE) ---
 tableBody.addEventListener('click', (e) => {
 if (!e.target.classList.contains('edit-action-btn')) return;

 const uid = e.target.getAttribute('data-uid');
 const type = e.target.getAttribute('data-type');


if (type === 'points') {
    const newPts = prompt("Enter new points value (Whole numbers only, max 10 digits):");
    
    if (newPts !== null && newPts !== "") {
        // 1. Remove everything except numbers (strips decimals, letters, spaces)
        let cleanPts = newPts.replace(/\D/g, ''); 

        // 2. Truncate to a maximum of 10 digits
        if (cleanPts.length > 10) {
            cleanPts = cleanPts.substring(0, 10);
        }

        // 3. Ensure we actually have a number left before updating
        if (cleanPts !== "") {
            const finalPts = parseInt(cleanPts, 10);
            updateAccount(uid, { points: finalPts }); 
        } else {
            alert("Invalid input. Please enter a valid number.");
        }
    }
}

 else if (type === 'pass') {
 const newPass = prompt("Enter new password/PIN:");
 if (newPass !== null && newPass !== "") updateAccount(uid, { password: newPass });
 }
 else if (type === 'name') {
 const newName = prompt("Enter new name:");
 if (newName !== null && newName !== "") updateAccount(uid, { name: newName });
 }
 else if (type === 'delete') {
 const userName = e.target.closest('tr').cells[0].innerText;
 if (confirm(`Are you sure you want to delete ${userName}?`)) {
 set(ref(db, 'accounts/' + uid), null)
 .then(() => console.log("Deleted:", uid))
 .catch(err => alert("Delete failed: " + err.message));
 }
 }
 });

 // Firebase Update Helper
 function updateAccount(uid, updateData) {
 const userRef = ref(db, 'accounts/' + uid);
 update(userRef, updateData)
 .then(() => console.log("Update Success"))
 .catch((err) => alert("Update failed: " + err.message));
 }

 // --- 5. NEW ACCOUNT CREATION ---
 if (addAccountBtn) {
 addAccountBtn.addEventListener('click', () => {
 const name = newNameInput.value.trim();
 const uid = newUIDInput.value.trim();
 const pass = newPassInput.value.trim();

 if (!name || !uid || !pass) {
 alert("Please fill in Name, UID, and Password.");
 return;
 }

 set(ref(db, 'accounts/' + uid), {
 name: name,
 password: pass,
 points: 0
 })
 .then(() => {
 alert("New user added!");
 newNameInput.value = '';
 newUIDInput.value = '';
 newPassInput.value = '';
 })
 .catch((err) => alert("Error: " + err.message));
 });
 }



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

// Add this inside your script tag where other buttons are handled
const syncBtn = document.getElementById('syncBtn');

syncBtn.addEventListener('click', () => {
 // We write to a path called 'commands/syncTrigger'
 const syncRef = ref(db, 'commands/syncTrigger');

 set(syncRef, 1).then(() => {
 console.log("Sync sending...");
 // 2. Wait 2 seconds (2000 milliseconds) then set it back to 0
      setTimeout(() => {
        set(syncRef, 0)
          .then(() => console.log("Sync trigger reset to 0"))
          .catch((err) => console.error("Reset failed:", err));
      }, 2000);
 }).catch((error) => {
 console.error("Sync Error:", error);
 });
});


// --- 7. SYNC STATUS LISTENER ---
const statusCircle = document.getElementById('syncStatus');
const statusRef = ref(db, 'commands/syncStatus');

onValue(statusRef, (snapshot) => {
 const status = snapshot.val();

 // Reset classes
 statusCircle.classList.remove('gray', 'green', 'red');

 if (status === "sync_success") {
 statusCircle.classList.add('green');
 } else if (status === "sync_fail") {
 statusCircle.classList.add('red');
 } else {
 statusCircle.classList.add('gray');
 }
});

// Update your existing syncBtn listener to reset the circle to gray when clicked
syncBtn.addEventListener('click', () => {
 const syncRef = ref(db, 'commands/syncTrigger');

 /// Disable button immediately to prevent spamming triggers
    syncBtn.disabled = true;
    statusCircle.className = 'status-circle gray';
    console.log("Sync sending...");

    set(syncRef, 1)
        .then(() => {
            setTimeout(() => {
                set(syncRef, 0)
                    .then(() => {
                        console.log("Sync trigger reset to 0");
                        syncBtn.disabled = false; // Re-enable button
                    })
                    .catch((err) => {
                        console.error("Reset failed:", err);
                        syncBtn.disabled = false;
                    });
            }, 2000);
        })
        .catch((error) => {
            console.error("Sync Error:", error);
            syncBtn.disabled = false;
 });
});


// --- 7. SYNC STATUS LISTENER (UPDATED) ---
const syncDisplayBox = document.getElementById('sync-display-box');
const commandsRef = ref(db, 'commands/');

onValue(commandsRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) return;

    let latestEntry = null;
    let latestTime = 0;
    let type = '';

    // Helper to get the most recent push key from an object
    const getLatestFromNode = (nodeData) => {
        if (!nodeData) return null;
        const keys = Object.keys(nodeData);
        const lastKey = keys[keys.length - 1]; // Firebase push IDs are chronological
        return nodeData[lastKey];
    };

    const lastFail = getLatestFromNode(data.syncfail);
    const lastSuccess = getLatestFromNode(data.syncsuccess);

    // Determine which one is actually newer by comparing date/time strings
    // Or, more simply, react to whichever node was just updated
    // For this implementation, we compare the combined date/time strings
    const failStamp = lastFail ? new Date(`${lastFail.date} ${lastFail.time}`).getTime() : 0;
    const successStamp = lastSuccess ? new Date(`${lastSuccess.date} ${lastSuccess.time}`).getTime() : 0;

    if (failStamp > successStamp) {
        // Display Sync Fail Data
        syncDisplayBox.style.color = "#ff4d4d"; // Red text for failure
        syncDisplayBox.innerHTML = `
            <strong>FAILED:</strong> ${lastFail.reason}<br>
            USER: ${lastFail.firstName} (${lastFail.uid})<br>
            ${lastFail.date} | ${lastFail.time}
        `;
    } else if (lastSuccess) {
        // Display Sync Success Data
        syncDisplayBox.style.color = "#00ff88"; // Green text for success
        syncDisplayBox.innerHTML = `
            <strong>${lastSuccess.status}</strong><br>
            DATE: ${lastSuccess.date}<br>
            TIME: ${lastSuccess.time}
        `;
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
