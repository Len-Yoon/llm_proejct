// src/App.js
import React, {useState} from 'react';
import './styles/App.css';

// 화면 컴포넌트들을 import 합니다.
import WelcomeScreen from './components/WelcomeScreen';
import RecognitionScreen from './components/RecognitionScreen';
import PinInputScreen from './components/PinInputScreen';
import DocumentViewer from './components/DocumentViewer';

function App() {
    const [flowState, setFlowState] = useState('WELCOME');
    const [recognizedText, setRecognizedText] = useState('');
    const [userName, setUserName] = useState('');

    // 음성인식 결과(텍스트) 받기
    const handleRecognition = async (text) => {
        setRecognizedText(text);
        setFlowState('PIN_INPUT');
    };

    // 주민등록번호(PIN) 검증 및 사용자 이름 저장
    const handlePinSubmit = async (pin) => {
        try {
            const response = await fetch('http://localhost:8000/recognition/', {
                method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({jumin: pin}),
            });
            if (!response.ok) {
                alert('서버 에러 발생');
                return false;
            }
            const data = await response.json();
            if (data.success) {
                setUserName(data.name || '');
                setFlowState('DOCUMENT_VIEW');
                return true;
            } else {
                alert(data.error);
                return false;
            }
        } catch (err) {
            console.error('PIN 검증 실패:', err);
            return false;
        }
    };

    // 현재 화면 렌더링
    const renderCurrentScreen = () => {
        switch (flowState) {
            case 'WELCOME':
                return <WelcomeScreen onSubmitText={handleRecognition}/>;
            case 'PIN_INPUT':
                return (<div className="pin-screen">
                        <div className="recognition-wrapper">
                            <RecognitionScreen status="finished" text={recognizedText}/>
                        </div>
                        <div className="pin-wrapper">
                            <h2>주민번호를 입력해주세요 (- 없이)</h2>
                            <PinInputScreen onPinSubmit={handlePinSubmit}/>
                        </div>
                    </div>);
            case 'DOCUMENT_VIEW':
                return <DocumentViewer name={userName}/>;
            default:
                return <WelcomeScreen onSubmitText={handleRecognition}/>;
        }
    };

    return (<div className="kiosk-container">
            {renderCurrentScreen()}
        </div>);
}

export default App;
