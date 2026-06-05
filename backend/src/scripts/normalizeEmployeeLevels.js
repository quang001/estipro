require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const mongoose = require('mongoose');
const NhanVien = require('../models/NhanVien.model');
const CapDoNhanVien = require('../models/CapDoNhanVien.model');
const { CAP_DO_ORDER } = require('../utils/scoringEngine');
const { getSystemSettings } = require('../services/systemSettings.service');

function resolveLevelByPoints(currentLevel, points, threshold) {
  let index = CAP_DO_ORDER.indexOf(currentLevel);
  if (index < 0) index = 0;

  let remain = Number(points) || 0;
  while (remain >= threshold && index < CAP_DO_ORDER.length - 1) {
    remain -= threshold;
    index += 1;
  }

  return {
    level: CAP_DO_ORDER[index],
    points: Math.round(remain * 100) / 100,
  };
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const settings = await getSystemSettings();
  const threshold = Math.max(Number(settings.promotionThreshold) || 200, 1);
  console.log(`Normalize employee levels with threshold ${threshold} points`);

  const levels = await CapDoNhanVien.find();
  const levelMap = {};
  levels.forEach(level => {
    levelMap[level.ten_cap_do] = level._id;
  });

  const employees = await NhanVien.find().populate('ma_cap_do');
  for (const employee of employees) {
    const currentLevel = employee.ma_cap_do?.ten_cap_do || 'junior';
    const currentPoints = Number(employee.diem_tich_luy || 0);
    const next = resolveLevelByPoints(currentLevel, currentPoints, threshold);

    if (!levelMap[next.level]) {
      console.warn(`Skip ${employee.ho_ten}: missing level ${next.level}`);
      continue;
    }

    const changed = currentLevel !== next.level || currentPoints !== next.points;
    if (!changed) continue;

    employee.ma_cap_do = levelMap[next.level];
    employee.diem_tich_luy = next.points;
    await employee.save();

    console.log(`${employee.ho_ten}: ${currentLevel} ${currentPoints} -> ${next.level} ${next.points}`);
  }

  await mongoose.disconnect();
  console.log('Done');
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
