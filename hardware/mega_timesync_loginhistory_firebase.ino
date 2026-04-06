#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <SPI.h>
#include <MFRC522.h>
#include <Keypad.h>
#include <Servo.h>
#include <SD.h>

// --- CONFIGURATION & PINS ---
#define SD_CS 53
#define RST_PIN 7
#define SS_PIN 10
#define MAX_USERS 20
#define SERVO_A0_PIN A0
#define SERVO_A1_PIN A1
#define SERVO_A2_PIN A2

// --- OBJECTS ---
LiquidCrystal_I2C lcd(0x27, 20, 4);
MFRC522 mfrc522(SS_PIN, RST_PIN);
Servo servos[3];
File myFile;

// --- KEYPAD SETUP ---
char keys[4][4] = {
  { '1', '2', '3', 'A' }, { '4', '5', '6', 'B' }, { '7', '8', '9', 'C' }, { '*', '0', '#', 'D' }
};
byte rowPins[4] = { 22, 23, 24, 25 };
byte colPins[4] = { 26, 27, 28, 29 };
Keypad keypad = Keypad(makeKeymap(keys), rowPins, colPins, 4, 4);

// --- DATA STRUCTURES ---
struct Card {
  String uid, password, firstName;
  int points;
};
Card cards[MAX_USERS];
int totalUsers = 0;

// --- GLOBAL STATE ---
bool espDetected = false;
enum State { WAITING_CARD,
             AUTH_PASSWORD,
             RETRY,
             MENU,
             ITEM_SELECT,
             CONFIRM,
             DISPENSING };
State currentState = WAITING_CARD;

int penPrice = 0, markerPrice = 0, yellowPaperPrice = 0;
int selectedItem = 0;
int currentPoints = 0;
String currentUID = "", currentFirstName = "", keyBuffer = "";
unsigned long servoStartTime = 0;

// Sync State
bool isSyncing = false;

// ---------------------------------------------------------
// DATA HANDLERS (SD CARD & PARSING)
// ---------------------------------------------------------

void loadUsers() {
  myFile = SD.open("card.txt");
  if (myFile) {
    int i = 0;
    while (myFile.available() && i < MAX_USERS) {
      String l = myFile.readStringUntil('\n');
      l.trim();
      if (l.length() == 0) continue;
      int c1 = l.indexOf(','), c2 = l.indexOf(',', c1 + 1), c3 = l.indexOf(',', c2 + 1);
      if (c1 == -1 || c2 == -1 || c3 == -1) continue;
      cards[i] = { l.substring(0, c1), l.substring(c1 + 1, c2), l.substring(c2 + 1, c3), l.substring(c3 + 1).toInt() };
      i++;
    }
    totalUsers = i;
    myFile.close();
    Serial.print(F("Users loaded from SD: "));
    Serial.println(totalUsers);
  }
}

void loadPrices() {
  if (SD.exists("prices.txt")) {
    myFile = SD.open("prices.txt");
    if (myFile) {
      String l = myFile.readStringUntil('\n');
      l.trim();
      int pIdx = l.indexOf('P'), mIdx = l.indexOf('M'), yIdx = l.indexOf('Y');
      if (pIdx >= 0 && mIdx > 0 && yIdx > 0) {
        penPrice = l.substring(pIdx + 1, mIdx).toInt();
        markerPrice = l.substring(mIdx + 1, yIdx).toInt();
        yellowPaperPrice = l.substring(yIdx + 1).toInt();
        Serial.println(F("Prices loaded from SD."));
      }
      myFile.close();
    }
  }
}

void dumpSDCard() {
  Serial.println(F("\n--- SD CARD DUMP ---"));
  myFile = SD.open("card.txt");
  if (myFile) {
    while (myFile.available()) { Serial.write(myFile.read()); }
    myFile.close();
  }
  Serial.println(F("\n--- END ---"));
}

void handleESPData() {
  if (Serial1.available() > 0) {
    String data = Serial1.readStringUntil('\n');
    data.trim();

    // If the ESP tells us WiFi is gone, stop trying to sync
    if (data == "WIFI_ERROR") {
      isSyncing = false;
      Serial.println(F("WiFi Lost. Switching to Offline."));
      showIdleScreen();
      return;
    }

    // 1. Handle Prices & Save to prices.txt
    if (data.startsWith("P") && data.indexOf('M') > 0) {
      SD.remove("prices.txt");
      myFile = SD.open("prices.txt", FILE_WRITE);
      if (myFile) {
        myFile.println(data);
        myFile.close();
      }

      int pIdx = data.indexOf('P'), mIdx = data.indexOf('M'), yIdx = data.indexOf('Y');
      penPrice = data.substring(pIdx + 1, mIdx).toInt();
      markerPrice = data.substring(mIdx + 1, yIdx).toInt();
      yellowPaperPrice = data.substring(yIdx + 1).toInt();
      if (currentState == ITEM_SELECT) showItems();
      Serial.println(F("Prices Updated & Saved."));
    }

    // 2. Handle Account Sync (Wipe & Rewrite card.txt)
    else if (data == "SYNC_START") {
      isSyncing = true;
      updateDisplay("  Initializing...", "   Please wait...");
      int retry = 0;
      while (SD.exists("card.txt") && retry < 5) {
        SD.remove("card.txt");
        delay(100);
        retry++;
      }
      if (!SD.exists("card.txt")) {
        isSyncing = true;
        Serial.println(F("Sync Started: card.txt wiped."));
      }
    } else if (data.startsWith("ACC:")) {
      if (isSyncing) {
        myFile = SD.open("card.txt", FILE_WRITE);
        if (myFile) {
          myFile.println(data.substring(4));  // Store: UID,Pass,Name,Pts
          myFile.flush();
          myFile.close();
          Serial.print(".");
        }
      }
    } else if (data == "SYNC_DONE") {
      isSyncing = false;
      loadUsers();  // Refresh RAM array
      Serial.println(F("\nSync Done. Users Reloaded."));
      
      Serial.println(F("Sync Complete. Idle Screen Restored."));
      showIdleScreen(); // Now that data is ready, go back to idle!
    }
  }
}

