export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { cardId, cardLastFour, pdvSlug, prenom, nom, montant } = req.body;
  if (!cardId || !cardLastFour || !prenom || !nom || !montant) {
    return res.status(400).json({ error: 'Champs manquants' });
  }

  const TOKEN = process.env.GITHUB_TOKEN;
  const REPO  = process.env.GITHUB_REPO || 'ndirediallo/macarteraminta';
  const FILE  = 'recharges.json';
  const API   = `https://api.github.com/repos/${REPO}/contents/${FILE}`;
  const HEADERS = {
    Authorization: `token ${TOKEN}`,
    Accept: 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
  };

  try {
    const getRes = await fetch(API, { headers: HEADERS });
    let recharges = [], sha = null;

    if (getRes.ok) {
      const file = await getRes.json();
      sha = file.sha;
      recharges = JSON.parse(Buffer.from(file.content, 'base64').toString('utf8'));
    }

    recharges.unshift({
      id: Date.now(),
      date: new Date().toLocaleString('fr-FR', { timeZone: 'Africa/Conakry' }),
      pdvSlug: pdvSlug || '',
      cardId, cardLastFour, prenom, nom, montant,
      status: 'inactive',
    });

    const body = {
      message: `Recharge – ${prenom} ${nom}`,
      content: Buffer.from(JSON.stringify(recharges, null, 2)).toString('base64'),
      ...(sha && { sha }),
    };

    const pdvNom = pdvSlug
      ? pdvSlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
      : null;
    const pdvInfo = pdvNom ? `🏪 PdV : ${pdvNom}\n` : '';
    const msg = encodeURIComponent(
      `🔔 Nouvelle demande de recharge Raminta !\n` +
      pdvInfo +
      `💳 Carte : ${cardId} | ****${cardLastFour}\n` +
      `👤 ${prenom} ${nom}\n` +
      `💰 ${Number(montant).toLocaleString('fr-FR')} GNF`
    );
    const whatsappUrl = `https://api.callmebot.com/whatsapp.php?phone=224622269738&text=${msg}&apikey=2895723`;

    // Sauvegarde GitHub + notification WhatsApp en parallèle
    const [putRes] = await Promise.all([
      fetch(API, { method: 'PUT', headers: HEADERS, body: JSON.stringify(body) }),
      fetch(whatsappUrl).catch(() => {}),
    ]);
    if (!putRes.ok) throw new Error(await putRes.text());

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}
