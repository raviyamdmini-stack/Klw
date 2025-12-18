import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion
} from 'baileys';

import Pino from 'pino';
import { ensureDirs } from './utils.js';
import { SESSION_FOLDER } from './config.js';

ensureDirs();

const logger = Pino({ level: 'info' });

async function runPair() {
  const phone = process.env.PAIR_NUMBER;
  if (!phone) {
    logger.error('Set PAIR_NUMBER=947XXXXXXXX to get a pairing code.');
    return; // safer than process.exit
  }

  try {
    const { version } = await fetchLatestBaileysVersion();
    const { state, saveCreds } = await useMultiFileAuthState(SESSION_FOLDER);

    const sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      logger
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', update => {
      const { connection, lastDisconnect } = update;
      logger.info({ connection, lastDisconnect }, 'connection update');
    });

    const code = await sock.requestPairingCode(phone);
    logger.info(`Pairing Code for ${phone}: ${code}`);
    logger.info('Open WhatsApp > Linked devices > Link with phone number, then enter this code.');
  } catch (e) {
    logger.error('Failed to generate pairing code:', e);
  }
}

runPair().catch(err => {
  logger.error('Fatal error in runPair:', err);
});