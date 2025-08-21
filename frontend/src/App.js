// src/App.js
import React, {useState} from 'react';
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


    const dummyUsers = {
        '9011111111111': '홍길동',
        '8505051222222': '김상철',
        '9701012345678': '이영희',
    };


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
    };


    const handleRequest = async (text) => {
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


        try {
            if (summary.includes('축제') || summary.includes('행사')) {
                setRecognizedText(text);
                setFestivalKeyword(text);

                try {
                    Papa.parse('/festival.csv', {
                        download: true,
                        header: true,
                        complete: (result) => {
                            setFestivalData(result.data);
                            setFlowState('FESTIVAL');
                        },
                    });
                    return;
                } catch (error) {
                    console.error("축제 정보 로딩 실패:", error);
                    alert("축제 정보를 가져오는 데 실패했습니다.");
                    handleBackToHome();
                }

            }


            // ✅ 3. 날씨 정보 요청 시, 현재 날씨만 가져오도록 수정
            if (summary.includes('날씨')) {
                setRecognizedText(text);
                setWeatherKeyword(text);
                try {
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

                    // 화면에 원본 JSON 그대로 보여주기
                    setWeatherData(JSON.stringify(weatherResult, null, 2));

                    // ✅ 백엔드가 붙여준 요약만 사용
                    const aiSummary = weatherResult?._meta?.ai_summary_ko ?? '';
                    setWeatherAiSummary(aiSummary);

                    setFlowState('WEATHER_VIEW');
                } catch (error) {
                    console.error('날씨 정보 로딩 실패:', error);
                    alert('날씨 정보를 가져오는 데 실패했습니다.');
                    handleBackToHome();
                }
                return;
            }


            let docType = '';
            if (summary.includes('등본')) docType = '주민등록등본';
            else if (summary.includes('초본')) docType = '주민등록초본';
            else if (summary.includes('가족관계')) docType = '가족관계증명서';
            else if (summary.includes('건강보험')) docType = '건강보험자격득실확인서';


            if (docType) {
                setPurpose(docType);
                setRecognizedText(`${docType} 발급 요청`);
                setFlowState('PIN_INPUT');
            } else {
                setRecognizedText(text);
                alert('알 수 없는 요청입니다. 다시 시도해주세요.');
                handleBackToHome();
            }
        } catch (error) {
            console.error("처리 중 오류 발생:", error);
            alert("요청 처리 중 오류가 발생했습니다. 다시 시도해 주세요.");
            handleBackToHome();
        }
    };


    const handleVoiceClick = () => {
        setIsRecognizing(true);
        handleRequest('');
    };


    const handleKeyPress = (key) => {
        if (key === 'clear') {
            setPinValue('');
        } else if (key === 'submit') {
            handlePinSubmit(pinValue);
        } else if (pinValue.length < 13) {
            setPinValue(prev => prev + key);
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
                        onMenuClick={handleRequest}
                        onSubmitText={handleRequest}
                        onVoiceClick={handleVoiceClick}
                        isRecognizing={isRecognizing}
                    />
                );
            case 'FESTIVAL':
                return <FestivalScreen festivals={festivalData} keyword={festivalKeyword}/>;
            case 'WEATHER_VIEW':
                // ✅ 4. WeatherScreen에 forecastData prop 전달 제거
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
                return <DocumentViewer name={userName} purpose={purpose}/>;
            default:
                return <WelcomeScreen onMenuClick={handleRequest} onSubmitText={handleRequest}
                                      onVoiceClick={handleVoiceClick} isRecognizing={isRecognizing}/>;
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
