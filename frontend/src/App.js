import React, {useState} from 'react';
import './styles/App.css';
import WelcomeScreen from './components/WelcomeScreen';
import RecognitionScreen from './components/RecognitionScreen';
import Keypad from './components/Keypad';
import DocumentViewer from './components/DocumentViewer';
import FestivalScreen from './components/FestivalScreen';
import Papa from 'papaparse'; // 축제 CSV용
import WeatherScreen from './components/WeatherScreen';

function App() {
    const [flowState, setFlowState] = useState('WELCOME');
    const [recognizedText, setRecognizedText] = useState('');
    const [purpose, setPurpose] = useState('');
    const [pinValue, setPinValue] = useState('');
    const [userName, setUserName] = useState('');
    // 축제용 상태
    const [festivalData, setFestivalData] = useState([]);
    const [festivalKeyword, setFestivalKeyword] = useState('');
    // 날씨용 상태
    const [weatherKeyword, setWeatherKeyword] = useState('');
    const [weatherData, setWeatherData] = useState(null);

    // --- 1. handleRecognition 함수 수정 ---
    const handleRecognition = async (text) => {
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

            setRecognizedText(summary);
            setPurpose(docType);

            // "축제" 또는 "행사" 처리
            if (summary.includes('축제') || summary.includes('행사')) {
                // (이 부분은 기존 축제 로직을 그대로 사용하시면 됩니다.)
                // 예시: CSV 파싱 및 화면 전환
                setFestivalKeyword(text);
                // Papa.parse(...) 로직 실행 후 setFlowState('FESTIVAL');
                Papa.parse('/festival.csv', {
                    download: true,
                    header: true, // CSV 첫줄을 컬럼명으로 사용
                    complete: (result) => {
                        console.log('CSV 파싱 결과:', result.data);
                        setFestivalData(result.data); // 상태에 저장
                        setFlowState('FESTIVAL');
                    },
                });

                console.log("축제 정보 화면으로 전환합니다.");
                return;
            } else if (summary.includes('날씨') || docType === '날씨') {
                // "날씨" 처리
                setWeatherKeyword(summary);

                // 백엔드 날씨 API 호출
                const weatherRes = await fetch('http://localhost:8000/weather/', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({city: 'Seoul'}), // 우선 서울로 고정
                });
                const weatherResult = await weatherRes.json();

                setWeatherData(JSON.stringify(weatherResult, null, 2));
                setFlowState('WEATHER_VIEW');
                return;
            } else {
                // 위의 조건에 해당하지 않으면 문서 발급으로 간주
                setFlowState('PIN_INPUT');
            }
        } catch (error) {
            console.error("처리 중 오류 발생:", error);
            alert("요청을 처리하는 중 오류가 발생했습니다. 다시 시도해 주세요.");
        }
    };

    // --- 2. 다른 함수들을 handleRecognition 바깥으로 이동 ---
    const handleKeyPress = (key) => {
        if (key === 'clear') {
            setPinValue('');
        } else if (key === 'submit') {
            handlePinSubmit(pinValue);
        } else if (pinValue.length < 13) {
            setPinValue(prev => prev + key);
        }
    };

    const handlePinSubmit = async (pin) => {
        // (기존 handlePinSubmit 로직과 동일)
    };

    const handleBack = () => setFlowState('WELCOME');

    // --- 3. renderCurrentScreen 함수도 바깥으로 이동 ---
    const renderCurrentScreen = () => {
        switch (flowState) {
            case 'WELCOME':
                return <WelcomeScreen onSubmitText={handleRecognition}/>;

            case 'FESTIVAL':
                return (
                    <FestivalScreen
                        festivals={festivalData}
                        keyword={festivalKeyword}
                        onBack={handleBack}
                    />
                );

            case 'WEATHER_VIEW':
                return (
                    <WeatherScreen
                        weatherInfo={weatherData}
                        keyword={weatherKeyword}
                        onBack={() => setFlowState('WELCOME')}
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
                return <DocumentViewer name={userName} purpose={purpose}/>;

            default:
                return <WelcomeScreen onSubmitText={handleRecognition}/>;
        }
    };

    return (
        <div className="kiosk-container">
            {renderCurrentScreen()}
        </div>
    );
}

export default App;
