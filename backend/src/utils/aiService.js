

const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

// ─── Rate Limiter ─────────────────────────────────────────────────────────────
const rateLimiter = {
  requests: [],
  maxPerMinute: 10,
  canCall() {
    const now = Date.now();
    this.requests = this.requests.filter(t => now - t < 60_000);
    return this.requests.length < this.maxPerMinute;
  },
  record() { this.requests.push(Date.now()); },
  waitTime() {
    if (this.requests.length === 0) return 0;
    return Math.max(0, 60_000 - (Date.now() - Math.min(...this.requests)));
  },
};

// ─── Cache (5 phút) ───────────────────────────────────────────────────────────
const aiCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

function getCacheKey(info) {
  // Key đơn giản để tránh lỗi stringify circular
  return `${info.loai_du_an}|${info.ten_du_an}`;
}

// ─── Làm sạch string trước khi đưa vào prompt ────────────────────────────────
function sanitize(val) {
  if (val === null || val === undefined) return 'Không có';
  if (typeof val === 'object') {
    try { return JSON.stringify(val, null, 1); }
    catch { return 'Không có'; }
  }
  return String(val)
    .replace(/`/g, "'")      // backtick gây lỗi trong template string
    .replace(/\\/g, '/')     // backslash gây lỗi JSON
    .slice(0, 500);          // giới hạn độ dài
}

// ─── Core caller với đầy đủ log lỗi ─────────────────────────────────────────
async function callGemini(prompt, retryCount = 0) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
    console.log('[AI] Không có API key — dùng fallback');
    return null;
  }

  if (!rateLimiter.canCall()) {
    const wait = rateLimiter.waitTime();
    console.warn(`[AI] Rate limit — chờ ${Math.ceil(wait / 1000)}s`);
    await delay(wait + 500);
  }
  rateLimiter.record();

  // Đảm bảo prompt là string thuần, không có ký tự lạ
  const cleanPrompt = String(prompt).trim();

  const body = {
    contents: [{
      parts: [{ text: cleanPrompt }]
    }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 2048,
    },
  };

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    // Log chi tiết khi lỗi
    if (!response.ok) {
      let errBody = '';
      try { errBody = await response.text(); } catch {}
      console.error(`[AI] Lỗi ${response.status}: ${errBody.slice(0, 300)}`);

      // 429 — retry
      if (response.status === 429) {
        if (retryCount >= 3) { console.error('[AI] 429 — đã thử 3 lần, bỏ qua'); return null; }
        const backoff = Math.pow(2, retryCount) * 3000;
        console.warn(`[AI] 429 — retry ${retryCount + 1}/3 sau ${backoff / 1000}s`);
        await delay(backoff);
        return callGemini(prompt, retryCount + 1);
      }

      // 400 — lỗi prompt, không retry
      if (response.status === 400) {
        console.error('[AI] 400 Bad Request — kiểm tra prompt hoặc API key');
        return null;
      }

      return null;
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      console.warn('[AI] Response rỗng từ Gemini');
      return null;
    }
    return text;
  } catch (err) {
    console.error('[AI] Network error:', err.message);
    return null;
  }
}

// ─── Parse JSON an toàn ───────────────────────────────────────────────────────
function safeParseJSON(text) {
  if (!text) return null;
  try {
    // Xóa markdown code block nếu có
    const cleaned = text
      .replace(/^```json\s*/m, '')
      .replace(/^```\s*/m, '')
      .replace(/```\s*$/m, '')
      .trim();
    return JSON.parse(cleaned);
  } catch (e) {
    // Thử tìm JSON object trong text
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]); } catch {}
    }
    console.warn('[AI] Parse JSON thất bại:', e.message.slice(0, 100));
    return null;
  }
}

