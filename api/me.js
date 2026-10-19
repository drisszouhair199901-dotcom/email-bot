import { currentUser } from './_lib.js';

export default async function handler(req, res) {
  try {
    const user = await currentUser(req);
    if (!user) return res.status(401).json({ error: 'not logged in' });
    return res.status(200).json({
      user: { username: user.username, email: user.email, senderEmail: user.sender_email }
    });
  } catch (err) {
    console.error('me error:', err.message);
    return res.status(500).json({ error: 'server error' });
  }
}
