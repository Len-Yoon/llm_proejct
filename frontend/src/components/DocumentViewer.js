import React from 'react';
import '../styles/DocumentViewer.css';

function DocumentViewer() {
  return (
    <div className="document-container">
      {/* 이제 iframe을 사용하여 public 폴더의 document.html 파일을 직접 렌더링합니다.
        이것이 외부 HTML을 React 앱에 통합하는 가장 표준적인 방법입니다.
      */}
      <iframe 
        src="/document.html" 
        title="주민등록표 등본"
        className="document-iframe"
      ></iframe>
      <button className="print-button" onClick={() => window.print()}>인쇄하기</button>
    </div>
  );
}

export default DocumentViewer;