// ─── Fallbacks ────────────────────────────────────────────────────────────────
const FALLBACKS = {
  phan_tich: {
    do_phuc_tap: 'trung_binh', diem_do_phuc_tap: 5,
    yeu_to_phuc_tap: ['Đánh giá thủ công — AI chưa phân tích'],
    canh_bao: [], de_xuat_ky_thuat: [],
    thoi_gian_thuc_te_goi_y: 'Cần xem xét thêm',
    nhan_xet_tong_quan: 'AI phân tích chưa chạy. Nhấn nút "Tính ước tính" để kích hoạt.',
    ai_enabled: false,
  },
  rui_ro: {
    muc_rui_ro: 'trung_binh', diem_rui_ro: 5,
    rui_ro_chinh: [{ ten: 'Chưa phân tích', mo_ta: 'AI chưa chạy', giai_phap: 'Nhấn Tính ước tính' }],
    khuyen_nghi_gia: 'giữ', ly_do_khuyen_nghi: 'Chờ AI phân tích',
    buffer_de_xuat_pct: 10, ai_enabled: false,
  },
  bao_gia: {
    tom_tat_bao_gia: 'Báo giá tính toán dựa trên yêu cầu kỹ thuật và nguồn lực thực tế.',
    diem_manh_bao_gia: ['Đội ngũ chuyên nghiệp', 'Cam kết chất lượng', 'Hỗ trợ sau bàn giao'],
    giai_thich_gia_tri: 'Mức giá phản ánh đúng công sức và công cụ cần thiết.',
    cac_moc_giao_hang: [
      { ten: 'Kickoff', mo_ta: 'Bắt đầu dự án' },
      { ten: 'Review', mo_ta: 'Duyệt kết quả' },
      { ten: 'Bàn giao', mo_ta: 'Giao file hoàn thiện' },
    ],
    dieu_kien_de_nghi: ['Đặt cọc 50% khi ký hợp đồng', 'Thanh toán 50% khi bàn giao'],
    goi_bo_sung: null, ai_enabled: false,
  },
};

// ─── HÀM CHÍNH: 1 API call duy nhất ─────────────────────────────────────────
async function phanTichToanDien(duAnInfo, uocTinhResult = {}) {
  // Kiểm tra cache
  const cacheKey = getCacheKey(duAnInfo);
  const cached = aiCache.get(cacheKey);
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    console.log('[AI] Cache hit — dùng kết quả đã lưu');
    return cached.data;
  }

  // Chuẩn bị dữ liệu — dùng sanitize để tránh ký tự gây lỗi
  const tenDuAn   = sanitize(duAnInfo.ten_du_an);
  const loaiDuAn  = sanitize(duAnInfo.loai_du_an);
  const moTa      = sanitize(duAnInfo.mo_ta);
  const deadline  = sanitize(duAnInfo.deadline);
  const doKho     = Number(duAnInfo.diem_do_kho) || 3;
  const yeuCauStr = sanitize(duAnInfo.yeu_cau);

  const giaDexuat = Number(uocTinhResult.gia_de_xuat) || 0;
  const tongGio   = Number(uocTinhResult.tong_gio_cong) || 0;
  const chiPhiNS  = Number(uocTinhResult.chi_phi_nhan_su) || 0;
  const chiPhiKT  = Number(uocTinhResult.chi_phi_ky_thuat) || 0;

  // Prompt dạng text đơn giản, KHÔNG dùng template JSON lồng nhau
  const prompt = [
    'Ban la chuyen gia uoc tinh chi phi du an sang tao tai Viet Nam.',
    'Phan tich du an va tra ve JSON theo dung format duoi day.',
    'Chi tra JSON thuan tuy, khong co markdown, khong co giai thich.',
    '',
    'THONG TIN DU AN:',
    'Ten du an: ' + tenDuAn,
    'Loai du an: ' + loaiDuAn,
    'Mo ta: ' + moTa,
    'Deadline: ' + deadline,
    'Do kho tinh cua khach hang: ' + doKho + '/5',
    'Yeu cau ky thuat: ' + yeuCauStr,
    '',
    'GIA UOC TINH:',
    'Gia de xuat: ' + giaDexuat.toLocaleString('vi-VN') + ' VND',
    'Tong gio cong: ' + tongGio + ' gio',
    'Chi phi nhan su: ' + chiPhiNS.toLocaleString('vi-VN') + ' VND',
    'Chi phi ky thuat: ' + chiPhiKT.toLocaleString('vi-VN') + ' VND',
    '',
    'Tra ve JSON voi dung format sau (chi JSON):',
    '{',
    '  "phan_tich": {',
    '    "do_phuc_tap": "trung_binh",',
    '    "diem_do_phuc_tap": 5,',
    '    "yeu_to_phuc_tap": ["ly do 1", "ly do 2"],',
    '    "canh_bao": ["canh bao neu co"],',
    '    "de_xuat_ky_thuat": ["de xuat 1"],',
    '    "thoi_gian_thuc_te_goi_y": "X-Y ngay lam viec",',
    '    "nhan_xet_tong_quan": "nhan xet ngan gon 2-3 cau"',
    '  },',
    '  "rui_ro": {',
    '    "muc_rui_ro": "trung_binh",',
    '    "diem_rui_ro": 5,',
    '    "rui_ro_chinh": [{"ten": "ten rui ro", "mo_ta": "mo ta", "giai_phap": "giai phap"}],',
    '    "khuyen_nghi_gia": "giu",',
    '    "ly_do_khuyen_nghi": "ly do",',
    '    "buffer_de_xuat_pct": 10',
    '  },',
    '  "bao_gia": {',
    '    "tom_tat_bao_gia": "1-2 cau tom tat",',
    '    "diem_manh_bao_gia": ["diem 1", "diem 2"],',
    '    "giai_thich_gia_tri": "2-3 cau giai thich",',
    '    "cac_moc_giao_hang": [{"ten": "ten moc", "mo_ta": "mo ta"}],',
    '    "dieu_kien_de_nghi": ["dieu kien 1"],',
    '    "goi_bo_sung": null',
    '  }',
    '}',
  ].join('\n');

  const raw = await callGemini(prompt);
  const parsed = safeParseJSON(raw);

  if (!parsed || !parsed.phan_tich || !parsed.rui_ro || !parsed.bao_gia) {
    console.warn('[AI] Không phân tích được — dùng fallback');
    return {
      phan_tich: FALLBACKS.phan_tich,
      rui_ro:    FALLBACKS.rui_ro,
      bao_gia:   FALLBACKS.bao_gia,
    };
  }

  const result = {
    phan_tich: { ...parsed.phan_tich, ai_enabled: true },
    rui_ro:    { ...parsed.rui_ro,    ai_enabled: true },
    bao_gia:   { ...parsed.bao_gia,   ai_enabled: true },
  };

  // Lưu cache
  aiCache.set(cacheKey, { data: result, time: Date.now() });
  console.log('[AI] Phân tích thành công, đã cache');
  return result;
}

