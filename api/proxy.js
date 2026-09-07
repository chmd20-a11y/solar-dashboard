// 통합 프록시 (Vercel 서버리스, Node/CommonJS, 서울 icn1)
// - /req/*  → api.vworld.kr/req/*  (VWorld: 데이터 JSON, WMTS 타일 이미지)  [rewrite __path]
// - /luris/* → apis.data.go.kr/1613000/arLandUseInfoService/*  (토지이용규제 행위제한) [rewrite __lpath]
// 서버 env 키 주입(VWORLD_KEY / LURIS_KEY). undici 회피용 Node https. LURIS 게이트웨이 HTTP_ERROR는 재시도.
const https = require('https');

function vget(target, referer) {
  return new Promise((resolve, reject) => {
    const headers = { 'User-Agent': 'Mozilla/5.0', 'Accept': '*/*' };
    if (referer) headers.Referer = referer;
    const r = https.request(target, { method: 'GET', headers }, (up) => {
      const chunks = [];
      up.on('data', (c) => chunks.push(c));
      up.on('end', () => resolve({ status: up.statusCode || 200, type: up.headers['content-type'] || 'application/octet-stream', buf: Buffer.concat(chunks) }));
    });
    r.on('error', reject);
    r.setTimeout(15000, () => r.destroy(new Error('timeout')));
    r.end();
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }

  try {
    const u = new URL(req.url, 'http://local');

    // ---- LURIS (data.go.kr 토지이용규제 행위제한) ----
    const lpath = u.searchParams.get('__lpath');
    if (lpath != null) {
      u.searchParams.delete('__lpath');
      if (process.env.LURIS_KEY) u.searchParams.set('serviceKey', process.env.LURIS_KEY);
      const target = 'https://apis.data.go.kr/1613000/arLandUseInfoService/' + lpath + '?' + u.searchParams.toString();
      let body = '';
      for (let i = 0; i < 4; i++) { const r = await vget(target); body = r.buf.toString('utf8'); if (!/HTTP_ERROR/.test(body)) break; }  // 게이트웨이 간헐오류 재시도
      res.statusCode = 200; res.setHeader('Content-Type', 'application/xml;charset=UTF-8'); res.end(body); return;
    }

    // ---- DEM (OpenTopoData 표고 → 경사도 산출) ----
    const dpath = u.searchParams.get('__dpath');
    if (dpath != null) {
      u.searchParams.delete('__dpath');
      const target = 'https://api.opentopodata.org/' + dpath + '?' + u.searchParams.toString();
      const r = await vget(target);
      res.statusCode = 200; res.setHeader('Content-Type', 'application/json;charset=UTF-8'); res.end(r.buf); return;
    }

    // ---- VWorld ----
    let p = u.searchParams.get('__path') || '';
    u.searchParams.delete('__path');
    const KEY = process.env.VWORLD_KEY;
    if (KEY) p = p.replace('__KEY__', KEY);
    if (KEY && !u.searchParams.get('key')) u.searchParams.set('key', KEY);
    const qs = u.searchParams.toString();
    const target = 'https://api.vworld.kr/req/' + p + (qs ? ('?' + qs) : '');
    const r = await vget(target, 'http://localhost');
    res.statusCode = 200;
    res.setHeader('Content-Type', r.type);
    if (/^image\//.test(r.type)) res.setHeader('Cache-Control', 'public, max-age=86400');
    res.end(r.buf);
  } catch (e) {
    res.statusCode = 502;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ proxy_error: String((e && e.message) || e), code: e && e.code }));
  }
};
