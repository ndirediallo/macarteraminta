export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { prenom, nom, dob, idType, idNumber, phone, email } = req.body;
  if (!prenom || !nom || !dob || !phone || !email) {
    return res.status(400).json({ error: 'Champs manquants' });
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
    let submissions = [], sha = null;

    if (getRes.ok) {
      const file = await getRes.json();
      sha = file.sha;
      submissions = JSON.parse(Buffer.from(file.content, 'base64').toString('utf8'));
    }

    submissions.unshift({
      id: Date.now(),
      date: new Date().toLocaleString('fr-FR', { timeZone: 'Africa/Conakry' }),
      prenom, nom, dob, idType, idNumber, phone, email
    });

    const body = {
      message: `Commande – ${prenom} ${nom}`,
      content: Buffer.from(JSON.stringify(submissions, null, 2)).toString('base64'),
      ...(sha && { sha }),
    };

    const putRes = await fetch(API, { method: 'PUT', headers: HEADERS, body: JSON.stringify(body) });
    if (!putRes.ok) throw new Error(await putRes.text());

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}
