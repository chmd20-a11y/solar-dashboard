// VWorld 배포용 프록시 (Cloudflare Worker)
// 목적: GitHub Pages(https)에서 VWorld API를 CORS 없이 호출하기 위한 https 중계기.
// 로컬 개발용 vworld-proxy.mjs 와 동일한 역할.
//
// 배포 방법(약 3분):
//  1) dash.cloudflare.com 로그인 → Workers & Pages → Create → Worker
//  2) 이 파일 내용 전체를 붙여넣고 Deploy
//  3) 발급된 주소(예: https://vworld-proxy.<계정>.workers.dev)를
//     대시보드의 '프록시 주소' 칸에 입력 → 연결 저장
//  4) VWorld 인증키 설정의 '서비스URL'에 GitHub Pages 주소를 추가 등록
//     (예: https://chmd20-a11y.github.io) — 이게 Referer로 검증됨
//
// (선택) 키를 브라우저에 노출하지 않으려면:
//  Worker 설정 → Variables 에 VWORLD_KEY 시크릿 추가하면
//  브라우저가 key 를 안 보내도 여기서 주입합니다.

const REFERER = 'https://chmd20-a11y.github.io'; // ← 배포 도메인(=VWorld 등록 URL)

export default {
  async fetch(request, env) {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Methods': 'GET,OPTIONS',
    };
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    const url = new URL(request.url);
    if (!url.pathname.startsWith('/req/')) {
      return new Response(JSON.stringify({ error: 'only /req/* is proxied' }),
        { status: 404, headers: { ...cors, 'Content-Type': 'application/json' } });
    }
    const target = new URL('https://api.vworld.kr' + url.pathname + url.search);
    if (env && env.VWORLD_KEY && !target.searchParams.get('key')) {
      target.searchParams.set('key', env.VWORLD_KEY);
    }
    const r = await fetch(target.toString(), { headers: { Referer: REFERER } });
    const body = await r.text();
    return new Response(body, {
      status: r.status,
      headers: { ...cors, 'Content-Type': 'application/json;charset=UTF-8' },
    });
  },
};
