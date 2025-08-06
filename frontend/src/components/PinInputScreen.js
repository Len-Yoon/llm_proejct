// src/components/PinInputScreen.jsx
import React, {useState} from 'react';
import '../styles/PinInputScreen.css';

function PinInputScreen({onPinSubmit}) {
    // //window.onload()와 같이 화면이 시작하자마자 실행하는 함수 //멘트: 요청하신 서울의 축제 정보를 알려드려요! 자세한 정보는 카메라로 QR를 찍어주세요!)
    // useEffect(() => {
    //     const condition = "본인인증";
    //
    //     console.log("WeatherScreen 로드됨, condition 전송:", condition);
    //
    //     // 백엔드 FastAPI 호출 예시
    //     fetch("http://localhost:8000/만든 API 명", {
    //         method: "POST",
    //         headers: { "Content-Type": "application/json" },
    //         body: JSON.stringify({ condition })
    //     })
    //     .then(res => res.json())
    //     .then(data => console.log("백엔드 응답:", data))
    //     .catch(err => console.error("백엔드 호출 실패:", err));
    //
    // }, []);

    const [value, setValue] = useState('');
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'submit'];

    const handleKeyPress = (key) => {
        if (key === 'clear') {
            setValue('');
        } else if (key === 'submit') {
            onPinSubmit(value);
            setValue('');
        } else {
            if (value.length < 13) {
                setValue(prev => prev + key);
            }
        }
    };

    return (
        <div className="pin-input-screen">
            {/* 입력된 값을 표시하는 실시간 디스플레이 */}
            <input
                type="text"
                className="pin-display"
                value={value}
                readOnly
                placeholder="주민번호를 입력하세요"
            />

            {/* 3×4 그리드 키패드 */}
            <div className="keypad">
                {keys.map(key => (
                    <button
                        key={key}
                        className={`keypad-button ${key === 'clear' || key === 'submit' ? 'special' : ''}`}
                        onClick={() => handleKeyPress(key)}
                    >
                        {key === 'clear' ? '정정' : key === 'submit' ? '확인' : key}
                    </button>
                ))}
            </div>
        </div>
    );
}

export default PinInputScreen;
