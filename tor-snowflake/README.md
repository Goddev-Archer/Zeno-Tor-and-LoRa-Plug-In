# 🧅 Zeno Tor & Snowflake Anti-Censorship Plugin

Funktionales Transport-Plugin für den dezentralen Zeno-Messenger zur **Umgehung von Internet-Zensur und Deep-Packet-Inspection (DPI)** in repressiven Staaten (Art. 10 GG / Art. 19 AEMR).

---

## ⚡ Wie Snowflake funktioniert

Snowflake ist eine zensurresistente Tor-Technologie:
1. Der Client kontaktiert einen Snowflake-Broker (über unauffällige Front-Domains wie CDNs).
2. Der Broker vermittelt eine temporäre Peer-to-Peer **WebRTC-Verbindung** zu einem freiwilligen Snowflake-Proxy irgendwo auf der Welt.
3. Für Zensoren (Firewalls, staatliche DPI) sieht der Datenverkehr wie ein ganz normales, harmloses Video-Telefonat (WebRTC) aus.
4. Der Proxy leitet die verschlüsselten Zeno-Pakete in das Tor-Netzwerk weiter.

---

## 💻 Befehle im Zeno-Chat

- `/tor status`: Zeigt aktuellen Status, Circuit-ID und übertragene Bytes an.
- `/tor connect`: Startet die WebRTC-Snowflake-Verhandlung.
- `/tor disconnect`: Trennt die aktive Verbindung.
- `/tor newnym`: Rotiert die WebRTC-Bridge und fordert ein frisches Circuit an.
