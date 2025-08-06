// src/components/DocumentViewer.jsx
import React from 'react';
import '../styles/DocumentViewer.css';

/**
 * DocumentViewer 컴포넌트
 * - props.name: 사용자 이름
 * - props.purpose: 문서 요청 목적 (예: 등본, 초본, 가족관계증명서 등)
 */

function DocumentViewer({name, purpose}) {
    //UseEffect X html에서 Sript에서 처리 예정

    // 이름과 목적에 따른 문서 경로 결정
    let docSrc;

    if (name === '홍길동') {
        if (purpose.includes('등본')) {
            docSrc = '/document1.html';
        } else if (purpose.includes('초본')) {
            docSrc = '/extract1.html';
        } else if (purpose.includes('가족관계')) {
            docSrc = '/family1.html';
        } else {
            docSrc = '/healthInsurance1.html';
        }
    } else if (name === '김상철') {
        if (purpose.includes('등본')) {
            docSrc = '/document2.html';
        } else if (purpose.includes('초본')) {
            docSrc = '/extract2.html';
        } else if (purpose.includes('가족관계')) {
            docSrc = '/family2.html';
        } else {
            docSrc = '/healthInsurance2.html';
        }
    } else {
        // 다른 사용자 또는 미지정
        if (purpose.includes('등본')) {
            docSrc = '/document3.html';
        } else if (purpose.includes('초본')) {
            docSrc = '/extract3.html';
        } else if (purpose.includes('가족관계')) {
            docSrc = '/family3.html';
        } else {
            docSrc = '/healthInsurance3.html';
        }
    }

    return (
        <div className="document-container">
            {/* 요청 목적 및 사용자 이름 표시 */}
            <div className="document-info">
                <strong>이름:</strong> {name} &nbsp;|&nbsp; <strong>요청:</strong> {purpose}
            </div>

            {/* 문서를 새 창으로 열기 */}
            <button
                className="open-button"
                onClick={() => window.open(docSrc, '_blank')}
            >
                문서 열기
            </button>

            {/* 앱 내 미리보기용 iframe */}
            <iframe
                src={docSrc}
                title="문서 뷰어"
                className="document-iframe"
            />

            {/* 인쇄 버튼 */}
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
