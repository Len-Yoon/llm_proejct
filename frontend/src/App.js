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

    // ✅ 더미 주민번호 DB
    const dummyUsers = {
        '9011111111111': '홍길동' ,
        '8505051222222': '김상철',
        '9701013456789': '이영희',
    };

    // 홈으로 이동
    const handleBack = () => setFlowState('WELCOME');

    // --- 1. 음성/텍스트 인식 처리 ---
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
            setRecognizedText(summary);

            // --- ① 축제 처리 ---
            if (summary.includes('축제') || summary.includes('행사')) {
                setFestivalKeyword(text);
                Papa.parse('/festival.csv', {
                    download: true,
                    header: true,
                    complete: (result) => {
                        console.log('CSV 파싱 결과:', result.data);
                        setFestivalData(result.data);
                        setFlowState('FESTIVAL');
                    },
                });
                return;
            }

            // --- ② 날씨 처리 ---
            if (summary.includes('날씨') || data.purpose === '날씨') {
                setWeatherKeyword(summary);

                const weatherRes = await fetch('http://localhost:8000/weather/', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({city: 'Seoul'}),
                });
                const weatherResult = await weatherRes.json();

                setWeatherData(JSON.stringify(weatherResult, null, 2));
                setFlowState('WEATHER_VIEW');
                return;
            }

            // --- ③ 문서 발급 처리 ---
            let docType = '';
            if (summary.includes('등본') || summary.includes('주민등록등본')) {
                docType = '주민등록등본';
            } else if (summary.includes('초본') || summary.includes('주민등록초본')) {
                docType = '주민등록초본';
            } else if (summary.includes('가족관계') || summary.includes('가족관계증명서')) {
                docType = '가족관계증명서';
            } else if (summary.includes('건강보험') || summary.includes('득실') || summary.includes('자격')) {
                docType = '건강보험자격득실확인서';
            }

            setPurpose(docType);

            if (docType) {
                // 문서 발급이면 PIN 입력 화면 이동
                setFlowState('PIN_INPUT');
            } else {
                alert('민원 유형을 인식하지 못했습니다. 다시 말씀해주세요.');
                setFlowState('WELCOME');
            }

        } catch (error) {
            console.error("처리 중 오류 발생:", error);
            alert("요청을 처리하는 중 오류가 발생했습니다. 다시 시도해 주세요.");
        }
    };

    // --- 2. Keypad 처리 ---
    const handleKeyPress = (key) => {
        if (key === 'clear') {
            setPinValue('');
        } else if (key === 'submit') {
            handlePinSubmit(pinValue);
        } else if (pinValue.length < 13) {
            setPinValue(prev => prev + key);
        }
    };

    // --- 3. 주민번호 제출 처리 ---
    const handlePinSubmit = async (pin) => {
        // 더미 데이터 조회
        if (dummyUsers[pin]) {
            setUserName(dummyUsers[pin]);
            setFlowState('DOCUMENT_VIEW'); // 이름 표시 후 문서 발급 화면 이동
        } else {
            alert('등록되지 않은 주민번호입니다.');
            setPinValue('');
        }
    };

    // --- 4. 화면 렌더링 ---
    const renderCurrentScreen = () => {
        switch (flowState) {
            case 'WELCOME':
                return <WelcomeScreen onSubmitText={handleRecognition} />;

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
                        onBack={handleBack}
                    />
                );

            case 'PIN_INPUT':
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

            case 'DOCUMENT_VIEW':
                return <DocumentViewer name={userName} purpose={purpose} />;

            default:
                return <WelcomeScreen onSubmitText={handleRecognition} />;
        }
    };

    return (
        <div className="kiosk-container">
            {renderCurrentScreen()}
        </div>
    );
}

export default App;
