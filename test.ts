// Initialize RFID module
MFRC522.Init();

// Get ID of RFID card
serial.writeLine(MFRC522.getID().toString());

// Read data from RFID card
serial.writeLine(MFRC522.read());

// Write data to card
MFRC522.write("1234")

// Turn off antenna
MFRC522.AntennaOff()