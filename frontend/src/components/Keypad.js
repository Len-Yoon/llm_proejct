// src/components/Keypad.js
import React, { useState } from 'react';
import '../styles/Keypad.css';

function Keypad({ onSubmit }) {
  // 내부 상태: 현재까지 입력된 숫자 문자열
  const [value, setValue] = useState('');

  // 버튼 배열
  const keys = ['1','2','3','4','5','6','7','8','9','clear','0','submit'];

  // 버튼 클릭 핸들러
  const handleKeyPress = (key) => {
    if (key === 'clear') {
      setValue('');
    } else if (key === 'submit') {
      onSubmit(value);  // 부모에 값 전달
      setValue('');     // 초기화
    } else {
      // 숫자 버튼: 최대 13자리 제한
      if (value.length < 13) {
        setValue(prev => prev + key);
      }
    }
  };

  return (
    <div className="keypad-wrapper">
      {/* 디스플레이 영역 */}
      <div className="keypad-display">
        {value.split('').map((_, i) => '●').join('')}
      </div>

      {/* 키패드 버튼들 */}
      <div className="keypad">
        {keys.map(key => (
          <button
            key={key}
            onClick={() => handleKeyPress(key)}
            className={`keypad-button ${key==='clear'||key==='submit'? 'special' : ''}`}
          >
            {key === 'clear'  ? '정정'
             : key === 'submit' ? '확인'
             : key}
          </button>
        ))}
      </div>
    </div>
  );
}

export default Keypad;