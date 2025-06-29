import React, { useEffect, useState } from 'react';
import '../styles/HamsterChat.css';
// 파일명을 실제 파일 이름과 똑같이 소문자 'h'로 수정했습니다.
import hamsterImage from '../assets/hamster3.png'; 

// 타이핑 효과를 위한 커스텀 훅 (선택 사항)
function useTypingEffect(text, speed = 100) {
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    let i = 0;
    const typingInterval = setInterval(() => {
      if (i < text.length) {
        setDisplayedText(text.substring(0, i + 1));
        i++;
      } else {
        clearInterval(typingInterval);
      }
    }, speed);

    return () => clearInterval(typingInterval);
  }, [text, speed]);

  return displayedText;
}


function HamsterChat({ onFinishTyping }) {
  const greetingMessage = " 안녕하세요! 무엇을 도와드릴까요?";
  const typedMessage = useTypingEffect(greetingMessage, 100);

  // 타이핑이 모두 완료되면 부모 컴포넌트로 알림
  useEffect(() => {
    if (typedMessage === greetingMessage) {
      // 바로 넘어가지 않고, 잠시 메시지를 보여준 후 넘어갑니다.
      const timer = setTimeout(() => {
        onFinishTyping();
      }, 1500); // 1.5초 후 전환
      
      return () => clearTimeout(timer);
    }
  }, [typedMessage, greetingMessage, onFinishTyping]);

  return (
    <div className="hamster-chat-container">
      <img src={hamsterImage} alt="안내 햄스터 캐릭터" className="hamster-image" />
      <div className="speech-bubble">
        <p>{typedMessage}</p>
      </div>
    </div>
  );
}

export default HamsterChat;