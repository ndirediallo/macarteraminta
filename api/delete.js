const ADMIN_TOKEN = '3d6846f0e413ad2971d9993e08a92747f4366d32085e6d79';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const auth = req.headers.authorization || '';
  if (auth !== `Bearer ${ADMIN_TOKEN}`) return res.status(401).json({ error: 'Non autorisé' });

  const { id } = req.body;
  if (!id) return res.status(400).json({ error: 'ID manquant' });

  const TOKEN = process.env.GITHUB_TOKEN;
  const REPO  = process.env.GITHUB_REPO || 'ndirediallo/macarteraminta';
  const FILE  = 'submissions.json';
  const API   = `https://api.github.com/repos/${REPO}/contents/${FILE}`;
  const HEADERS = {
    Authorization: `token ${TOKEN}`,
    Accept: 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
  };

  try {
    const getRes = await fetch(API, { headers: HEADERS });
    if (!getRes.ok) return res.status(404).json({ error: 'Fichier introuvable' });

    const file = await getRes.json();
    const list = JSON.parse(Buffer.from(file.content, 'base64').toString('utf8'));

    const newList = list.filter(s => String(s.id) !== String(id));
    if (newList.length === list.length) {
      return res.status(404).json({ error: 'Commande introuvable' });
    }

    const putBody = {
      message: `Suppression commande ${id}`,
      content: Buffer.from(JSON.stringify(newList, null, 2)).toString('base64'),
      sha: file.sha,
    };

    const putRes = await fetch(API, {
      method: 'PUT', headers: HEADERS, body: JSON.stringify(putBody),
    });
    if (!putRes.ok) throw new Error(await putRes.text());

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}
