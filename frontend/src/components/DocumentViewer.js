// src/components/DocumentViewer.jsx
import React from 'react';
import '../styles/DocumentViewer.css';

/**
 * DocumentViewer 컴포넌트
 * - props.name: 사용자 이름에 따라 렌더링할 문서 변경
 */
function DocumentViewer({ name }) {
  // 이름별 문서 경로 매핑
    console.log(name)
  const srcMap = {
    '홍길동': '/document1.html',
    '김상철': '/document2.html',
  };
  // 매핑에 없으면 기본 문서
  const defaultSrc = '/defaultDocument.html';

  // 전달된 name에 맞는 문서 경로 선택
  const docSrc = srcMap[name] || defaultSrc;

  return (
    <div className="document-container">
      <iframe
        src={docSrc}
        title="주민등록표 등본"
        className="document-iframe"
      />
      <button
        className="print-button"
        onClick={() => window.print()}
      >
        인쇄하기
      </button>
    </div>
  );
}

export default DocumentViewer;
