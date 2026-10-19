# Email Bot (multi-user)

كل مستخدم: حساب + API key ديال Brevo ديالو (مشفر). الدخول بإيميل + كلمة سر فقط.

## الإعداد فـ Vercel
1. Storage -> Create Database -> Neon (Postgres) -> ربطو مع المشروع (كيزيد DATABASE_URL).
2. Settings -> Environment Variables، زيد:
   - ENCRYPTION_KEY  (نص عشوائي 32+ حرف)
   - SESSION_SECRET  (نص آخر عشوائي)
3. حيّد BREVO_API_KEY القديم (ما بقاش كيتستعمل).
4. Push لـ GitHub، وVercel كيعاود النشر.

⚠️ ما تبدلش ENCRYPTION_KEY من بعد، وإلا مفاتيح Brevo المخزنة ما غتبقاش كتخدم.
