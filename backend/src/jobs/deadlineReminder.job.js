/**
 * jobs/deadlineReminder.job.js
 * Kiểm tra dự án sắp deadline mỗi ngày lúc 8:00 sáng.
 *
 * Cách dùng: gọi startJobs() từ server.js nếu muốn bật.
 * Cần cài thêm: npm install node-cron
 *
 * Ví dụ kích hoạt trong server.js:
 *   const { startJobs } = require('./jobs/deadlineReminder.job');
 *   startJobs();
 */

// const cron   = require('node-cron');
const DuAn   = require('../models/DuAn.model');

async function checkDeadlines() {
  const now  = new Date();
  const soon = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 ngày tới

  const duAns = await DuAn.find({
    trang_thai: { $nin: ['completed', 'cancelled'] },
    deadline:   { $gte: now, $lte: soon },
  }).populate('ma_khach_hang');

  if (duAns.length === 0) return;

  console.log(`[DeadlineJob] ⚠️  ${duAns.length} dự án sắp deadline:`);
  duAns.forEach(d => {
    const diff = Math.ceil((new Date(d.deadline) - now) / 86400000);
    console.log(`  - ${d.ten_du_an} | còn ${diff} ngày | KH: ${d.ma_khach_hang?.ten_cong_ty}`);
  });

  // TODO: gửi email / Slack notification ở đây
}

function startJobs() {
  // Chạy mỗi ngày lúc 8:00 sáng
  // cron.schedule('0 8 * * *', checkDeadlines);
  console.log('[Jobs] Deadline reminder job đã đăng ký (cần bật node-cron)');
}

module.exports = { startJobs, checkDeadlines };
