/**
 * ============================================================================
 *   ZENO LORA OFF-GRID MESH PLUGIN (V1.0.0)
 *   Treiberfreie Web-Serial Funkkommunikation für 868 / 433 MHz LoRa-Dongles
 * ============================================================================
 */

export default {
  onload(api) {
    console.log("[LoRa Mesh Plugin] Initialisiere serielles Funkmodul...");

    // Status-Tracking
    const state = {
      status: "disconnected", // "disconnected" | "connected" | "listening" | "error"
      port: null,
      reader: null,
      writer: null,
      keepReading: false,
      baudRate: 115200,
      frequencyMhz: 868.100,
      bandwidth: 125, // kHz
      spreadingFactor: 7,
      rssi: -85, // dBm
      snr: 8.5,  // dB
      packetsReceived: 0,
      packetsSent: 0,
      portInfo: "Kein Gerät",
      messageHandlers: new Set()
    };

    /**
     * Prüft ob der Browser / WebView2 Web Serial unterstützt
     */
    function isWebSerialSupported() {
      return typeof navigator !== "undefined" && "serial" in navigator;
    }

    /**
     * Verbindet sich treiberfrei über die Web Serial API mit dem USB-LoRa-Modul
     */
    async function connectSerialDevice() {
      if (!isWebSerialSupported()) {
        api.showNotice("⚠️ Web Serial API wird von dieser Umgebung nicht unterstützt.");
        return false;
      }

      try {
        state.status = "connecting";
        updateStatusUI();

        // Öffnet den nativen OS-Gerätedialog für serielle USB-Ports (CH340, CP2102, FTDI etc.)
        const port = await navigator.serial.requestPort();
        state.port = port;

        await port.open({
          baudRate: state.baudRate,
          dataBits: 8,
          stopBits: 1,
          parity: "none",
          flowControl: "none"
        });

        const portInfo = port.getInfo ? port.getInfo() : {};
        state.portInfo = `USB VID:${portInfo.usbVendorId?.toString(16) || "Auto"}`;
        state.status = "connected";
        state.keepReading = true;

        api.showNotice(`📻 LoRa-Funkmodul verbunden (${state.portInfo} @ ${state.baudRate} Baud)!`);
        updateStatusUI();

        // Starte Lese-Schleife im Hintergrund
        startReadingLoop(port);

        // Initialisierungsbefehle senden (AT-Konfiguration falls AT-Modul)
        await sendRawSerialCommand(`AT+BAND=${Math.round(state.frequencyMhz * 1000000)}\r\n`);
        return true;

      } catch (err) {
        state.status = "disconnected";
        console.error("[LoRa Mesh] Fehler bei Port-Verbindung:", err);
        if (err.name !== "NotFoundError") {
          api.showNotice(`⚠️ LoRa Verbindungsfehler: ${err.message || String(err)}`);
        }
        updateStatusUI();
        return false;
      }
    }

    /**
     * Liest kontinuierlich eingehende Daten vom seriellen Port
     */
    async function startReadingLoop(port) {
      const textDecoder = new TextDecoderStream();
      const readableStreamClosed = port.readable.pipeTo(textDecoder.writable);
      const reader = textDecoder.readable.getReader();
      state.reader = reader;

      let buffer = "";

      try {
        while (state.keepReading) {
          const { value, done } = await reader.read();
          if (done) break;
          if (value) {
            buffer += value;
            const lines = buffer.split("\n");
            buffer = lines.pop() || ""; // Rest im Puffer behalten

            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed) {
                handleIncomingRadioLine(trimmed);
              }
            }
          }
        }
      } catch (err) {
        console.warn("[LoRa Mesh] Lesefehler oder Verbindung getrennt:", err);
      } finally {
        reader.releaseLock();
      }
    }

    /**
     * Verarbeitet eine vom Funkmodul empfangene Textzeile
     */
    function handleIncomingRadioLine(line) {
      console.log("[LoRa RAW RX]:", line);

      // 1. AT+RCV Parsing (Standard RYLR896/RYLR998 Modul: +RCV=addr,len,data,RSSI,SNR)
      if (line.startsWith("+RCV=")) {
        const parts = line.substring(5).split(",");
        if (parts.length >= 3) {
          const dataPayload = parts[2];
          state.rssi = parseInt(parts[3], 10) || state.rssi;
          state.snr = parseFloat(parts[4]) || state.snr;
          state.packetsReceived++;
          updateStatusUI();

          dispatchRadioMessage(dataPayload);
          return;
        }
      }

      // 2. Meshtastic / Plain Text Broadcast Parsing
      if (line.startsWith("ZENO:") || line.startsWith("{")) {
        state.packetsReceived++;
        updateStatusUI();
        dispatchRadioMessage(line);
      }
    }

    /**
     * Verteilt die empfangene Nachricht an den Zeno-Client
     */
    function dispatchRadioMessage(rawText) {
      try {
        let cleanText = rawText;
        if (cleanText.startsWith("ZENO:")) cleanText = cleanText.substring(5);
        const parsed = JSON.parse(cleanText);

        for (const handler of state.messageHandlers) {
          handler(parsed.channelId || "lora-mesh", parsed.payload || parsed);
        }
        api.showNotice(`📡 Funk-Nachricht empfangen! (RSSI: ${state.rssi} dBm)`);
      } catch (e) {
        // Plain text Nachricht
        for (const handler of state.messageHandlers) {
          handler("lora-mesh", rawText);
        }
        api.showNotice(`📡 LoRa Text: ${rawText}`);
      }
    }

    /**
     * Schreibt Rohdaten auf den seriellen COM-Port
     */
    async function sendRawSerialCommand(dataStr) {
      if (!state.port || !state.port.writable) return false;
      const textEncoder = new TextEncoder();
      const writer = state.port.writable.getWriter();
      try {
        await writer.write(textEncoder.encode(dataStr));
        return true;
      } catch (e) {
        console.error("[LoRa Mesh] Schreibfehler:", e);
        return false;
      } finally {
        writer.releaseLock();
      }
    }

    /**
     * Trennt die serielle Schnittstelle
     */
    async function disconnectSerial() {
      state.keepReading = false;
      if (state.reader) {
        try { await state.reader.cancel(); } catch {}
        state.reader = null;
      }
      if (state.port) {
        try { await state.port.close(); } catch {}
        state.port = null;
      }
      state.status = "disconnected";
      api.showNotice("📻 LoRa Funkmodul getrennt.");
      updateStatusUI();
    }

    /**
     * Registriere TransportProvider im Zeno-Host
     */
    api.registerTransportProvider("lora-mesh", {
      id: "lora-mesh",
      name: "LoRa Off-Grid Funk-Mesh",
      async connect() {
        return await connectSerialDevice();
      },
      async disconnect() {
        await disconnectSerial();
      },
      async sendMessage(channelId, payload) {
        state.packetsSent++;
        const packetStr = typeof payload === "string" ? payload : JSON.stringify(payload);
        const atCommand = `AT+SEND=0,${packetStr.length},ZENO:${packetStr}\r\n`;
        const ok = await sendRawSerialCommand(atCommand);
        updateStatusUI();
        return ok;
      },
      onMessage(handler) {
        state.messageHandlers.add(handler);
        return () => state.messageHandlers.delete(handler);
      },
      status() {
        return state.status;
      }
    });

    /**
     * Chat Slash-Commands
     */
    api.registerCommand({
      name: "/lora",
      description: "Steuere das LoRa-Funkmodul (/lora connect, /lora ping, /lora freq, /lora status)",
      icon: "mage:radio",
      execute: async (args) => {
        const parts = (args || "").trim().split(" ");
        const sub = parts[0]?.toLowerCase();

        if (sub === "connect" || sub === "scan") {
          await connectSerialDevice();
        } else if (sub === "disconnect" || sub === "stop") {
          await disconnectSerial();
        } else if (sub === "freq") {
          const newFreq = parseFloat(parts[1]);
          if (newFreq > 100 && newFreq < 1000) {
            state.frequencyMhz = newFreq;
            await sendRawSerialCommand(`AT+BAND=${Math.round(newFreq * 1000000)}\r\n`);
            api.showNotice(`📻 LoRa Frequenz gesetzt auf ${newFreq.toFixed(3)} MHz`);
            updateStatusUI();
          } else {
            api.showNotice("Verwendung: /lora freq 868.100 (in MHz)");
          }
        } else if (sub === "ping") {
          const pingStr = `AT+SEND=0,16,ZENO:PING_${Date.now()}\r\n`;
          await sendRawSerialCommand(pingStr);
          state.packetsSent++;
          api.showNotice(`📻 LoRa Discovery-Ping über Äther gesendet (${state.frequencyMhz} MHz)!`);
          updateStatusUI();
        } else {
          api.showNotice(`📡 LoRa Funk-Status: ${state.status.toUpperCase()} | Freq: ${state.frequencyMhz} MHz | RSSI: ${state.rssi} dBm | RX: ${state.packetsReceived} | TX: ${state.packetsSent}`);
        }
      }
    });

    /**
     * UI Status Bar Widget
     */
    let statusBarElem = null;
    function updateStatusUI() {
      if (!statusBarElem) return;
      const isConnected = state.status === "connected";
      statusBarElem.innerHTML = `
        <div class="zeno-lora-chip ${isConnected ? 'active' : 'idle'}" title="LoRa Mesh: ${state.status} (${state.frequencyMhz} MHz, RSSI: ${state.rssi} dBm)">
          <span class="lora-signal-bar"></span>
          <span class="lora-freq-tag">${state.frequencyMhz} MHz</span>
          ${isConnected ? `<span class="lora-rssi-badge">${state.rssi} dBm</span>` : ''}
        </div>
      `;
    }

    api.registerUIComponent("status_bar", {
      id: "lora-status-widget",
      title: "LoRa Funk Status",
      render(container) {
        statusBarElem = container;
        updateStatusUI();
        return () => {
          statusBarElem = null;
        };
      }
    });
  },

  onunload() {
    console.log("[LoRa Mesh Plugin] Entladen.");
  }
};
