const ADMIN_TOKEN = '67724186e8f4241335449f9477c4df637b5988e1ec4e514d';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const auth = req.headers.authorization || '';
  if (auth !== `Bearer ${ADMIN_TOKEN}`) return res.status(401).json({ error: 'Non autorisé' });

  const TOKEN = process.env.GITHUB_TOKEN;
  const REPO  = process.env.GITHUB_REPO || 'ndirediallo/macarteraminta';
  const API   = `https://api.github.com/repos/${REPO}/contents/submissions.json`;

  try {
    const getRes = await fetch(API, {
      headers: {
        Authorization: `token ${TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
        'Cache-Control': 'no-cache',
      },
    });

    if (!getRes.ok) return res.status(200).json([]);

    const file = await getRes.json();
    const data = JSON.parse(Buffer.from(file.content, 'base64').toString('utf8'));
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}
