// VWorld 로컬 프록시 — 브라우저 CORS 우회용 중계기
// 실행:  node vworld-proxy.mjs        (Node 18+ / 이 맥은 v26)
// 대시보드의 '프록시 주소' 기본값 http://localhost:8799 와 짝.
// 인증키는 브라우저(대시보드)에서 쿼리로 넘어오므로 여기서는 그대로 전달만 한다.
import http from 'http';

const PORT = 8799;
const BASE = 'https://api.vworld.kr';

http.createServer(async (req, res) => {
  // 모든 응답에 CORS 허용
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  try {
    const u = new URL(req.url, 'http://local');
    // /req/address, /req/data 등 vworld 경로만 통과
    if (!u.pathname.startsWith('/req/')) {
      res.writeHead(404); res.end(JSON.stringify({ error: 'only /req/* is proxied' })); return;
    }
    const target = new URL(BASE + u.pathname);
    u.searchParams.forEach((v, k) => target.searchParams.set(k, v));

    const r = await fetch(target.toString(), { headers: { Referer: 'http://localhost' } });
    const body = await r.text();
    res.writeHead(r.status, { 'Content-Type': 'application/json;charset=UTF-8' });
    res.end(body);
  } catch (e) {
    res.writeHead(502);
    res.end(JSON.stringify({ error: String(e && e.message || e) }));
  }
}).listen(PORT, () => console.log('VWorld proxy listening on http://localhost:' + PORT));
