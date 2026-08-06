const ADMIN_TOKEN = '67724186e8f4241335449f9477c4df637b5988e1ec4e514d';

const FILE    = 'pdv.json';
const API_URL = `https://api.github.com/repos/${process.env.GITHUB_REPO || 'ndirediallo/macarteraminta'}/contents/${FILE}`;

function ghHeaders() {
  return {
    Authorization: `token ${process.env.GITHUB_TOKEN}`,
    Accept: 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
  };
}

function slugify(nom) {
  return nom
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function readFile() {
  const res = await fetch(API_URL, { headers: ghHeaders() });
  if (!res.ok) return { list: [], sha: null };
  const file = await res.json();
  const list = JSON.parse(Buffer.from(file.content, 'base64').toString('utf8'));
  return { list, sha: file.sha };
}

async function writeFile(list, sha, message) {
  const body = {
    message,
    content: Buffer.from(JSON.stringify(list, null, 2)).toString('base64'),
    ...(sha && { sha }),
  };
  const res = await fetch(API_URL, { method: 'PUT', headers: ghHeaders(), body: JSON.stringify(body) });
  if (!res.ok) throw new Error(await res.text());
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const auth = req.headers.authorization || '';
  if (auth !== `Bearer ${ADMIN_TOKEN}`) return res.status(401).json({ error: 'Non autorisé' });

  try {
    // GET — liste tous les PdV
    if (req.method === 'GET') {
      const { list } = await readFile();
      return res.status(200).json(list);
    }

    // POST — crée ou supprime selon le champ "action"
    if (req.method === 'POST' && req.body.action === 'delete') {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: 'ID manquant' });

      const { list, sha } = await readFile();
      const newList = list.filter(p => String(p.id) !== String(id));
      if (newList.length === list.length) return res.status(404).json({ error: 'PdV introuvable' });

      await writeFile(newList, sha, `Suppression PdV ${id}`);
      return res.status(200).json({ success: true });
    }

    if (req.method === 'POST') {
      const { nom } = req.body;
      if (!nom || nom.trim().length < 2) return res.status(400).json({ error: 'Nom requis (min 2 caractères)' });

      const { list, sha } = await readFile();
      const slug = slugify(nom.trim());

      if (list.some(p => p.slug === slug)) {
        return res.status(409).json({ error: 'Un point de vente avec ce nom existe déjà' });
      }

      const pdv = {
        id: Date.now(),
        nom: nom.trim(),
        slug,
        createdAt: new Date().toLocaleString('fr-FR', { timeZone: 'Africa/Conakry' }),
      };
      list.unshift(pdv);
      await writeFile(list, sha, `Nouveau PdV : ${pdv.nom}`);
      return res.status(200).json({ success: true, pdv });
    }

    return res.status(405).json({ error: 'Méthode non autorisée' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}
