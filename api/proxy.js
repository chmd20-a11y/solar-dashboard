// VWorld 프록시 (Vercel 서버리스 함수, Node / CommonJS, 서울 리전 icn1)
// /req/* 를 api.vworld.kr/req/* 로 중계. vercel.json rewrite: /req/:path* → /api/proxy?__path=:path*
// - 데이터 API(JSON): key 파라미터 없으면 서버 env 키 주입
// - WMTS 위성타일(이미지): 경로의 __KEY__ 를 서버 env 키로 치환
// - 응답은 원본 content-type 그대로(바이너리 포함) 전달
// - undici는 VWorld 비표준응답에 실패 → Node 기본 https 사용, Referer=localhost(등록도메인)
const https = require('https');

function vget(target) {
  return new Promise((resolve, reject) => {
    const r = https.request(
      target,
      { method: 'GET', headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': '*/*', 'Referer': 'http://localhost' } },
      (up) => {
        const chunks = [];
        up.on('data', (c) => chunks.push(c));
        up.on('end', () => resolve({ status: up.statusCode || 200, type: up.headers['content-type'] || 'application/octet-stream', buf: Buffer.concat(chunks) }));
      }
    );
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
    let p = u.searchParams.get('__path') || '';   // address, data, wmts/1.0.0/__KEY__/Satellite/z/y/x.jpeg
    u.searchParams.delete('__path');
    const KEY = process.env.VWORLD_KEY;
    if (KEY) p = p.replace('__KEY__', KEY);                                   // WMTS 타일 키 치환
    if (KEY && !u.searchParams.get('key')) u.searchParams.set('key', KEY);    // 데이터 API 키 주입
    const qs = u.searchParams.toString();
    const target = 'https://api.vworld.kr/req/' + p + (qs ? ('?' + qs) : '');

    const r = await vget(target);
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
