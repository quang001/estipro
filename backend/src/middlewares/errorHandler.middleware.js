module.exports = (err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  const isProd = process.env.NODE_ENV === 'production';

  console.error(`[${status}] ${req.method} ${req.path}:`, err.message);
  if (!isProd && err.stack) console.error(err.stack);

  res.status(status).json({
    message: err.message || 'Loi he thong',
    ...(isProd ? {} : { stack: err.stack }),
  });
};
