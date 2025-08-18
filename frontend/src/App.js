// src/App.js
import React, {useState, useEffect, useCallback, useRef, useMemo} from 'react';
import {useVoiceFlow} from './hooks/useVoiceFlow';
import './styles/App.css';

import WelcomeScreen from './components/WelcomeScreen';
import RecognitionScreen from './components/RecognitionScreen';
import Keypad from './components/Keypad';
import DocumentViewer from './components/DocumentViewer';
import FestivalScreen from './components/FestivalScreen';
import WeatherScreen from './components/WeatherScreen';
import Papa from 'papaparse';

// ===== Constants =====
const BACKEND = 'http://localhost:8000';
const API = {
    ANALYZE: `${BACKEND}/receive-text/`,
    WEATHER: `${BACKEND}/weather/`,
    FORECAST: `${BACKEND}/weather-forecast/`,
};

const FLOW = {
    WELCOME: 'WELCOME',
    PIN: 'PIN_INPUT',
    DOC: 'DOCUMENT_VIEW',
    FESTIVAL: 'FESTIVAL',
    WEATHER: 'WEATHER_VIEW',
};

const PURPOSE = {
    DMBON: '주민등록등본 발급 요청',
    CHOBON: '주민등록초본 발급 요청',
    FAMILY: '가족관계증명서 발급 요청',
    NHIS: '건강보험득실확인서 발급 요청',
    WEATHER: '날씨 정보 조회 요청',
    FESTIVAL: '행사 정보 조회 요청',
};

