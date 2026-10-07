# 📡 Zeno LoRa Off-Grid Funk-Mesh Plugin

Funktionales Off-Grid Funk-Plugin für Zeno. Nutzt die native **Web Serial API** zur direkten, treiberfreien Kommunikation mit günstigen USB-LoRa-Modulen (868 MHz EU / 915 MHz US / 433 MHz).

---

## 📻 Unterstützte Hardware

Das Plugin funktioniert treiberfrei mit jedem USB-LoRa-Modul mit seriellem UART/USB-Interface:
- **Reyax RYLR896 / RYLR998** (Standard AT-Befehlssatz)
- **Heltec WiFi LoRa 32 / Wireless Stick**
- **LilyGO TTGO T-Beam / T-Echo**
- **EBYTE E220 / E32 USB-Dongles**
- **Standard CH340, CP2102 oder FTDI UART-Bridges**

---

## 🚀 Schnelleinstieg

1. Stecke deinen USB-LoRa-Dongle an den PC.
2. Gib im Zeno-Chat `/lora connect` ein.
3. Wähle im nativen Windows-Gerätedialog den erkannten seriellen COM-Port aus.
4. Fertig! Zeno sendet und empfängt nun Textnachrichten direkt über die Funkwellen – **völlig ohne Internet, ohne WLAN und ohne Mobilfunk**.

---

## 💻 Chat-Befehle

- `/lora connect`: Öffnet den Gerätedialog zur USB-Port-Auswahl.
- `/lora disconnect`: Trennt die serielle Schnittstelle.
- `/lora ping`: Sendet ein Broadcast-Ping-Paket über die Antenne.
- `/lora freq 868.100`: Setzt die Frequenz (in MHz).
- `/lora status`: Gibt Signalstärke (RSSI in dBm) und RX/TX-Paketzähler aus.
