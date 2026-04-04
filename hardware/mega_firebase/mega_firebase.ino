#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <SPI.h>
#include <MFRC522.h>
#include <Keypad.h>
#include <Servo.h>
#include <SD.h>

// --- CONFIGURATION & PINS ---
#define SD_CS         53
#define RST_PIN       7
#define SS_PIN        10
#define MAX_USERS     20
#define SERVO_A0_PIN  A0
#define SERVO_A1_PIN  A1
#define SERVO_A2_PIN  A2

// --- OBJECTS ---
LiquidCrystal_I2C lcd(0x27, 20, 4);
MFRC522 mfrc522(SS_PIN, RST_PIN);
Servo servos[3]; 
File myFile; // FIXED: Added missing global declaration

// --- KEYPAD SETUP ---
char keys[4][4] = {
  {'1','2','3','A'}, {'4','5','6','B'},
  {'7','8','9','C'}, {'*','0', '#','D'}
};
byte rowPins[4] = {22, 23, 24, 25};
byte colPins[4] = {26, 27, 28, 29};
Keypad keypad = Keypad(makeKeymap(keys), rowPins, colPins, 4, 4);

// --- DATA STRUCTURES ---
struct Card {
  String uid, password, firstName;
  int points;
};
Card cards[MAX_USERS];
int totalUsers = 0;

// --- GLOBAL STATE ---
// FIXED: Renamed IDLE to WAITING_CARD to avoid clash with Keypad library
enum State { WAITING_CARD, AUTH_PASSWORD, RETRY, MENU, ITEM_SELECT, CONFIRM, DISPENSING };
State currentState = WAITING_CARD;

int penPrice = 0, markerPrice = 0, yellowPaperPrice = 0;
int selectedItem = 0;
int currentPoints = 0;
String currentUID = "", currentFirstName = "", keyBuffer = "";
unsigned long servoStartTime = 0;

// ---------------------------------------------------------
// REUSABLE UI & UTILS
// ---------------------------------------------------------

void updateDisplay(String line1, String line2) {
  lcd.clear();
  lcd.setCursor(0, 1); lcd.print(line1);
  lcd.setCursor(0, 2); lcd.print(line2);
}

void showIdleScreen() {
  currentState = WAITING_CARD;
  updateDisplay("  Please tap your", "        RFID");
}

void stopServos() {
  for (int i = 0; i < 3; i++) servos[i].write(90);
}

void showMainUI() {
  lcd.clear();
  lcd.print(currentFirstName + " Pts:" + String(currentPoints));
  lcd.setCursor(0, 1); lcd.print("1-Store Points");
  lcd.setCursor(0, 2); lcd.print("2-Select Items");
  lcd.setCursor(0, 3); lcd.print("3-Logout");
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
  Serial.println(F("Event: User Logged Out."));
  mfrc522.PICC_HaltA();
  mfrc522.PCD_StopCrypto1();
  showIdleScreen();
}

// ---------------------------------------------------------
// DATA HANDLERS
// ---------------------------------------------------------

void loadUsers() {
  myFile = SD.open("card.txt");
  if (myFile) {
    int i = 0;
    while (myFile.available() && i < MAX_USERS) {
      String l = myFile.readStringUntil('\n');
      l.trim();
      if(l.length() == 0) continue; 
      int c1 = l.indexOf(','), c2 = l.indexOf(',', c1 + 1), c3 = l.indexOf(',', c2 + 1);
      cards[i] = {l.substring(0, c1), l.substring(c1 + 1, c2), l.substring(c2 + 1, c3), l.substring(c3 + 1).toInt()};
      i++;
    }
    totalUsers = i;
    myFile.close();
    Serial.print(F("Users loaded from SD: ")); Serial.println(totalUsers);
  }
}

void handleESPData() {
  if (Serial1.available() > 0) {
    String data = Serial1.readStringUntil('\n');
    data.trim();
    if (data.startsWith("P")) {
      int p = data.indexOf('P'), m = data.indexOf('M'), y = data.indexOf('Y');
      penPrice = data.substring(p + 1, m).toInt();
      markerPrice = data.substring(m + 1, y).toInt();
      yellowPaperPrice = data.substring(y + 1).toInt();
      if (currentState == ITEM_SELECT) showItems();
    }
  }
}

