// 회원 탈퇴(본인 계정 완전 삭제) 서버리스
// - service_role 키는 Vercel env(SUPABASE_SERVICE_ROLE_KEY)에만 보관(클라 노출 X)
// - 호출자 토큰(JWT)을 검증해 '본인 id'만 삭제 → 남의 계정은 절대 삭제 불가
// - 삭제 범위: dev_requests(본인) · user_settings · profiles · auth 계정
const SUPA_URL = 'https://rejgvqeliqdjpavjvtjt.supabase.co';
const ANON = 'sb_publishable_SAJNSZSfhPgl3M9XiG7hYg_R0tSWUOb';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }

  const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SERVICE) { res.status(500).json({ error: '서버에 SUPABASE_SERVICE_ROLE_KEY 미설정' }); return; }

  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) { res.status(401).json({ error: '인증 토큰 없음' }); return; }

  let body = req.body;
  if (!body || typeof body !== 'object') { try { body = JSON.parse(body || '{}'); } catch (e) { body = {}; } }
  if (body.confirm !== true) { res.status(400).json({ error: '확인 값 누락' }); return; }

  const svc = { apikey: SERVICE, Authorization: 'Bearer ' + SERVICE, 'Content-Type': 'application/json' };
  try {
    // 1) 호출자 신원 확인 → 본인 id
    const me = await fetch(SUPA_URL + '/auth/v1/user', { headers: { apikey: ANON, Authorization: 'Bearer ' + token } }).then(r => r.json());
    if (!me || !me.id) { res.status(401).json({ error: '유효하지 않은 토큰' }); return; }
    const id = me.id;

    // 2) 본인 데이터 삭제(순서: 종속 데이터 → 프로필 → 계정)
    await fetch(SUPA_URL + '/rest/v1/dev_requests?user_id=eq.' + id, { method: 'DELETE', headers: svc }).catch(() => {});
    await fetch(SUPA_URL + '/rest/v1/user_settings?id=eq.' + id, { method: 'DELETE', headers: svc }).catch(() => {});
    await fetch(SUPA_URL + '/rest/v1/profiles?id=eq.' + id, { method: 'DELETE', headers: svc }).catch(() => {});

    // 3) 인증 계정 삭제(마지막) — 이게 성공해야 진짜 탈퇴
    const rr = await fetch(SUPA_URL + '/auth/v1/admin/users/' + encodeURIComponent(id), { method: 'DELETE', headers: svc });
    if (!rr.ok) { const t = await rr.text(); res.status(502).json({ error: '계정 삭제 실패: ' + t.slice(0, 200) }); return; }

    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String((e && e.message) || e) });
  }
};
