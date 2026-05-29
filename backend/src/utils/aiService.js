
const { danhGiaDuAn, diemSangMucDo } = require('./difficultyEngine');

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
    .slice(0, 1200);         // giới hạn độ dài prompt AI
}

function sanitizeShort(val, max = 220) {
  return sanitize(val).slice(0, max);
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

function scoreToLevel(score) {
  const value = Number(score) || 2;
  if (value <= 1) return 'de';
  if (value <= 2) return 'trung_binh';
  if (value <= 3) return 'kho';
  return 'rat_kho';
}

function normalizeScore(score) {
  const value = Number(score);
  if (!Number.isFinite(value)) return 2;
  return Math.max(1, Math.min(5, Math.round(value)));
}

function asPlainId(value) {
  return value?._id?.toString?.() || value?.toString?.() || '';
}

function toPlainCategory(category) {
  const obj = category?.toObject?.() || category || {};
  return {
    _id: asPlainId(obj._id),
    slug: obj.slug,
    ten_hien_thi: obj.ten_hien_thi,
    mo_ta: obj.mo_ta || '',
    base_hours: obj.base_hours,
    tech_cost_base: obj.tech_cost_base,
    required_roles: obj.required_roles || [],
  };
}

function toPlainField(field) {
  const obj = field?.toObject?.() || field || {};
  return {
    _id: asPlainId(obj._id),
    ma_loai_du_an: asPlainId(obj.ma_loai_du_an),
    field_key: obj.field_key,
    label: obj.label,
    hint: obj.hint || '',
    type: obj.type,
    required: Boolean(obj.required),
    default_value: obj.default_value,
    min_value: obj.min_value,
    max_value: obj.max_value,
    options: (obj.options || []).map(option => ({
      value: option.value,
      label: option.label || String(option.value),
      muc_do: option.muc_do,
      diem: option.diem,
    })),
    cau_hinh_do_kho_number: obj.cau_hinh_do_kho_number || [],
    multiselect_rule: obj.multiselect_rule || 'max',
    active: obj.active !== false,
  };
}

function normalizeContext(context = {}) {
  const categories = (context.categories || []).map(toPlainCategory);
  const fields = (context.fields || []).map(toPlainField).filter(field => field.active);
  const fieldsByCategory = {};
  fields.forEach(field => {
    const key = asPlainId(field.ma_loai_du_an);
    if (!fieldsByCategory[key]) fieldsByCategory[key] = [];
    fieldsByCategory[key].push(field);
  });
  return { ...context, categories, fields, fieldsByCategory };
}

function compactFieldForPrompt(field) {
  return {
    field_key: field.field_key,
    label: field.label,
    type: field.type,
    required: field.required,
    options: field.options?.slice(0, 24).map(option => ({
      value: option.value,
      label: option.label,
      difficulty_score: option.diem,
      difficulty_level: option.muc_do,
    })),
    number_difficulty: field.cau_hinh_do_kho_number?.slice(0, 8).map(range => ({
      min: range.min,
      max: range.max,
      difficulty_score: range.diem,
      difficulty_level: range.muc_do,
    })),
    multiselect_rule: field.multiselect_rule,
  };
}

function buildAiEstimationPrompt(context = {}, sourceText = '') {
  const normalized = normalizeContext(context);
  const project = normalized.project || {};
  const currentCategoryId = asPlainId(project.loai_du_an || project.category_id || project.ma_loai_du_an);
  const categoryBlocks = normalized.categories.map(category => ({
    id: category._id,
    slug: category.slug,
    label: category.ten_hien_thi,
    fields: (!currentCategoryId || category._id === currentCategoryId)
      ? (normalized.fieldsByCategory[category._id] || []).map(compactFieldForPrompt)
      : [],
  }));

  return [
    'Ban la AI phan tich yeu cau cho he thong EstiPro.',
    'Nhiem vu: phan tich brief, xac dinh loai du an, trich xuat dieu kien, danh gia do kho.',
    'Khong tinh gia, khong dua ra tong tien, khong thay the thuat toan tinh gia hien co.',
    'Khong hardcode dieu kien. Chi dung cac category va field duoc cung cap trong cau hinh.',
    'Neu gia tri thuoc field da co cau hinh do kho, hay dung dung do kho trong cau hinh.',
    'Neu phat hien dieu kien chua co field tuong ung, dua vao new_conditions voi ly do va do kho de xuat 1..5.',
    'Neu co file anh/pdf dinh kem, hay OCR noi dung brief va dua text doc duoc vao extracted_text.',
    'Tra ve JSON thuan tuy, khong markdown, khong chain-of-thought.',
    '',
    'DU AN HIEN TAI:',
    JSON.stringify({
      ten_du_an: project.ten_du_an || '',
      loai_du_an: project.loai_du_an || project.category_id || '',
      mo_ta: project.mo_ta || '',
      deadline: project.deadline || '',
      yeu_cau: project.yeu_cau || {},
    }),
    '',
    'BRIEF/OCR TEXT:',
    sanitizeShort(sourceText || project.mo_ta || '', 1000),
    '',
    'CAU HINH DONG TU DATABASE:',
    JSON.stringify(categoryBlocks),
    '',
    'JSON FORMAT BAT BUOC:',
    '{',
    '  "extracted_text": "noi dung OCR/brief doc duoc, neu co",',
    '  "project": {',
    '    "ten_du_an": "ten du an neu suy ra duoc",',
    '    "ma_loai_du_an": "id category phu hop nhat",',
    '    "loai_du_an_slug": "slug category",',
    '    "mo_ta": "tom tat brief da chuan hoa",',
    '    "deadline": "YYYY-MM-DD hoac null",',
    '    "muc_do_gap": "binh_thuong|gap|sieu_gap"',
    '  },',
    '  "conditions": [',
    '    {',
    '      "field_key": "field_key co trong cau hinh",',
    '      "label": "ten hien thi",',
    '      "value": "gia tri phu hop voi type",',
    '      "difficulty_score": 1,',
    '      "difficulty_level": "de|trung_binh|kho|rat_kho",',
    '      "reason": "ly do ngan gon",',
    '      "confidence": 0.8',
    '    }',
    '  ],',
    '  "new_conditions": [',
    '    {',
    '      "label": "dieu kien moi",',
    '      "value": "gia tri",',
    '      "suggested_field_key": "snake_case_key",',
    '      "difficulty_score": 4,',
    '      "difficulty_level": "rat_kho",',
    '      "reason": "vi sao can tinh do kho",',
    '      "confidence": 0.7',
    '    }',
    '  ],',
    '  "missing_conditions": ["field bat buoc chua thay"],',
    '  "notes": ["ghi chu ngan gon"]',
    '}',
  ].join('\n');
}

async function callGeminiForAi(prompt, media = null, retryCount = 0) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE') return null;

  const model = process.env.GEMINI_MODEL || process.env.AI_GEMINI_MODEL || 'gemini-2.5-flash';
  const parts = [{ text: String(prompt).trim() }];
  if (media?.data && media?.mime_type) {
    parts.push({
      inline_data: {
        mime_type: media.mime_type,
        data: media.data,
      },
    });
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 4096,
            responseMimeType: 'application/json',
          },
        }),
      }
    );

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      console.error(`[AI:${model}] ${response.status}: ${body.slice(0, 300)}`);
      if (response.status === 429 && retryCount < 2) {
        await delay((retryCount + 1) * 3000);
        return callGeminiForAi(prompt, media, retryCount + 1);
      }
      return null;
    }

    const data = await response.json();
    return data?.candidates?.[0]?.content?.parts?.find(part => part.text)?.text || null;
  } catch (err) {
    console.error('[AI:gemini] Network error:', err.message);
    return null;
  }
}

