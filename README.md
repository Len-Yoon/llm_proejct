# 📌 Kiosk Voice Interaction Project

> 얼굴 인식 + 음성 인터랙션 + 문서 출력/날씨/축제 정보 안내 키오스크 애플리케이션  

---

## 🚀 주요 기능

### 🎤 음성 인터랙션
- **TTS(Text-To-Speech)**: 백엔드 TTS API 연동 (`/api/tts` 엔드포인트)  
  - JSON → FormData → GET 요청 3단계 폴백 지원
  - 오디오 `canplay` 이벤트 시점까지만 프리페치 → 지연 최소화  
- **STT(Speech-To-Text)**: 마이크 입력 후 인식 결과를 자동 처리  
  - `LISTENING` / `PROCESSING` 상태 관리
  - 오류(무음, 자신감 낮음, 마이크 권한 거부 등) 핸들링  
- **자동 플로우**: 웰컴 멘트 재생 → 종료 즉시 마이크 자동 시작  

### 👤 얼굴 감지 & 웰컴 트리거
- 카메라 스트림으로 얼굴 감지 (`PresenceCamera` 활용)
- 얼굴이 감지되면 웰컴 멘트 자동 실행
- 멘트 종료 후 곧바로 STT 청취 시작  

### 📑 문서 서비스
- 사용자가 원하는 문서 종류를 음성/버튼으로 요청  
  - 주민등록등본  
  - 주민등록초본  
  - 가족관계증명서  
  - 건강보험자격득실확인서  
- 주민등록번호 13자리 입력 → 더미 사용자 매칭 (`dummyUsers`)
- 문서 뷰어 표시 후 인쇄 기능 (`window.print()` 활용)  

### ☀️ 날씨 안내
- `/weather/` API 호출 (현재는 `Seoul` 고정)
- 백엔드 AI가 생성한 한국어 요약(`ai_summary_ko`) 제공
- 기본 멘트(TTS) 후 → **AI 요약 멘트 1회만 자동 재생**  

### 🎉 축제/행사 안내
- `PapaParse`로 `/festival.csv` 파일 파싱
- 사용자가 요청한 키워드 기반 축제 리스트 표시
- 진입 시 TTS 멘트: “서울시 축제 정보를 안내합니다.”  

### 🧭 음성 요청 처리 플로우
1. 사용자가 음성/버튼으로 요청  
2. `/receive-text/` 서버 호출 → 요약/목적(`summary`, `purpose`) 응답  
3. 목적에 따라 플로우 전환  
   - `축제/행사` → FESTIVAL 화면  
   - `날씨` → WEATHER_VIEW 화면  
   - 문서(등본/초본/가족관계/건강보험) → PIN 입력 화면  
   - 그 외 → **알 수 없는 요청 멘트 TTS 후 자동 듣기 재시작**  

### 🔊 음성 UX 디테일
- **TTS 사전 로드**: 웰컴 멘트는 앱 시작 시 미리 로드 → 즉시 재생  
- **오디오 언락**: 첫 사용자 제스처(pointerdown/keydown)에서 오디오 컨텍스트 활성화 → 브라우저 자동재생 제한 대응  
- **중복 방지**: 새 멘트 재생 시 기존 TTS/타이머 모두 정리 (`stopAllSpeechAndTimers`)  
- **sayThenListen 헬퍼**: 멘트가 끝나면 자동으로 STT 시작하는 래퍼  

---

## 🛠️ 기술 스택

- **Frontend**: React  
- **음성 처리**: Web Audio API + SpeechRecognition (STT) + 백엔드 TTS API  
- **CSV 파싱**: PapaParse  
- **스타일링**: CSS (단순 UI 프레임)  
- **기타**:  
  - `window.print()`를 활용한 간단한 문서 인쇄  
  - 상태 관리: React Hooks (`useState`, `useEffect`, `useRef`, `useCallback`)  

---

## 📂 주요 컴포넌트 구조

- `App.js` : 전체 플로우 관리 (TTS/STT/화면 전환/타이머/오디오 언락)  
- `WelcomeScreen.jsx` : 웰컴 화면, 얼굴 감지/버튼 입력/음성 트리거  
- `RecognitionScreen.jsx` : 음성 인식 텍스트 표시  
- `Keypad.jsx` : 주민등록번호 입력 키패드  
- `DocumentViewer.jsx` : 문서 뷰어 및 인쇄 버튼  
- `FestivalScreen.jsx` : 축제/행사 정보 표시  
- `WeatherScreen.jsx` : 날씨 정보 + AI 요약 표시  
- `hooks/useVoiceFlow.js` : TTS/STT 흐름 관리 커스텀 훅  

---

## ⚙️ 동작 시나리오

1. 사용자가 키오스크 앞에 서면 얼굴 감지 → 웰컴 멘트 TTS  
2. 멘트가 끝나자마자 STT 자동 시작  
3. 사용자가 음성으로 “등본 발급”, “날씨 알려줘”, “서울 축제” 등 요청  
4. 서버에서 요약/목적 분석 → 플로우 전환  
5. 화면 전환 후 TTS 안내 + 필요시 인쇄 기능 제공  
6. 알 수 없는 요청 → TTS로 재안내 후 자동으로 다시 STT 시작  

---

## 📌 특징 정리

- 브라우저 자동재생 제한을 고려한 **Audio Unlock 처리**  
- **TTS 프리페치**로 사용자 대기 시간 최소화  
- 멘트와 청취 사이의 공백 제거 → 자연스러운 대화 UX  
- 알 수 없는 요청/에러 상황도 **TTS 안내 후 자동 재청취** → 끊기지 않는 흐름  
- 축제/날씨 같은 데이터 소스 확장 가능 (CSV/외부 API 연동)  
