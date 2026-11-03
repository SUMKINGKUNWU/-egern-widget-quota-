/**
 * 订阅余量 · Egern 小组件
 *
 * 读取订阅的 Subscription-Userinfo 响应头，或正文中的明确流量字段。
 * 不默认任何套餐总量，不把“未提供统计”显示成 0，不自动尝试多种客户端身份。
 * 自动统计周期：REFRESH_HOURS（0.5~24），默认 24 小时；周期内复用缓存。
 * 参数命名参考 Hark sub-traffic-hark-rings.yaml；旧参数 REFRESH_MINUTES、USER_AGENT 仍兼容。
 *
 * 本文件不含订阅地址、节点或证书，可安全地在私有仓库中维护。
 */

const MAX_SOURCES = 4;
const DEFAULT_REFRESH_MINUTES = 1440;
const MIN_REFRESH_MINUTES = 30;
const MAX_REFRESH_MINUTES = 1440;
const HTTP_TIMEOUT_MS = 8000;
const GIB = 1024 ** 3;

/* ------------------------------------------------------------------ */
/* 主题                                                                */
/* ------------------------------------------------------------------ */

const THEMES = {
  glacier: {
    name: '冰川蓝',
    background: { light: '#F1F5F9', dark: '#0F172A' },
    card: { light: '#FFFFFF', dark: '#1E293B' },
    text: { light: '#0F172A', dark: '#F1F5F9' },
    secondary: { light: '#475569', dark: '#CBD5E1' },
    muted: { light: '#64748B', dark: '#94A3B8' },
    accent: { light: '#2563EB', dark: '#76AEFA' },
    meter: { light: '#2A78D6', dark: '#3987E5' },
    track: { light: '#DCE5EF', dark: '#334155' },
    divider: { light: '#E2E8F0', dark: '#334155' },
    warnChip: { light: '#FEF3C7', dark: '#3F2A06' },
    warnInk: { light: '#7A3E00', dark: '#FCD34D' },
    dangerInk: { light: '#B42318', dark: '#FDA29B' },
  },
  mist: {
    name: '雾青灰',
    background: { light: '#EEF3F3', dark: '#101619' },
    card: { light: '#FFFFFF', dark: '#1B252A' },
    text: { light: '#10201F', dark: '#F1F7F6' },
    secondary: { light: '#405956', dark: '#C7D8D5' },
    muted: { light: '#5F7572', dark: '#93AAA6' },
    accent: { light: '#087F73', dark: '#58D6C0' },
    meter: { light: '#087F73', dark: '#58D6C0' },
    track: { light: '#DCE7E6', dark: '#33474B' },
    divider: { light: '#E3ECEB', dark: '#33474B' },
    warnChip: { light: '#FEF3C7', dark: '#3F2A06' },
    warnInk: { light: '#7A3E00', dark: '#FCD34D' },
    dangerInk: { light: '#A83232', dark: '#F7A3A3' },
  },
  iris: {
    name: '鸢尾紫',
    background: { light: '#F4F2F8', dark: '#17151E' },
    card: { light: '#FFFFFF', dark: '#262231' },
    text: { light: '#1B1726', dark: '#F6F3FB' },
    secondary: { light: '#50495F', dark: '#D5CDE5' },
    muted: { light: '#6B6479', dark: '#A79EB8' },
    accent: { light: '#7057D9', dark: '#B7A2FF' },
    meter: { light: '#7057D9', dark: '#B7A2FF' },
    track: { light: '#E7E2F0', dark: '#3B3548' },
    divider: { light: '#ECE7F3', dark: '#3B3548' },
    warnChip: { light: '#FEF3C7', dark: '#3F2A06' },
    warnInk: { light: '#7A3E00', dark: '#FCD34D' },
    dangerInk: { light: '#A83232', dark: '#F7A3A3' },
  },
  seasalt: {
    name: '海盐蓝绿',
    background: { light: '#EFF6F6', dark: '#102027' },
    card: { light: '#FFFFFF', dark: '#1C3038' },
    text: { light: '#0E2328', dark: '#EFFAFA' },
    secondary: { light: '#3A565C', dark: '#C1D9DD' },
    muted: { light: '#5B7479', dark: '#8FAAB0' },
    accent: { light: '#087F8C', dark: '#5DD3DF' },
    meter: { light: '#087F8C', dark: '#5DD3DF' },
    track: { light: '#DCEBEC', dark: '#2A424B' },
    divider: { light: '#E1EEEE', dark: '#2A424B' },
    warnChip: { light: '#FEF3C7', dark: '#3F2A06' },
    warnInk: { light: '#7A3E00', dark: '#FCD34D' },
    dangerInk: { light: '#A83232', dark: '#F7A3A3' },
  },
  amber: {
    name: '石墨琥珀',
    background: { light: '#F5F3EF', dark: '#191816' },
    card: { light: '#FFFFFF', dark: '#292621' },
    text: { light: '#211D16', dark: '#F7F2E8' },
    secondary: { light: '#574F43', dark: '#D8CCB9' },
    muted: { light: '#6F6556', dark: '#AE9F8A' },
    accent: { light: '#9B6010', dark: '#E9BB69' },
    meter: { light: '#A96B12', dark: '#E9BB69' },
    track: { light: '#E8E1D5', dark: '#3B352C' },
    divider: { light: '#EAE5DC', dark: '#3B352C' },
    warnChip: { light: '#FEF3C7', dark: '#3F2A06' },
    warnInk: { light: '#7A3E00', dark: '#FCD34D' },
    dangerInk: { light: '#9E2A2A', dark: '#F7A3A3' },
  },
};

