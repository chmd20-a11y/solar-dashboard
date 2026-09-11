/* PLOT 서비스워커 — '홈 화면에 추가(설치)' 조건 충족 전용.
   캐싱하지 않는 통과형(passthrough): 항상 네트워크 최신본을 그대로 사용 → 업데이트 지연 문제 없음. */
self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', e => { /* respondWith 호출하지 않음 = 브라우저 기본 네트워크 처리(캐시 안 함) */ });
