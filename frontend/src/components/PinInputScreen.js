import React, { useState } from 'react';
import Keypad from './Keypad'; // 키패드 컴포넌트 import
import '../styles/PinInputScreen.css';

function PinInputScreen({ onPinSubmit }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleKeyPress = (key) => {
    setError(''); // 키 입력 시 에러 메시지 초기화
    if (key === 'clear') {
      setPin('');
    } else if (key === 'submit') {
      const success = onPinSubmit(pin);
      if (!success) {
        setError('주민번호가 올바르지 않습니다. 다시 입력해주세요.');
        setPin('');
      }
    } else {
      // 주민번호 형식에 맞게 '-' 추가 (간단한 버전)
      if (pin.length < 13) {
          setPin(pin + key);
      }
    }
  };

  return (
    <div className="pin-input-container">
      <div className="pin-header">
        <h2>주민번호를 입력해주세요 (- 빼고)</h2>
      </div>
      <div className="pin-display">{pin.padEnd(13, ' ')}</div>
      {error && <div className="pin-error">{error}</div>}
      <Keypad onKeyPress={handleKeyPress} />
    </div>
  );
}

export default PinInputScreen;