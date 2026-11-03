/**
 * 三国余量 · Egern 小组件
 *
 * 读取订阅的 Subscription-Userinfo 响应头，或正文中的明确流量字段。
 * 不默认任何套餐总量，不把“未提供统计”显示成 0，不自动尝试多种客户端身份。
 * 自动统计周期：REFRESH_MINUTES，默认 1440 分钟；周期内复用缓存。
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

function themeFor(value) {
  return THEMES[String(value || '').trim().toLowerCase()] || THEMES.glacier;
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
  const raw = Number(env?.REFRESH_MINUTES);
  if (!Number.isFinite(raw)) return DEFAULT_REFRESH_MINUTES;
  return Math.min(MAX_REFRESH_MINUTES, Math.max(MIN_REFRESH_MINUTES, Math.round(raw)));
}

function readSources(ctx) {
  const env = ctx.env || {};
  const sources = [];
  for (let i = 1; i <= MAX_SOURCES; i++) {
    const url = String(env[`SUB${i}_URL`] || '').trim();
    if (!url) continue;
    sources.push({
      id: `s${i}`,
      name: String(env[`SUB${i}_NAME`] || '').trim() || `来源 ${i}`,
      region: String(env[`SUB${i}_REGION`] || '').trim().toUpperCase(),
      url,
      totalGb: String(env[`SUB${i}_TOTAL_GB`] || '').trim(),
      resetDay: String(env[`SUB${i}_RESET_DAY`] || '').trim(),
    });
  }
  return sources;
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
  const ua = String(env?.USER_AGENT || '').trim();
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
  if (fromHeader) return { traffic: fromHeader, nodeHint: true };
  const body = await readBody(response);
  if (looksAccessDenied(status, body)) {
    return { traffic: null, accessDenied: true, status };
  }
  const fromBody = parseBodyInfo(body);
  if (fromBody) return { traffic: fromBody, nodeHint: true };
  return {
    traffic: null,
    statsUnavailable: status >= 200 && status < 300,
    status,
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
    if (result.accessDenied) {
      const snapshot = cached
        ? { ...cached, nextCheckAt: now + ttl, lastError: `订阅拒绝访问（HTTP ${result.status || '未知'}）` }
        : { traffic: null, updatedAt: now, lastSuccessAt: null, capability: 'error', nextCheckAt: now + ttl, lastError: `订阅拒绝访问（HTTP ${result.status || '未知'}）` };
      writeCache(ctx, key, snapshot);
      return materialize(snapshot, source, env, now, 'live');
    }
    if (result.traffic) {
      const day = updateDayStats(cached?.dayStats, result.traffic, now);
      const snapshot = { traffic: result.traffic, updatedAt: now, lastSuccessAt: now, capability: 'stats', nextCheckAt: now + ttl, ...day };
      writeCache(ctx, key, snapshot);
      return materialize(snapshot, source, env, now, 'live');
    }
    if (result.statsUnavailable) {
      // The subscription answered but exposes no quota; do not retry repeatedly
      // or fabricate a plan size. Cache the capability for one refresh period.
      const snapshot = {
        traffic: null, updatedAt: now, lastSuccessAt: cached?.lastSuccessAt || null,
        capability: 'unavailable', nextCheckAt: now + ttl,
      };
      if (cached?.traffic) {
        // Keep last known values as stale rather than discarding them, and
        // persist the new deadline so every widget render does not re-request.
        const retained = { ...cached, nextCheckAt: now + ttl, capability: 'unavailable' };
        writeCache(ctx, key, retained);
        return materialize(retained, source, env, now, 'live');
      }
      writeCache(ctx, key, snapshot);
      return materialize(snapshot, source, env, now, 'live');
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
/* 视觉组件                                                            */
/* ------------------------------------------------------------------ */

function text(value, size, color, weight = 'regular', extra = {}) {
  return {
    type: 'text', text: String(value), font: { size, weight },
    textColor: color, maxLines: 1, minScale: 0.6, ...extra,
  };
}

function icon(name, color, size = 12) {
  return { type: 'image', src: `sf-symbol:${name}`, width: size, height: size, color };
}

function spacer() { return { type: 'spacer' }; }