// 环形版视觉参数（参考 Hark）。palette 写进 SVG，必须是固定色值字符串。
const GLASS = { light: '#FFFFFFA6', dark: '#FFFFFF1A' };
const STYLES = {
  glacier: {
    palette: ['#3B82F6', '#06B6D4', '#8B5CF6', '#F59E0B'],
    gradient: [{ light: '#EAF2FF', dark: '#0B1426' }, { light: '#F1F6FD', dark: '#0E1A30' }, { light: '#EEF8FB', dark: '#081A22' }],
  },
  mist: {
    palette: ['#14B8A6', '#64748B', '#0EA5E9', '#F59E0B'],
    gradient: [{ light: '#ECF3F2', dark: '#0C1514' }, { light: '#F1F5F5', dark: '#111B1D' }, { light: '#EEF2F5', dark: '#0E1519' }],
  },
  iris: {
    palette: ['#BF5AF2', '#0A84FF', '#30D158', '#FF9F0A'],
    gradient: [{ light: '#F3EEFF', dark: '#1A0F33' }, { light: '#EEF4FF', dark: '#0B1530' }, { light: '#F2FBF7', dark: '#06120E' }],
  },
  seasalt: {
    palette: ['#14B8A6', '#0EA5E9', '#22C55E', '#F97316'],
    gradient: [{ light: '#EAF7F6', dark: '#06191C' }, { light: '#EEF6FB', dark: '#0A1824' }, { light: '#F0FAF4', dark: '#07150F' }],
  },
  amber: {
    palette: ['#F59E0B', '#EF4444', '#10B981', '#6366F1'],
    gradient: [{ light: '#FBF4E8', dark: '#1A140A' }, { light: '#F7F3EC', dark: '#171310' }, { light: '#F3F1EC', dark: '#121110' }],
  },
};

function themeFor(value) {
  const requested = String(value || '').trim().toLowerCase();
  const key = THEMES[requested] ? requested : 'glacier';
  return { ...THEMES[key], ...STYLES[key], glass: GLASS, warn: '#FF9F0A', fail: '#FF453A' };
}

/* ------------------------------------------------------------------ */
/* 数据解析                                                            */
/* ------------------------------------------------------------------ */

function readHeader(headers, name) {
  if (!headers) return '';
  const target = String(name).toLowerCase();
  if (typeof headers.get === 'function') {
    const value = headers.get(name);
    if (Array.isArray(value)) return value.join(', ');
    return value == null ? '' : String(value);
  }
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() !== target) continue;
    const value = headers[key];
    return Array.isArray(value) ? value.join(', ') : String(value ?? '');
  }
  return '';
}

function parseUserInfo(raw) {
  const fields = {};
  String(raw || '').split(';').forEach(part => {
    const at = part.indexOf('=');
    if (at < 1) return;
    const key = part.slice(0, at).trim().toLowerCase();
    const value = Number(part.slice(at + 1).trim());
    if (Number.isFinite(value)) fields[key] = value;
  });
  if (!Number.isFinite(fields.upload) || !Number.isFinite(fields.download)) return null;

  const upload = Math.max(0, fields.upload);
  const download = Math.max(0, fields.download);
  const used = upload + download;
  const rawTotal = Number.isFinite(fields.total) ? Math.max(0, fields.total) : null;
  // A zero total is not treated as unlimited unless the source explicitly
  // declares infinity; this widget has no such declaration channel.
  const total = rawTotal != null && rawTotal > 0 ? rawTotal : null;
  const remaining = total == null ? null : total - used;
  const expireValue = Number.isFinite(fields.expire) && fields.expire > 0 ? fields.expire : null;

  return {
    upload, download, used, total, remaining,
    totalUnspecified: total == null && rawTotal === 0,
    expireAt: expireValue == null ? null : expireValue > 1e12 ? expireValue : expireValue * 1000,
    source: 'header',
    unlimited: null,
  };
}

// Decimal units (GB = 10^9) and binary units (GiB = 2^30) are different
// quantities; a source's unit must never be silently reinterpreted.
const UNITS = { B: 1, KB: 1000, MB: 1000 ** 2, GB: 1000 ** 3, TB: 1000 ** 4, PB: 1000 ** 5,
                KIB: 1024, MIB: 1024 ** 2, GIB: 1024 ** 3, TIB: 1024 ** 4 };

function toBytes(value, unit) {
  const multiplier = UNITS[String(unit || '').toUpperCase()];
  const number = Number(value);
  if (multiplier == null || !Number.isFinite(number)) return null;
  return number * multiplier;
}

function parseBytesToken(text) {
  const match = String(text || '').match(/([0-9]+(?:\.[0-9]+)?)\s*(PB|TB|GB|MB|KB|B|TIB|GIB|MIB|KIB)/i);
  return match ? toBytes(match[1], match[2]) : null;
}

function parseBodyInfo(body) {
  const source = String(body || '');
  if (!source || source.length > 4 * 1024 * 1024) return null;

  const remaining = parseBytesToken((source.match(/(?:剩余(?:流量)?|流量剩余)[：:\s]*([0-9.]+)\s*(?:PB|TB|GB|MB|KB|B)/i) || [])[0]);
  const totalToken = source.match(/(?:总(?:流量|量)|套餐流量|套餐总量)[：:\s]*([0-9.]+)\s*(?:PB|TB|GB|MB|KB|B)/i);
  const usedToken = source.match(/已用(?:流量)?[：:\s]*([0-9.]+)\s*(?:PB|TB|GB|MB|KB|B)/i);
  const expireToken = source.match(/(?:有效期|到期(?:时间)?|过期(?:时间)?)[：:\s]*([12]\d{3}[-/.]\d{1,2}[-/.]\d{1,2})/i);

  // Fall back to a labelled upload/download pair when no remaining line exists.
  if (remaining == null) {
    const upload = parseBytesToken((source.match(/上传[：:\s]*(?:[0-9.]+\s*(?:PB|TB|GB|MB|KB|B))/i) || [])[0]);
    const download = parseBytesToken((source.match(/下载[：:\s]*(?:[0-9.]+\s*(?:PB|TB|GB|MB|KB|B))/i) || [])[0]);
    if (upload == null && download == null) return null;
    const used = (upload || 0) + (download || 0);
    const total = totalToken ? parseBytesToken(totalToken[0]) : null;
    return {
      upload, download, used, total,
      remaining: total == null ? null : total - used,
      totalUnspecified: false,
      expireAt: parseExpire(expireToken),
      source: 'body',
      unlimited: null,
    };
  }

  const total = totalToken ? parseBytesToken(totalToken[0]) : null;
  const explicitUsed = usedToken ? parseBytesToken(usedToken[0]) : null;
  return {
    upload: null,
    download: null,
    used: explicitUsed != null ? explicitUsed : (total == null ? null : Math.max(0, total - remaining)),
    total,
    remaining,
    totalUnspecified: false,
    expireAt: parseExpire(expireToken),
    source: 'body',
    unlimited: null,
  };
}

