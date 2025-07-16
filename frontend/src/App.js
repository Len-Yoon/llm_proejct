// src/App.js
import React, {useState} from 'react';
import './styles/App.css';
import WelcomeScreen from './components/WelcomeScreen';
import RecognitionScreen from './components/RecognitionScreen';
import Keypad from './components/Keypad';
import DocumentViewer from './components/DocumentViewer';

function App() {
    const [flowState, setFlowState] = useState('WELCOME');
    const [recognizedText, setRecognizedText] = useState('');
    const [purpose, setPurpose] = useState('');    // 문서 종류만 저장
    const [pinValue, setPinValue] = useState('');
    const [userName, setUserName] = useState('');

    // 1) 음성인식 텍스트 → 의도 분석 → 문서 종류 추출 → purpose, recognizedText 저장 → PIN 입력 단계
    const handleRecognition = async (text) => {
        try {
            const res = await fetch('http://localhost:8000/receive-text/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text }),
            });
            if (!res.ok) throw new Error(res.status);
            const data = await res.json();

            // 서버에서 받은 요약문
            const summary = data.summary || text;
            setRecognizedText(summary);

            // 요약문에 키워드 포함 여부로 문서 종류만 추출
            let docType = '';
            if (summary.includes('등본')) {
                docType = '등본';
            } else if (summary.includes('초본')) {
                docType = '초본';
            } else if (summary.includes('가족관계')) {
                docType = '가족관계증명서';
            } else {
                docType = '건강보험자격득실확인서';
            }
            setPurpose(docType);
            setFlowState('PIN_INPUT');
        } catch (err) {
            console.error('의도 분석 실패:', err);
            alert('의도 분석 중 오류가 발생했습니다.');
        }
    };

    // 2) 키패드 입력 처리
    const handleKeyPress = (key) => {
        if (key === 'clear') {
            setPinValue('');
        } else if (key === 'submit') {
            handlePinSubmit(pinValue);
        } else if (pinValue.length < 13) {
            setPinValue(prev => prev + key);
        }
    };

    // 3) PIN 검증 후 화면 전환
    const handlePinSubmit = async (pin) => {
        try {
            const res = await fetch('http://localhost:8000/recognition/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jumin: pin }),
            });
            if (!res.ok) {
                alert('서버 에러 발생');
                return false;
            }
            const data = await res.json();
            if (!data.success) {
                alert(data.error);
                return false;
            }
            setUserName(data.name || '');
            setFlowState('DOCUMENT_VIEW');
            return true;
        } catch (err) {
            console.error('PIN 검증 실패:', err);
            alert('PIN 검증 중 오류가 발생했습니다.');
            return false;
        }
    };

    // 4) 화면 렌더링 분기
    const renderCurrentScreen = () => {
        switch (flowState) {
            case 'WELCOME':
                return <WelcomeScreen onSubmitText={handleRecognition}/>;
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