// ---------------------------------------------------------
// MAIN SETUP
// ---------------------------------------------------------

void setup() {
  Serial.begin(9600);
  Serial1.begin(9600);
  Serial.println(F("\n--- SYSTEM INITIALIZING ---"));

  lcd.begin(20, 4);
  lcd.backlight();
  
  servos[0].attach(SERVO_A0_PIN);
  servos[1].attach(SERVO_A1_PIN);
  servos[2].attach(SERVO_A2_PIN);
  stopServos();

  SPI.begin();
  mfrc522.PCD_Init();

  if (!SD.begin(SD_CS)) {
    Serial.println(F("ERR: SD Card Failed."));
    lcd.print("SD Error!"); 
    while(1);
  }
  loadUsers();
  
  delay(2000);
  Serial1.println("FETCH");
  
  showIdleScreen();
  Serial.println(F("--- SYSTEM READY ---"));
}

// ---------------------------------------------------------
// INPUT PROCESSING
// ---------------------------------------------------------

void handleRFID() {
  if (!mfrc522.PICC_IsNewCardPresent() || !mfrc522.PICC_ReadCardSerial()) return;

  currentUID = "";
  for (byte i = 0; i < mfrc522.uid.size; i++) {
    currentUID += String(mfrc522.uid.uidByte[i], HEX);
  }
  currentUID.toLowerCase();
  Serial.print(F("RFID Tapped: ")); Serial.println(currentUID);

  bool found = false;
  for (int i = 0; i < totalUsers; i++) {
    if (cards[i].uid == currentUID) { found = true; break; }
  }

  if (found) {
    currentState = AUTH_PASSWORD;
    keyBuffer = "";
    updateDisplay("Enter Password:", "");
  } else {
    updateDisplay("Invalid Card", "");
    delay(1500);
    showIdleScreen();
  }
}

void handlePasswordEntry(char key) {
  if (key == '#') {
    bool correct = false;
    for (int i = 0; i < totalUsers; i++) {
      if (cards[i].uid == currentUID && cards[i].password == keyBuffer) {
        currentFirstName = cards[i].firstName;
        currentPoints = cards[i].points;
        correct = true;
        break;
      }
    }

    if (correct) {
      lcd.clear();
      lcd.setCursor(0, 1); lcd.print("      Welcome");
      lcd.setCursor(0, 2); lcd.print("      " + currentFirstName + "!");
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
    updateDisplay("Enter Password:", "");
  } else {
    keyBuffer += key;
    lcd.setCursor(keyBuffer.length() - 1, 2);
    lcd.print('*');
  }
}

void loop() {
  handleESPData();
  
  if (currentState == DISPENSING && millis() - servoStartTime >= 2000) {
    stopServos();
    updateDisplay("      Done!", "");
    delay(1500);
    logout();
  }

  char key = keypad.getKey();
  if (key) {
    Serial.print(F("Key: ")); Serial.println(key);
    
    switch (currentState) {
      case AUTH_PASSWORD: handlePasswordEntry(key); break;
      case RETRY:
        if (key == 'A') { currentState = AUTH_PASSWORD; updateDisplay("Enter Password:", ""); }
        else if (key == 'B') logout();
        break;
      case MENU:
        if (key == '2') { Serial1.println("FETCH"); currentState = ITEM_SELECT; showItems(); }
        else if (key == '3') logout();
        break;
      case ITEM_SELECT:
        if (key >= '1' && key <= '3') {
          selectedItem = key - '0';
          currentState = CONFIRM;
          lcd.clear();
          lcd.print("Confirm Item "); lcd.print(selectedItem);
          lcd.setCursor(0, 2); lcd.print("A-Confirm  B-Back");
        } else if (key == '*') { currentState = MENU; showMainUI(); }
        break;
      case CONFIRM:
        if (key == 'A') {
          currentState = DISPENSING;
          updateDisplay("Dispensing...", "");
          servos[selectedItem - 1].write(0);
          servoStartTime = millis();
        } else if (key == 'B') { currentState = ITEM_SELECT; showItems(); }
        break;
    }
  }

  if (currentState == WAITING_CARD) handleRFID();
}