function barSvg(ratio, colors, width, height, dashed = false) {
  const w = width, h = height, r = h / 2;
  const track = dashed
    ? `<line x1='${r}' y1='${h / 2}' x2='${w - r}' y2='${h / 2}' stroke='${colors.track}' stroke-width='${h}' stroke-linecap='round' stroke-dasharray='2 4'/>`
    : `<rect width='${w}' height='${h}' rx='${r}' fill='${colors.track}'/>`;
  const p = Number.isFinite(ratio) ? Math.max(0, Math.min(1, ratio)) : null;
  const fill = p != null && p > 0
    ? `<rect width='${Math.max(h, w * p).toFixed(1)}' height='${h}' rx='${r}' fill='${colors.meter}'/>`
    : '';
  return 'data:image/svg+xml,' + encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${w} ${h}'>${track}${fill}</svg>`);
}

function meter(entry, theme, width, height) {
  const p = entry.traffic ? percentLeft(entry.traffic) : null;
  const colored = { track: theme.track, meter: theme.meter };
  return {
    type: 'image',
    src: barSvg(p, colored, width, height, p == null),
    width, height,
  };
}

function badge(entry, theme) {
  const status = statusOf(entry);
  if (!status.label) return null;
  const color = status.tone === 'danger' ? theme.dangerInk : status.tone === 'warn' ? theme.warnInk : theme.muted;
  const chipBg = status.tone === 'warn' || status.tone === 'danger' ? theme.warnChip : null;
  const children = [];
  if (status.tone !== 'muted') {
    children.push(icon(status.tone === 'danger' ? 'exclamationmark.octagon.fill' : 'exclamationmark.triangle.fill', color, 9));
  }
  children.push(text(status.label, 9.5, color, 'semibold', { minScale: 0.8 }));
  return {
    type: 'stack', direction: 'row', alignItems: 'center', gap: 3,
    padding: [2, 5], borderRadius: 6,
    ...(chipBg ? { backgroundColor: chipBg } : {}),
    children,
  };
}

function errorMark(entry, theme) {
  if (entry.state !== 'error') return null;
  return { type: 'stack', direction: 'row', alignItems: 'center', gap: 2, children: [
    icon('exclamationmark.octagon.fill', theme.dangerInk, 8),
    text('失败', 9, theme.dangerInk, 'medium'),
  ] };
}

function staleMark(entry, theme) {
  if (!entry.stale) return null;
  return { type: 'stack', direction: 'row', alignItems: 'center', gap: 2, children: [
    icon('clock.fill', theme.muted, 8),
    text('缓存', 9, theme.muted, 'medium'),
  ] };
}

function updatedLabel(list, theme) {
  const times = list.map(s => s.lastSuccessAt || 0).filter(Boolean);
  if (!times.length) return text('尚未获取', 9, theme.muted);
  const latest = new Date(Math.max(...times));
  const hh = String(latest.getHours()).padStart(2, '0');
  const mm = String(latest.getMinutes()).padStart(2, '0');
  return text(`更新 ${hh}:${mm}`, 9, theme.muted);
}

function header(list, theme, title) {
  const anyWarning = list.some(s => ['low', 'critical', 'exhausted', 'error', 'contradiction'].includes(statusOf(s).key));
  return {
    type: 'stack', direction: 'row', alignItems: 'center', gap: 5,
    children: [
      icon('chart.bar.doc.horizontal.fill', theme.accent, 12),
      text(title, 13, theme.text, 'semibold'),
      spacer(),
      ...(anyWarning ? [icon('exclamationmark.triangle.fill', theme.warnInk, 10)] : []),
      updatedLabel(list, theme),
    ],
  };
}

function remainBig(entry, theme, size) {
  if (!entry.traffic || !Number.isFinite(entry.traffic.remaining)) {
    return text('--', size, theme.muted, 'bold', { minScale: 0.7 });
  }
  const parts = splitBytes(Math.max(0, entry.traffic.remaining), null);
  return {
    type: 'stack', direction: 'row', alignItems: 'end', gap: 2,
    children: [
      text(parts.number, size, theme.text, 'bold'),
      text(parts.unit, Math.round(size * 0.45), theme.muted, 'semibold', { minScale: 0.9 }),
    ],
  };
}

