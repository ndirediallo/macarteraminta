const ADMIN_USER  = 'adminraminta@';
const ADMIN_PASS  = 'bMzHfMSLUAonCiBy';
const ADMIN_TOKEN = '3d6846f0e413ad2971d9993e08a92747f4366d32085e6d79';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { username, password } = req.body;

  if (username === ADMIN_USER && password === ADMIN_PASS) {
    return res.status(200).json({ success: true, token: ADMIN_TOKEN });
  }
  return res.status(401).json({ error: 'Identifiants incorrects' });
}
