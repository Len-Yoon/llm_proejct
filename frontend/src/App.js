// src/App.js
import React, { useState, useEffect, useCallback, useRef } from "react";

// 0) 코어/훅/서비스 (실행 흐름에 맞춰 상단 정리)
import { useVoiceFlow } from "./hooks/useVoiceFlow";
import { PipelineController } from "./core/PipelineController";
import { audioUnlock } from "./core/AudioUnlock";
import { prefetchTTSAudio } from "./services/ttsClient";
import { routeKioskRequest } from "./services/kioskRequest";

// 1) 스타일 + 화면 컴포넌트
import "./styles/App.css";
import WelcomeScreen from "./components/WelcomeScreen";
import RecognitionScreen from "./components/RecognitionScreen";
import Keypad from "./components/Keypad";
import DocumentViewer from "./components/DocumentViewer";
import FestivalScreen from "./components/FestivalScreen";
import WeatherScreen from "./components/WeatherScreen";

// 2) 유틸/외부 라이브러리
import Papa from "papaparse";

// ============================================================================
// [서비스 플로우 개요]
//   Welcome → (인사 TTS) → 자동 청취(STT) → 의도 라우팅(routeKioskRequest)
//           → 화면 전환(FESTIVAL/WEATHER/PIN/DOC) + 상황별 발화
// ============================================================================

const WELCOME_MSG =
  "안녕하세요! 무엇을 도와드릴까요? 아래 버튼을 누르거나 음성으로 말씀해주세요.";
const SKIP_WEATHER_INTRO = true;

const dummyUsers = {
  "9011111111111": "홍길동",
  "8505051222222": "김상철",
  "9701012345678": "이영희",
};