async function callOpenAICompatible({ provider, baseUrl, apiKey, model, prompt, media = null }) {
  if (!apiKey) return null;

  const userContent = media?.data && media?.mime_type
    ? [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: `data:${media.mime_type};base64,${media.data}` } },
      ]
    : prompt;

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        ...(provider === 'openrouter' ? {
          'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'http://localhost',
          'X-Title': process.env.OPENROUTER_APP_NAME || 'EstiPro',
        } : {}),
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'Return only valid JSON. Do not include markdown.' },
          { role: 'user', content: userContent },
        ],
        temperature: 0.1,
        max_tokens: 4096,
        stream: false,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      console.error(`[AI:${provider}] ${response.status}: ${body.slice(0, 300)}`);
      return null;
    }

    const data = await response.json();
    return data?.choices?.[0]?.message?.content || null;
  } catch (err) {
    console.error(`[AI:${provider}] Network error:`, err.message);
    return null;
  }
}

function getProviderCandidates(media = null) {
  const explicit = String(process.env.AI_ESTIMATION_PROVIDER || 'auto').toLowerCase();
  const all = {
    groq: {
      provider: 'groq',
      baseUrl: 'https://api.groq.com/openai/v1',
      apiKey: process.env.GROQ_API_KEY,
      model: process.env.GROQ_MODEL || process.env.AI_GROQ_MODEL || 'llama-3.3-70b-versatile',
      supportsMedia: false,
    },
    gemini: {
      provider: 'gemini',
      apiKey: process.env.GEMINI_API_KEY,
      model: process.env.GEMINI_MODEL || process.env.AI_GEMINI_MODEL || 'gemini-2.5-flash',
      supportsMedia: true,
    },
    openrouter: {
      provider: 'openrouter',
      baseUrl: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY,
      model: process.env.OPENROUTER_MODEL || process.env.AI_OPENROUTER_MODEL || 'google/gemini-2.5-flash',
      supportsMedia: true,
    },
    deepseek: {
      provider: 'deepseek',
      baseUrl: 'https://api.deepseek.com',
      apiKey: process.env.DEEPSEEK_API_KEY,
      model: process.env.DEEPSEEK_MODEL || process.env.AI_DEEPSEEK_MODEL || 'deepseek-v4-flash',
      supportsMedia: false,
    },
  };

  const ordered = media
    ? ['gemini', 'openrouter']
    : ['groq', 'gemini', 'openrouter', 'deepseek'];

  const names = explicit !== 'auto' && all[explicit] ? [explicit, ...ordered.filter(name => name !== explicit)] : ordered;
  return names.map(name => all[name]).filter(cfg => cfg?.apiKey && (!media || cfg.supportsMedia));
}

