export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { to, subject, htmlContent } = req.body;

  const BREVO_API_KEY = process.env.BREVO_API_KEY; 

  const SENDER_NAME = "Idriss Zouhair"; 
  const SENDER_EMAIL = "zouhairidriss06@gmail.com"; 

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: SENDER_NAME, email: SENDER_EMAIL },
        to: [{ email: to }],
        replyTo: { email: SENDER_EMAIL },
        subject: subject,
        htmlContent: htmlContent
      })
    });

    if (response.ok) {
      return res.status(200).json({ success: true });
    } else {
      const errorData = await response.json();
      return res.status(400).json({ error: errorData.message || 'فشل الإرسال' });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
