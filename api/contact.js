// Vercel Serverless Function: POST /api/contact
// Validates input and logs submission. Optionally wire email or MongoDB via env vars.

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  try {
    const raw = await readBody(req);
    let payload = {};
    try {
      payload = raw ? JSON.parse(raw) : {};
    } catch {
      return res.status(400).end('Invalid JSON.');
    }

    const { name, email, message } = payload || {};
    if (!name || !email || !message) {
      return res.status(400).end('name, email, and message are required.');
    }

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailOk) {
      return res.status(400).end('Invalid email format.');
    }

    // Optional integrations:
    // - Email provider (Resend/SendGrid/SMTP) using RESEND_API_KEY, CONTACT_TO_EMAIL, CONTACT_FROM_EMAIL
    // - MongoDB persistence using MONGODB_URI

    console.log('Contact submission:', {
      name,
      email,
      message,
      at: new Date().toISOString(),
    });

    return res.status(200).end('OK');
  } catch (err) {
    console.error('Contact API error:', err);
    return res.status(500).end('Internal Server Error');
  }
};