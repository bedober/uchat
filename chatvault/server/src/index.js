import 'dotenv/config';
import express from 'express';
import http from 'node:http';
import cors from 'cors';
import helmet from 'helmet';
import { Server } from 'socket.io';
import { z } from 'zod';

const app = express();
app.use(helmet());
app.use(cors({ origin: (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean) }));
app.use(express.json({ limit: '256kb' }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean) },
  maxHttpBufferSize: 300_000,
});

const envelopeSchema = z.object({
  messageId: z.string().uuid(),
  conversationId: z.string().min(1).max(128),
  recipientDeviceIds: z.array(z.string().min(1).max(128)).min(1).max(100),
  ciphertext: z.string().min(16).max(256_000),
  createdAt: z.number().int().positive(),
}).strict();

function requireBearer(req, res, next) {
  // TODO: validate Firebase ID token with Firebase Admin before production.
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token || !process.env.AUTH_TOKEN_FOR_LOCAL_TESTS ||
      token !== process.env.AUTH_TOKEN_FOR_LOCAL_TESTS) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  req.userId = req.headers['x-chatvault-user'];
  if (typeof req.userId !== 'string' || req.userId.length < 1 || req.userId.length > 128) {
    return res.status(401).json({ error: 'invalid_user' });
  }
  next();
}

app.get('/health', (_req, res) => res.json({ ok: true, service: 'chatvault-relay', mode: 'ciphertext-relay-only' }));

// This endpoint relays an opaque encrypted envelope in memory. It does not write
// message bodies to a database or log ciphertext. Offline delivery must be handled
// by encrypted client-to-client sync or a separately reviewed ciphertext store.
app.post('/v1/relay', requireBearer, (req, res) => {
  const parsed = envelopeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'invalid_envelope' });
  const envelope = { ...parsed.data, senderId: req.userId };
  for (const deviceId of envelope.recipientDeviceIds) {
    io.to(`device:${deviceId}`).emit('message:envelope', envelope);
  }
  return res.status(202).json({ accepted: true, messageId: envelope.messageId });
});

io.use((socket, next) => {
  // TODO: verify Firebase ID token and bind authenticated device ID.
  const token = socket.handshake.auth?.token;
  const deviceId = socket.handshake.auth?.deviceId;
  if (!token || !process.env.AUTH_TOKEN_FOR_LOCAL_TESTS ||
      token !== process.env.AUTH_TOKEN_FOR_LOCAL_TESTS ||
      typeof deviceId !== 'string' || deviceId.length > 128) {
    return next(new Error('unauthorized'));
  }
  socket.data.deviceId = deviceId;
  next();
});

io.on('connection', (socket) => {
  socket.join(`device:${socket.data.deviceId}`);
  socket.on('disconnect', () => {});
});

const port = Number(process.env.PORT || 8080);
server.listen(port, () => {
  // Deliberately do not log request bodies, tokens, or message payloads.
  console.log(`ChatVault relay listening on ${port}`);
});
