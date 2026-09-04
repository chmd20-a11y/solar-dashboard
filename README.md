# ☀️ 태양광 부지 배치 대시보드

지번(또는 도로명)으로 부지를 찾고, 그 **지적 경계 안**에 입력한 **모듈 규격** 기준으로 태양광 패널을 자동 배치해 **수량·용량(kWp)·이용률·예상 발전량**을 산정하는 웹 대시보드입니다.

**배포:** https://chmd20-a11y.github.io/solar-dashboard/

## 기능
- 🔎 **지번 검색** → 위치 + **지적 경계 자동 취득** (VWorld)
- ✏️ **경계 직접 그리기/편집** (키 없이도 사용 가능)
- 📐 **모듈 규격**(가로·세로 mm·출력 W·방향·적재 장수) 기반 자동 배치
- ⚙️ 설치유형(노지/지붕/주차장)·경사각·방위·이격거리·열간격(자동/수동)
- 📊 총 모듈수 · 설치용량 · 부지면적 · 이용률 · 연 예상발전량
- 🛰️ 위성영상: Esri World Imagery

## 정확도
- ✅ 부지 경계·모듈규격 기반 수량/용량·이격·열간격·방위는 정확 반영
- ⚠️ 지형 경사·나무/건물 음영·구조물 상세·전기(스트링) 설계·지자체별 이격규정은 미반영 → **개략 배치(제안·견적용)**

## VWorld 연결 (지번검색·자동경계)
VWorld는 브라우저 직접호출을 막아(CORS) **프록시**가 필요합니다.

**로컬(개발)**
```bash
node vworld-proxy.mjs        # http://localhost:8799
```
대시보드 '프록시 주소' = `http://localhost:8799`, 인증키 입력 후 저장.
※ VWorld 인증키의 서비스URL에 `http://localhost` 등록 필요.

**배포(어디서나)**: `cloudflare-worker.js` 참고 — Cloudflare Worker로 https 프록시를 띄우고 그 주소를 '프록시 주소'에 입력. VWorld 키 서비스URL에 Pages 주소(`https://chmd20-a11y.github.io`) 추가 등록.

> 인증키는 저장소에 포함하지 않습니다(브라우저 localStorage 보관). 공개 배포 시 키 은닉이 필요하면 Worker 시크릿(`VWORLD_KEY`) 사용.

## 기술
Leaflet · Leaflet-Geoman · Turf.js · Esri World Imagery · VWorld Open API
