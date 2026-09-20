import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason
} from "@whiskeysockets/baileys";

import P from "pino";

const GROUP_ID = "YOUR_GROUP_ID_HERE";

const linkRegex =
  /(https?:\/\/|www\.|t\.me\/|wa\.me\/|chat\.whatsapp\.com\/|bit\.ly\/|tinyurl\.com\/)/i;

async function startBot() {
  const { state, saveCreds } =
    await useMultiFileAuthState("auth_info_baileys");

  const sock = makeWASocket({
    auth: state,
    logger: P({ level: "silent" }),
    printQRInTerminal: true
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", ({ connection, lastDisconnect }) => {
    if (connection === "open") {
      console.log("✅ Bot connected!");
    }

    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !==
        DisconnectReason.loggedOut;

      if (shouldReconnect) {
        startBot();
      }
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    for (const msg of messages) {
      if (!msg.message) continue;
      if (msg.key.fromMe) continue;

      const jid = msg.key.remoteJid;

      // یوازې ټاکلی ګروپ
      if (jid !== GROUP_ID) continue;

      const text =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        "";

      // که لینک وي
      if (linkRegex.test(text)) {
        const sender = msg.key.participant;

        if (!sender) continue;

        try {
          await sock.groupParticipantsUpdate(
            GROUP_ID,
            [sender],
            "remove"
          );

          console.log("🚫 Removed:", sender);

          await sock.sendMessage(GROUP_ID, {
            text: "🚫 لینک شریکول منع دي."
          });

        } catch (error) {
          console.log("❌ Remove error:", error);
        }
      }
    }
  });
}

startBot();
