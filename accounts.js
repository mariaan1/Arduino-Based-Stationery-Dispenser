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
    const accountsRef = ref(db, 'accounts/');
    onValue(accountsRef, (snapshot) => {
        const data = snapshot.val();
        tableBody.innerHTML = ''; 

        if (data) {
            Object.keys(data).forEach(uid => {
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
            const newPts = prompt("Enter new points value:");
            if (newPts !== null && newPts !== "") updateAccount(uid, { points: parseInt(newPts) });
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

    // --- 6. INVENTORY EDITING LOGIC ---
    editBtn.addEventListener('click', () => {
        const isEditing = editBtn.textContent === 'EDIT';

        if (!isEditing) {
            // Save state (Done clicked)
            const penPrice = parseInt(findPriceInHTML('PEN'));
            const markerPrice = parseInt(findPriceInHTML('MARKER'));
            const paperPrice = parseInt(findPriceInHTML('YELLOW PAPER'));

            set(ref(db, 'inventory/'), {
                pen: penPrice,
                marker: markerPrice,
                yellowpaper: paperPrice
            }).then(() => console.log("Inventory Saved!"));
        }

        editBtn.textContent = isEditing ? 'DONE' : 'EDIT';
        document.querySelectorAll('.arrow-btn').forEach(arrow => arrow.classList.toggle('green', isEditing));
    });

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
        if(leftArrow) {
            leftArrow.style.opacity = price <= 1 ? "0.5" : "1";
            leftArrow.style.cursor = price <= 1 ? "not-allowed" : "pointer";
        }
    }

    // --- 7. NAVIGATION & LOGOUT ---
    if (menuButton) {
        menuButton.onclick = () => window.location.href = 'menu.html';
    }

    logoutBtn.addEventListener('click', () => {
        signOut(auth).then(() => window.location.replace("login.html"));
    });
});

// --- 8. ROUTE GUARD ---
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.replace("login.html");
    } else {
        console.log("Admin Session Active");
    }
});