function App() {
  // ==========================================================================
  // A. UI/플로우 상태
  // ==========================================================================
  const [flowState, setFlowState] = useState("WELCOME");
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [recognizedText, setRecognizedText] = useState("");
  const [purpose, setPurpose] = useState("");

  // 신원/PIN
  const [pinValue, setPinValue] = useState("");
  const [userName, setUserName] = useState("");

  // 축제
  const [festivalData, setFestivalData] = useState([]);
  const [festivalKeyword, setFestivalKeyword] = useState("");

  // 날씨
  const [weatherKeyword, setWeatherKeyword] = useState("");
  const [weatherData, setWeatherData] = useState(null);
  const [weatherAiSummary, setWeatherAiSummary] = useState("");

  // ==========================================================================
  // B. refs/guards (안전한 상태 조회 & 중복 호출 방지)
  // ==========================================================================
  const flowStateRef = useRef(flowState);
  useEffect(() => {
    flowStateRef.current = flowState;
  }, [flowState]);

  const prevFlowState = useRef(null);
  const weatherSummarySpokenRef = useRef(false);
  const welcomeListenStartedRef = useRef(false);

  // ==========================================================================
  // C. 음성 파이프라인 훅 + 컨트롤러
  // ==========================================================================
  const {
    flowState: voiceFlowState,
    speak,
    listenAndRecognize,
    stopSpeaking,
    stopListening,
  } = useVoiceFlow({ onCommandReceived, onError });

  const voiceFlowStateRef = useRef(voiceFlowState);
  useEffect(() => {
    voiceFlowStateRef.current = voiceFlowState;
  }, [voiceFlowState]);

  const controllerRef = useRef(null);
  if (!controllerRef.current) {
    controllerRef.current = new PipelineController({
      stopSpeaking,
      speak,
      listenAndRecognize,
      stopListening,
    });
  }
  const C = controllerRef.current;

  // ==========================================================================
  // D. [콜백] STT 결과/에러
  // ==========================================================================
  function onCommandReceived(command) {
    setIsRecognizing(false);
    setRecognizedText(command);
  }

  function onError(error) {
    setIsRecognizing(false);
    let errorMessage = "음성 인식 중 오류가 발생했습니다.";
    switch (error?.code) {
      case "MIC_PERMISSION_DENIED":
        errorMessage = "마이크 사용 권한을 허용해주세요.";
        break;
      case "NO_MICROPHONE":
        errorMessage = "사용 가능한 마이크 장치가 없습니다.";
        break;
      case "STT_NO_SPEECH":
        return;
      case "STT_LOW_CONFIDENCE":
        errorMessage = "음성을 명확히 인식하지 못했습니다. 다시 말씀해주세요.";
        break;
      default:
        break;
    }
    alert(errorMessage);
  }

  // ==========================================================================
  // E. [초기화] 오디오 언락 + 웰컴 TTS 프리페치
  // ==========================================================================
  useEffect(() => {
    const handler = () => audioUnlock.unlock();
    window.addEventListener("pointerdown", handler, { once: true });
    window.addEventListener("keydown", handler, { once: true });
    return () => {
      window.removeEventListener("pointerdown", handler);
      window.removeEventListener("keydown", handler);
    };
  }, []);

  useEffect(() => {
    prefetchTTSAudio(WELCOME_MSG).catch(() => {});
  }, []);
  useEffect(() => {
    if (flowState === "WELCOME") prefetchTTSAudio(WELCOME_MSG).catch(() => {});
  }, [flowState]);

  // ==========================================================================
  // F. [Welcome] 인사 → 자동 청취(STT) 트리거
  // ==========================================================================
  const startMicIfWelcome = useCallback(() => {
    if (flowStateRef.current !== "WELCOME") return;
    if (welcomeListenStartedRef.current) return;
    if (
      voiceFlowStateRef.current === "LISTENING" ||
      voiceFlowStateRef.current === "PROCESSING"
    )
      return;

    welcomeListenStartedRef.current = true;
    setIsRecognizing(true);
    listenAndRecognize();
  }, [listenAndRecognize]);

  const handleVoiceClick = useCallback(async () => {
    if (
      voiceFlowStateRef.current === "LISTENING" ||
      voiceFlowStateRef.current === "PROCESSING"
    )
      return;

    try {
      await C.speakWelcomeWithBackend(WELCOME_MSG);
      startMicIfWelcome();
    } catch {
      startMicIfWelcome();
    }
  }, [C, startMicIfWelcome]);

  // ==========================================================================
  // G. [문서 인쇄/키패드/PIN 처리]
  // ==========================================================================
  const handlePrint = () => {
    if (purpose.includes("등본") || purpose.includes("초본"))
      C.safeSpeak(`${purpose}이 출력되었습니다.`);
    else C.safeSpeak(`${purpose}가 출력되었습니다.`);
    window.print();
  };

  const handleKeyPress = (key) => {
    if (key === "clear") setPinValue("");
    else if (key === "submit") handlePinSubmit(pinValue);
    else if (pinValue.length < 13) setPinValue((prev) => prev + key);
  };

  const handlePinSubmit = (pin) => {
    if (dummyUsers[pin]) {
      setUserName(dummyUsers[pin]);
      setFlowState("DOCUMENT_VIEW");
    } else {
      alert("등록되지 않은 주민번호입니다.");
      setPinValue("");
    }
  };

  // ==========================================================================
  // H. [메뉴/홈] 수동 트리거 & 초기화
  // ==========================================================================
  const handleMenuClick = useCallback(
    (text) => {
      C.stopAllSpeechAndTimers();
      setRecognizedText(text);
    },
    [C]
  );

  const handleBackToHome = useCallback(() => {
    C.stopBasicTTS();
    setFlowState("WELCOME");
    setIsRecognizing(false);
    setRecognizedText("");
    setPurpose("");
    setPinValue("");
    setUserName("");
    setWeatherKeyword("");
    setWeatherData(null);
    setWeatherAiSummary("");
    weatherSummarySpokenRef.current = false;
    welcomeListenStartedRef.current = false;

    C.stopAllSpeechAndTimers();
    try {
      stopListening?.();
    } catch {}
    try {
      if (window?.mediaStreamRef?.current) {
        window.mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        window.mediaStreamRef.current = null;
      }
    } catch {}
  }, [C, stopListening]);

  // ==========================================================================
  // I. [의도 라우팅] STT/텍스트 → 서버(routeKioskRequest) → 화면 분기
  // ==========================================================================
  const handleRequest = useCallback(
    async (text) => {
      try {
        const result = await routeKioskRequest(text);
        setPurpose(result.purpose || "");

        if (result.screen === "FESTIVAL") {
          setFestivalKeyword(result.payload.keyword);
          Papa.parse("/festival.csv", {
            download: true,
            header: true,
            complete: (r) => {
              setFestivalData(r.data);
              setFlowState("FESTIVAL");
            },
          });
          return;
        }

        if (result.screen === "WEATHER_VIEW") {
          setWeatherKeyword(result.payload.keyword);
          setWeatherData(result.payload.weatherData);
          setWeatherAiSummary(result.payload.weatherAiSummary);
          setFlowState("WEATHER_VIEW");
          return;
        }

        if (result.screen === "PIN_INPUT") {
          setFlowState("PIN_INPUT");
          return;
        }

        // 인식 실패
        handleBackToHome();
        await C.sayThen(
          "죄송해요. 잘 이해하지 못했어요. 다시 한번 말씀해 주세요.",
          startMicIfWelcome
        );
      } catch (error) {
        console.error("처리 중 오류 발생:", error);
        handleBackToHome();
        await C.sayThen(
          "요청을 처리하는 중 문제가 발생했어요. 다시 한번 말씀해 주세요.",
          startMicIfWelcome
        );
      }
    },
    [C, startMicIfWelcome, handleBackToHome]
  );

  // recognizedText가 생기면 즉시 라우팅
  useEffect(() => {
    if (recognizedText && recognizedText.trim()) {
      handleRequest(recognizedText);
      setRecognizedText("");
    }
  }, [recognizedText, handleRequest]);

  // ==========================================================================
  // J. [상태 진입 멘트] (WEATHER_VIEW는 별도 체인)
  // ==========================================================================
  useEffect(() => {
    if (C.debouncedSpeakTid) {
      clearTimeout(C.debouncedSpeakTid);
      C.debouncedSpeakTid = null;
    }
    C.debouncedSpeakTid = setTimeout(() => {
      if (flowState === prevFlowState.current) return;
      prevFlowState.current = flowState;

      if (flowState === "PIN_INPUT") {
        C.safeSpeak("주민등록번호 열 세자리를 입력해주세요.");
      } else if (flowState === "DOCUMENT_VIEW") {
        if (purpose) {
          if (purpose.includes("등본") || purpose.includes("초본"))
            C.safeSpeak(
              `${purpose}이 준비되었습니다. 인쇄를 원하시면 인쇄 버튼을 눌러주세요.`
            );
          else
            C.safeSpeak(
              `${purpose}가 준비되었습니다. 인쇄를 원하시면 인쇄 버튼을 눌러주세요.`
            );
        }
      } else if (flowState === "FESTIVAL") {
        C.safeSpeak("서울시 축제 정보를 안내합니다.");
      }
    }, 300);
  }, [flowState, purpose, C]);

  // 화면 전환 시 공통 클린업
  useEffect(() => {
    C.stopAllSpeechAndTimers();
    if (flowState === "WEATHER_VIEW") weatherSummarySpokenRef.current = false;
    if (flowState === "WELCOME") welcomeListenStartedRef.current = false;
  }, [flowState, C]);

  // ==========================================================================
  // K. [유틸] 한국어 문장 청크 + 날씨 요약 발화 체인
  // ==========================================================================
  const chunkKoreanText = useCallback((s, maxLen = 240) => {
    const sentences = s
      .replace(/\s+/g, " ")
      .split(/(?<=[.?!]|다\.|요\.|니다\.)\s+/);
    const out = [];
    let buf = "";
    for (const sent of sentences) {
      const piece = sent.trim();
      if (!piece) continue;
      if ((buf + " " + piece).trim().length > maxLen) {
        if (buf) out.push(buf.trim());
        if (piece.length > maxLen) {
          for (let i = 0; i < piece.length; i += maxLen)
            out.push(piece.slice(i, i + maxLen));
          buf = "";
        } else buf = piece;
      } else buf = (buf ? buf + " " : "") + piece;
    }
    if (buf) out.push(buf.trim());
    return out;
  }, []);

  // WEATHER_VIEW 진입 시: 요약 텍스트 프리페치 후 순차 발화
  useEffect(() => {
    if (flowState !== "WEATHER_VIEW") return;
    if (weatherSummarySpokenRef.current) return;
    if (!weatherAiSummary || !weatherAiSummary.trim()) return;

    if (C.weatherSummaryTid) {
      clearTimeout(C.weatherSummaryTid);
      C.weatherSummaryTid = null;
    }
    C.weatherSummaryTid = setTimeout(() => {
      (async () => {
        try {
          const chunks = chunkKoreanText(weatherAiSummary);
          // 병렬 프리페치
          chunks.forEach((c) => {
            prefetchTTSAudio(c).catch(() => {});
          });

          if (!SKIP_WEATHER_INTRO) {
            await C.speakWelcomeWithBackend("현재 날씨와 주간 예보를 알려드립니다.");
          }
          // 순차 재생
          for (const c of chunks) {
            await C.speakWelcomeWithBackend(c);
          }
        } catch {
          try {
            C.safeSpeak(weatherAiSummary);
          } catch {}
        } finally {
          weatherSummarySpokenRef.current = true;
        }
      })();
    }, 0);

    return () => {
      if (C.weatherSummaryTid) {
        clearTimeout(C.weatherSummaryTid);
        C.weatherSummaryTid = null;
      }
    };
  }, [
    flowState,
    weatherAiSummary,
    C,
    chunkKoreanText,
    SKIP_WEATHER_INTRO,
    prefetchTTSAudio,
  ]);

  // ==========================================================================
  // L. [표시용] LISTENING/PROCESSING → 인식중 스피너 표시
  // ==========================================================================
  useEffect(() => {
    setIsRecognizing(
      voiceFlowState === "LISTENING" || voiceFlowState === "PROCESSING"
    );
  }, [voiceFlowState]);

  // ==========================================================================
  // M. 렌더
  // ==========================================================================
  const renderCurrentScreen = () => {
    switch (flowState) {
      case "WELCOME":
        return (
          <WelcomeScreen
            onMenuClick={handleMenuClick}
            onSubmitText={(text) => setRecognizedText(text)}
            onVoiceClick={handleVoiceClick}
            isRecognizing={isRecognizing}
          />
        );
      case "FESTIVAL":
        return (
          <FestivalScreen festivals={festivalData} keyword={festivalKeyword} />
        );
      case "WEATHER_VIEW":
        return (
          <WeatherScreen
            weatherInfo={weatherData}
            keyword={weatherKeyword}
            summary={weatherAiSummary}
          />
        );
      case "PIN_INPUT":
        return (
          <div className="pin-screen">
            <div className="recognition-wrapper">
              <RecognitionScreen status="finished" text={recognizedText} />
            </div>
            <div className="pin-wrapper">
              <h2>주민번호를 입력해주세요 (- 없이)</h2>
              <Keypad value={pinValue} onKeyPress={handleKeyPress} />
            </div>
          </div>
        );
      case "DOCUMENT_VIEW":
        return (
          <DocumentViewer name={userName} purpose={purpose} onPrint={handlePrint} />
        );
      default:
        return (
          <WelcomeScreen
            onMenuClick={handleMenuClick}
            onSubmitText={(text) => setRecognizedText(text)}
            onVoiceClick={handleVoiceClick}
            isRecognizing={isRecognizing}
          />
        );
    }
  };

  return (
    <div className="kiosk-frame">
      {flowState !== "WELCOME" && (
        <button
          className="home-button"
          onClick={handleBackToHome}
          aria-label="홈으로"
          title="홈으로"
        />
      )}
      {renderCurrentScreen()}
    </div>
  );
}

export default App;