async function callAiEstimationModel(context, media = null, sourceText = '') {
  const prompt = buildAiEstimationPrompt(context, sourceText);
  const candidates = getProviderCandidates(media);

  for (const cfg of candidates) {
    const raw = cfg.provider === 'gemini'
      ? await callGeminiForAi(prompt, media)
      : await callOpenAICompatible({ ...cfg, prompt, media });
    const parsed = safeParseJSON(raw);
    if (parsed) {
      return { raw: parsed, ai_enabled: true, provider: cfg.provider, model: cfg.model };
    }
  }

  return { raw: null, ai_enabled: false, provider: null, model: null };
}

function findBestCategory(rawProject, context) {
  const categories = context.categories || [];
  const currentId = asPlainId(context.project?.loai_du_an || context.project?.category_id);
  const rawId = asPlainId(rawProject?.ma_loai_du_an || rawProject?.category_id);
  const rawSlug = String(rawProject?.loai_du_an_slug || rawProject?.slug || '').toLowerCase();

  return categories.find(cat => cat._id === rawId)
    || categories.find(cat => cat.slug && cat.slug.toLowerCase() === rawSlug)
    || categories.find(cat => cat._id === currentId)
    || categories[0]
    || null;
}

function coerceFieldValue(value, field) {
  if (!field) return value;
  if (field.type === 'number') {
    const num = Number(value);
    if (Number.isFinite(num)) return num;
    const match = String(value ?? '').match(/-?\d+(\.\d+)?/);
    return match ? Number(match[0]) : '';
  }
  if (field.type === 'boolean') {
    if (typeof value === 'boolean') return value;
    return ['true', '1', 'yes', 'co', 'có'].includes(String(value).toLowerCase());
  }
  if (field.type === 'multiselect') {
    if (Array.isArray(value)) return value;
    if (value === undefined || value === null || value === '') return [];
    return String(value).split(',').map(item => item.trim()).filter(Boolean);
  }
  return value === undefined || value === null ? '' : value;
}