function parseExpire(token) {
  if (!token) return null;
  const normalized = token[1].replace(/[/.]/g, '-');
  const parsed = new Date(`${normalized}T23:59:59+08:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
}

/* ------------------------------------------------------------------ */
/* 展示计算                                                            */
/* ------------------------------------------------------------------ */

function displayUnit(env) {
  return String(env?.UNIT || 'GiB').toLowerCase() === 'gb' ? 'GB' : 'GiB';
}

function unitBytes(env) {
  return displayUnit(env) === 'GB' ? 1000 ** 3 : GIB;
}

function formatBytes(bytes, env, options = {}) {
  if (!Number.isFinite(bytes)) return '--';
  const divisor = unitBytes(env);
  const unit = displayUnit(env);
  const tib = divisor * 1024;
  const value = Math.abs(bytes) >= tib ? bytes / tib : bytes / divisor;
  const suffix = Math.abs(bytes) >= tib ? (unit === 'GB' ? 'TB' : 'TiB') : unit;
  const decimals = options.decimals != null ? options.decimals : value >= 100 ? 0 : value >= 10 ? 1 : 2;
  let text = value.toFixed(decimals).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
  if (text === '-0') text = '0';
  return `${text} ${suffix}`;
}

function splitBytes(bytes, env) {
  const text = formatBytes(bytes, env);
  const at = text.lastIndexOf(' ');
  return { number: text.slice(0, at), unit: text.slice(at + 1) };
}

function knownBytes(entry) {
  const t = entry?.traffic;
  return Boolean(t) && Number.isFinite(t.total) && t.total > 0 && Number.isFinite(t.remaining);
}

function missingPercent(entry) {
  // Only say "percentage unknown" when the source actually supplied a
  // remaining value but no trustworthy plan total.
  return knownBytes(entry) ? false : Boolean(entry?.traffic) && !entry.traffic.unlimited;
}

function percentLeft(traffic) {
  if (!traffic || !Number.isFinite(traffic.remaining) || !Number.isFinite(traffic.total) || traffic.total <= 0) return null;
  return Math.max(0, Math.min(1, traffic.remaining / traffic.total));
}

function applyManualTotal(traffic, source, env) {
  if (!traffic) return traffic;
  const manual = Number(source.totalGb);
  if (!Number.isFinite(manual) || manual <= 0) return traffic;
  if (Number.isFinite(traffic.total)) {
    // A manual total is metadata only; never overwrite a source-reported value.
    return traffic;
  }
  if (!Number.isFinite(traffic.remaining)) return traffic;
  const total = manual * unitBytes(env);
  return { ...traffic, total, used: Math.max(0, total - traffic.remaining), totalEstimated: true };
}

function statusOf(entry) {
  if (entry.state === 'error') return { key: 'error', label: '查询失败', tone: 'danger' };
  if (entry.state === 'stats-unavailable') return { key: 'unavailable', label: '未提供统计', tone: 'muted' };
  if (entry.state === 'contradiction') return { key: 'contradiction', label: '数据需核对', tone: 'danger' };
  const t = entry.traffic;
  if (!t) return { key: 'unknown', label: '未提供统计', tone: 'muted' };
  if (t.remaining != null && t.remaining <= 0) {
    return { key: 'exhausted', label: '已用尽', tone: 'danger' };
  }
  const p = percentLeft(t);
  if (p != null && p <= 0.05) return { key: 'critical', label: '即将用尽', tone: 'danger' };
  if (p != null && p <= 0.2) return { key: 'low', label: '低余量', tone: 'warn' };
  if (entry.stale) return { key: 'stale', label: '缓存', tone: 'warn' };
  return { key: 'ok', label: '', tone: 'ok' };
}

/* ------------------------------------------------------------------ */
/* 存储与获取                                                          */
/* ------------------------------------------------------------------ */

function hashKey(value) {
  let hash = 2166136261;
  const text = String(value || '');
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function cacheKey(source) {
  return `quota.v1.${source.id}.${hashKey(source.url)}`;
}

function readCache(ctx, key) {
  try {
    const value = ctx.storage?.getJSON?.(key);
    return value && typeof value === 'object' ? value : null;
  } catch {
    return null;
  }
}

function writeCache(ctx, key, value) {
  try { ctx.storage?.setJSON?.(key, value); } catch { /* storage is optional */ }
}

function localDateKey(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

// Daily usage can only be measured from the source's own counters: the
// difference between two samples taken on the same local day. Widget renders
// are not samples, and a quota reset must not be mistaken for negative usage.
function usageMetric(traffic) {
  if (!traffic) return null;
  if (Number.isFinite(traffic.used)) return traffic.used;
  // When only "remaining" is published, a decrease still means consumption.
  if (Number.isFinite(traffic.remaining)) return -traffic.remaining;
  return null;
}

function updateDayStats(previous, traffic, now) {
  const metric = usageMetric(traffic);
  if (metric == null) return { dayStats: previous || null, todayUsed: null, todaySamples: 0 };
  const today = localDateKey(now);
  const prev = previous && previous.date === today ? previous : null;
  if (!prev || !Number.isFinite(prev.baseline) || metric < prev.baseline) {
    // First sample of a new day, or the counter decreased (quota reset or
    // plan change): restart the baseline instead of reporting negative usage.
    return {
      dayStats: { date: today, baseline: metric, samples: 1, updatedAt: now },
      todayUsed: null,
      todaySamples: 1,
    };
  }
  return {
    dayStats: { date: today, baseline: prev.baseline, samples: prev.samples + 1, updatedAt: now },
    todayUsed: metric - prev.baseline,
    todaySamples: prev.samples + 1,
  };
}

function refreshMinutes(env) {
  const hours = String(env?.REFRESH_HOURS ?? '').trim();
  const minutes = String(env?.REFRESH_MINUTES ?? '').trim();
  const raw = hours ? Number(hours) * 60 : minutes ? Number(minutes) : NaN;
  if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_REFRESH_MINUTES;
  return Math.min(MAX_REFRESH_MINUTES, Math.max(MIN_REFRESH_MINUTES, Math.round(raw)));
}

// Best-effort labels derived from the subscription's own node/profile names.
// These are display hints only: when the source exposes nothing recognizable
// the user-supplied name and region are kept, and nothing is invented.
const REGION_HINTS = [
  // 两字母代码要求前后都不是字母，避免 STATUS、MODE 一类单词误判。
  [/香港|Hong\s*Kong|(?:^|[^A-Za-z])HK(?![A-Za-z])/i, 'HK'],
  [/台湾|台灣|Taiwan|(?:^|[^A-Za-z])TW(?![A-Za-z])/i, 'TW'],
  [/日本|Japan|(?:^|[^A-Za-z])JP(?![A-Za-z])|东京|東京|大阪/i, 'JP'],
  [/新加坡|狮城|獅城|Singapore|(?:^|[^A-Za-z])SG(?![A-Za-z])/i, 'SG'],
  [/韩国|韓國|Korea|(?:^|[^A-Za-z])KR(?![A-Za-z])|首尔|首爾/i, 'KR'],
  [/美国|美國|United\s*States|USA|(?:^|[^A-Za-z])US(?![A-Za-z])/i, 'US'],
  [/德国|德國|Germany|(?:^|[^A-Za-z])DE(?![A-Za-z])/i, 'DE'],
];

function detectRegion(text, fallback) {
  const source = String(text || '');
  for (const [pattern, code] of REGION_HINTS) {
    if (pattern.test(source)) return code;
  }
  return fallback;
}

function detectProfileName(body) {
  const text = String(body || '').slice(0, 200000);
  let match = text.match(/(?:^|\n)\s*(?:profile-name|profileName|title|name)\s*[:=]\s*["']?([^"'\n#]{1,40})/i);
  if (match) return match[1].trim();
  match = text.match(/(?:流量|套餐|订阅|机场|机场名)[：:]\s*([^\n<]{1,30})/);
  return match ? match[1].trim() : '';
}

function readSources(ctx) {
  const env = ctx.env || {};
  const sources = [];
  for (let i = 1; i <= MAX_SOURCES; i++) {
    const url = String(env[`SUB${i}_URL`] || '').trim();
    if (!url) continue;
    sources.push({
      id: `s${i}`,
      name: String(env[`SUB${i}_NAME`] || '').trim(),
      region: String(env[`SUB${i}_REGION`] || '').trim().toUpperCase(),
      url,
      totalGb: String(env[`SUB${i}_TOTAL_GB`] || '').trim(),
      resetDay: String(env[`SUB${i}_RESET_DAY`] || '').trim(),
      detectedName: '',
      detectedRegion: '',
    });
  }
  return sources;
}

function applyDetectedLabels(source, body) {
  const hint = detectProfileName(body);
  const guessed = detectRegion(hint ? `${hint} ${body.slice(0, 4000)}` : String(body || '').slice(0, 4000), '');
  return {
    ...source,
    name: source.name || source.detectedName || (hint ? hint.slice(0, 16) : '') || '订阅',
    region: source.region || guessed || '',
    detectedName: hint,
    detectedRegion: guessed,
  };
}

function demoSources() {
  return [
    { id: 'kr', name: '韩国', region: 'KR', url: 'demo://kr', totalGb: '', resetDay: '' },
    { id: 'us-a', name: '美国 A', region: 'US-A', url: 'demo://us-a', totalGb: '', resetDay: '' },
    { id: 'us-b', name: '美国 B', region: 'US-B', url: 'demo://us-b', totalGb: '', resetDay: '' },
    { id: 'de', name: '德国', region: 'DE', url: 'demo://de', totalGb: '', resetDay: '' },
  ];
}

function demoTariffs(id) {
  if (id === 'kr') return { upload: 12 * GIB, download: 60 * GIB, used: 72 * GIB, total: 200 * GIB, remaining: 128 * GIB, expireAt: null, source: 'demo' };
  if (id === 'us-a') return { upload: 2 * GIB, download: 80 * GIB, used: 82 * GIB, total: 100 * GIB, remaining: 18 * GIB, expireAt: null, source: 'demo' };
  if (id === 'de') return { upload: 60 * GIB, download: 300 * GIB, used: 360 * GIB, total: 1000 * GIB, remaining: 640 * GIB, expireAt: null, source: 'demo' };
  return null;
}

function demoTodayUsed(id) {
  if (id === 'kr') return 7036874417;   // 6.55 GiB
  if (id === 'us-a') return 4514048942; // 4.20 GiB
  if (id === 'de') return 20937965568;  // 19.50 GiB
  return null;
}

function requestHeaders(env) {
  const ua = String(env?.SUBSCRIPTION_USER_AGENT || env?.USER_AGENT || '').trim();
  return ua ? { 'User-Agent': ua } : {};
}

async function readBody(response) {
  try {
    if (typeof response?.text === 'function') return await response.text();
    return typeof response?.body === 'string' ? response.body : '';
  } catch {
    return '';
  }
}

function looksAccessDenied(status, body) {
  if (status === 401 || status === 403 || status === 429) return true;
  return /信任\s*IP|IP\s*未授权|访问被拒绝|forbidden/i.test(String(body || ''));
}

async function attemptFetch(ctx, source) {
  const env = ctx.env || {};
  const headers = requestHeaders(env);
  // A total script budget below the host timeout keeps a hung subscription
  // from starving the other sources.
  const timeout = Math.min(HTTP_TIMEOUT_MS, Math.max(2000, Number(env.TIMEOUT_MS) || HTTP_TIMEOUT_MS));
  const response = await ctx.http.get(source.url, {
    timeout,
    redirect: 'follow',
    headers,
  });
  const status = Number(response?.status || 0);
  const fromHeader = parseUserInfo(readHeader(response?.headers, 'subscription-userinfo'));
  const profileName = readHeader(response?.headers, 'profile-title') || '';
  const body = await readBody(response);
  if (looksAccessDenied(status, body)) {
    return { traffic: null, accessDenied: true, status, body };
  }
  const label = profileName || body;
  if (fromHeader) return { traffic: fromHeader, nodeHint: true, label };
  const fromBody = parseBodyInfo(body);
  if (fromBody) return { traffic: fromBody, nodeHint: true, label };
  return {
    traffic: null,
    statsUnavailable: status >= 200 && status < 300,
    status,
    label,
  };
}

async function fetchSource(ctx, source, now) {
  const env = ctx.env || {};
  const ttl = refreshMinutes(env) * 60000;
  const key = cacheKey(source);
  const cached = readCache(ctx, key);
  if (cached && Number.isFinite(cached.nextCheckAt) && now < cached.nextCheckAt) {
    return materialize(cached, source, env, now, 'cache');
  }

  if (String(env.DEMO_MODE || '').toLowerCase() === 'true') {
    const traffic = demoTariffs(source.id);
    const day = updateDayStats(null, traffic, now);
    const snapshot = traffic
      ? { traffic, updatedAt: now, lastSuccessAt: now, capability: 'stats', nextCheckAt: now + ttl, ...day, demoTodayUsed: demoTodayUsed(source.id) }
      : { traffic: null, updatedAt: now, lastSuccessAt: null, capability: 'unavailable', nextCheckAt: now + ttl, ...day };
    writeCache(ctx, key, snapshot);
    return materialize(snapshot, source, env, now, 'live');
  }

  try {
    const result = await attemptFetch(ctx, source);
    const labeled = applyDetectedLabels(source, result.label || '');
    if (result.traffic) {
      const day = updateDayStats(cached?.dayStats, result.traffic, now);
      const snapshot = { traffic: result.traffic, updatedAt: now, lastSuccessAt: now, capability: 'stats', nextCheckAt: now + ttl, ...day, label: result.label || '' };
      writeCache(ctx, key, snapshot);
      return materialize(snapshot, labeled, env, now, 'live');
    }
    if (result.accessDenied) {
      const msg = `订阅拒绝访问（HTTP ${result.status || '未知'}）`;
      const snapshot = cached ? { ...cached, nextCheckAt: now + ttl, lastError: msg }
        : { traffic: null, updatedAt: now, lastSuccessAt: null, capability: 'error', nextCheckAt: now + ttl, lastError: msg };
      writeCache(ctx, key, snapshot);
      return materialize(snapshot, labeled, env, now, 'live');
    }
    if (result.statsUnavailable) {
      const snapshot = cached
        ? { ...cached, nextCheckAt: now + ttl, capability: 'unavailable', label: result.label || cached.label || '' }
        : { traffic: null, updatedAt: now, lastSuccessAt: null, capability: 'unavailable', nextCheckAt: now + ttl, label: result.label || '' };
      writeCache(ctx, key, snapshot);
      return materialize(snapshot, labeled, env, now, 'live');
    }
    throw new Error(`HTTP ${result.status || '未知'}`);
  } catch (error) {
    const message = String(error?.message || error || '读取失败');
    const snapshot = cached
      ? { ...cached, nextCheckAt: now + ttl, lastError: message }
      : { traffic: null, updatedAt: now, lastSuccessAt: null, capability: 'error', nextCheckAt: now + ttl, lastError: message };
    writeCache(ctx, key, snapshot);
    return materialize(snapshot, source, env, now, 'live');
  }
}

function materialize(snapshot, source, env, now, fetchMode) {
  let traffic = snapshot.traffic ? applyManualTotal(snapshot.traffic, source, env) : null;
  let state = 'ready';
  if (!traffic) {
    state = snapshot.capability === 'error' ? 'error' : 'stats-unavailable';
  } else if (Number.isFinite(traffic.used) && Number.isFinite(traffic.total) && traffic.used > traffic.total) {
    state = 'contradiction';
  }
  // Normal cache reuse within the refresh window is not "stale". It becomes
  // stale when the subscription no longer reports statistics or a refresh
  // attempt failed and the last good values are being retained.
  const stale = Boolean(traffic) && (snapshot.capability !== 'stats' || Boolean(snapshot.lastError));
  return {
    ...source,
    traffic,
    state,
    stale,
    updatedAt: snapshot.updatedAt || now,
    lastSuccessAt: snapshot.lastSuccessAt || (traffic ? snapshot.updatedAt : null),
    lastError: snapshot.lastError || '',
    capability: snapshot.capability,
    fetchMode,
    todayUsed: Number.isFinite(snapshot.demoTodayUsed) ? snapshot.demoTodayUsed : (snapshot.todayUsed ?? null),
    todaySamples: snapshot.todaySamples || 0,
    dayDate: snapshot.dayStats?.date || null,
  };
}


/* ------------------------------------------------------------------ */
/* 视觉组件（列表版：每个订阅各自显示）           */
/* ------------------------------------------------------------------ */

function svgUri(svg) { return 'data:image/svg+xml,' + encodeURIComponent(svg); }

function barSvg(pct, color, w, h) {
  const p = Math.max(0, Math.min(1, Number(pct) || 0));
  const r = h / 2;
  const fw = p > 0 ? Math.max(h, w * p) : 0;
  return svgUri(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${w} ${h}'><rect width='${w}' height='${h}' rx='${r}' fill='${color}' fill-opacity='0.2'/>${fw ? `<rect width='${fw.toFixed(1)}' height='${h}' rx='${r}' fill='${color}'/>` : ''}</svg>`);
}

