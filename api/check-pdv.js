export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).end();

  const slug = req.query.slug || '';
  if (!slug) return res.status(200).json({ valid: false });

  const TOKEN = process.env.GITHUB_TOKEN;
  const REPO  = process.env.GITHUB_REPO || 'ndirediallo/macarteraminta';
  const API   = `https://api.github.com/repos/${REPO}/contents/pdv.json`;

  try {
    const getRes = await fetch(API, {
      headers: {
        Authorization: `token ${TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!getRes.ok) return res.status(200).json({ valid: false });

    const file = await getRes.json();
    const list = JSON.parse(Buffer.from(file.content, 'base64').toString('utf8'));
    const valid = list.some(p => p.slug === slug);

    return res.status(200).json({ valid });
  } catch {
    // En cas d'erreur réseau, on laisse passer (fail open)
    return res.status(200).json({ valid: true });
  }
}