function getSystemDifficulty(field, value) {
  if (!field?.field_key) return null;
  const evaluated = danhGiaDuAn({ [field.field_key]: value }, [field]);
  const detail = evaluated?.chi_tiet_do_kho?.[0];
  if (!detail) return null;
  return {
    difficulty_score: detail.diem_do_kho || detail.diem || 2,
    difficulty_level: detail.muc_do || scoreToLevel(detail.diem_do_kho || detail.diem || 2),
    difficulty_source: 'system',
  };
}

function normalizeCondition(rawCondition, field = null, isNew = false) {
  const value = field ? coerceFieldValue(rawCondition?.value, field) : (rawCondition?.value ?? '');
  const systemDifficulty = field ? getSystemDifficulty(field, value) : null;
  const aiScore = normalizeScore(rawCondition?.difficulty_score || rawCondition?.diem || 2);
  const difficulty = systemDifficulty || {
    difficulty_score: aiScore,
    difficulty_level: rawCondition?.difficulty_level || scoreToLevel(aiScore),
    difficulty_source: isNew ? 'ai_new' : 'ai_proposed',
  };

  return {
    temp_id: rawCondition?.temp_id || `${field?.field_key || rawCondition?.suggested_field_key || 'new'}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    field_key: field?.field_key || rawCondition?.field_key || rawCondition?.suggested_field_key || '',
    label: field?.label || rawCondition?.label || rawCondition?.name || 'Dieu kien moi',
    type: field?.type || rawCondition?.type || 'text',
    value,
    is_new: Boolean(isNew || !field),
    options: field?.options || [],
    required: Boolean(field?.required),
    confidence: Number(rawCondition?.confidence || 0),
    reason: rawCondition?.reason || '',
    ...difficulty,
  };
}

function appendCurrentProjectConditions(conditions, selectedFields, projectYeuCau = {}) {
  const existingKeys = new Set(conditions.filter(item => !item.is_new).map(item => item.field_key));
  selectedFields.forEach(field => {
    const value = projectYeuCau[field.field_key];
    if (existingKeys.has(field.field_key)) return;
    if (value === undefined || value === null || value === '' || value === false) return;
    if (Array.isArray(value) && value.length === 0) return;
    conditions.push(normalizeCondition({
      field_key: field.field_key,
      value,
      reason: 'Gia tri hien tai cua du an',
      confidence: 1,
    }, field, false));
  });
}

function normalizeAiEstimationProposal(aiResult, context, sourceText = '') {
  const normalizedContext = normalizeContext(context);
  const raw = aiResult.raw || {};
  const selectedCategory = findBestCategory(raw.project, normalizedContext);
  const selectedFields = selectedCategory ? (normalizedContext.fieldsByCategory[selectedCategory._id] || []) : [];
  const fieldMap = {};
  selectedFields.forEach(field => { fieldMap[field.field_key] = field; });

  const conditions = [];
  const rawKnown = Array.isArray(raw.conditions) ? raw.conditions : [];
  rawKnown.forEach(item => {
    const field = fieldMap[item.field_key];
    if (field) conditions.push(normalizeCondition(item, field, false));
    else if (item?.label || item?.value) conditions.push(normalizeCondition(item, null, true));
  });

  const rawNew = Array.isArray(raw.new_conditions) ? raw.new_conditions : [];
  rawNew.forEach(item => {
    if (item?.label || item?.value) conditions.push(normalizeCondition(item, null, true));
  });

  appendCurrentProjectConditions(conditions, selectedFields, normalizedContext.project?.yeu_cau || {});

  return {
    ai_enabled: Boolean(aiResult.ai_enabled),
    provider: aiResult.provider,
    model: aiResult.model,
    extracted_text: raw.extracted_text || sourceText || '',
    project: {
      ten_du_an: raw.project?.ten_du_an || normalizedContext.project?.ten_du_an || '',
      ma_loai_du_an: selectedCategory?._id || '',
      loai_du_an_slug: selectedCategory?.slug || '',
      loai_du_an_label: selectedCategory?.ten_hien_thi || '',
      mo_ta: raw.project?.mo_ta || normalizedContext.project?.mo_ta || '',
      deadline: raw.project?.deadline || normalizedContext.project?.deadline || null,
      muc_do_gap: ['binh_thuong', 'gap', 'sieu_gap'].includes(raw.project?.muc_do_gap)
        ? raw.project.muc_do_gap
        : (normalizedContext.project?.yeu_cau?.muc_do_gap || 'binh_thuong'),
    },
    conditions,
    missing_conditions: Array.isArray(raw.missing_conditions) ? raw.missing_conditions : [],
    notes: aiResult.ai_enabled
      ? (Array.isArray(raw.notes) ? raw.notes : [])
      : ['Chua cau hinh API key AI, he thong dang tra ve proposal tu du lieu hien co.'],
  };
}

async function analyzeAiEstimation(context, { media = null, sourceText = '' } = {}) {
  const normalized = normalizeContext(context);
  const aiResult = await callAiEstimationModel(normalized, media, sourceText);
  return normalizeAiEstimationProposal(aiResult, normalized, sourceText);
}

function buildConfirmedRequirements({ existingYeuCau = {}, conditions = [], fields = [], project = {} }) {
  const fieldMap = {};
  fields.map(toPlainField).forEach(field => { fieldMap[field.field_key] = field; });

  const yeuCau = { ...existingYeuCau };
  const reviewed = [];

  conditions.forEach((item, index) => {
    const field = item.field_key ? fieldMap[item.field_key] : null;
    const value = field ? coerceFieldValue(item.value, field) : (item.value ?? '');
    const score = normalizeScore(item.difficulty_score || item.diem || 2);
    const level = item.difficulty_level || scoreToLevel(score);

    if (field && !item.is_new) {
      yeuCau[field.field_key] = value;
    }

    if (item.label || item.field_key || value !== '') {
      reviewed.push({
        field_key: field?.field_key || item.field_key || '',
        label: field?.label || item.label || `Dieu kien ${index + 1}`,
        value,
        is_new: Boolean(item.is_new || !field),
        difficulty_score: score,
        difficulty_level: level,
        difficulty_effective_score: Math.min(score, 4),
        reason: item.reason || '',
      });
    }
  });

  if (project?.muc_do_gap) yeuCau.muc_do_gap = project.muc_do_gap;
  yeuCau.ai_reviewed_conditions = reviewed;
  yeuCau.ai_confirmed_at = new Date().toISOString();

  return yeuCau;
}

function mergeAiReviewedDifficulty(doKhoResult, yeuCau = {}) {
  const reviewed = Array.isArray(yeuCau.ai_reviewed_conditions) ? yeuCau.ai_reviewed_conditions : [];
  if (reviewed.length === 0) return doKhoResult;

  const chiTiet = Array.isArray(doKhoResult?.chi_tiet_do_kho)
    ? doKhoResult.chi_tiet_do_kho.map(item => ({ ...item }))
    : [];
  const byKey = {};
  chiTiet.forEach((item, index) => {
    if (item.field_key) byKey[item.field_key] = index;
  });

  reviewed.forEach(item => {
    const score = Math.min(normalizeScore(item.difficulty_effective_score || item.difficulty_score), 4);
    const detail = {
      field_key: item.field_key || `ai_new_${chiTiet.length + 1}`,
      label: item.label || item.field_key || 'Dieu kien AI',
      gia_tri: item.value,
      muc_do: item.difficulty_level || diemSangMucDo(score),
      diem_do_kho: score,
      ai_reviewed: true,
      is_new: Boolean(item.is_new),
      reason: item.reason || '',
    };

    if (item.field_key && byKey[item.field_key] !== undefined && !item.is_new) {
      chiTiet[byKey[item.field_key]] = { ...chiTiet[byKey[item.field_key]], ...detail };
    } else {
      chiTiet.push(detail);
    }
  });

  const total = chiTiet.reduce((sum, item) => sum + (Number(item.diem_do_kho || item.diem) || 0), 0);
  const avg = chiTiet.length > 0 ? total / chiTiet.length : 1;
  return {
    ...doKhoResult,
    chi_tiet_do_kho: chiTiet,
    muc_do_tong_the: diemSangMucDo(avg),
    diem_do_kho_tong: Math.round(avg * 100) / 100,
  };
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
  analyzeAiEstimation,
  buildConfirmedRequirements,
  mergeAiReviewedDifficulty,
  phanTichToanDien,
  phanTichYeuCau,
  danhGiaRuiRo,
  tuVanBaoGia,
  taoInsightsTongHop,
};
