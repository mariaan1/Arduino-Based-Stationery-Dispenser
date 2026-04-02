// THE ROUTE GUARD
onAuthStateChanged(auth, (user) => {
    if (!user) {
        // If NO user is logged in, redirect them immediately
        console.log("Access denied. Redirecting to login...");
        window.location.href = "index.html"; 
    } else {
        console.log("Welcome, Admin:", user.email);
        // You can now safely show the menu content
    }
});

// 1. Get references to the buttons
const accounts = document.getElementById('accounts');
const loginhistory = document.getElementById('loginhistory');
const itemprices = document.getElementById('itemprices');
const transactionhistory = document.getElementById('transactionhistory');

// 2. Add Click Events
accounts.addEventListener('click', () => {
    console.log("Opening Accounts...");
    // window.location.href = "accounts.html";
});

loginhistory.addEventListener('click', () => {
    console.log("Viewing Login History...");
    // logic to show login logs
});

itemprices.addEventListener('click', () => {
    console.log("Viewing Item Prices...");
    // logic to edit prices
});

transactionhistory.addEventListener('click', () => {
    console.log("Viewing Transactions...");
    // logic to see what was dispensed
});