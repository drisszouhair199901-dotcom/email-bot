import { clearSession, methodOnly } from './_lib.js';

export default async function handler(req, res) {
  if (!methodOnly(req, res, 'POST')) return;
  clearSession(res);
  return res.status(200).json({ success: true });
}
