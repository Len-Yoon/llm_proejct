// src/App.js
import React, { useState } from 'react';
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
    // ✅ 1. 예보 데이터 상태 제거
    // const [forecastData, setForecastData] = useState([]);


    const dummyUsers = {
        '9011111111111': '홍길동',
        '8505051222222': '김상철',
        '0101013456789': '이영희',
    };


    const handleBackToHome = () => {
        setFlowState('WELCOME');
        setIsRecognizing(false);
        setRecognizedText('');
        setPurpose('');
        setPinValue('');
        setUserName('');
        // ✅ 2. 홈으로 돌아갈 때 예보 데이터 초기화 로직 제거
        // setForecastData([]);
    };


    const handleRequest = async (text) => {
        if (isRecognizing) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            text = '등본';
            setIsRecognizing(false);
        }


        try {
            if (text.includes('축제') || text.includes('행사')) {
                setRecognizedText(text);
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


            // ✅ 3. 날씨 정보 요청 시, 현재 날씨만 가져오도록 수정
            if (text.includes('날씨')) {
                setRecognizedText(text);
                setWeatherKeyword(text);
                try {
                    // 현재 날씨만 가져오기
                    const weatherRes = await fetch('http://localhost:8000/weather/', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({city: 'Seoul'}),
                    });
                    const weatherResult = await weatherRes.json();
                    setWeatherData(JSON.stringify(weatherResult, null, 2));


                    // ❌ 미래 예보 정보 가져오는 부분 전체 삭제


                    setFlowState('WEATHER_VIEW');
                } catch (error) {
                    console.error("날씨 정보 로딩 실패:", error);
                    alert("날씨 정보를 가져오는 데 실패했습니다.");
                    handleBackToHome();
                }
                return;
            }


            let docType = '';
            if (text.includes('등본')) docType = '주민등록등본';
            else if (text.includes('초본')) docType = '주민등록초본';
            else if (text.includes('가족관계')) docType = '가족관계증명서';
            else if (text.includes('건강보험')) docType = '건강보험자격득실확인서';


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
                return <FestivalScreen festivals={festivalData} keyword={festivalKeyword} />;
            case 'WEATHER_VIEW':
                // ✅ 4. WeatherScreen에 forecastData prop 전달 제거
                return (
                    <WeatherScreen
                        weatherInfo={weatherData}
                        keyword={weatherKeyword}
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
                return <WelcomeScreen onMenuClick={handleRequest} onSubmitText={handleRequest} onVoiceClick={handleVoiceClick} isRecognizing={isRecognizing} />;
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
