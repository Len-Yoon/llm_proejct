import React, { useState } from 'react';
import '../styles/WelcomeScreen.css';
import hamsterImage from '../assets/hamster3.png';

function WelcomeScreen({ onSubmitText }) {
  const [inputText, setInputText] = useState('');

  const handleSubmit = () => {
    if (inputText.trim()) {
      onSubmitText(inputText); // App.js로 전달
    }
  };

  return (
    <div className="welcome-container">
      <img src={hamsterImage} alt="안내 햄스터" className="hamster-image-large" />
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
