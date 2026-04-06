#include <ESP8266WiFi.h>
#include <FirebaseESP8266.h>
#include <NTPClient.h> // --- NEW: NTP Library ---
#include <WiFiUdp.h>    // --- NEW: UDP for NTP ---

#define FIREBASE_HOST "stationery-dispenser-default-rtdb.asia-southeast1.firebasedatabase.app"
#define FIREBASE_AUTH "o5ZYshA35o1qYirOMYAqWFzZoJG61X8JV6D2xGV5"
#define WIFI_SSID "GlobeAtHome_91965"
#define WIFI_PASSWORD "D9G3R3FRE83"

// --- NEW: NTP Configuration ---
WiFiUDP ntpUDP;
// Offset for Philippines (GMT+8): 8 * 3600 = 28800 seconds
NTPClient timeClient(ntpUDP, "asia.pool.ntp.org", 28800);

FirebaseData firebaseData; 
FirebaseConfig config;
FirebaseAuth auth;

// --- NEW: Sync Accounts Branch ---
void syncAccountsToMega() {
  if (Firebase.get(firebaseData, "/accounts")) {
    // Only tell Mega to wipe if we actually got data
    Serial.println("SYNC_START"); 
    delay(1200); 
    
    FirebaseJson &json = firebaseData.jsonObject();
    size_t len = json.iteratorBegin();
    String key, value;
    int type;

    for (size_t i = 0; i < len; i++) {
      json.iteratorGet(i, type, key, value);
      if (type == FirebaseJson::JSON_OBJECT) {
        FirebaseJsonData result;
        json.get(result, key + "/password"); String pass = result.stringValue;
        json.get(result, key + "/name");     String name = result.stringValue;
        json.get(result, key + "/points");   int pts = result.intValue;

        // Send Clean CSV Format: ACC:UID,Pass,Name,Points
        Serial.print("ACC:");
        Serial.print(key);   Serial.print(",");
        Serial.print(pass);  Serial.print(",");
        Serial.print(name);  Serial.print(",");
        Serial.println(pts);
        
        delay(400); // Give Mega time to write to SD
      }
    }
    json.iteratorEnd();
    delay(500);
    Serial.println("SYNC_DONE");
  }
}

void fetchAndSendPrices() {
  if (Firebase.get(firebaseData, "/inventory")) {
    FirebaseJsonData result;
    FirebaseJson &json = firebaseData.jsonObject();
    int p, m, y;
    json.get(result, "pen"); p = result.intValue;
    json.get(result, "marker"); m = result.intValue;
    json.get(result, "yellowpaper"); y = result.intValue;

    // Send Price Format: P10M15Y5
    Serial.print("P"); Serial.print(p);
    Serial.print("M"); Serial.print(m);
    Serial.print("Y"); Serial.println(y);
  }
}

void setup() {
  Serial.begin(9600); 
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  // --- NEW: WiFi Timeout Logic ---
  int attempt = 0;
  while (WiFi.status() != WL_CONNECTED && attempt < 20) { 
    delay(500); 
    attempt++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("WIFI_CONNECTED"); // Tell Mega WiFi is ready

    // --- NEW: Start Time Client ---
    timeClient.begin();

    // Force an update to ensure we have time before telling the Mega
    if(timeClient.update()) {
       Serial.println("TIME_OK"); // This tells the Mega the time is accurate
    }
    
    config.host = FIREBASE_HOST;
    config.signer.tokens.legacy_token = FIREBASE_AUTH;
    Firebase.begin(&config, &auth);
    
    // Optional: Auto-sync on boot if connected
    syncAccountsToMega();
    fetchAndSendPrices();
  } else {
    Serial.println("WIFI_ERROR"); // Tell Mega to use SD card mode
  }
}

void loop() {
// --- NEW: Keep time updated in background ---
  if (WiFi.status() == WL_CONNECTED) {
    timeClient.update();
  }


  if (Serial.available() > 0) {
    String input = Serial.readStringUntil('\n');
    input.trim();

// --- NEW: Respond to Handshake Pings ---
    if (input == "CHECK") {
      if (WiFi.status() == WL_CONNECTED) {
        Serial.println("WIFI_CONNECTED");
      } else {
        Serial.println("WIFI_ERROR");
      }
    }


    if (input == "R" || input == "r" || input == "FETCH") {
      syncAccountsToMega();
      fetchAndSendPrices();
    }

    // 2. NEW LOGIC: Listen for Login Events from Mega
    // Expecting format from Mega: LOG:Name,UID
    else if (input.startsWith("LOG:")) {
      String data = input.substring(4); // Remove "LOG:"
      int commaIndex = data.indexOf(',');
      
      if (commaIndex != -1) {
        String userName = data.substring(0, commaIndex);
        String userUID = data.substring(commaIndex + 1);
        
        logLoginToFirebase(userName, userUID);
      }
    }
  }
}


// Helper function to push the login event to Firebase
void logLoginToFirebase(String name, String uid) {
  timeClient.update(); 

  time_t epochTime = timeClient.getEpochTime();
  struct tm *ptm = gmtime((time_t *)&epochTime);

  // Correctly formatted variables
  String currentDate = String(ptm->tm_mday) + "/" + String(ptm->tm_mon + 1) + "/" + String(ptm->tm_year + 1900);
  String currentTime = timeClient.getFormattedTime().substring(0, 5);

  FirebaseJson json;
  
  json.set("name", name);
  json.set("uid", uid);
  
  // UPDATED: Pass the variables instead of static text
  json.set("date", currentDate); 
  json.set("time", currentTime); 

  if (Firebase.pushJSON(firebaseData, "/loginHistory", json)) {
    Serial.println("LOG_SUCCESS"); 
  } else {
    Serial.println("LOG_FAILED");
  }
}