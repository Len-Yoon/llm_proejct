<img width="715" height="152" alt="image" src="https://github.com/user-attachments/assets/a99ef143-554e-456e-a5cc-75046a3d3943" />


# 🏪 AI Agent 기반 공공 대화형 무인 키오스크

<details>
<summary> 📌 프로젝트 개요 </summary>

<br>

공공기관이나 주민센터에는 무인 민원 키오스크가 설치되어 있지만, 실제로는 **어르신들이 사용법을 몰라 창구 앞에서 오래 기다리거나 결국 직원의 도움을 받아야 하는 경우가 많습니다.** 
기존 민원 키오스크는 **터치 기반 UI**에만 의존해 디지털 취약계층이 이용하기 어려운 단순히 장비만 갖춰놓는 것보다 누구나 쉽게 접근할 수 있는 **더 직관적이고 대화형 인터페이스**가 필요하다고 느꼈습니다. <br><br>

이 문제를 해결하기 위해, 저희 팀은 **AI Agent 기반 공공 대화형 무인 키오스크**를 개발했습니다. 사용자는 얼굴 인식과 음성 인식만으로 자연스럽게 시스템과 상호작용할 수 있으며,  AI Agent가 의도를 분석해 민원 문서 조회·발급, 날씨 안내, 축제 정보 제공 등 다양한 공공 서비스를 안내합니다. <br><br>
</details>


<details>
<summary> 🤝 담당 역할</summary>

<br>

프로젝트에서는 팀원들과 함께 키오스크의 기본 구조를 설계하고 기능을 구현했습니다. 음성 인식(STT/TTS) 모듈은 팀원이 초안을 만들었고, 
저는 이를 보완해 **OpenAI Whisper와 VAD**를 적용하여 대화 품질을 높였습니다. 프론트엔드도 팀원이 화면 레이아웃을 구성했고, 저는 그 위에 주요 기능 로직을 구현하여 실제 서비스 흐름을 완성했습니다. <br><br>

또한 **객체 인식**(**BlazeFace 적용**)과 대화 파이프라인 설계, 그리고 전체적인 기술 문서화를 맡아 프로젝트의 완성도를 높이는 데 기여했습니다. 
팀 내에서 경험 차이가 있었지만, 서로의 역할을 존중하며 협업한 덕분에 프로젝트를 성공적으로 마칠 수 있었습니다. <br><br>

</details>



<details>
  <summary>🚀 주요 기능 </summary>

  <br>
  
- **사용자 인식**: BlazeFace 기반 얼굴 인식, 세션 토큰 발급 및 만료 관리   <br><br>
- **음성 인터페이스**: Whisper STT, OpenAI TTS, VAD 적용  <br><br>
- **대화 처리**: LLM Agent를 통한 질의 분석, 문서 검색/날씨 API 연동  <br><br>
- **응답 출력**: 음성 및 화면 UI 동시 제공  
</details>


<details>
  <summary> ⚠️ 오류 발생 케이스</summary>

<br>

- **얼굴 인식**: 조도/화질 문제, 다중 사용자 충돌  <br><br>
- **음성 인식**: 잡음 환경 오류, 긴 발화 중단   <br><br>
- **대화 처리**: LLM 응답 지연, 범위 외 질의   <br><br>
- **서비스 기능**: 외부 API 지연/실패, 권한 없는 문서 접근   <br><br>
  
</details>

<details>
  <summary> 🧪 테스트 고려사항</summary>

<br>

  1. **멀티모달 동시 입력**: 얼굴/음성 인식 충돌 처리   <br><br>
2. **성능 검증**: 라즈베리파이 환경 BlazeFace FPS, Whisper STT 실시간성  <br><br>
3. **대화 품질**: VAD 적용 후 음성 끊김 여부, 캐싱 응답 일관성  <br><br>
4. **장애 대응**: API 실패 시 Fallback, 네트워크 단절 시 안내 메시지  <br><br>
</details>