function text(value, size, color, weight = 'regular', extra = {}) {
  return { type: 'text', text: String(value), font: { size, weight }, textColor: color, maxLines: 1, minScale: 0.6, ...extra };
}

function icon(name, color, size = 12) {
  return { type: 'image', src: `sf-symbol:${name}`, width: size, height: size, color };
}

function spacer() { return { type: 'spacer' }; }

function dot(color) {
  return { type: 'stack', width: 6, height: 6, borderRadius: 3, backgroundColor: color, children: [] };
}

function glass(children, theme, extra = {}) {
  return { type: 'stack', direction: 'column', alignItems: 'start', gap: 6, padding: 12, borderRadius: 20, backgroundColor: theme.glass, children, ...extra };
}

function bg(theme) {
  return {
    type: 'linear',
    colors: theme.gradient,
    stops: [0, 0.55, 1],
    startPoint: { x: 0, y: 0 },
    endPoint: { x: 1, y: 1 },
  };
}

function colorOf(i, theme) { return theme.palette[i % theme.palette.length]; }

function lastUpdated(list) {
  const ts = Math.max(0, ...list.map(s => s.lastSuccessAt || 0));
  if (!ts) return '--';
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function header(list, theme, title) {
  const bad = list.filter(s => ['low', 'critical', 'exhausted', 'error', 'contradiction'].includes(statusOf(s).key)).length;
  return {
    type: 'stack', direction: 'row', alignItems: 'center', gap: 5,
    children: [
      icon('chart.bar.fill', theme.accent.light, 13),
      text(title, 13, theme.text, 'semibold'),
      spacer(),
      ...(bad ? [dot(theme.warn)] : []),
      text(`更新 ${lastUpdated(list)}`, 10, theme.muted),
    ],
  };
}

function refreshAfter(ctx) {
  return new Date(Date.now() + refreshMinutes(ctx.env) * 60000).toISOString();
}

function titleOf(ctx) {
  const title = String(ctx.env?.WIDGET_TITLE || '').trim();
  return title || '订阅余量';
}

function resetInfo(resetDayText) {
  const day = Number(resetDayText);
  if (!resetDayText || !Number.isFinite(day) || day < 1 || day > 31) return null;
  const now = new Date();
  let year = now.getFullYear(), month = now.getMonth();
  const lastDay = (y, m) => new Date(y, m + 1, 0).getDate();
  let target = new Date(year, month, Math.min(day, lastDay(year, month)));
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (target < today) {
    month += 1;
    if (month > 11) { month = 0; year += 1; }
    target = new Date(year, month, Math.min(day, lastDay(year, month)));
  }
  return Math.round((target - today) / 86400000);
}

function daysUntil(ts) {
  if (!ts) return null;
  return Math.ceil((ts - Date.now()) / 86400000);
}

function fmtBytes(bytes) {
  if (!Number.isFinite(bytes)) return '--';
  const divisor = GIB;
  const tib = divisor * 1024;
  const value = Math.abs(bytes) >= tib ? bytes / tib : bytes / divisor;
  const suffix = Math.abs(bytes) >= tib ? 'TiB' : 'GiB';
  const decimals = value >= 100 ? 0 : value >= 10 ? 1 : 2;
  let text = value.toFixed(decimals).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
  if (text === '-0') text = '0';
  return `${text} ${suffix}`;
}

function splitAmt(bytes) {
  const s = fmtBytes(bytes);
  const at = s.lastIndexOf(' ');
  return { n: s.slice(0, at), u: s.slice(at + 1) };
}

function bigRemain(entry, theme, size) {
  const t = entry.traffic;
  if (!t || !Number.isFinite(t.remaining)) {
    return text('--', size, theme.muted, 'bold');
  }
  const b = splitAmt(t.remaining);
  return {
    type: 'stack', direction: 'row', alignItems: 'end', gap: 2,
    children: [text(b.n, size, theme.text, 'bold'), text(b.u, Math.round(size * 0.45), theme.muted, 'semibold')],
  };
}

function pctLeft(t) {
  if (!t || !Number.isFinite(t.remaining) || !Number.isFinite(t.total) || t.total <= 0) return null;
  return Math.max(0, Math.min(1, t.remaining / t.total));
}

function errorSummary(entry) {
  const message = String(entry.lastError || '');
  if (/拒绝访问|HTTP\s*40[13]|HTTP\s*429/.test(message)) return '订阅拒绝访问';
  return '查询失败';
}

function todayText(entry) {
  if (!entry.traffic) return '';
  if (Number.isFinite(entry.todayUsed)) return `今日 ${fmtBytes(entry.todayUsed)}`;
  return '今日 --';
}

function metaLine(entry) {
  const t = entry.traffic;
  if (!t) return entry.state === 'error' ? errorSummary(entry) : '订阅未提供额度';
  const bits = [];
  const e = daysUntil(t.expireAt);
  bits.push(e == null ? '长期有效' : `到期 ${Math.max(0, e)} 天`);
  const r = resetInfo(entry.resetDay);
  if (r != null) bits.push(r === 0 ? '今日重置' : `重置 ${r} 天`);
  if (entry.todayUsed != null) bits.push(todayText(entry));
  if (t.totalEstimated) bits.push('总量手填');
  return bits.join(' · ');
}

function dailyBudget(entry) {
  const t = entry.traffic;
  if (!t || !Number.isFinite(t.remaining)) return null;
  const r = resetInfo(entry.resetDay);
  const e = daysUntil(t.expireAt);
  const days = r != null ? Math.max(1, r) : e != null ? Math.max(1, e) : null;
  return days ? t.remaining / days : null;
}

function nameLabel(entry, theme, size) {
  return [
    text(entry.name, size, theme.text, 'semibold'),
    ...(entry.region ? [text(entry.region, size - 2, theme.muted, 'semibold')] : []),
  ];
}

function statusInk(st, theme, fallback) {
  if (st.key === 'ok') return fallback;
  return st.tone === 'danger' ? theme.fail : st.tone === 'warn' ? theme.warn : theme.muted.light;
}

// 已用 / 总量；缺哪项就只写有的那项，不推算。
function usedTotal(t) {
  if (Number.isFinite(t.used) && Number.isFinite(t.total)) return `已用 ${fmtBytes(t.used)} / ${fmtBytes(t.total)}`;
  if (t.totalUnspecified) return '总量未提供';
  if (Number.isFinite(t.used)) return `已用 ${fmtBytes(t.used)}`;
  if (Number.isFinite(t.total)) return `总量 ${fmtBytes(t.total)}`;
  return '总量未提供';
}

// 到期与重置；两者都没有时返回空串，不写“长期有效”之类的推测。
function cycleText(entry) {
  const t = entry.traffic;
  const bits = [];
  const r = resetInfo(entry.resetDay);
  if (r != null) bits.push(r === 0 ? '今日重置' : `${r} 天后重置`);
  const e = t ? daysUntil(t.expireAt) : null;
  if (e != null) bits.push(e >= 0 ? `${e} 天后到期` : '已到期');
  if (t?.totalEstimated) bits.push('总量手填');
  return bits.join(' · ');
}

function joinBits(...bits) { return bits.filter(Boolean).join(' · '); }

/* ---------- 多订阅：每个订阅各自一行 ---------- */

// 一个订阅的行。compact：只保留一行文字；bar：显示该订阅自己的进度条。
function subRow(entry, i, theme, o) {
  const color = colorOf(i, theme);
  const st = statusOf(entry);
  const ink = statusInk(st, theme, color);
  const t = entry.traffic;
  const p = pctLeft(t);
  const head = {
    type: 'stack', direction: 'row', alignItems: 'center', gap: 5,
    children: [
      dot(ink),
      ...nameLabel(entry, theme, o.nameSize),
      ...(st.label ? [text(st.label, o.smallSize, ink, 'semibold')] : []),
      spacer(),
      ...(t ? [
        text(fmtBytes(t.remaining), o.valueSize, theme.text, 'bold'),
        ...(p != null ? [text(`${Math.round(p * 100)}%`, o.smallSize, ink, 'semibold', { minScale: 1 })] : []),
      ] : []),
      ...(o.compact && t ? [text(todayText(entry), o.smallSize, theme.muted, 'medium')] : []),
    ],
  };
  if (o.compact) return head;
  const children = [head];
  if (!t) {
    children.push(text(metaLine(entry), o.smallSize, theme.muted));
  } else {
    if (o.bar) children.push({ type: 'image', src: barSvg(p == null ? 1 : p, color, o.barW, o.barH), width: o.barW, height: o.barH });
    if (o.lines === 1) {
      children.push(text(joinBits(todayText(entry), usedTotal(t), o.cycle ? cycleText(entry) : ''), o.smallSize, theme.muted, 'medium', { minScale: 0.7 }));
    } else {
      children.push(text(joinBits(todayText(entry), usedTotal(t)), o.smallSize, theme.muted, 'medium', { minScale: 0.7 }));
      const c = cycleText(entry);
      if (c) children.push(text(c, o.smallSize, theme.muted, 'medium', { minScale: 0.7 }));
    }
  }
  return { type: 'stack', direction: 'column', alignItems: 'start', gap: o.innerGap, children };
}

function multiSmall(ctx, list, theme) {
  const shown = list.slice(0, 4);
  const n = shown.length;
  const opts = n <= 2
    ? { nameSize: 11, valueSize: 12, smallSize: 9, bar: true, barW: 130, barH: 3, lines: 1, innerGap: 3 }
    : { nameSize: 10, valueSize: 10, smallSize: 8.5, bar: false, lines: 1, innerGap: 1 };
  return {
    type: 'widget', padding: 12, gap: n <= 2 ? 8 : 5, backgroundGradient: bg(theme), refreshAfter: refreshAfter(ctx),
    children: [
      { type: 'stack', direction: 'row', alignItems: 'center', gap: 5, children: [icon('chart.bar.fill', theme.accent.light, 11), text(titleOf(ctx), 11, theme.text, 'semibold'), spacer(), text(lastUpdated(list), 9, theme.muted)] },
      ...shown.map((s, i) => subRow(s, i, theme, opts)),
      spacer(),
    ],
  };
}

function multiMedium(ctx, list, theme) {
  const shown = list.slice(0, 4);
  const n = shown.length;
  let opts;
  if (n <= 2) opts = { nameSize: 12, valueSize: 14, smallSize: 9.5, bar: true, barW: 280, barH: 4, lines: 2, innerGap: 3 };
  else if (n === 3) opts = { nameSize: 11.5, valueSize: 13, smallSize: 9, bar: true, barW: 280, barH: 3, lines: 1, cycle: false, innerGap: 3 };
  else opts = { nameSize: 11, valueSize: 12, smallSize: 9, compact: true };
  return {
    type: 'widget', padding: [12, 14], gap: 8, backgroundGradient: bg(theme), refreshAfter: refreshAfter(ctx),
    children: [
      header(list, theme, titleOf(ctx)),
      glass(shown.map((s, i) => subRow(s, i, theme, opts)), theme, { flex: 1, gap: n <= 2 ? 10 : n === 3 ? 7 : 8, padding: [9, 12], borderRadius: 16 }),
    ],
  };
}

function multiLarge(ctx, list, theme) {
  const shown = list.slice(0, 4);
  const n = shown.length;
  const opts = { nameSize: 12.5, valueSize: n >= 4 ? 14 : 16, smallSize: 10, bar: true, barW: 290, barH: n >= 4 ? 4 : 5, lines: n >= 4 ? 1 : 2, cycle: true, innerGap: 4 };
  return {
    type: 'widget', padding: [12, 14], gap: n >= 4 ? 6 : 8, backgroundGradient: bg(theme), refreshAfter: refreshAfter(ctx),
    children: [
      header(list, theme, titleOf(ctx)),
      ...shown.map((s, i) => glass([subRow(s, i, theme, opts)], theme, { padding: [9, 12], borderRadius: 16, gap: 0 })),
      spacer(),
    ],
  };
}

/* ---------- 单订阅 ---------- */

function bigLine(entry, theme, size) {
  const t = entry.traffic;
  const p = pctLeft(t);
  return {
    type: 'stack', direction: 'row', alignItems: 'end', gap: 6,
    children: [
      bigRemain(entry, theme, size),
      ...(p != null ? [text(`剩 ${Math.round(p * 100)}%`, Math.round(size * 0.42), theme.accent, 'semibold')] : []),
    ],
  };
}

function singleHead(entry, theme, size) {
  const st = statusOf(entry);
  const ink = statusInk(st, theme, theme.muted);
  return {
    type: 'stack', direction: 'row', alignItems: 'center', gap: 5,
    children: [...nameLabel(entry, theme, size), spacer(), ...(st.label ? [text(st.label, size - 2, ink, 'semibold')] : [])],
  };
}

function singleBar(entry, theme, w, h) {
  const p = pctLeft(entry.traffic);
  return { type: 'image', src: barSvg(p == null ? 1 : p, theme.accent.light, w, h), width: w, height: h };
}

function singleSmall(ctx, entry, theme) {
  const t = entry.traffic;
  return {
    type: 'widget', padding: 14, gap: 6, backgroundGradient: bg(theme), refreshAfter: refreshAfter(ctx),
    children: [
      singleHead(entry, theme, 12),
      spacer(),
      text('剩余流量', 10, theme.muted, 'medium'),
      bigLine(entry, theme, 24),
      ...(t ? [singleBar(entry, theme, 130, 4)] : []),
      spacer(),
      text(t ? todayText(entry) : metaLine(entry), 10, theme.muted, 'medium'),
      ...(t ? [text(usedTotal(t), 9.5, theme.muted, 'medium', { minScale: 0.7 })] : []),
    ],
  };
}

function singleMedium(ctx, entry, theme) {
  const t = entry.traffic;
  const kv = (k, v) => ({ type: 'stack', direction: 'column', alignItems: 'start', gap: 1, flex: 1, children: [text(k, 10, theme.muted), text(v, 13, theme.text, 'semibold')] });
  const r = resetInfo(entry.resetDay);
  const e = t ? daysUntil(t.expireAt) : null;
  const cycle = r != null ? kv('重置', r === 0 ? '今日' : `${r} 天后`) : e != null ? kv('到期', e >= 0 ? `${e} 天后` : '已到期') : null;
  return {
    type: 'widget', padding: 14, gap: 8, backgroundGradient: bg(theme), refreshAfter: refreshAfter(ctx),
    children: [
      header([entry], theme, titleOf(ctx)),
      glass([
        singleHead(entry, theme, 12),
        bigLine(entry, theme, 26),
        ...(t ? [singleBar(entry, theme, 290, 5)] : [text(metaLine(entry), 10, theme.muted)]),
        ...(t ? [{
          type: 'stack', direction: 'row', gap: 8,
          children: [
            kv('今日已用', Number.isFinite(entry.todayUsed) ? fmtBytes(entry.todayUsed) : '--'),
            kv('已用', fmtBytes(t.used)),
            kv('总量', Number.isFinite(t.total) ? fmtBytes(t.total) : '--'),
            ...(cycle ? [cycle] : []),
          ],
        }] : []),
      ], theme, { flex: 1, gap: 6, padding: [10, 12], borderRadius: 16 }),
    ],
  };
}

function singleLarge(ctx, entry, theme) {
  const t = entry.traffic;
  const daily = dailyBudget(entry);
  const r = resetInfo(entry.resetDay);
  const e = t ? daysUntil(t.expireAt) : null;
  const cell = (k, v) => glass([text(k, 10, theme.muted, 'medium'), text(v, 15, theme.text, 'bold')], theme, { flex: 1, padding: [10, 12], borderRadius: 16, gap: 3 });
  return {
    type: 'widget', padding: 16, gap: 10, backgroundGradient: bg(theme), refreshAfter: refreshAfter(ctx),
    children: [
      header([entry], theme, titleOf(ctx)),
      glass([
        singleHead(entry, theme, 13),
        text('剩余流量', 11, theme.muted, 'medium'),
        bigLine(entry, theme, 34),
        ...(t ? [singleBar(entry, theme, 290, 6)] : [text(metaLine(entry), 11, theme.muted)]),
      ], theme, { padding: [12, 14], borderRadius: 18, gap: 5 }),
      { type: 'stack', direction: 'row', gap: 8, children: [cell('今日已用', Number.isFinite(entry.todayUsed) ? fmtBytes(entry.todayUsed) : '--'), cell('下载', t && Number.isFinite(t.download) ? fmtBytes(t.download) : '--'), cell('上传', t && Number.isFinite(t.upload) ? fmtBytes(t.upload) : '--')] },
      { type: 'stack', direction: 'row', gap: 8, children: [cell('已用', t ? fmtBytes(t.used) : '--'), cell('套餐总量', t && Number.isFinite(t.total) ? fmtBytes(t.total) : '--'), cell('日均可用', daily == null ? '--' : fmtBytes(daily))] },
      { type: 'stack', direction: 'row', gap: 8, children: [cell('到期', e != null ? (e >= 0 ? `${e} 天后` : '已到期') : '--'), cell('重置', r != null ? (r === 0 ? '今日' : `${r} 天后`) : '--')] },
      spacer(),
    ],
  };
}

function emptyWidget(ctx, theme) {
  return {
    type: 'widget', padding: 16, gap: 8, backgroundGradient: bg(theme),
    children: [
      { type: 'stack', direction: 'row', alignItems: 'center', gap: 5, children: [icon('chart.bar.fill', theme.accent.light, 13), text(titleOf(ctx), 13, theme.text, 'semibold')] },
      spacer(),
      icon('link.badge.plus', theme.muted, 22),
      text('还没有配置额度来源', 14, theme.text, 'semibold'),
      text('在模块参数里填订阅1 链接；最多 4 个，可只填一个。', 10, theme.muted, 'regular', { maxLines: 3 }),
      spacer(),
    ],
  };
}

function errorWidget(ctx, theme, message) {
  return {
    type: 'widget', padding: 16, gap: 8, backgroundGradient: bg(theme),
    children: [
      { type: 'stack', direction: 'row', alignItems: 'center', gap: 5, children: [icon('chart.bar.fill', theme.accent.light, 13), text(titleOf(ctx), 13, theme.text, 'semibold')] },
      spacer(),
      icon('exclamationmark.triangle.fill', theme.warn, 22),
      text('无法生成小组件', 14, theme.text, 'semibold'),
      text(message, 10, theme.muted, 'regular', { maxLines: 4 }),
      spacer(),
    ],
  };
}

/* ------------------------------------------------------------------ */
/* 入口                                                                */
/* ------------------------------------------------------------------ */

export default async function (ctx) {
  const env = ctx.env || {};
  const theme = themeFor(env.THEME);
  const family = ctx.widgetFamily || 'systemMedium';

  let sources = String(env.DEMO_MODE || '').toLowerCase() === 'true' ? demoSources() : readSources(ctx);
  if (!sources.length) return emptyWidget(ctx, theme);

  try {
    const now = Date.now();
    const resolved = [];
    for (const source of sources) resolved.push(await fetchSource(ctx, source, now));

    if (family === 'systemSmall') {
      return resolved.length === 1 ? singleSmall(ctx, resolved[0], theme) : multiSmall(ctx, resolved, theme);
    }
    if (family === 'systemLarge' || family === 'systemExtraLarge') {
      return resolved.length === 1 ? singleLarge(ctx, resolved[0], theme) : multiLarge(ctx, resolved, theme);
    }
    if (family === 'accessoryInline') {
      return { type: 'widget', children: [text(resolved.map(s => `${s.name} ${s.traffic ? fmtBytes(s.traffic.remaining) : '--'}`).join(' · '), 11, theme.text, 'semibold', { maxLines: 1, minScale: 0.5 })] };
    }
    if (family === 'accessoryRectangular') {
      return {
        type: 'widget', padding: 4, gap: 2, children: resolved.slice(0, 3).map(s => ({
          type: 'stack', direction: 'row', alignItems: 'center', gap: 4,
          children: [
            icon('chart.bar.fill', theme.accent.light, 9),
            text(`${s.name} ${s.traffic ? fmtBytes(s.traffic.remaining) : '--'}`, 10, theme.text, 'semibold', { minScale: 0.6 }),
            spacer(),
          ],
        })),
      };
    }
    if (family === 'accessoryCircular') {
      const first = resolved[0];
      const p = first.traffic ? pctLeft(first.traffic) : null;
      return { type: 'widget', padding: 6, children: [
        spacer(),
        text(p == null ? '--' : `${Math.round(p * 100)}%`, 14, theme.text, 'bold', { textAlign: 'center' }),
        text(first.traffic ? splitAmt(first.traffic.remaining).n : '', 9, theme.text, 'regular', { textAlign: 'center', opacity: 0.7, maxLines: 1, minScale: 0.5 }),
        spacer(),
      ] };
    }
    return resolved.length === 1 ? singleMedium(ctx, resolved[0], theme) : multiMedium(ctx, resolved, theme);
  } catch (error) {
    return errorWidget(ctx, theme, String(error?.message || error || '未知错误'));
  }
}
