import React, {useState} from 'react';
import './styles/App.css'; // 전역 스타일

// 화면 컴포넌트들을 import 합니다.
import WelcomeScreen from './components/WelcomeScreen';
import RecognitionScreen from './components/RecognitionScreen';
import PinInputScreen from './components/PinInputScreen';
import DocumentViewer from './components/DocumentViewer';

// App의 현재 상태를 나타내는 값들
// 'WELCOME' -> 'RECOGNIZING' -> 'PIN_INPUT' -> 'DOCUMENT_VIEW'
function App() {
    const [flowState, setFlowState] = useState('WELCOME');
    const [recognizedText, setRecognizedText] = useState('');

    // 1. [환영] -> [음성인식 중] -> [음성인식 완료 & 주민번호 입력] 단계로 전환하는 함수
    const handleRecognition = async (text) => {
        setRecognizedText(text);
        setFlowState('RECOGNIZING');

        try {
            const response = await fetch("http://localhost:8000/receive-text/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({text}),  // ✅ key 이름 "text"여야 함
            });

            console.log('📤 보낸 텍스트:', text);

            const result = await response.json();
            console.log('📥 백엔드 응답:', result);

            setTimeout(() => {
                setRecognizedText(result.purpose);
                setFlowState('PIN_INPUT'); // '주민번호 입력' 상태로 변경
            }, 2000);
        } catch (error) {
            console.error('❌ 백엔드 전송 실패:', error);
        }
    };

    // 2. [주민번호 입력] -> [등본 표시] 단계로 전환하는 함수
    const handlePinSubmit = async (pin) => {
    try {

        console.log(pin)
        // 백엔드로 pin 보내기
        const response = await fetch("http://localhost:8000/recognition/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ pin }),  // pin 데이터 보냄
        });

        if (!response.ok) {
            // 서버에서 400 등 에러 응답시
            return false;
        }

        const data = await response.json();
        // 서버에서 OK라면 data.success === true 등으로 응답
        if (data.success) {
            setFlowState('DOCUMENT_VIEW');
            return true;
        } else {
            return false;
        }
    } catch (error) {
        console.error("PIN 검증 실패:", error);
        return false;
    }
};

    // 현재 상태(flowState)에 따라 다른 화면을 보여줍니다.
    const renderCurrentScreen = () => {
        switch (flowState) {
            case 'WELCOME':
                return <WelcomeScreen onSubmitText={handleRecognition}/>;
            case 'RECOGNIZING':
                return <RecognitionScreen status="recognizing"/>;
            case 'PIN_INPUT':
                return (
                    <div>
                        <RecognitionScreen status="finished" text={recognizedText}/>
                        <PinInputScreen onPinSubmit={handlePinSubmit}/>
                    </div>
                );
            case 'DOCUMENT_VIEW':
                return <DocumentViewer/>;
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