// ---------------------------------------------------------
// UI & DISPLAY
// ---------------------------------------------------------

void updateDisplay(String line1, String line2) {
  lcd.clear();
  lcd.setCursor(0, 1);
  lcd.print(line1);
  lcd.setCursor(0, 2);
  lcd.print(line2);
}

void showIdleScreen() {
  if (isSyncing) {
    // If we are syncing, stay on the "Logging out" or "Syncing" screen
    return; 
  }
  currentState = WAITING_CARD;
  updateDisplay("  Please tap your", "       RFID");
}

void stopServos() {
  for (int i = 0; i < 3; i++) servos[i].write(90);
}

void showMainUI() {
  lcd.clear();
  lcd.print(currentFirstName + " Pts:" + String(currentPoints));
  lcd.setCursor(0, 1);
  lcd.print("1-Store Points");
  lcd.setCursor(0, 2);
  lcd.print("2-Select Items");
  lcd.setCursor(0, 3);
  lcd.print("3-Logout");
}

void showItems() {
  lcd.clear();
  lcd.print("    Choose Item");
  lcd.setCursor(0, 1);
  lcd.print("1-Pen:" + String(penPrice));
  lcd.setCursor(11, 1);
  lcd.print("3-YP:" + String(yellowPaperPrice));
  lcd.setCursor(0, 2);
  lcd.print("2-Mrk:" + String(markerPrice));
  lcd.setCursor(8, 3);
  lcd.print("*-Back");
}

void logout() {
  updateDisplay("   Logging out...", "");  // Show the message first
  Serial1.println("FETCH"); 
  Serial.println(F("Logout triggered: Fetching fresh data from Firebase..."));
  delay(2000);
  mfrc522.PICC_HaltA();
  mfrc522.PCD_StopCrypto1();
}

// ---------------------------------------------------------
// MAIN SETUP
// ---------------------------------------------------------

void setup() {
  Serial.begin(9600);
  Serial1.begin(9600);
  lcd.begin(20, 4);
  lcd.backlight();

  updateDisplay("   Please wait...", "");
  delay(1500);

  servos[0].attach(SERVO_A0_PIN);
  servos[1].attach(SERVO_A1_PIN);
  servos[2].attach(SERVO_A2_PIN);
  stopServos();

  SPI.begin();
  mfrc522.PCD_Init();

  if (!SD.begin(SD_CS)) {
    Serial.println(F("SD Error!"));
    lcd.print("SD Error!");
    while (1)
      ;
  }

  loadUsers();
  loadPrices();

  delay(2000);
 // --- HANDSHAKE LOGIC ---
  Serial.println(F("Checking for ESP & WiFi..."));
  Serial1.println("CHECK"); // Ask ESP for status
  
  updateDisplay("  System Booting", " Checking Connection");

  unsigned long startCheck = millis();
  bool canSync = false;

  // Wait 3 seconds for a specific response
  while (millis() - startCheck < 3000) { 
    if (Serial1.available() > 0) {
      String status = Serial1.readStringUntil('\n');
      status.trim();

      if (status == "WIFI_CONNECTED") {
        canSync = true;
        break;
      } 
      else if (status == "WIFI_ERROR") {
        canSync = false; // ESP is there, but no internet
        Serial.println(F("ESP reported WiFi Error."));
        break;
      }
    }
  }

  if (canSync) {
    Serial.println(F("WiFi OK. Starting Sync..."));
    isSyncing = true;
    Serial1.println("FETCH");
    updateDisplay("  System Booting", "  Syncing Data...");
  } else {
    Serial.println(F("Starting in Offline Mode (Using SD)."));
    isSyncing = false; 
    showIdleScreen(); // Go straight to RFID screen using SD data
  }
}

