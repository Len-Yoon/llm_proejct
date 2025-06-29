import React from 'react';
import '../styles/Keypad.css';

function Keypad({ onKeyPress }) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'submit'];

  return (
    <div className="keypad">
      {keys.map((key) => (
        <button 
          key={key} 
          onClick={() => onKeyPress(key)}
          className={`keypad-button ${key === 'clear' || key === 'submit' ? 'special' : ''}`}
        >
          {key === 'clear' ? '정정' : key === 'submit' ? '확인' : key}
        </button>
      ))}
    </div>
  );
}

export default Keypad;