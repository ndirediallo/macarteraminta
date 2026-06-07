export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { id, status } = req.body;
  if (!id || !['active', 'inactive'].includes(status)) {
    return res.status(400).json({ error: 'Paramètres invalides' });
  }

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

    const idx = list.findIndex(s => String(s.id) === String(id));
    if (idx === -1) return res.status(404).json({ error: 'Commande introuvable' });

    list[idx].status = status;

    const putBody = {
      message: `Statut mis à jour – ${list[idx].prenom} ${list[idx].nom} → ${status}`,
      content: Buffer.from(JSON.stringify(list, null, 2)).toString('base64'),
      sha: file.sha,
    };

    const putRes = await fetch(API, {
      method: 'PUT', headers: HEADERS, body: JSON.stringify(putBody),
    });
    if (!putRes.ok) throw new Error(await putRes.text());

    return res.status(200).json({ success: true, status });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}
