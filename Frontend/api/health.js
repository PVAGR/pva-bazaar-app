module.exports = (req, res) => {
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify({ ok: true, status: 'frontend-api-online', path: req.url }));
};
