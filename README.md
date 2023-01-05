# MakeCode Package for the Joy-IT SBC-RFID-RC522 RFID module (MFRC522).

This library provides a Microsoft Makecode package for the Joy-IT SBC-RFID-RC522 RFID module.
See https://joy-it.net/products/SBC-RFID-RC522 for more details.

## Connection

The RFID module needs to be connected with six pins to the Micro:bit:

| RFID module   | Micro:bit     |
| ------------- |:-------------:|
| VCC           | 3V            |
| GND           | GND           |
| MISO          | P15           |
| MOSI          | P14           |
| SCK           | P13           |
| NSS           | P16           |

## Initialize RFID module

The RFID module needs to be initialized before it is ready to use. All necessary commands will be transfered via SPI here.

```typescript
// Initialize RIFD module
MFRC522.Init()
```

## Read ID from card
This function reads the cards unique ID and returns it.

```typescript
// Read unique ID
MFRC522.getID()
```

## Read data from card
Data stored on the card can be retrieved with this function.

```typescript
// Read data
MFRC522.read()
```

## Write data to card
Write data, formatted as string, to the card.

```typescript
// Write data
MFRC522.write("1234")
```

## Turn off antenna
After use, the antenn can be turned off.

```typescript
// Turn antenna off
MFRC522.AntennaOff()
```

## Supported targets

* for PXT/microbit

## License

MIT