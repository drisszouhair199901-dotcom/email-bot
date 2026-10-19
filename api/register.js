import { db, encrypt, hashPassword, setSession, isEmail, methodOnly } from './_lib.js';

export default async function handler(req, res) {
  if (!methodOnly(req, res, 'POST')) return;

  try {
    const { username, email, password, brevoKey, senderEmail } = req.body || {};
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanSender = String(senderEmail || email || '').trim().toLowerCase();
    const cleanName = String(username || '').trim();
    const key = String(brevoKey || '').trim();

    if (cleanName.length < 2 || cleanName.length > 60)
      return res.status(400).json({ error: 'اسم المستخدم خاصو يكون بين 2 و 60 حرف' });
    if (!isEmail(cleanEmail)) return res.status(400).json({ error: 'الإيميل ماشي صحيح' });
    if (!isEmail(cleanSender)) return res.status(400).json({ error: 'إيميل المرسل ماشي صحيح' });
    if (typeof password !== 'string' || password.length < 8)
      return res.status(400).json({ error: 'كلمة السر خاصها تكون 8 حروف على الأقل' });
    if (!key) return res.status(400).json({ error: 'خاصك تدخل API key ديال Brevo' });

    // نتأكد أن المفتاح ديال Brevo صحيح
    const check = await fetch('https://api.brevo.com/v3/account', {
      headers: { accept: 'application/json', 'api-key': key }
    });
    if (!check.ok) {
      return res.status(400).json({ error: 'API key ديال Brevo ماشي صحيح، تأكد منو ونسخو من جديد' });
    }

    const sql = await db();
    const exists = await sql`SELECT 1 FROM users WHERE email = ${cleanEmail}`;
    if (exists.length) return res.status(409).json({ error: 'هاد الإيميل مسجل من قبل، دخل بيه' });

    const passwordHash = await hashPassword(password);
    const keyEnc = encrypt(key);

    const rows = await sql`
      INSERT INTO users (email, username, password_hash, brevo_key_enc, sender_email)
      VALUES (${cleanEmail}, ${cleanName}, ${passwordHash}, ${keyEnc}, ${cleanSender})
      RETURNING id`;

    setSession(res, rows[0].id);
    return res.status(200).json({
      user: { username: cleanName, email: cleanEmail, senderEmail: cleanSender }
    });
  } catch (err) {
    if (err && err.code === '23505')
      return res.status(409).json({ error: 'هاد الإيميل مسجل من قبل، دخل بيه' });
    console.error('register error:', err.message);
    return res.status(500).json({ error: 'خطأ فالسيرفر، تأكد من الإعدادات فـ Vercel' });
  }
}