// TIME DATE SYNCCCC THIS SHT BETTER WORK FFS
void checkSystemSync() {
  updateDisplay(" Synchronizing...", "   Please wait");
  
  unsigned long startWait = millis();
  bool timeSynced = false;

  // Wait up to 10 seconds for ESP to confirm NTP sync
  while (millis() - startWait < 10000) {
    if (Serial1.available() > 0) {
      String response = Serial1.readStringUntil('\n');
      response.trim();
      
      if (response == "TIME_OK") {
        Serial.println(F("Confirmed: Accurate Date/Time Synced."));
        timeSynced = true;
        break;
      }
    }
  }

  if (timeSynced) {
    updateDisplay("  Time Synced!", " System Online");
  } else {
    Serial.println(F("Warning: NTP Sync Timeout. Using internal clock."));
    updateDisplay("  Time Error", " Check Internet");
  }
  delay(2000);
}

// ---------------------------------------------------------
// RFID & KEYPAD HANDLING
// ---------------------------------------------------------

void handleRFID() {
  if (isSyncing) {
    // Optional: You could show "Syncing..." on the LCD here 
    // if you want the user to know why it's not responding.
    return; 
  }
  if (!mfrc522.PICC_IsNewCardPresent() || !mfrc522.PICC_ReadCardSerial()) return;
  currentUID = "";
  for (byte i = 0; i < mfrc522.uid.size; i++) {
    currentUID += String(mfrc522.uid.uidByte[i], HEX);
  }
  currentUID.toLowerCase();

  // --- NEW: Print the UID to Serial Monitor ---
  Serial.print(F("RFID Tapped! UID: "));
  Serial.println(currentUID);
  // ---------------------------------------------

  bool found = false;
  for (int i = 0; i < totalUsers; i++) {
    if (cards[i].uid == currentUID) {
      found = true;
      break;
    }
  }

  if (found) {
    currentState = AUTH_PASSWORD;
    keyBuffer = "";
    updateDisplay("   Enter Password:", "");
  } else {
    updateDisplay("Invalid Card", "");
    delay(1500);
    showIdleScreen();
  }
}

void handlePasswordEntry(char key) {
  if (key == '#') {
    bool correct = false;
    int userIndex = -1; // Added to track which user logged in

    for (int i = 0; i < totalUsers; i++) {
      if (cards[i].uid == currentUID && cards[i].password == keyBuffer) {
        currentFirstName = cards[i].firstName;
        currentPoints = cards[i].points;
        userIndex = i;
        correct = true;
        break;
      }
    }
    if (correct) {
      // --- NEW LOGIC START ---
      // Send a special prefix "LOG:" so the ESP knows this is a login history event
      // Format: LOG:Name,UID
      Serial1.print("LOG:");
      Serial1.print(cards[userIndex].firstName);
      Serial1.print(",");
      Serial1.println(cards[userIndex].uid);
      // --- NEW LOGIC END ---
      
      lcd.clear();
      lcd.setCursor(0, 1);
      lcd.print("     Welcome");
      lcd.setCursor(0, 2);
      lcd.print("   " + currentFirstName + "!");
      delay(2000);
      currentState = MENU;
      showMainUI();
    } else {
      currentState = RETRY;
      updateDisplay("Wrong Password", "A-Retry  B-End");
    }
    keyBuffer = "";
  } else if (key == '*') {
    keyBuffer = "";
    updateDisplay("   Enter Password:", "");
  } else {
    keyBuffer += key;
    lcd.setCursor(keyBuffer.length() - 1, 2);
    lcd.print('*');
  }
}

void loop() {
  handleESPData();

  if (Serial.available() > 0) {
    char cmd = Serial.read();
    if (cmd == 'D' || cmd == 'd') dumpSDCard();
    if (cmd == 'R' || cmd == 'r') Serial1.println("R");
  }

  if (currentState == DISPENSING && millis() - servoStartTime >= 2000) {
    stopServos();
    updateDisplay("      Done!", "");
    delay(1500);
    logout();
  }

  char key = keypad.getKey();
  if (key) {
    Serial.print("Key Pressed: ");  // This line is new
    Serial.println(key);            // This line is new
    switch (currentState) {
      case AUTH_PASSWORD: handlePasswordEntry(key); break;
      case RETRY:
        if (key == 'A') {
          currentState = AUTH_PASSWORD;
          updateDisplay("   Enter Password:", "");
        } else if (key == 'B') logout();
        break;
      case MENU:
        if (key == '2') {
          Serial1.println("FETCH");
          currentState = ITEM_SELECT;
          showItems();
        } else if (key == '3') logout();
        break;
      case ITEM_SELECT:
        if (key >= '1' && key <= '3') {
          selectedItem = key - '0';
          currentState = CONFIRM;
          lcd.print("Confirm Item ");
          lcd.print(selectedItem);
          lcd.setCursor(0, 2);
          lcd.print("A-Confirm  B-Back");
        } else if (key == '*') {
          currentState = MENU;
          showMainUI();
        }
        break;
      case CONFIRM:
        if (key == 'A') {
          currentState = DISPENSING;
          updateDisplay("Dispensing...", "");
          servos[selectedItem - 1].write(0);
          servoStartTime = millis();
        } else if (key == 'B') {
          currentState = ITEM_SELECT;
          showItems();
        }
        break;
    }
  }

  if (currentState == WAITING_CARD) handleRFID();
}