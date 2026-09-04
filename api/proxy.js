// VWorld 프록시 (Vercel 서버리스 함수, Node 런타임 / CommonJS)
// 같은 배포 도메인에서 /req/* 요청을 받아 api.vworld.kr 로 중계한다.
// Node의 fetch(undici)는 VWorld의 비표준 응답(Connection: Upgrade 등)도 정상 처리.
// vercel.json 의 rewrite 로 /req/:path* → /api/proxy?__path=:path* 로 들어온다.
// res.status()/send() 헬퍼 의존을 피하려 순수 Node http 응답 API만 사용.
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
    const r = await fetch(target, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' } });
    const body = await r.text();
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json;charset=UTF-8');
    res.end(body);
  } catch (e) {
    res.statusCode = 502;
    res.setHeader('Content-Type', 'application/json');
    const cause = e && e.cause ? (e.cause.code || e.cause.message || String(e.cause)) : null;
    res.end(JSON.stringify({ proxy_error: String((e && e.message) || e), cause }));
  }
};
