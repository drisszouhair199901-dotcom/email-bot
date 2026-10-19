import { currentUser, decrypt, isEmail, methodOnly } from './_lib.js';

const esc = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// إلا كان النص عادي (بلا HTML) كنحولو لأسطر
const toHtml = (text) =>
  /<[a-z][\s\S]*>/i.test(text) ? text : esc(text).replace(/\r?\n/g, '<br>');

export default async function handler(req, res) {
  if (!methodOnly(req, res, 'POST')) return;

  try {
    // 1) من هو المستخدم؟ (من الجلسة، ماشي من الطلب)
    const user = await currentUser(req);
    if (!user) return res.status(401).json({ error: 'خاصك تدخل لحسابك' });

    // 2) نتحقق من المدخلات
    const { to, subject, htmlContent, attachment } = req.body || {};
    if (!isEmail(to)) return res.status(400).json({ error: 'إيميل المستلم ماشي صحيح' });
    if (!subject || !htmlContent) return res.status(400).json({ error: 'العنوان والنص مطلوبين' });

    const payload = {
      sender: { name: user.username, email: user.sender_email },
      to: [{ email: to }],
      replyTo: { email: user.sender_email },
      subject: String(subject),
      htmlContent: toHtml(String(htmlContent))
    };

    if (Array.isArray(attachment) && attachment.length > 0) {
      if (attachment.length > 3) return res.status(400).json({ error: 'أقصى عدد ديال المرفقات 3' });
      payload.attachment = attachment.map((a) => ({
        name: String(a.name || 'file.pdf'),
        content: String(a.content || '')
      }));
    }

    // 3) كنستعمل مفتاح Brevo ديال هاد المستخدم بالضبط
    const apiKey = decrypt(user.brevo_key_enc);

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) return res.status(200).json({ success: true });

    let msg = 'فشل الإرسال';
    try {
      const err = await response.json();
      msg = err.message || msg;
    } catch {}
    return res.status(400).json({ error: msg });
  } catch (err) {
    console.error('send error:', err.message);
    return res.status(500).json({ error: 'خطأ فالسيرفر' });
  }
}