// ─── Insights lịch sử ────────────────────────────────────────────────────────
async function taoInsightsTongHop(lichSuDuAn) {
  if (!lichSuDuAn || lichSuDuAn.length === 0) {
    return { ai_enabled: false, nhan_xet: 'Chua co du lieu lich su.' };
  }

  const cacheKey = `insights|${lichSuDuAn.length}`;
  const cached = aiCache.get(cacheKey);
  if (cached && Date.now() - cached.time < 15 * 60 * 1000) return cached.data;

  // Tóm tắt dữ liệu lịch sử — không gửi object phức tạp
  const tomTat = lichSuDuAn.slice(0, 8).map(d =>
    `${d.loai || 'unknown'}: du_doan=${d.gia_du_doan || 0} thuc_te=${d.gia_thuc_te || 0} loi_nhuan=${d.loi_nhuan || 0}`
  ).join('\n');

  const prompt = [
    'Phan tich hieu suat tu lich su du an sang tao:',
    '',
    tomTat,
    '',
    'Tra ve JSON (chi JSON):',
    '{',
    '  "xu_huong_doanh_thu": "tang",',
    '  "loai_du_an_sinh_loi_nhat": "ten loai",',
    '  "van_de_pho_bien": ["van de 1", "van de 2"],',
    '  "khuyen_nghi_kinh_doanh": ["khuyen nghi 1", "khuyen nghi 2"],',
    '  "do_chinh_xac_uoc_tinh_pct": 80,',
    '  "nhan_xet_tong_quan": "2-3 cau tong quan"',
    '}',
  ].join('\n');

  const raw = await callGemini(prompt);
  const parsed = safeParseJSON(raw);
  if (!parsed) return { ai_enabled: false, nhan_xet: 'AI chua duoc cau hinh.' };

  const result = { ...parsed, ai_enabled: true };
  aiCache.set(cacheKey, { data: result, time: Date.now() });
  return result;
}

// ─── Backward-compat ──────────────────────────────────────────────────────────
async function phanTichYeuCau(info) {
  return (await phanTichToanDien(info, {})).phan_tich;
}
async function danhGiaRuiRo(info, uocTinh) {
  return (await phanTichToanDien(info, uocTinh)).rui_ro;
}
async function tuVanBaoGia(info, uocTinh) {
  return (await phanTichToanDien(info, uocTinh)).bao_gia;
}

module.exports = {
  phanTichToanDien,
  phanTichYeuCau,
  danhGiaRuiRo,
  tuVanBaoGia,
  taoInsightsTongHop,
};