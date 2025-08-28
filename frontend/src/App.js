// src/App.js
import React, {useState, useEffect, useCallback, useRef} from 'react';
import {useVoiceFlow} from './hooks/useVoiceFlow';
import './styles/App.css';
import WelcomeScreen from './components/WelcomeScreen';
import RecognitionScreen from './components/RecognitionScreen';
import Keypad from './components/Keypad';
import DocumentViewer from './components/DocumentViewer';
import FestivalScreen from './components/FestivalScreen';
import Papa from 'papaparse';
import WeatherScreen from './components/WeatherScreen';

function App() {
    // ---- UI/플로우 상태 ----
    const [flowState, setFlowState] = useState('WELCOME');
    const [isRecognizing, setIsRecognizing] = useState(false);
    const [recognizedText, setRecognizedText] = useState('');
    const [purpose, setPurpose] = useState('');
    const [pinValue, setPinValue] = useState('');
    const [userName, setUserName] = useState('');
    const [festivalData, setFestivalData] = useState([]);
    const [festivalKeyword, setFestivalKeyword] = useState('');
    const [weatherKeyword, setWeatherKeyword] = useState('');
    const [weatherData, setWeatherData] = useState(null);
    const [weatherAiSummary, setWeatherAiSummary] = useState('');

    // ---- 최신 상태/타이머 가드 ----
    const flowStateRef = useRef(flowState);
    useEffect(() => {
        flowStateRef.current = flowState;
    }, [flowState]);
    const prevFlowState = useRef(null);
    const weatherSummarySpokenRef = useRef(false);
    const welcomeListenStartedRef = useRef(false);
    const debouncedSpeakTidRef = useRef(null);
    const weatherSummaryTidRef = useRef(null);

    // ---- 오디오 언락/핸들 ----
    const [audioUnlocked, setAudioUnlocked] = useState(false);
    const pendingSpeakRef = useRef(null);
    const audioCtxRef = useRef(null);
    const welcomeAudioRef = useRef(null);

    // ---- 음성 파이프라인 훅 ----
    const {
        flowState: voiceFlowState,
        speak,               // 백엔드 TTS 재생
        listenAndRecognize,  // STT 시작
        stopSpeaking,        // TTS 중단
        stopListening,       // 👈 STT 중단 추가로 받아옴
    } = useVoiceFlow({onCommandReceived, onError});

    const voiceFlowStateRef = useRef(voiceFlowState);
    useEffect(() => {
        voiceFlowStateRef.current = voiceFlowState;
    }, [voiceFlowState]);

    const WELCOME_MSG = '안녕하세요! 무엇을 도와드릴까요? 아래 버튼을 누르거나 음성으로 말씀해주세요.';
    const dummyUsers = {
        '9011111111111': '홍길동',
        '8505051222222': '김상철',
        '9701012345678': '이영희',
    };

    // ---- STT 콜백 ----
    function onCommandReceived(command) {
        setIsRecognizing(false);
        setRecognizedText(command);
    }

    function onError(error) {
        setIsRecognizing(false);
        let errorMessage = '음성 인식 중 오류가 발생했습니다.';
        switch (error?.code) {
            case 'MIC_PERMISSION_DENIED':
                errorMessage = '마이크 사용 권한을 허용해주세요.';
                break;
            case 'NO_MICROPHONE':
                errorMessage = '사용 가능한 마이크 장치가 없습니다.';
                break;
            case 'STT_NO_SPEECH':
                return;
            case 'STT_LOW_CONFIDENCE':
                errorMessage = '음성을 명확히 인식하지 못했습니다. 다시 말씀해주세요.';
                break;
            default:
                break;
        }
        alert(errorMessage);
    }

    // ---- 오디오/타이머 정리 ----
    const stopAllSpeechAndTimers = useCallback(() => {
        try {
            stopSpeaking?.();
        } catch (_) {
        }
        try {
            window?.speechSynthesis?.cancel();
        } catch (_) {
        }
        [debouncedSpeakTidRef, weatherSummaryTidRef].forEach(ref => {
            if (ref.current) {
                clearTimeout(ref.current);
                ref.current = null;
            }
        });
        const a = welcomeAudioRef.current;
        if (a) {
            try {
                a.onended = null;
                a.onerror = null;
                a.pause();
                a.src = '';
            } catch (_) {
            }
            welcomeAudioRef.current = null;
        }
    }, [stopSpeaking]);

    // ---- 사용자 제스처로 오디오 언락 ----
    const unlockAudio = useCallback(async () => {
        if (audioUnlocked) return;
        try {
            window?.speechSynthesis?.resume?.();
        } catch (_) {
        }
        try {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (AC) {
                if (!audioCtxRef.current) audioCtxRef.current = new AC();
                await audioCtxRef.current.resume();
            }
        } catch (_) {
        }
        setAudioUnlocked(true);
        if (pendingSpeakRef.current) {
            const text = pendingSpeakRef.current;
            pendingSpeakRef.current = null;
            speak(text);
        }
    }, [audioUnlocked, speak]);

    useEffect(() => {
        const handler = () => unlockAudio();
        window.addEventListener('pointerdown', handler, {once: true});
        window.addEventListener('keydown', handler, {once: true});
        return () => {
            window.removeEventListener('pointerdown', handler);
            window.removeEventListener('keydown', handler);
        };
    }, [unlockAudio]);

    // ---- 일반 멘트 ----
    const safeSpeak = useCallback((text) => {
        stopAllSpeechAndTimers();
        if (!audioUnlocked) {
            pendingSpeakRef.current = text;
            return;
        }
        speak(text);
    }, [stopAllSpeechAndTimers, speak, audioUnlocked]);

    // ---- 홈으로 ----
    const handleBackToHome = () => {
        setFlowState('WELCOME');
        setIsRecognizing(false);
        setRecognizedText('');
        setPurpose('');
        setPinValue('');
        setUserName('');
        setWeatherKeyword('');
        setWeatherData(null);
        setWeatherAiSummary('');
        weatherSummarySpokenRef.current = false;
        welcomeListenStartedRef.current = false;

        // 1) TTS/타이머/웰컴오디오 정리
        stopAllSpeechAndTimers();

        // 2) STT 정리 (공식)
        try {
            stopListening?.();
        } catch (_) {
        }

        // 3) STT 폴백: 혹시 남은 마이크 트랙/스트림도 안전하게 종료
        try {
            if (window?.mediaStreamRef?.current) {
                window.mediaStreamRef.current.getTracks().forEach(track => track.stop());
                window.mediaStreamRef.current = null;
            }
        } catch (_) {
        }
    };

    // ---- TTS 프리페치 & 폴백 ----
    async function fetchTTSAudio({text, voice, speed}) {
        const endpoint = '/api/tts';
        const makeAudioFromResponse = async (res) => {
            const ct = (res.headers.get('content-type') || '').toLowerCase();
            if (ct.includes('application/json')) {
                const j = await res.json();
                const url = j.audioUrl || j.url || j.audio_url || j.location;
                if (!url) throw new Error('TTS JSON 응답에 audioUrl 없음');
                const a = new Audio(url);
                a.preload = 'auto';
                return a;
            }
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = new Audio(url);
            a.preload = 'auto';
            return a;
        };
        let res = await fetch(endpoint, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({text, voice, speed}),
        });
        if (res.status === 422 || res.status === 415) {
            const fd = new FormData();
            fd.append('text', text);
            if (voice) fd.append('voice', voice);
            if (speed != null) fd.append('speed', String(speed));
            res = await fetch(endpoint, {method: 'POST', body: fd});
        }
        if (!res.ok) {
            const q = new URLSearchParams({text, ...(voice ? {voice} : {}), ...(speed != null ? {speed} : {})}).toString();
            res = await fetch(`${endpoint}?${q}`, {method: 'GET'});
        }
        if (!res.ok) {
            const t = await res.text().catch(() => '');
            throw new Error(`TTS 실패: ${res.status} ${t}`);
        }
        return makeAudioFromResponse(res);
    }

    const ttsCacheRef = useRef(new Map());
    const prefetchTTSAudio = useCallback(async (text) => {
        const cache = ttsCacheRef.current;
        if (cache.has(text)) return cache.get(text);
        const p = (async () => {
            const a = await fetchTTSAudio({text});
            await new Promise((resolve) => {
                let doneOnce = false;
                const done = () => {
                    if (!doneOnce) {
                        doneOnce = true;
                        resolve();
                    }
                };
                a.addEventListener('canplay', done, {once: true});
                setTimeout(done, 700);
                try {
                    a.load();
                } catch {
                }
            });
            return a;
        })();
        cache.set(text, p);
        return p;
    }, []);

    useEffect(() => {
        prefetchTTSAudio(WELCOME_MSG).catch(() => {
        });
    }, [prefetchTTSAudio]);
    useEffect(() => {
        if (flowState === 'WELCOME') prefetchTTSAudio(WELCOME_MSG).catch(() => {
        });
    }, [flowState, prefetchTTSAudio]);

    // ---- 백엔드 TTS로 즉시 재생(ended까지 대기) ----
    const speakWelcomeWithBackend = useCallback(async (text) => {
        stopAllSpeechAndTimers();
        const unlockP = unlockAudio();
        const prefetchP = prefetchTTSAudio(text);
        const a0 = await prefetchP;
        await unlockP.catch(() => {
        });
        const a = new Audio(a0.src);
        a.preload = 'auto';
        return new Promise((resolve, reject) => {
            try {
                const prev = welcomeAudioRef.current;
                if (prev) {
                    try {
                        prev.onended = null;
                        prev.onerror = null;
                        prev.pause();
                        prev.src = '';
                    } catch {
                    }
                }
                a.onended = () => resolve();
                a.onerror = (e) => reject(e);
                welcomeAudioRef.current = a;
                a.play().catch(async (err) => {
                    try {
                        await unlockAudio();
                        await a.play();
                        resolve();
                    } catch (e2) {
                        reject(err || e2);
                    }
                });
            } catch (e) {
                reject(e);
            }
        });
    }, [stopAllSpeechAndTimers, unlockAudio, prefetchTTSAudio]);

    // ---- 멘트 종료 직후 WELCOME에서 자동 청취 ----
    const startMicIfWelcome = useCallback(() => {
        if (flowStateRef.current !== 'WELCOME') return;
        if (welcomeListenStartedRef.current) return;
        if (voiceFlowStateRef.current === 'LISTENING' || voiceFlowStateRef.current === 'PROCESSING') return;
        welcomeListenStartedRef.current = true;
        setIsRecognizing(true);
        listenAndRecognize();
    }, [listenAndRecognize]);

    // ---- 말하고(ended) 곧바로 듣기 ----
    const sayThenListen = useCallback(async (text) => {
        try {
            await speakWelcomeWithBackend(text);
        } catch (e) {
            console.warn('sayThenListen TTS 실패:', e);
        }
        startMicIfWelcome();
    }, [speakWelcomeWithBackend, startMicIfWelcome]);

    // ---- 얼굴 인식/버튼 트리거: 웰컴 멘트 후 자동 청취 ----
    const handleVoiceClick = useCallback(async () => {
        if (voiceFlowStateRef.current === 'LISTENING' || voiceFlowStateRef.current === 'PROCESSING') return;
        try {
            await speakWelcomeWithBackend(WELCOME_MSG);
            startMicIfWelcome();
        } catch (e) {
            console.warn('welcome TTS 실패:', e);
            startMicIfWelcome();
        }
    }, [speakWelcomeWithBackend, startMicIfWelcome]);

    // ---- 인쇄 ----
    const handlePrint = () => {
        if (purpose.includes('등본') || purpose.includes('초본')) safeSpeak(`${purpose}이 출력되었습니다.`);
        else safeSpeak(`${purpose}가 출력되었습니다.`);
        window.print();
    };

    // ---- 키패드/PIN ----
    const handleKeyPress = (key) => {
        if (key === 'clear') setPinValue('');
        else if (key === 'submit') handlePinSubmit(pinValue);
        else if (pinValue.length < 13) setPinValue(prev => prev + key);
    };
    const handlePinSubmit = (pin) => {
        if (dummyUsers[pin]) {
            setUserName(dummyUsers[pin]);
            setFlowState('DOCUMENT_VIEW');
        } else {
            alert('등록되지 않은 주민번호입니다.');
            setPinValue('');
        }
    };

    // ---- 메뉴 버튼 클릭: TTS 정지 후 바로 다음 스텝 ----
    const handleMenuClick = useCallback((text) => {
        stopAllSpeechAndTimers();                 // TTS/타이머 즉시 정지
        if (pendingSpeakRef.current) pendingSpeakRef.current = null;
        setRecognizedText(text);                  // 다음 단계로 바로 라우팅
        // (옵션) 버튼 클릭 후 STT도 바로 켜고 싶다면:
        // setIsRecognizing(true);
        // listenAndRecognize();
    }, [stopAllSpeechAndTimers]);

    // ---- 서버 요청 → 라우팅 ----
    const handleRequest = async (text) => {
        try {
            const res = await fetch('http://localhost:8000/receive-text/', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({text}),
            });
            if (!res.ok) throw new Error(`서버 응답 오류: ${res.status}`);
            const data = await res.json();
            const summary = data.summary || text;
            const docType = data.purpose || '';
            setPurpose(docType);

            if (summary.includes('축제') || summary.includes('행사')) {
                setFestivalKeyword(text);
                Papa.parse('/festival.csv', {
                    download: true, header: true,
                    complete: (result) => {
                        setFestivalData(result.data);
                        setFlowState('FESTIVAL');
                    },
                });
                return;
            }

            if (summary.includes('날씨')) {
                setWeatherKeyword(text);
                const weatherRes = await fetch('http://localhost:8000/weather/', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({city: 'Seoul'}),
                });
                if (!weatherRes.ok) {
                    const t = await weatherRes.text();
                    throw new Error(`날씨 API 오류: ${weatherRes.status} ${t}`);
                }
                const weatherResult = await weatherRes.json();
                setWeatherData(JSON.stringify(weatherResult, null, 2));
                const aiSummary = weatherResult?._meta?.ai_summary_ko ?? '';
                setWeatherAiSummary(aiSummary);
                setFlowState('WEATHER_VIEW');
                return;
            }

            let docName = '';
            if (summary.includes('등본')) docName = '주민등록등본';
            else if (summary.includes('초본')) docName = '주민등록초본';
            else if (summary.includes('가족관계')) docName = '가족관계증명서';
            else if (summary.includes('건강보험')) docName = '건강보험자격득실확인서';

            if (docName) {
                setPurpose(docName);
                setFlowState('PIN_INPUT');
            } else {
                handleBackToHome();
                await sayThenListen('죄송해요. 잘 이해하지 못했어요. 다시 한번 말씀해 주세요.');
            }
        } catch (error) {
            console.error('처리 중 오류 발생:', error);
            handleBackToHome();
            await sayThenListen('요청을 처리하는 중 문제가 발생했어요. 다시 한번 말씀해 주세요.');
        }
    };

    // ---- 화면 전환 시 클린업 ----
    useEffect(() => {
        stopAllSpeechAndTimers();
        if (flowState === 'WEATHER_VIEW') weatherSummarySpokenRef.current = false;
        if (flowState === 'WELCOME') welcomeListenStartedRef.current = false;
    }, [flowState, stopAllSpeechAndTimers]);

    // ---- 음성 인식 결과 → 요청 처리 ----
    useEffect(() => {
        if (recognizedText && recognizedText.trim()) {
            handleRequest(recognizedText);
            setRecognizedText('');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [recognizedText]);

    // ---- 상태별 한 줄 멘트 ----
    useEffect(() => {
        if (debouncedSpeakTidRef.current) {
            clearTimeout(debouncedSpeakTidRef.current);
            debouncedSpeakTidRef.current = null;
        }
        debouncedSpeakTidRef.current = setTimeout(() => {
            if (flowState === prevFlowState.current) return;
            prevFlowState.current = flowState;

            if (flowState === 'PIN_INPUT') {
                safeSpeak('주민등록번호 열 세자리를 입력해주세요.');
            } else if (flowState === 'DOCUMENT_VIEW') {
                if (purpose) {
                    if (purpose.includes('등본') || purpose.includes('초본'))
                        safeSpeak(`${purpose}이 준비되었습니다. 인쇄를 원하시면 인쇄 버튼을 눌러주세요.`);
                    else
                        safeSpeak(`${purpose}가 준비되었습니다. 인쇄를 원하시면 인쇄 버튼을 눌러주세요.`);
                }
            } else if (flowState === 'FESTIVAL') {
                safeSpeak('서울시 축제 정보를 안내합니다.');
            } else if (flowState === 'WEATHER_VIEW') {
                safeSpeak('현재 날씨와 주간 예보를 알려드립니다.');
            }
        }, 300);
        return () => {
            if (debouncedSpeakTidRef.current) {
                clearTimeout(debouncedSpeakTidRef.current);
                debouncedSpeakTidRef.current = null;
            }
        };
    }, [flowState, purpose, safeSpeak]);

    // ---- 날씨 요약 도착 시 1회만 읽기 ----
    useEffect(() => {
        if (flowState !== 'WEATHER_VIEW') return;
        if (weatherSummarySpokenRef.current) return;
        if (!weatherAiSummary || !weatherAiSummary.trim()) return;
        if (weatherSummaryTidRef.current) {
            clearTimeout(weatherSummaryTidRef.current);
            weatherSummaryTidRef.current = null;
        }
        weatherSummaryTidRef.current = setTimeout(() => {
            safeSpeak(weatherAiSummary);
            weatherSummarySpokenRef.current = true;
        }, 1500);
        return () => {
            if (weatherSummaryTidRef.current) {
                clearTimeout(weatherSummaryTidRef.current);
                weatherSummaryTidRef.current = null;
            }
        };
    }, [flowState, weatherAiSummary, safeSpeak]);

    // ---- 표시용: 청취/처리 중 상태 ----
    useEffect(() => {
        setIsRecognizing(voiceFlowState === 'LISTENING' || voiceFlowState === 'PROCESSING');
    }, [voiceFlowState]);

    // ---- 화면 렌더 ----
    const renderCurrentScreen = () => {
        switch (flowState) {
            case 'WELCOME':
                return (
                    <WelcomeScreen
                        onMenuClick={handleMenuClick}
                        onSubmitText={(text) => setRecognizedText(text)}
                        onVoiceClick={handleVoiceClick}
                        isRecognizing={isRecognizing}
                    />
                );
            case 'FESTIVAL':
                return <FestivalScreen festivals={festivalData} keyword={festivalKeyword}/>;
            case 'WEATHER_VIEW':
                return <WeatherScreen weatherInfo={weatherData} keyword={weatherKeyword} summary={weatherAiSummary}/>;
            case 'PIN_INPUT':
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
            case 'DOCUMENT_VIEW':
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
            {flowState !== 'WELCOME' && (
                <button className="home-button" onClick={handleBackToHome}></button>
            )}
            {renderCurrentScreen()}
        </div>
    );
}

export default App;
