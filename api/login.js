import { db, checkPassword, setSession, methodOnly } from './_lib.js';

export default async function handler(req, res) {
  if (!methodOnly(req, res, 'POST')) return;

  try {
    const { email, password } = req.body || {};
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!cleanEmail || typeof password !== 'string')
      return res.status(400).json({ error: 'دخل الإيميل وكلمة السر' });

    const sql = await db();
    const rows = await sql`
      SELECT id, email, username, sender_email, password_hash FROM users WHERE email = ${cleanEmail}`;
    const user = rows[0];

    // نفس الرسالة فالحالتين باش ما نكشفوش واش الإيميل كاين
    const ok = user && (await checkPassword(password, user.password_hash));
    if (!ok) return res.status(401).json({ error: 'الإيميل أو كلمة السر غالطين' });

    setSession(res, user.id);
    return res.status(200).json({
      user: { username: user.username, email: user.email, senderEmail: user.sender_email }
    });
  } catch (err) {
    console.error('login error:', err.message);
    return res.status(500).json({ error: 'خطأ فالسيرفر، تأكد من الإعدادات فـ Vercel' });
  }
}
