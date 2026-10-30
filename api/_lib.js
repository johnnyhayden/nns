// Shared helpers for the NNS API: sessions, Google token verification, DynamoDB access.
import { createRemoteJWKSet, jwtVerify, SignJWT } from 'jose';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

export const TABLE = process.env.NNS_TABLE || 'nns-charts';
export const PROFILE_ID = '#profile';

const SESSION_COOKIE = 'nns_session';
const SESSION_DAYS = 180;
const googleJwks = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));

export const db = DynamoDBDocumentClient.from(
    new DynamoDBClient({
        region: process.env.NNS_AWS_REGION || 'us-east-1',
        credentials: {
            accessKeyId: process.env.NNS_AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.NNS_AWS_SECRET_ACCESS_KEY
        }
    }),
    { marshallOptions: { removeUndefinedValues: true } }
);

function sessionKey() {
    if (!process.env.SESSION_SECRET) throw new Error('SESSION_SECRET not configured');
    return new TextEncoder().encode(process.env.SESSION_SECRET);
}

export async function verifyGoogleCredential(credential) {
    const { payload } = await jwtVerify(credential, googleJwks, {
        issuer: ['https://accounts.google.com', 'accounts.google.com'],
        audience: process.env.GOOGLE_CLIENT_ID
    });
    if (!payload.sub) throw new Error('Token missing subject');
    return {
        sub: payload.sub,
        email: payload.email || '',
        name: payload.name || payload.email || '',
        picture: payload.picture || ''
    };
}

export async function createSessionCookie(user) {
    const token = await new SignJWT({ email: user.email, name: user.name, picture: user.picture })
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject(user.sub)
        .setIssuedAt()
        .setExpirationTime(`${SESSION_DAYS}d`)
        .sign(sessionKey());
    return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}`;
}

export function clearSessionCookie() {
    return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

// Returns the signed-in user, or null if there is no valid session cookie.
export async function getSessionUser(req) {
    const cookies = Object.fromEntries(
        (req.headers.cookie || '').split(';').map(c => {
            const i = c.indexOf('=');
            return [c.slice(0, i).trim(), c.slice(i + 1).trim()];
        })
    );
    const token = cookies[SESSION_COOKIE];
    if (!token) return null;
    try {
        const { payload } = await jwtVerify(token, sessionKey(), { algorithms: ['HS256'] });
        return { sub: payload.sub, email: payload.email, name: payload.name, picture: payload.picture };
    } catch {
        return null;
    }
}

export async function readJsonBody(req) {
    if (req.body && typeof req.body === 'object') return req.body;
    if (typeof req.body === 'string') return JSON.parse(req.body);
    return {};
}
