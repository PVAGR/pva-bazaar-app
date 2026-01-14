export default function handler(req, res) {
  try {
    res.status(200).json({
      ok: true,
      message: 'PVABazaar API routing active (frontend project)',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ ok: false, message: 'Health check failed' });
  }
}
