// VWorld 프록시 (Vercel 서버리스 함수, Node 런타임 / CommonJS)
// /req/* 요청을 api.vworld.kr 로 중계. vercel.json rewrite: /req/:path* → /api/proxy?__path=:path*
// ⚠️ fetch(undici)는 VWorld의 비표준 응답(Connection: Upgrade)에서 UND_ERR_SOCKET로 실패 →
//    curl처럼 관대한 Node 기본 https 모듈로 요청한다.
const https = require('https');

function vget(target) {
  return new Promise((resolve, reject) => {
    const r = https.request(
      target,
      { method: 'GET', headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' } },
      (up) => {
        const chunks = [];
        up.on('data', (c) => chunks.push(c));
        up.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
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
    const p = u.searchParams.get('__path') || '';   // address, data ...
    u.searchParams.delete('__path');
    const target = 'https://api.vworld.kr/req/' + p + '?' + u.searchParams.toString();
    const body = await vget(target);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json;charset=UTF-8');
    res.end(body);
  } catch (e) {
    res.statusCode = 502;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ proxy_error: String((e && e.message) || e), code: e && e.code }));
  }
};
