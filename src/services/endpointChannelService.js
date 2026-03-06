const crypto = require('crypto');

const PUBLIC_CHANNEL_TTL_MS = Math.max(60_000, Number.parseInt(process.env.PUBLIC_CHANNEL_TTL_MS || '600000', 10) || 600000);
const PUBLIC_NONCE_LIMIT = Math.max(16, Number.parseInt(process.env.PUBLIC_CHANNEL_NONCE_WINDOW || '64', 10) || 64);
const PUBLIC_TS_DRIFT_MS = Math.max(10_000, Number.parseInt(process.env.PUBLIC_CHANNEL_MAX_DRIFT_MS || '120000', 10) || 120000);
const MAX_CACHE_ENTRIES = Math.max(1000, Number.parseInt(process.env.PUBLIC_CHANNEL_CACHE_MAX || '10000', 10) || 10000);

const channels = new Map();

const sha256Hex = (value = '') => crypto.createHash('sha256').update(String(value)).digest('hex');
const toBase64Url = (buf) => Buffer.from(buf).toString('base64url');

const normalizeIp = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (raw.startsWith('::ffff:')) return raw.slice(7);
  return raw;
};

const getClientIp = (req) => normalizeIp(
  req.headers['x-forwarded-for']?.split(',')[0]
  || req.headers['x-real-ip']
  || req.connection?.remoteAddress
  || req.socket?.remoteAddress
  || req.ip
  || 'unknown'
);

const normalizePath = (value = '') => String(value || '').split('?')[0];

const payloadDigest = (payload) => {
  if (payload === undefined) return sha256Hex('');
  try {
    return sha256Hex(JSON.stringify(payload));
  } catch {
    return sha256Hex('');
  }
};

const cleanupExpired = () => {
  const now = Date.now();
  for (const [id, channel] of channels.entries()) {
    const expiresAt = new Date(channel?.expiresAt || 0).getTime();
    if (!expiresAt || expiresAt <= now) {
      channels.delete(id);
    }
  }

  if (channels.size <= MAX_CACHE_ENTRIES) return;
  const entries = Array.from(channels.entries())
    .sort((a, b) => new Date(a[1]?.lastUsedAt || a[1]?.createdAt || 0).getTime() - new Date(b[1]?.lastUsedAt || b[1]?.createdAt || 0).getTime());
  while (channels.size > MAX_CACHE_ENTRIES && entries.length) {
    const [oldestId] = entries.shift();
    channels.delete(oldestId);
  }
};

const buildPublicChannel = (req) => {
  const now = Date.now();
  const channelId = `pch_${toBase64Url(crypto.randomBytes(12))}`;
  const serverNonce = toBase64Url(crypto.randomBytes(24));
  const clientToken = toBase64Url(crypto.randomBytes(24));
  const ip = getClientIp(req);
  const ua = req.headers['user-agent'] || '';
  const state = {
    channelId,
    version: 'pubchan1',
    serverNonce,
    clientToken,
    createdAt: new Date(now),
    expiresAt: new Date(now + PUBLIC_CHANNEL_TTL_MS),
    seq: 0,
    recentNonces: [],
    uaHash: sha256Hex(ua),
    ipHash: sha256Hex(ip),
    lastUsedAt: null
  };
  channels.set(channelId, state);
  cleanupExpired();
  return state;
};

const toPublicPayload = (channel) => ({
  version: String(channel?.version || 'pubchan1'),
  channelId: String(channel?.channelId || ''),
  serverNonce: String(channel?.serverNonce || ''),
  clientToken: String(channel?.clientToken || ''),
  issuedAt: channel?.createdAt || new Date(),
  expiresAt: channel?.expiresAt || new Date(),
  seq: Number(channel?.seq || 0) || 0
});

const buildChannelKey = ({ channelId = '', serverNonce = '', clientToken = '' }) => (
  sha256Hex(`${String(channelId)}|${String(serverNonce)}|${String(clientToken)}`)
);

const buildExpectedAlias = ({ key, method, path, seq, nonce, ts }) => (
  `epa1.${sha256Hex(`${key}|alias|${method}|${path}|${seq}|${nonce}|${ts}`).slice(0, 48)}`
);

const buildExpectedSignature = ({ key, method, path, seq, nonce, ts, bodyHash }) => (
  `eps1.${sha256Hex(`${key}|sig|${method}|${path}|${seq}|${nonce}|${ts}|${bodyHash}`).slice(0, 64)}`
);

const safeEquals = (a = '', b = '') => {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
};

const validatePublicRequest = (req, body) => {
  cleanupExpired();

  const channelId = String(req.headers['x-endpoint-channel'] || '').trim();
  const alias = String(req.headers['x-endpoint-alias'] || '').trim();
  const signature = String(req.headers['x-endpoint-signature'] || '').trim();
  const nonce = String(req.headers['x-endpoint-nonce'] || '').trim();
  const tsRaw = String(req.headers['x-endpoint-ts'] || '').trim();
  const seqRaw = String(req.headers['x-endpoint-seq'] || '').trim();
  const ts = Number.parseInt(tsRaw, 10);
  const seq = Number.parseInt(seqRaw, 10);

  if (!channelId || !alias || !signature || !nonce || !Number.isFinite(ts) || !Number.isFinite(seq)) {
    return { ok: false, reason: 'missing_headers' };
  }

  const channel = channels.get(channelId);
  if (!channel) {
    return { ok: false, reason: 'unknown_channel' };
  }

  if (new Date(channel.expiresAt || 0).getTime() <= Date.now()) {
    channels.delete(channelId);
    return { ok: false, reason: 'channel_expired' };
  }

  const now = Date.now();
  if (Math.abs(now - ts) > PUBLIC_TS_DRIFT_MS) {
    return { ok: false, reason: 'clock_drift' };
  }

  if (seq <= Number(channel.seq || 0)) {
    return { ok: false, reason: 'replay_seq' };
  }

  if ((channel.recentNonces || []).includes(nonce)) {
    return { ok: false, reason: 'replay_nonce' };
  }

  const uaHash = sha256Hex(req.headers['user-agent'] || '');
  const ipHash = sha256Hex(getClientIp(req));
  if (channel.uaHash && channel.uaHash !== uaHash) {
    return { ok: false, reason: 'ua_mismatch' };
  }
  if (channel.ipHash && channel.ipHash !== ipHash) {
    return { ok: false, reason: 'ip_mismatch' };
  }

  const method = String(req.method || 'GET').toUpperCase();
  const path = normalizePath(req.originalUrl);
  const key = buildChannelKey({
    channelId: channel.channelId,
    serverNonce: channel.serverNonce,
    clientToken: channel.clientToken
  });
  const bodyHash = payloadDigest(body);
  const expectedAlias = buildExpectedAlias({ key, method, path, seq, nonce, ts });
  const expectedSignature = buildExpectedSignature({ key, method, path, seq, nonce, ts, bodyHash });

  if (!safeEquals(alias, expectedAlias) || !safeEquals(signature, expectedSignature)) {
    return { ok: false, reason: 'invalid_signature' };
  }

  channel.seq = seq;
  channel.lastUsedAt = new Date();
  channel.recentNonces = [nonce, ...(channel.recentNonces || [])].slice(0, PUBLIC_NONCE_LIMIT);
  channels.set(channelId, channel);

  return { ok: true, channel };
};

module.exports = {
  issuePublicChannel: (req) => toPublicPayload(buildPublicChannel(req)),
  validatePublicRequest,
  getClientIp
};
