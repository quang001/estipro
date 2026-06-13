// utils/scoringEngine.js
/**
 * scoringEngine.js — Hệ thống tính điểm & đánh giá nhân viên
/**
 * SCORING ENGINE — Hệ thống tính điểm & đánh giá nhân viên
 * 10đ base × rating% × ty_le_dong_gop
 * 200 điểm = lên 1 cấp | 5 lần 0 sao = xuống 1 cấp
 */
const CAP_DO_ORDER = ['junior', 'mid', 'senior', 'expert'];
const RATING_MAP   = { 5:1.0, 4:0.8, 3:0.6, 2:0.4, 1:0.2, 0:0.0 };
const BASE_SCORE   = 10;
const DIEM_LEN_CAP = 200;
const LAN_0_SAO_PHAT = 5;
const BONUS   = { dung_deadline: 2, khong_bi_sua: 3 };
const PENALTY = { tre_deadline: -2, bi_sua_nhieu: -3 };

function resolveScoringRules(rules = {}) {
  const bonusUp = Number(rules.bonusDeltaUp);
  const bonusDown = Number(rules.bonusDeltaDown);

  return {
    baseScore: Number(rules.baseScore) || BASE_SCORE,
    promotionThreshold: Math.max(Number(rules.promotionThreshold) || DIEM_LEN_CAP, 1),
    demotionZeroStar: Math.max(Math.round(Number(rules.demotionZeroStar) || LAN_0_SAO_PHAT), 1),
    bonusDeltaUp: Number.isFinite(bonusUp) ? bonusUp : (BONUS.dung_deadline + BONUS.khong_bi_sua),
    bonusDeltaDown: Number.isFinite(bonusDown) ? bonusDown : Math.abs(PENALTY.tre_deadline + PENALTY.bi_sua_nhieu),
  };
}

function tinhDiemDuAn({ so_sao, phanCongs, bonus = {}, penalty = {}, rules = {} }) {
  if (so_sao === undefined || so_sao === null) throw new Error('Thiếu so_sao (0-5)');
  if (so_sao < 0 || so_sao > 5) throw new Error('so_sao phải trong [0,5]');
  if (!phanCongs || phanCongs.length === 0) throw new Error('Cần ít nhất 1 nhân viên');

  const scoringRules = resolveScoringRules(rules);
  const ratingPct     = RATING_MAP[Math.round(so_sao)] ?? 0;
  const project_score = scoringRules.baseScore * ratingPct;

  let tongTyLe = phanCongs.reduce((s, p) => s + (p.ty_le_dong_gop ?? 0), 0);
  let phanCongsNorm;
  if (tongTyLe === 0 || Math.abs(tongTyLe - 1) > 0.01) {
    const equal = 1 / phanCongs.length;
    phanCongsNorm = phanCongs.map(p => ({ ...p, ty_le_dong_gop: equal }));
  } else {
    phanCongsNorm = phanCongs;
  }

  let bonusDiem = 0;
  if (bonus.dung_deadline || bonus.khong_bi_sua) bonusDiem += scoringRules.bonusDeltaUp;
  if (penalty.tre_deadline || penalty.bi_sua_nhieu) bonusDiem -= scoringRules.bonusDeltaDown;

  const employees = phanCongsNorm.map(p => ({
    ma_nhan_vien:   p.ma_nhan_vien,
    ty_le_dong_gop: p.ty_le_dong_gop,
    diem_nhan:      Math.round(Math.max(0, (project_score + bonusDiem) * p.ty_le_dong_gop) * 100) / 100,
  }));

  return { project_score, bonus_diem: bonusDiem, so_sao, rating_pct: ratingPct, employees };
}

function apDungDiem(nv, diem, so_sao, capDoMap, rules = {}) {
  const scoringRules = resolveScoringRules(rules);
  const cap_do_truoc = nv._capDoTen || 'unknown';
  let upgraded = false, downgraded = false;

  nv.diem_tich_luy = (nv.diem_tich_luy || 0) + diem;
  nv.tong_du_an    = (nv.tong_du_an    || 0) + 1;

  const oldAvg   = nv.diem_trung_binh || 0;
  const oldCount = nv.tong_du_an - 1;
  nv.diem_trung_binh = oldCount === 0
    ? diem
    : Math.round(((oldAvg * oldCount + diem) / nv.tong_du_an) * 100) / 100;

  if (Math.round(so_sao) === 0) {
    nv.so_lan_0_sao = (nv.so_lan_0_sao || 0) + 1;
    if (nv.so_lan_0_sao >= scoringRules.demotionZeroStar) {
      const idx = CAP_DO_ORDER.indexOf(cap_do_truoc);
      if (idx > 0) {
        nv._capDoTen = CAP_DO_ORDER[idx - 1];
        nv.ma_cap_do = capDoMap[nv._capDoTen] || nv.ma_cap_do;
        downgraded   = true;
      }
      nv.so_lan_0_sao = 0;
    }
  }

  let idxCurrent = CAP_DO_ORDER.indexOf(nv._capDoTen || cap_do_truoc);
  while (nv.diem_tich_luy >= scoringRules.promotionThreshold && idxCurrent < CAP_DO_ORDER.length - 1) {
    nv.diem_tich_luy -= scoringRules.promotionThreshold;
    idxCurrent       += 1;
    nv._capDoTen      = CAP_DO_ORDER[idxCurrent];
    nv.ma_cap_do      = capDoMap[nv._capDoTen] || nv.ma_cap_do;
    upgraded          = true;
  }

  return { upgraded, downgraded, cap_do_truoc, cap_do_sau: nv._capDoTen || cap_do_truoc };
}

module.exports = { tinhDiemDuAn, apDungDiem, resolveScoringRules, CAP_DO_ORDER, RATING_MAP, BASE_SCORE, DIEM_LEN_CAP };