function App() {
    // ===== State =====
    const [flowState, setFlowState] = useState(FLOW.WELCOME);
    const [isRecognizing, setIsRecognizing] = useState(false);
    const [recognizedText, setRecognizedText] = useState('');
    const [purpose, setPurpose] = useState('');
    const [pinValue, setPinValue] = useState('');
    const [userName, setUserName] = useState('');
    const [festivalData, setFestivalData] = useState([]);
    const [festivalKeyword, setFestivalKeyword] = useState('');
    const [weatherKeyword, setWeatherKeyword] = useState('');
    const [weatherData, setWeatherData] = useState(null);
    const [forecastData, setForecastData] = useState([]);
    const prevFlowState = useRef(null);

    const dummyUsers = useMemo(
        () => ({
            '9011111111111': '홍길동',
            '8505051222222': '김상철',
            '0101123456789': '이영희',
        }),
        []
    );

    // ===== Voice Hook =====
    const {flowState: voiceFlowState, speak, listenAndRecognize} = useVoiceFlow({
        onCommandReceived: (command) => {
            setIsRecognizing(false);
            setRecognizedText(command); // 아래 useEffect에서 handleRequest로 연결
        },
        onError: (error) => {
            setIsRecognizing(false);
            let msg = '음성 인식 중 오류가 발생했습니다.';
            switch (error.code) {
                case 'MIC_PERMISSION_DENIED':
                    msg = '마이크 사용 권한을 허용해주세요.';
                    break;
                case 'NO_MICROPHONE':
                    msg = '사용 가능한 마이크 장치가 없습니다.';
                    break;
                case 'STT_NO_SPEECH':
                    return; // 무음은 조용히 무시
                case 'STT_LOW_CONFIDENCE':
                    msg = '음성을 명확히 인식하지 못했습니다. 다시 말씀해주세요.';
                    break;
                default:
                    break;
            }
            alert(msg);
        },
    });

    // ===== Helpers =====
    const resetToHome = useCallback(() => {
        setFlowState(FLOW.WELCOME);
        setIsRecognizing(false);
        setRecognizedText('');
        setPurpose('');
        setPinValue('');
        setUserName('');
        setFestivalData([]);
        setFestivalKeyword('');
        setWeatherKeyword('');
        setWeatherData(null);
        setForecastData([]);
        prevFlowState.current = null;
    }, []);

    const handleBackToHome = useCallback(() => {
        resetToHome();
    }, [resetToHome]);

    // ===== Core: handleRequest =====
    const handleRequest = useCallback(
        async (text) => {
            try {
                const q = (text || '').trim();
                if (!q) return; // 빈 문자열이면 무시

                // 1) 목적 분석
                const response = await fetch(API.ANALYZE, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({text: q}),
                });
                if (!response.ok) throw new Error('텍스트 분석 API 호출에 실패했습니다.');
                const result = await response.json();
                const purposeText = result?.purpose;

                // 2) 분기 처리
                if (purposeText === PURPOSE.DMBON) {
                    setPurpose('주민등록등본');
                    setFlowState(FLOW.PIN);

                } else if (purposeText === PURPOSE.CHOBON) {
                    setPurpose('주민등록초본');
                    setFlowState(FLOW.PIN);

                } else if (purposeText === PURPOSE.FAMILY) {
                    setPurpose('가족관계증명서');
                    setFlowState(FLOW.PIN);

                } else if (purposeText === PURPOSE.NHIS) {
                    setPurpose('건강보험자격득실확인서');
                    setFlowState(FLOW.PIN);

                } else if (purposeText === PURPOSE.WEATHER) {
                    setWeatherKeyword(q);
                    try {
                        const [wRes, fRes] = await Promise.all([
                            fetch(API.WEATHER, {
                                method: 'POST',
                                headers: {'Content-Type': 'application/json'},
                                body: JSON.stringify({city: 'Seoul'}),
                            }),
                            fetch(API.FORECAST, {
                                method: 'POST',
                                headers: {'Content-Type': 'application/json'},
                                body: JSON.stringify({city: 'Seoul'}),
                            }),
                        ]);

                        if (!wRes.ok) throw new Error(`날씨 API 실패: ${wRes.status}`);
                        if (!fRes.ok) throw new Error(`예보 API 실패: ${fRes.status}`);

                        const weatherResult = await wRes.json();
                        const forecastResult = await fRes.json();

                        setWeatherData(weatherResult);

                        // 예보 가공 (안전 가드)
                        const p = Array.isArray(forecastResult) ? forecastResult : [];
                        const processedForecasts = [
                            {
                                day: '내일',
                                weather: p[0]?.weather ?? '',
                                temp_max: p[0]?.temp_max ?? null,
                                temp_min: p[0]?.temp_min ?? null,
                            },
                            {
                                day: '모레',
                                weather: p[1]?.weather ?? '',
                                temp_max: p[1]?.temp_max ?? null,
                                temp_min: p[1]?.temp_min ?? null,
                            },
                            {
                                day: '글피',
                                weather: p[2]?.weather ?? '',
                                temp_max: p[2]?.temp_max ?? null,
                                temp_min: p[2]?.temp_min ?? null,
                            },
                        ];
                        setForecastData(processedForecasts);

                        setFlowState(FLOW.WEATHER);
                    } catch (err) {
                        console.error('날씨/예보 로딩 실패:', err);
                        alert('날씨 정보를 가져오는 데 실패했습니다.');
                        resetToHome();
                        setTimeout(() => listenAndRecognize(), 1200);
                    }

                } else if (purposeText === PURPOSE.FESTIVAL) {
                    setFestivalKeyword(q);
                    Papa.parse('/festival.csv', {
                        download: true,
                        header: true,
                        complete: (res) => {
                            setFestivalData(res?.data || []);
                            setFlowState(FLOW.FESTIVAL);
                        },
                        error: (err) => {
                            console.error('축제 CSV 파싱 실패:', err);
                            alert('축제 정보를 가져오는 데 실패했습니다.');
                            resetToHome();
                        },
                    });

                } else {
                    alert('알 수 없는 요청입니다. 다시 시도해주세요.');
                    resetToHome();
                }
            } catch (error) {
                console.error('처리 중 오류 발생:', error);
                alert('요청 처리 중 오류가 발생했습니다. 다시 시도해 주세요.');
                resetToHome();
                setTimeout(() => listenAndRecognize(), 1200);
            } finally {
                setRecognizedText(''); // 처리 후 초기화
            }
        },
        [listenAndRecognize, resetToHome]
    );

    // ===== Handlers =====
    const handleVoiceClick = useCallback(() => {
        setIsRecognizing(true);
        listenAndRecognize(); // 빈 문자열로 handleRequest 호출하지 않음
    }, [listenAndRecognize]);

    const handleKeyPress = (key) => {
        if (key === 'clear') setPinValue('');
        else if (key === 'submit') handlePinSubmit(pinValue);
        else if (pinValue.length < 13) setPinValue((prev) => prev + key);
    };

    const handlePinSubmit = (pin) => {
        if (dummyUsers[pin]) {
            setUserName(dummyUsers[pin]);
            setFlowState(FLOW.DOC);
        } else {
            alert('등록되지 않은 주민번호입니다.');
            setPinValue('');
        }
    };

    const handlePrint = () => {
        if (purpose) speak(`${purpose}가 출력되었습니다.`);
        window.print();
    };

    // ===== Effects =====
    // 음성 인식 결과 처리
    useEffect(() => {
        if (recognizedText && recognizedText.trim()) {
            handleRequest(recognizedText);
        }
    }, [recognizedText, handleRequest]);

    // 음성 안내 (중복 방지)
    useEffect(() => {
        if (flowState === prevFlowState.current) return;
        prevFlowState.current = flowState;

        const say = (msg, opts) => speak(msg, opts);

        switch (flowState) {
            case FLOW.WELCOME:
                say('안녕하세요! 무엇을 도와드릴까요? 아래 버튼을 누르거나 음성으로 말씀해주세요.', {listenAfter: true});
                break;
            case FLOW.PIN:
                say('주민등록번호 13자리를 입력해주세요.');
                break;
            case FLOW.DOC:
                console.log(purpose)
                if (purpose.includes("등본") || purpose.includes("초본")) {
                    say(`${purpose}이 준비되었습니다. 인쇄를 원하시면 인쇄 버튼을 눌러주세요.`);
                } else {
                    say(`${purpose}가 준비되었습니다. 인쇄를 원하시면 인쇄 버튼을 눌러주세요.`);
                }
                break;
            case FLOW.FESTIVAL:
                say('서울시 축제 정보를 안내합니다.');
                break;
            case FLOW.WEATHER:
                say('현재 날씨와 주간 예보를 알려드립니다.');
                break;
            default:
                break;
        }
    }, [flowState, purpose, speak]);

    // 음성 인식 상태 반영
    useEffect(() => {
        setIsRecognizing(voiceFlowState === 'LISTENING' || voiceFlowState === 'PROCESSING');
    }, [voiceFlowState]);

    // ===== Render =====
    const renderCurrentScreen = () => {
        switch (flowState) {
            case FLOW.WELCOME:
                return (
                    <WelcomeScreen
                        onMenuClick={handleRequest}
                        onSubmitText={handleRequest}
                        onVoiceClick={handleVoiceClick}
                        isRecognizing={isRecognizing}
                    />
                );
            case FLOW.FESTIVAL:
                return <FestivalScreen festivals={festivalData} keyword={festivalKeyword}/>;
            case FLOW.WEATHER:
                return <WeatherScreen weatherInfo={weatherData} forecastData={forecastData} keyword={weatherKeyword}/>;
            case FLOW.PIN:
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
            case FLOW.DOC:
                return <DocumentViewer name={userName} purpose={purpose} onPrint={handlePrint}/>;
            default:
                return (
                    <WelcomeScreen
                        onMenuClick={handleRequest}
                        onSubmitText={handleRequest}
                        onVoiceClick={handleVoiceClick}
                        isRecognizing={isRecognizing}
                    />
                );
        }
    };

    return (
        <div className="kiosk-frame">
            {flowState !== FLOW.WELCOME && <button className="home-button" onClick={handleBackToHome}/>}
            {renderCurrentScreen()}
        </div>
    );
}

export default App;
