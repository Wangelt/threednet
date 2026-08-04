function notFound(req, res) {
  res.status(404).json({
    success: false,
    message: 'The requested API endpoint was not found.',
  });
}

module.exports = notFound;
