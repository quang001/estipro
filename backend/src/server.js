const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const connectDB = require('./config/database');
const { globalLimiter } = require('./middlewares/rateLimiter.middleware');
const errorHandler = require('./middlewares/errorHandler.middleware');

const app = express();
connectDB();

const corsOrigin = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim()).filter(Boolean)
  : true;

app.use(helmet());
app.use(cors({
  origin: corsOrigin,
  credentials: true,
}));

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

app.use('/api', globalLimiter);

app.use('/uploads', express.static('src/uploads'));
app.use('/public', express.static('src/public'));

app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/khach-hang', require('./routes/khachHang.routes'));
app.use('/api/du-an', require('./routes/duAn.routes'));
app.use('/api/nhan-vien', require('./routes/nhanVien.routes'));
app.use('/api/ky-nang', require('./routes/kyNang.routes'));
app.use('/api/cap-do', require('./routes/capDo.routes'));
app.use('/api/bao-cao', require('./routes/baoCao.routes'));
app.use('/api/loai-du-an', require('./routes/projectCategory.routes'));
app.use('/api/project-requirements', require('./routes/projectRequirement.routes'));

app.get('/api/health', (_, res) => res.json({ status: 'ok', time: new Date() }));

app.use((req, res) => {
  res.status(404).json({ message: `Khong tim thay route: ${req.method} ${req.path}` });
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend running: http://localhost:${PORT}`));