function errorSummary(entry) {
  const message = String(entry.lastError || '');
  if (/拒绝访问|HTTP\s*40[13]|HTTP\s*429/.test(message)) return '订阅拒绝访问';
  return '查询失败';
}

function detailLine(entry, theme) {
  const t = entry.traffic;
  if (!t) {
    if (entry.state === 'error') return text(errorSummary(entry), 9, theme.dangerInk, 'medium');
    return text('订阅未提供额度', 9, theme.muted);
  }
  if (entry.state === 'contradiction') return text('已用量超过总量', 9, theme.dangerInk, 'medium');
  const p = percentLeft(t);
  const pieces = [];
  if (Number.isFinite(t.total)) pieces.push(`总 ${formatBytes(t.total, null)}`);
  else if (t.totalUnspecified) pieces.push('总量未提供');
  if (p != null) pieces.push(`余 ${Math.round(p * 100)}%`);
  else if (missingPercent(entry)) pieces.push('比例未知');
  if (t.totalEstimated) pieces.push('总量手填');
  return text(pieces.join(' · '), 9, theme.muted, 'medium', { minScale: 0.8 });
}

function todayLabel(entry, theme) {
  if (!entry.traffic) return text('', 9, theme.muted);
  if (Number.isFinite(entry.todayUsed)) {
    return text(`今日 ${formatBytes(entry.todayUsed, null)}`, 9, theme.secondary, 'semibold', { minScale: 0.8 });
  }
  // Be explicit that no value exists yet rather than printing 0, and hint the
  // likely cause when the refresh period is a full day.
  const hint = entry.todaySamples === 1 ? '今日 -- 待下次刷新' : '今日 --';
  return text(hint, 9, theme.muted, 'medium', { minScale: 0.7 });
}

