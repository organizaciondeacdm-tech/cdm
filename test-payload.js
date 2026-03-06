const crypto = require('crypto');
const http = require('http');
const { URL } = require('url');

const ITERATIONS = 150000;
const KEY_LENGTH = 32;
const ENVELOPE_MARKER = 'acdm-payload-v1';

const sha256Hex = (value = '') => crypto.createHash('sha256').update(String(value)).digest('hex');
const normalizePath = (value = '') => String(value || '').split('?')[0];
const payloadDigest = (payload) => {
    if (payload === undefined) return sha256Hex('');
    try {
        return sha256Hex(JSON.stringify(payload));
    } catch {
        return sha256Hex('');
    }
};

const requestJson = (url, method, payload, headers = {}) => new Promise((resolve, reject) => {
    const body = payload === undefined ? undefined : JSON.stringify(payload);
    const parsed = new URL(url);
    const req = http.request(
        parsed,
        {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...(body ? { 'Content-Length': Buffer.byteLength(body) } : {}),
                ...headers
            }
        },
        (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    resolve({
                        status: res.statusCode || 0,
                        json: data ? JSON.parse(data) : null,
                        text: data
                    });
                } catch {
                    resolve({
                        status: res.statusCode || 0,
                        json: null,
                        text: data
                    });
                }
            });
        }
    );
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
});

const signPublicHeaders = ({ channel, method, path, body }) => {
    const ts = Date.now();
    const seq = Number(channel.seq || 0) + 1;
    const nonce = crypto.randomBytes(16).toString('base64url');
    const key = sha256Hex(`${channel.channelId}|${channel.serverNonce}|${channel.clientToken}`);
    const bodyHash = payloadDigest(body);
    const normalizedPath = normalizePath(path);
    const alias = `epa1.${sha256Hex(`${key}|alias|${method}|${normalizedPath}|${seq}|${nonce}|${ts}`).slice(0, 48)}`;
    const signature = `eps1.${sha256Hex(`${key}|sig|${method}|${normalizedPath}|${seq}|${nonce}|${ts}|${bodyHash}`).slice(0, 64)}`;
    return {
        nextSeq: seq,
        headers: {
            'x-endpoint-channel': channel.channelId,
            'x-endpoint-nonce': nonce,
            'x-endpoint-ts': String(ts),
            'x-endpoint-seq': String(seq),
            'x-endpoint-alias': alias,
            'x-endpoint-signature': signature
        }
    };
};

async function testLogin() {
    const secret = 'acdm-dev-fallback-secret-123';

    const iv = crypto.randomBytes(12);
    const salt = crypto.randomBytes(16);

    const key = crypto.pbkdf2Sync(secret, salt, ITERATIONS, KEY_LENGTH, 'sha256');

    const payload = {
        username: 'papiweb',
        password: 'password_test'
    };

    const plainBytes = Buffer.from(JSON.stringify(payload), 'utf8');

    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const ciphertext = Buffer.concat([cipher.update(plainBytes), cipher.final()]);
    const authTag = cipher.getAuthTag();

    // En WebCrypto (que usa el frontend), el ciphertext y el authTag se concatenan.
    const combined = Buffer.concat([ciphertext, authTag]);

    const envelope = {
        __enc: ENVELOPE_MARKER,
        iv: iv.toString('base64'),
        salt: salt.toString('base64'),
        data: combined.toString('base64')
    };

    const baseUrl = 'http://localhost:5000';
    const loginPath = '/api/auth/login';

    let first = await requestJson(`${baseUrl}${loginPath}`, 'POST', envelope);
    if (first.status === 428 && first?.json?.code === 'SECURE_ENDPOINT_REQUIRED' && first?.json?.publicChannel) {
        const channel = first.json.publicChannel;
        const signed = signPublicHeaders({
            channel,
            method: 'POST',
            path: loginPath,
            body: envelope
        });
        channel.seq = signed.nextSeq;
        first = await requestJson(`${baseUrl}${loginPath}`, 'POST', envelope, signed.headers);
    }

    console.log(`STATUS: ${first.status}`);
    console.log(`BODY: ${first.text}`);
}

testLogin();
