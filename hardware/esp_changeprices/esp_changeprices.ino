#include <ESP8266WiFi.h>
#include <FirebaseESP8266.h>

// 1. PROJECT CREDENTIALS
#define FIREBASE_HOST "stationery-dispenser-default-rtdb.asia-southeast1.firebasedatabase.app"
#define FIREBASE_AUTH "o5ZYshA35o1qYirOMYAqWFzZoJG61X8JV6D2xGV5"
#define WIFI_SSID "GlobeAtHome_91965"
#define WIFI_PASSWORD "D9G3R3FRE83"

// 2. INITIALIZE OBJECTS
FirebaseData firebaseData; 
FirebaseConfig config;
FirebaseAuth auth;

// Function to fetch data from Firebase and send to Mega
void fetchAndSendPrices() {
  Serial.println("\n--- Fetching from Firebase ---");
  
  if (Firebase.get(firebaseData, "/inventory")) {
    FirebaseJson &json = firebaseData.jsonObject();
    FirebaseJsonData result;

    int p, m, y;
    // Extract values from the JSON folder
    json.get(result, "pen"); p = result.intValue;
    json.get(result, "marker"); m = result.intValue;
    json.get(result, "yellowpaper"); y = result.intValue;

    // Readable output for Serial Monitor (Proponents Debugging)
    Serial.println("Success! Current Prices:");
    Serial.print("  pen: "); Serial.println(p);
    Serial.print("  marker: "); Serial.println(m);
    Serial.print("  yellowpaper: "); Serial.println(y);

    // The "Secret Code" for the Mega (Strict Format: P10M10Y10)
    // We use lowercase 'p' in the label above so the Mega doesn't 
    // confuse it with this actual data line.
    Serial.print("P"); Serial.print(p);
    Serial.print("M"); Serial.print(m);
    Serial.print("Y"); Serial.println(y);
    
    Serial.println("--- Sync Complete ---");
  } else {
    Serial.print("Fetch Failed: ");
    Serial.println(firebaseData.errorReason());
  }
}

void setup() {
  // Use 9600 to match the Arduino Mega Serial1 speed
  Serial.begin(9600); 
  delay(1000);
  Serial.println("\nESP8266 BOOTING...");

  // Connect to Wi-Fi
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWi-Fi Connected!");
  
  // Setup Firebase
  config.host = FIREBASE_HOST;
  config.signer.tokens.legacy_token = FIREBASE_AUTH;
  Firebase.begin(&config, &auth);
  
  // Initial fetch on startup so the Mega isn't empty
  fetchAndSendPrices();
  
  Serial.println("System Ready. Type 'R' to refresh manually.");
}

void loop() {
  // Check for 'R' from Serial Monitor or 'FETCH' from Mega
  if (Serial.available() > 0) {
    String input = Serial.readStringUntil('\n');
    input.trim();

    if (input == "R" || input == "r" || input == "FETCH") {
      fetchAndSendPrices();
    }
  }
}