function remainingLabel(entry, theme) {
  if (!entry.traffic) return null;
  const t = entry.traffic;
  if (Number.isFinite(t.remaining) && t.remaining < 0) {
    return text(`超额 ${formatBytes(Math.abs(t.remaining), null)}`, 9, theme.dangerInk, 'semibold');
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* 布局：中号 2×2                                                      */
/* ------------------------------------------------------------------ */

function quadCard(entry, theme) {
  const status = statusOf(entry);
  const b = badge(entry, theme);
  const stale = staleMark(entry, theme);
  return {
    type: 'stack', direction: 'column', alignItems: 'start', gap: 5,
    flex: 1, padding: [9, 10], borderRadius: 14,
    backgroundColor: theme.card,
    children: [
      {
        type: 'stack', direction: 'row', alignItems: 'center', gap: 4,
        children: [
          ...(entry.region ? [text(entry.region, 8.5, theme.muted, 'semibold')] : []),
          text(entry.name, 11, theme.text, 'semibold', { minScale: 0.8 }),
          spacer(),
          ...(b ? [b] : []),
        ],
      },
      spacer(),
      {
        type: 'stack', direction: 'row', alignItems: 'end', gap: 3,
        children: [
          remainBig(entry, theme, 19),
          spacer(),
          ...(status.key === 'ok' ? [stale].filter(Boolean) : []),
        ],
      },
      ...(stale && status.key !== 'ok' ? [{
        type: 'stack', direction: 'row', alignItems: 'center', gap: 4,
        children: [stale, spacer()],
      }] : []),
      ...(errorMark(entry, theme) && status.key !== 'ok' ? [{
        type: 'stack', direction: 'row', alignItems: 'center', gap: 4,
        children: [errorMark(entry, theme), spacer()],
      }] : []),
      detailLine(entry, theme),
      {
        type: 'stack', direction: 'column', alignItems: 'start', gap: 2,
        children: [
          meter(entry, theme, 126, 4),
          {
            type: 'stack', direction: 'row', alignItems: 'center', gap: 3,
            children: [
              ...(remainingLabel(entry, theme) ? [remainingLabel(entry, theme)] : []),
              ...(remainingLabel(entry, theme) ? [spacer()] : []),
              todayLabel(entry, theme),
            ],
          },
        ],
      },
    ],
  };
}

function grid(list, theme) {
  const rows = [];
  for (let i = 0; i < list.length; i += 2) {
    const pair = list.slice(i, i + 2);
    rows.push({
      type: 'stack', direction: 'row', alignItems: 'stretch', gap: 8, flex: 1,
      children: [
        quadCard(pair[0], theme),
        ...(pair[1] ? [quadCard(pair[1], theme)] : [{ type: 'stack', flex: 1, children: [] }]),
      ],
    });
  }
  return { type: 'stack', direction: 'column', alignItems: 'stretch', gap: 8, flex: 1, children: rows };
}

function mediumWidget(ctx, list, theme) {
  return {
    type: 'widget', padding: 13, gap: 8,
    backgroundColor: theme.background,
    refreshAfter: refreshAfter(ctx),
    children: [header(list, theme, titleOf(ctx)), grid(list, theme)],
  };
}

/* ------------------------------------------------------------------ */
/* 布局：大号列表                                                      */
/* ------------------------------------------------------------------ */

function largeRowDetails(entry) {
  const t = entry.traffic;
  if (!t) return entry.state === 'error' ? errorSummary(entry) : '仅返回节点，未提供用量';
  const bits = [];
  if (Number.isFinite(t.remaining) && t.remaining < 0) bits.push(`超额 ${formatBytes(Math.abs(t.remaining), null)}`);
  if (Number.isFinite(t.used) && Number.isFinite(t.total)) bits.push(`已用 ${formatBytes(t.used, null)} / 总 ${formatBytes(t.total, null)}`);
  else if (Number.isFinite(t.used)) bits.push(`已用 ${formatBytes(t.used, null)}`);
  else if (Number.isFinite(t.total)) bits.push(`总 ${formatBytes(t.total, null)}`);
  else if (missingPercent(entry)) bits.push('比例未知');
  if (t.expireAt) {
    const days = Math.ceil((t.expireAt - Date.now()) / 86400000);
    bits.push(days >= 0 ? `到期剩 ${days} 天` : '已到期');
  }
  const reset = resetInfo(entry.resetDay);
  if (reset === 0) bits.push('今日重置');
  else if (reset != null) bits.push(`重置剩 ${reset} 天`);
  return bits.join(' · ');
}

function largeRow(entry, theme) {
  const t = entry.traffic;
  const p = t ? percentLeft(t) : null;
  const b = badge(entry, theme);
  return {
    type: 'stack', direction: 'column', alignItems: 'start', gap: 4,
    padding: [8, 10], borderRadius: 13, backgroundColor: theme.card,
    children: [
      {
        type: 'stack', direction: 'row', alignItems: 'center', gap: 4,
        children: [
          ...(entry.region ? [text(entry.region, 9, theme.muted, 'semibold')] : []),
          text(entry.name, 11.5, theme.text, 'semibold'),
          spacer(),
          ...(b ? [b] : []),
          ...(staleMark(entry, theme) ? [staleMark(entry, theme)] : []),
        ],
      },
      {
        type: 'stack', direction: 'row', alignItems: 'end', gap: 4,
        children: [
          remainBig(entry, theme, 20),
          spacer(),
          ...(p != null ? [text(`${Math.round(p * 100)}%`, 10, theme.muted, 'semibold')] : []),
        ],
      },
      meter(entry, theme, 300, 4),
      {
        type: 'stack', direction: 'row', alignItems: 'center', gap: 6,
        children: [
          text(largeRowDetails(entry), 9, theme.muted, 'medium', { minScale: 0.8 }),
          spacer(),
          todayLabel(entry, theme),
        ],
      },
    ],
  };
}

function largeWidget(ctx, list, theme) {
  return {
    type: 'widget', padding: 13, gap: 7,
    backgroundColor: theme.background,
    refreshAfter: refreshAfter(ctx),
    children: [
      header(list, theme, titleOf(ctx)),
      ...list.map(s => largeRow(s, theme)),
      spacer(),
    ],
  };
}

/* ------------------------------------------------------------------ */
/* 布局：小号单来源                                                    */
/* ------------------------------------------------------------------ */

function smallWidget(ctx, entry, theme) {
  const status = statusOf(entry);
  const t = entry.traffic;
  const p = t ? percentLeft(t) : null;
  return {
    type: 'widget', padding: 13, gap: 5,
    backgroundColor: theme.background,
    refreshAfter: refreshAfter(ctx),
    children: [
      {
        type: 'stack', direction: 'row', alignItems: 'center', gap: 4,
        children: [
          icon('chart.bar.doc.horizontal.fill', theme.accent, 12),
          text(entry.name, 12, theme.text, 'semibold'),
          spacer(),
          ...(badge(entry, theme) ? [badge(entry, theme)] : []),
        ],
      },
      spacer(),
      text('剩余流量', 9.5, theme.muted, 'medium'),
      remainBig(entry, theme, 30),
      ...(p != null ? [text(`余 ${Math.round(p * 100)}%`, 10, theme.accent, 'semibold')] : []),
      meter(entry, theme, 136, 5),
      {
        type: 'stack', direction: 'row', alignItems: 'center', gap: 4,
        children: [todayLabel(entry, theme), spacer()],
      },
      text(detailLine(entry, theme).text, 9, theme.muted, 'medium', { minScale: 0.75 }),
      spacer(),
      {
        type: 'stack', direction: 'row', alignItems: 'center', gap: 3,
        children: [updatedLabel([entry], theme), spacer(), ...(entry.stale ? [staleMark(entry, theme)] : [])],
      },
    ],
  };
}

/* ------------------------------------------------------------------ */
/* 其它                                                                */
/* ------------------------------------------------------------------ */

function refreshAfter(ctx) {
  return new Date(Date.now() + refreshMinutes(ctx.env) * 60000).toISOString();
}

function titleOf(ctx) {
  const title = String(ctx.env?.WIDGET_TITLE || '').trim();
  return title || '三国余量';
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

function emptyWidget(ctx, theme) {
  return {
    type: 'widget', padding: 16, gap: 7, backgroundColor: theme.background,
    refreshAfter: refreshAfter(ctx),
    children: [
      header([], theme, titleOf(ctx)),
      spacer(),
      icon('link.badge.plus', theme.muted, 20),
      text('还没有配置额度来源', 13, theme.text, 'semibold'),
      text('填入至少一个订阅；没有额度信息的订阅会显示“未提供统计”。', 10, theme.muted, 'regular', { maxLines: 3 }),
      spacer(),
    ],
  };
}

function errorWidget(ctx, theme, message) {
  return {
    type: 'widget', padding: 16, gap: 7, backgroundColor: theme.background,
    refreshAfter: refreshAfter(ctx),
    children: [
      header([], theme, titleOf(ctx)),
      spacer(),
      icon('exclamationmark.triangle.fill', theme.warnInk, 20),
      text('无法生成小组件', 13, theme.text, 'semibold'),
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
      const index = Math.max(0, Math.min(resolved.length - 1, Number(env.SMALL_SOURCE || 1) - 1 || 0));
      return smallWidget(ctx, resolved[index], theme);
    }
    if (family === 'systemLarge' || family === 'systemExtraLarge') return largeWidget(ctx, resolved, theme);
    if (family === 'accessoryInline') {
      return { type: 'widget', children: [text(resolved.map(s => `${s.name} ${s.traffic ? formatBytes(s.traffic.remaining, null) : '--'}`).join(' · '), 11, theme.text, 'semibold', { maxLines: 1, minScale: 0.5 })] };
    }
    if (family === 'accessoryRectangular') {
      return {
        type: 'widget', padding: 4, gap: 2, children: resolved.slice(0, 3).map(s => ({
          type: 'stack', direction: 'row', alignItems: 'center', gap: 4,
          children: [
            icon('chart.bar.doc.horizontal.fill', theme.accent, 9),
            text(`${s.name} ${s.traffic ? formatBytes(s.traffic.remaining, null) : '--'}`, 10, theme.text, 'semibold', { minScale: 0.6 }),
            spacer(),
          ],
        })),
      };
    }
    if (family === 'accessoryCircular') {
      const first = resolved[0];
      const p = first.traffic ? percentLeft(first.traffic) : null;
      return { type: 'widget', padding: 6, children: [
        spacer(),
        text(p == null ? '--' : `${Math.round(p * 100)}%`, 14, theme.text, 'bold', { textAlign: 'center' }),
        text(first.traffic ? splitBytes(first.traffic.remaining, null).number : '', 8, theme.muted, 'regular', { textAlign: 'center' }),
        spacer(),
      ] };
    }
    return mediumWidget(ctx, resolved, theme);
  } catch (error) {
    return errorWidget(ctx, theme, String(error?.message || error || '未知错误'));
  }
}
