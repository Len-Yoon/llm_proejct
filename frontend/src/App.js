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

    const prevFlowState = useRef(null);
    const weatherSummarySpokenRef = useRef(false);
    const welcomeListenStartedRef = useRef(false);

    // 🔔 모든 예약 타이머를 한곳에서 관리
    const debouncedSpeakTidRef = useRef(null);
    const welcomeStartTidRef = useRef(null);
    const welcomeRetryTidRef = useRef(null);
    const weatherSummaryTidRef = useRef(null);

    const dummyUsers = {
        '9011111111111': '홍길동',
        '8505051222222': '김상철',
        '9701012345678': '이영희',
    };

    const onCommandReceived = useCallback((command) => {
        setIsRecognizing(false);
        setRecognizedText(command);
    }, []);

    const onError = useCallback((error) => {
        setIsRecognizing(false);
        let errorMessage = '음성 인식 중 오류가 발생했습니다.';
        switch (error.code) {
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
    }, []);

    const {
        flowState: voiceFlowState,
        speak,
        listenAndRecognize,
        stopSpeaking, // ✅ useVoiceFlow에서 추가된 강제 중단 API 사용
    } = useVoiceFlow({onCommandReceived, onError});

    // 🔕 화면 전환 시 TTS 즉시 중단 + 예약 타이머 전부 정리 (+ 훅 내부 오디오도 중단)
    const stopAllSpeechAndTimers = useCallback(() => {
        try {
            stopSpeaking?.();
        } catch (_) {
        }
        try {
            window?.speechSynthesis?.cancel();
        } catch (_) {
        }
        [debouncedSpeakTidRef, welcomeStartTidRef, welcomeRetryTidRef, weatherSummaryTidRef].forEach(ref => {
            if (ref.current) {
                clearTimeout(ref.current);
                ref.current = null;
            }
        });
    }, [stopSpeaking]);

    // ✅ 새 멘트는 항상 깨끗한 상태에서: 중단 → 발화
    const safeSpeak = useCallback((text) => {
        stopAllSpeechAndTimers();
        speak(text);
    }, [stopAllSpeechAndTimers, speak]);

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
        stopAllSpeechAndTimers(); // ✅ 홈으로 돌아갈 때도 즉시 중단
    };

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

            // 축제 정보
            if (summary.includes('축제') || summary.includes('행사')) {
                setFestivalKeyword(text);
                Papa.parse('/festival.csv', {
                    download: true,
                    header: true,
                    complete: (result) => {
                        setFestivalData(result.data);
                        setFlowState('FESTIVAL');
                    },
                });
                return;
            }

            // 날씨 정보
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

            // 증명서 및 문서
            let docName = '';
            if (summary.includes('등본')) docName = '주민등록등본';
            else if (summary.includes('초본')) docName = '주민등록초본';
            else if (summary.includes('가족관계')) docName = '가족관계증명서';
            else if (summary.includes('건강보험')) docName = '건강보험자격득실확인서';

            if (docName) {
                setPurpose(docName);
                setFlowState('PIN_INPUT');
            } else {
                alert('알 수 없는 요청입니다. 다시 시도해주세요.');
                handleBackToHome();
            }
        } catch (error) {
            console.error('처리 중 오류 발생:', error);
            alert('요청 처리 중 오류가 발생했습니다. 다시 시도해 주세요.');
            handleBackToHome();
            setTimeout(() => {
                listenAndRecognize();
            }, 3000);
        }
    };

    // 화면 전환될 때마다: 진행 중 TTS 즉시 중단 + 모든 예약 타이머 클리어
    useEffect(() => {
        stopAllSpeechAndTimers();
        // WEATHER_VIEW로 진입 시 요약-한번만 낭독 플래그 리셋
        if (flowState === 'WEATHER_VIEW') {
            weatherSummarySpokenRef.current = false;
        }
        if (flowState === 'WELCOME') {
            welcomeListenStartedRef.current = false;
        }
    }, [flowState, stopAllSpeechAndTimers]);

    // recognizedText 변경 시 handleRequest 호출
    useEffect(() => {
        if (recognizedText && recognizedText.trim()) {
            handleRequest(recognizedText);
            setRecognizedText('');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [recognizedText]);

    // 상태별 안내 멘트 (WELCOME은 직접 청취 시작)
    useEffect(() => {
        // 이전 타이머 정리 (안전)
        if (debouncedSpeakTidRef.current) {
            clearTimeout(debouncedSpeakTidRef.current);
            debouncedSpeakTidRef.current = null;
        }

        debouncedSpeakTidRef.current = setTimeout(() => {
            if (flowState === prevFlowState.current) return;
            prevFlowState.current = flowState;

            if (flowState === 'WELCOME') {
                safeSpeak('안녕하세요! 무엇을 도와드릴까요? 아래 버튼을 누르거나 음성으로 말씀해주세요.');
                if (!welcomeListenStartedRef.current) {
                    welcomeListenStartedRef.current = true;
                    // 멘트 잠시 후 청취 시작
                    welcomeStartTidRef.current = setTimeout(() => {
                        listenAndRecognize();
                        // 드문 실패 대비 재시도
                        welcomeRetryTidRef.current = setTimeout(() => {
                            if (!(voiceFlowState === 'LISTENING' || voiceFlowState === 'PROCESSING')) {
                                listenAndRecognize();
                            }
                        }, 3000);
                    }, 1000);
                }
            } else if (flowState === 'PIN_INPUT') {
                safeSpeak('주민등록번호 열 세자리를 입력해주세요.');
            } else if (flowState === 'DOCUMENT_VIEW') {
                if (purpose) {
                    if (purpose.includes('등본') || purpose.includes('초본')) {
                        safeSpeak(`${purpose}이 준비되었습니다. 인쇄를 원하시면 인쇄 버튼을 눌러주세요.`);
                    } else {
                        safeSpeak(`${purpose}가 준비되었습니다. 인쇄를 원하시면 인쇄 버튼을 눌러주세요.`);
                    }
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
    }, [flowState, purpose, safeSpeak, listenAndRecognize, voiceFlowState]);

    // 요약이 “준비되는 순간” 한 번만 읽기
    useEffect(() => {
        if (flowState !== 'WEATHER_VIEW') return;
        if (weatherSummarySpokenRef.current) return;
        if (!weatherAiSummary || !weatherAiSummary.trim()) return;

        // 이전 타이머 정리 (안전)
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

    useEffect(() => {
        setIsRecognizing(voiceFlowState === 'LISTENING' || voiceFlowState === 'PROCESSING');
    }, [voiceFlowState]);

    const handleVoiceClick = () => {
        setIsRecognizing(true);
        listenAndRecognize();
    };

    const handlePrint = () => {
        if (purpose.includes('등본') || purpose.includes('초본')) {
            safeSpeak(`${purpose}이 출력되었습니다.`);
        } else {
            safeSpeak(`${purpose}가 출력되었습니다.`);
        }
        window.print();
    };

    const handleKeyPress = (key) => {
        if (key === 'clear') {
            setPinValue('');
        } else if (key === 'submit') {
            handlePinSubmit(pinValue);
        } else if (pinValue.length < 13) {
            setPinValue((prev) => prev + key);
        }
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

    const renderCurrentScreen = () => {
        switch (flowState) {
            case 'WELCOME':
                return (
                    <WelcomeScreen
                        onMenuClick={(text) => setRecognizedText(text)}
                        onSubmitText={(text) => setRecognizedText(text)}
                        onVoiceClick={handleVoiceClick}
                        isRecognizing={isRecognizing}
                    />
                );
            case 'FESTIVAL':
                return <FestivalScreen festivals={festivalData} keyword={festivalKeyword}/>;
            case 'WEATHER_VIEW':
                return (
                    <WeatherScreen
                        weatherInfo={weatherData}
                        keyword={weatherKeyword}
                        summary={weatherAiSummary}
                    />
                );
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
                        onMenuClick={(text) => setRecognizedText(text)}
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