# 📊 Sequence Diagram
<details>
  <summary> 얼굴 존재 감지 & 세션 시작 (BlazeFace + TFJS → /session/start) </summary>

  <img width="1050" height="564" alt="1 얼굴 존재 감지   세션 시작" src="https://github.com/user-attachments/assets/8a1982b3-56e7-452a-ad24-ea06f097ba16" />

</details>

<details>
  <summary>음성 업로드 → 오디오 정규화(ffmpeg) → STT(OpenAI)</summary>

  <img width="1050" height="423" alt="2" src="https://github.com/user-attachments/assets/45905d2d-945b-45ee-b01a-29c1fc2e8fad" />

</details>

<details>
  <summary>메인 대화 파이프라인 (STT → Keyword Filter → OpenAI Intent → Service Router)</summary>

  <img width="1074" height="420" alt="3" src="https://github.com/user-attachments/assets/0efe6091-ae17-4867-b36d-dfb6c658af3c" />

</details>

<details>
  <summary>날씨 질의 (키워드 필터 포함 → httpx OWM → OpenAI 2줄 요약)</summary>

  <img width="1245" height="543" alt="4" src="https://github.com/user-attachments/assets/0f22773c-ad95-4039-9b0b-df089b2e334d" />

</details>

<details>
  <summary>문서 발급(예: 등본) — 정책/옵션 → 본인확인 → 발급/출력/감사로그</summary>

  <img width="1214" height="645" alt="5" src="https://github.com/user-attachments/assets/a671ac5d-598b-4324-83c1-ba4c0fec4387" />

</details>

<details>
  <summary>날짜별 축제 조회 → 동적 페이지 생성 → QR 코드 반환</summary>

  <img width="1041" height="534" alt="8" src="https://github.com/user-attachments/assets/ef10400a-807f-4b47-95e6-c2ce3f298d76" />

</details>

<details>
  <summary>VAD 기반 실시간 대화(스트리밍) — pvcobra + sounddevice + resampy</summary>

  <img width="996" height="646" alt="6" src="https://github.com/user-attachments/assets/d8f6d768-dbb5-4de9-8b88-ad521619f2da" />

</details>

<details>
  <summary>TTS 합성 & 재생 (OpenAI TTS → 브라우저 재생)</summary>

  <img width="996" height="646" alt="6" src="https://github.com/user-attachments/assets/a7be1581-1382-41bf-b1bd-c4c73d5186e9" />

</details>

<details>
  <summary>장애/지연 대응 — 오프라인 큐 & 알림</summary>

  <img width="1010" height="588" alt="7" src="https://github.com/user-attachments/assets/4fedbc5a-7fb8-42d4-b4c3-1df259573c4b" />

</details>




# 기술 적용 내역 
<details>
  <summary> 🔗 기술 적용 내역</summary>

<br>

  본 프로젝트는 **Python 3.10**를 기반으로 개발되었으며,  
  웹 서버, 음성 입출력, LLM 연동을 중심으로 다양한 라이브러리가 사용되었습니다.  

  ### 🖥️ 프론트엔드 (Kiosk UI)
- **React** — UI 구성
- **@tensorflow-models/blazeface** — 경량 얼굴 검출 모델 (입장/존재 감지)
- **@testing-library/react / jest-dom / user-event** — UI 테스트 도구
- **concurrently** — 개발 편의 실행 스크립트

### ⚙️ 백엔드 (Python API)
- **FastAPI** — 비동기 웹 API 프레임워크
- **Pydantic** — 요청/응답 스키마 검증
- **httpx** — 외부 API 연동(예: 날씨)
- **openai** — LLM 요청 및 TTS/STT 연동
- **loguru** — 구조적 로깅
- **python-dotenv** — 환경변수 로딩(.env)

### 🔊 음성 · VAD · 오디오 I/O (Python)
- **pvcobra** — 음성 구간 검출(VAD)
- **sounddevice** — 마이크 입력 장치 제어
- **resampy** — 오디오 리샘플링(예: 48kHz → 16kHz)
- **numpy** — 신호/수치 연산

### 🛠️ 외부 도구 / 런타임 의존
- **ffmpeg** — 브라우저 오디오(webm/ogg) → WAV(16kHz, mono) 변환
</details>

