// 관리자 전용 서버리스: 회원 비밀번호를 '123qwe'로 초기화
// - service_role 키는 Vercel env(SUPABASE_SERVICE_ROLE_KEY)에만 보관(클라 노출 X)
// - 호출자 토큰(JWT) 검증 → profiles.is_admin=true 인 경우에만 대상 비번 초기화
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
  const targetId = body.targetId;
  if (!targetId) { res.status(400).json({ error: 'targetId 없음' }); return; }

  try {
    // 1) 호출자 신원 확인
    const me = await fetch(SUPA_URL + '/auth/v1/user', { headers: { apikey: ANON, Authorization: 'Bearer ' + token } }).then(r => r.json());
    if (!me || !me.id) { res.status(401).json({ error: '유효하지 않은 토큰' }); return; }

    // 2) 호출자가 관리자인지 확인 (service_role로 조회)
    const prof = await fetch(SUPA_URL + '/rest/v1/profiles?id=eq.' + me.id + '&select=is_admin', { headers: { apikey: SERVICE, Authorization: 'Bearer ' + SERVICE } }).then(r => r.json());
    if (!Array.isArray(prof) || !prof[0] || prof[0].is_admin !== true) { res.status(403).json({ error: '관리자만 초기화할 수 있습니다' }); return; }

    // 3) 대상 회원 비밀번호를 123qwe로 초기화
    const rr = await fetch(SUPA_URL + '/auth/v1/admin/users/' + encodeURIComponent(targetId), {
      method: 'PUT',
      headers: { apikey: SERVICE, Authorization: 'Bearer ' + SERVICE, 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: '123qwe' })
    });
    if (!rr.ok) { const t = await rr.text(); res.status(502).json({ error: '초기화 실패: ' + t.slice(0, 200) }); return; }

    res.status(200).json({ ok: true, password: '123qwe' });
  } catch (e) {
    res.status(500).json({ error: String((e && e.message) || e) });
  }
};
