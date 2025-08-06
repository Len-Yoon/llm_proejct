import React, {useState} from 'react';
import '../styles/WelcomeScreen.css';
import hamsterImage from '../assets/hamster3.png';

function WelcomeScreen({onSubmitText}) {
    //window.onload()와 같이 화면이 시작하자마자 실행하는 함수 // (멘트: 안녕하세요! 무엇을 도와드릴까요?)

    // useEffect(() => {
    //     const condition = "홈 화면";
    //
    //     console.log("WeatherScreen 로드됨, condition 전송:", condition);
    //
    //     // 백엔드 FastAPI 호출 예시
    //     fetch("http://127.0.0.1:8000/만든 API 명", {
    //         method: "POST",
    //         headers: { "Content-Type": "application/json" },
    //         body: JSON.stringify({ condition })
    //     })
    //     .then(res => res.json())
    //     .then(data => console.log("백엔드 응답:", data))
    //     .catch(err => console.error("백엔드 호출 실패:", err));
    //
    // }, []);

    const [inputText, setInputText] = useState('');

    const handleSubmit = () => {
        if (inputText.trim()) {
            onSubmitText(inputText); // App.js로 전달
        }
    };

    return (
        <div className="welcome-container">
            <img src={hamsterImage} alt="안내 햄스터" className="hamster-image-large"/>
            <div className="speech-bubble-large">
                <p>안녕하세요! 무엇을 도와드릴까요?</p>
                <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="요청을 입력하세요..."
                />
                <button onClick={handleSubmit}>전송</button>
            </div>
        </div>
    );
}

export default WelcomeScreen;
