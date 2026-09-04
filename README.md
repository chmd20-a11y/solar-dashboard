# ☀️ 태양광 부지 배치 대시보드

지번(또는 도로명)으로 부지를 찾고, 그 **지적 경계 안**에 입력한 **모듈 규격** 기준으로 태양광 패널을 자동 배치해 **수량·용량(kWp)·이용률·예상 발전량**을 산정하는 웹 대시보드.

**라이브(무설정, 바로 사용):** https://solar-dashboard-seven-xi.vercel.app/

## 기능
- 🔎 **지번 검색** → 위치 + **지적 경계 자동 취득** (VWorld) — *배포본은 키 입력 불필요*
- ✏️ **경계 직접 그리기/편집** (Leaflet-Geoman)
- 📐 **모듈 규격**(가로·세로 mm·출력 W·방향·적재 장수) 기반 자동 배치(Turf)
- ⚙️ 설치유형(노지/지붕/주차장)·경사각·방위·이격거리·열간격(자동/수동)
- 📊 총 모듈수 · 설치용량 · 부지면적 · 이용률 · 연 예상발전량 · 이미지 저장
- 🛰️ 위성영상: Esri World Imagery

## 정확도
- ✅ 부지 경계·모듈규격 기반 수량/용량·이격·열간격·방위는 정확 반영
- ⚠️ 지형 경사·나무/건물 음영·구조물 상세·전기(스트링) 설계·지자체별 이격규정 미반영 → **개략 배치(제안·견적용)**

## 아키텍처 / 배포 (중요)
VWorld는 ① 브라우저 직접호출을 CORS로 막고 ② **api.vworld.kr가 해외/클라우드 IP 연결을 리셋(ECONNRESET)** 한다. 따라서 프록시는 **한국 IP**에서 돌아야 한다.

- **배포:** Vercel 서버리스 함수(`api/proxy.js`)를 **서울 리전(icn1)** 에서 실행 → 한국 IP 확보. `vercel.json` rewrite `/req/:path*` → `/api/proxy`. 대시보드는 같은 도메인의 `/req/*`를 호출(동일출처, CORS 불필요).
  - 프록시는 `Referer: http://localhost`(키에 등록된 값)를 붙여 VWorld Data API 도메인검증 통과.
  - VWorld 키는 Vercel 환경변수 `VWORLD_KEY`로 주입(브라우저 무노출·무입력).
  - ⚠️ Vercel 함수 리전은 Project Settings → Functions → Region = **icn1(Seoul)** 이어야 함(iad1이면 VWorld가 리셋).
  - ⚠️ `fetch`(undici)는 VWorld의 비표준 응답(`Connection: Upgrade`)에서 `UND_ERR_SOCKET`으로 실패 → Node 기본 `https` 모듈 사용.
  - Cloudflare Workers는 위 비표준 응답으로 520이 나서 **사용 불가**(`cloudflare-worker.js`는 참고용 잔재).
- **로컬 개발:** `node vworld-proxy.mjs`(localhost:8799) 실행 후 대시보드 프록시 주소를 `http://localhost:8799`로.

## 기술
Leaflet · Leaflet-Geoman · Turf.js · Esri World Imagery · VWorld Open API · Vercel(icn1)
