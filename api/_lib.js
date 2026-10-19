import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';

const COOKIE = 'session';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 يوم

function need(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable: ${name}`);
  return v;
}

// ---------- قاعدة البيانات ----------
let _sql = null;
let _ready = null;

export async function db() {
  if (!_sql) _sql = neon(need('DATABASE_URL'));
  if (!_ready) {
    _ready = _sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        username TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        brevo_key_enc TEXT NOT NULL,
        sender_email TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now()
      )`;
  }
  await _ready;
  return _sql;
}

// ---------- تشفير مفتاح Brevo (AES-256-GCM) ----------
function encKey() {
  return crypto.createHash('sha256').update(need('ENCRYPTION_KEY')).digest();
}

export function encrypt(plain) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

export function decrypt(b64) {
  const buf = Buffer.from(b64, 'base64');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', encKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

// ---------- كلمة السر ----------
export const hashPassword = (p) => bcrypt.hash(p, 10);
export const checkPassword = (p, h) => bcrypt.compare(p, h);

// ---------- الجلسة (Cookie) ----------
export function setSession(res, userId) {
  const token = jwt.sign({ uid: userId }, need('SESSION_SECRET'), { expiresIn: MAX_AGE });
  res.setHeader(
    'Set-Cookie',
    `${COOKIE}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${MAX_AGE}`
  );
}

export function clearSession(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`);
}

function readCookie(req, name) {
  const raw = req.headers.cookie || '';
  for (const part of raw.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=');
  }
  return null;
}

// كيرجع المستخدم الحالي من قاعدة البيانات، ولا null
export async function currentUser(req) {
  const token = readCookie(req, COOKIE);
  if (!token) return null;
  let payload;
  try {
    payload = jwt.verify(token, need('SESSION_SECRET'));
  } catch {
    return null;
  }
  const sql = await db();
  const rows = await sql`
    SELECT id, email, username, sender_email, brevo_key_enc FROM users WHERE id = ${payload.uid}`;
  return rows[0] || null;
}

// ---------- أدوات عامة ----------
export const isEmail = (s) => typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) && s.length <= 254;

export function methodOnly(req, res, method) {
  if (req.method !== method) {
    res.status(405).json({ error: 'Method not allowed' });
    return false;
  }
  return true;
}
