// src/App.js
import React, {useState, useEffect, useCallback, useRef} from "react";
import {useVoiceFlow} from "./hooks/useVoiceFlow";
import "./styles/App.css";
import WelcomeScreen from "./components/WelcomeScreen";
import RecognitionScreen from "./components/RecognitionScreen";
import Keypad from "./components/Keypad";
import DocumentViewer from "./components/DocumentViewer";
import FestivalScreen from "./components/FestivalScreen";
import Papa from "papaparse";
import WeatherScreen from "./components/WeatherScreen";

// 서비스/컨트롤러
import {prefetchTTSAudio} from "./services/ttsClient";
import {routeKioskRequest} from "./services/kioskRequest";
import {PipelineController} from "./core/PipelineController";
import {audioUnlock} from "./core/AudioUnlock";

function App() {
    // ---- UI/플로우 상태 ----
    const [flowState, setFlowState] = useState("WELCOME");
    const [isRecognizing, setIsRecognizing] = useState(false);
    const [recognizedText, setRecognizedText] = useState("");
    const [purpose, setPurpose] = useState("");
    const [pinValue, setPinValue] = useState("");
    const [userName, setUserName] = useState("");
    const [festivalData, setFestivalData] = useState([]);
    const [festivalKeyword, setFestivalKeyword] = useState("");
    const [weatherKeyword, setWeatherKeyword] = useState("");
    const [weatherData, setWeatherData] = useState(null);
    const [weatherAiSummary, setWeatherAiSummary] = useState("");

    // ---- refs/guards ----
    const flowStateRef = useRef(flowState);
    useEffect(() => {
        flowStateRef.current = flowState;
    }, [flowState]);
    const prevFlowState = useRef(null);
    const weatherSummarySpokenRef = useRef(false);
    const welcomeListenStartedRef = useRef(false);

    const WELCOME_MSG =
        "안녕하세요! 무엇을 도와드릴까요? 아래 버튼을 누르거나 음성으로 말씀해주세요.";
    const dummyUsers = {
        "9011111111111": "홍길동",
        "8505051222222": "김상철",
        "9701012345678": "이영희",
    };

    // 요약 빨리: true면 인트로 스킵
    const SKIP_WEATHER_INTRO = true;

    // ---- 음성 훅 ----
    const {
        flowState: voiceFlowState,
        speak,
        listenAndRecognize,
        stopSpeaking,
        stopListening,
    } = useVoiceFlow({onCommandReceived, onError});

    const voiceFlowStateRef = useRef(voiceFlowState);
    useEffect(() => {
        voiceFlowStateRef.current = voiceFlowState;
    }, [voiceFlowState]);

    // ---- 컨트롤러 ----
    const controllerRef = useRef(null);
    if (!controllerRef.current) {
        controllerRef.current = new PipelineController({
            stopSpeaking, speak, listenAndRecognize, stopListening,
        });
    }
    const C = controllerRef.current;

    // ---- STT 콜백 ----
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

    // ---- 오디오 언락 ----
    useEffect(() => {
        const handler = () => audioUnlock.unlock();
        window.addEventListener("pointerdown", handler, {once: true});
        window.addEventListener("keydown", handler, {once: true});
        return () => {
            window.removeEventListener("pointerdown", handler);
            window.removeEventListener("keydown", handler);
        };
    }, []);

    // ---- TTS 프리페치 ----
    useEffect(() => {
        prefetchTTSAudio(WELCOME_MSG).catch(() => {
        });
    }, []);
    useEffect(() => {
        if (flowState === "WELCOME") prefetchTTSAudio(WELCOME_MSG).catch(() => {
        });
    }, [flowState]);

    // ---- 웰컴 후 자동 청취 ----
    const startMicIfWelcome = useCallback(() => {
        if (flowStateRef.current !== "WELCOME") return;
        if (welcomeListenStartedRef.current) return;
        if (voiceFlowStateRef.current === "LISTENING" || voiceFlowStateRef.current === "PROCESSING") return;
        welcomeListenStartedRef.current = true;
        setIsRecognizing(true);
        listenAndRecognize();
    }, [listenAndRecognize]);

    const handleVoiceClick = useCallback(async () => {
        if (voiceFlowStateRef.current === "LISTENING" || voiceFlowStateRef.current === "PROCESSING") return;
        try {
            await C.speakWelcomeWithBackend(WELCOME_MSG);
            startMicIfWelcome();
        } catch {
            startMicIfWelcome();
        }
    }, [C, startMicIfWelcome]);

    // ---- 인쇄 ----
    const handlePrint = () => {
        if (purpose.includes("등본") || purpose.includes("초본"))
            C.safeSpeak(`${purpose}이 출력되었습니다.`);
        else
            C.safeSpeak(`${purpose}가 출력되었습니다.`);
        window.print();
    };

    // ---- PIN ----
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

    // ---- 메뉴 클릭 ----
    const handleMenuClick = useCallback((text) => {
        C.stopAllSpeechAndTimers();
        setRecognizedText(text);
    }, [C]);

    // ---- 홈으로 ----
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
        } catch {
        }
        try {
            if (window?.mediaStreamRef?.current) {
                window.mediaStreamRef.current.getTracks().forEach((t) => t.stop());
                window.mediaStreamRef.current = null;
            }
        } catch {
        }
    }, [C, stopListening]);

    // ---- 서버 요청 → 라우팅 ----
    const handleRequest = useCallback(async (text) => {
        try {
            const result = await routeKioskRequest(text);
            setPurpose(result.purpose || "");

            if (result.screen === "FESTIVAL") {
                setFestivalKeyword(result.payload.keyword);
                Papa.parse("/festival.csv", {
                    download: true, header: true, complete: (r) => {
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
            await C.sayThen("죄송해요. 잘 이해하지 못했어요. 다시 한번 말씀해 주세요.", startMicIfWelcome);
        } catch (error) {
            console.error("처리 중 오류 발생:", error);
            handleBackToHome();
            await C.sayThen("요청을 처리하는 중 문제가 발생했어요. 다시 한번 말씀해 주세요.", startMicIfWelcome);
        }
    }, [C, startMicIfWelcome, handleBackToHome]);

    // ---- 화면 전환 클린업 ----
    useEffect(() => {
        C.stopAllSpeechAndTimers();
        if (flowState === "WEATHER_VIEW") weatherSummarySpokenRef.current = false;
        if (flowState === "WELCOME") welcomeListenStartedRef.current = false;
    }, [flowState, C]);

    // ---- 음성 인식 결과 처리 ----
    useEffect(() => {
        if (recognizedText && recognizedText.trim()) {
            handleRequest(recognizedText);
            setRecognizedText("");
        }
    }, [recognizedText, handleRequest]);

    // ---- 상태별 멘트 (WEATHER_VIEW는 아래 체인에서 처리) ----
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
                        C.safeSpeak(`${purpose}이 준비되었습니다. 인쇄를 원하시면 인쇄 버튼을 눌러주세요.`);
                    else
                        C.safeSpeak(`${purpose}가 준비되었습니다. 인쇄를 원하시면 인쇄 버튼을 눌러주세요.`);
                }
            } else if (flowState === "FESTIVAL") {
                C.safeSpeak("서울시 축제 정보를 안내합니다.");
            }
        }, 300);
    }, [flowState, purpose, C]);

    // ---- 한국어 문장 단위로 조각내기 ----
    const chunkKoreanText = useCallback((s, maxLen = 240) => {
        const sentences = s.replace(/\s+/g, " ").split(/(?<=[.?!]|다\.|요\.|니다\.)\s+/);
        const out = [];
        let buf = "";
        for (const sent of sentences) {
            const piece = sent.trim();
            if (!piece) continue;
            if ((buf + " " + piece).trim().length > maxLen) {
                if (buf) out.push(buf.trim());
                if (piece.length > maxLen) {
                    for (let i = 0; i < piece.length; i += maxLen) out.push(piece.slice(i, i + maxLen));
                    buf = "";
                } else buf = piece;
            } else buf = (buf ? buf + " " : "") + piece;
        }
        if (buf) out.push(buf.trim());
        return out;
    }, []);

    // ---- 날씨: 요약 빠르게(병렬 프리페치 + 인트로 스킵 옵션) ----
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
                    // 프리페치 병렬 시작
                    chunks.forEach((c) => {
                        prefetchTTSAudio(c).catch(() => {
                        });
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
                    } catch {
                    }
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
    }, [flowState, weatherAiSummary, C, chunkKoreanText, SKIP_WEATHER_INTRO, prefetchTTSAudio]);

    // ---- 표시용: 청취/처리 중 상태 ----
    useEffect(() => {
        setIsRecognizing(voiceFlowState === "LISTENING" || voiceFlowState === "PROCESSING");
    }, [voiceFlowState]);

    // ---- 화면 렌더 ----
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
                return <FestivalScreen festivals={festivalData} keyword={festivalKeyword}/>;
            case "WEATHER_VIEW":
                return <WeatherScreen weatherInfo={weatherData} keyword={weatherKeyword} summary={weatherAiSummary}/>;
            case "PIN_INPUT":
                return (
                    <div className="pin-screen">
                        <div className="recognition-wrapper">
                            <RecognitionScreen status="finished" text={recognizedText}/>
                        </div>
                        <div className="pin-wrapper">
                            <h2>주민번호를 입력해주세요 (- 없이)</h2>
                            <Keypad value={pinValue} onKeyPress={handleKeyPress}/>
                        </div>
                    </div>
                );
            case "DOCUMENT_VIEW":
                return <DocumentViewer name={userName} purpose={purpose} onPrint={handlePrint}/>;
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
