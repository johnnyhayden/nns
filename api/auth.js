// GET  /api/auth  -> { googleClientId, user }   (user is null when signed out)
// POST /api/auth  { credential }  -> signs in with a Google ID token, sets session cookie
// DELETE /api/auth -> signs out
import {
    verifyGoogleCredential, createSessionCookie, clearSessionCookie,
    getSessionUser, readJsonBody
} from './_lib.js';

export default async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    try {
        if (req.method === 'GET') {
            const user = await getSessionUser(req);
            return res.status(200).json({ googleClientId: process.env.GOOGLE_CLIENT_ID || null, user });
        }

        if (req.method === 'POST') {
            const { credential } = await readJsonBody(req);
            if (!credential) return res.status(400).json({ error: 'Missing credential' });
            let user;
            try {
                user = await verifyGoogleCredential(credential);
            } catch (e) {
                return res.status(401).json({ error: 'Invalid Google credential' });
            }
            res.setHeader('Set-Cookie', await createSessionCookie(user));
            return res.status(200).json({ user });
        }

        if (req.method === 'DELETE') {
            res.setHeader('Set-Cookie', clearSessionCookie());
            return res.status(200).json({ ok: true });
        }

        res.setHeader('Allow', 'GET, POST, DELETE');
        return res.status(405).json({ error: 'Method not allowed' });
    } catch (e) {
        console.error('auth error', e);
        return res.status(500).json({ error: 'Server error' });
    }
}
