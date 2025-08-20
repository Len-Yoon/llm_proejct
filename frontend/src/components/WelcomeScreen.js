// src/components/WelcomeScreen.jsx
import React, { useState } from 'react';
import '../styles/WelcomeScreen.css';
import hamsterImage from '../assets/hamster3.png';

function WelcomeScreen({ onMenuClick, onSubmitText, onVoiceClick, isRecognizing }) {
  const [inputText, setInputText] = useState('');

  // ✅ 버튼 텍스트를 요청에 맞게 수정
  const menuItems = [
    '주민등록등본', 
    '주민등록초본', 
    '가족관계증명서 ',
    '건강보험자격득실확인서', 
    '축제/행사', 
    '날씨'
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputText.trim()) {
      onSubmitText(inputText);
    }
  };

  return (
    <div className="welcome-container">
      <div className="welcome-top">
        <img src={hamsterImage} alt="안내 햄스터" className="hamster-image-large" />
        <div className="speech-bubble-large">
          <p>안녕하세요! 무엇을 도와드릴까요?</p>
          
          <div className="input-area">
            {isRecognizing ? (
              <div className="voice-loading-area">
                <div className="loading-spinner-welcome"></div>
                <span>음성 인식 중...</span>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="search-form">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  // ✅ Placeholder 텍스트를 스크린샷에 맞게 수정
                  placeholder="직접 입력 or 아래 버튼을 누르세요."
                />
                <button type="submit" className="submit-btn">전송</button>
                <button type="button" onClick={onVoiceClick} className="voice-btn">음성</button>
              </form>
            )}
          </div>
        </div>
      </div>

      <div className="menu-buttons-container">
        {menuItems.map(item => (
          <button key={item} className="menu-button" onClick={() => onMenuClick(item)}>
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}

export default WelcomeScreen;
