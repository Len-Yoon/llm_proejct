import React, { useState } from 'react';
import hamsterImage from '../assets/hamster12.png'; // WelcomeScreen과 동일한 이미지
import '../styles/FestivalScreen.css';

function FestivalScreen({ festivals, keyword, onBack }) {
  // "서울" 지역 축제만 필터링
  const seoulFestivals = festivals.filter(f => (f['위치'] || '').trim() === '서울');
  
  // 페이지네이션 로직 (3개씩)
  const [page, setPage] = useState(0);
  const pageSize = 3;
  const totalPages = Math.ceil(seoulFestivals.length / pageSize);
  const pagedFestivals = seoulFestivals.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <div className="festival-screen">
      <img src={hamsterImage} alt="안내 햄스터" className="hamster-image-top" />

      <div className="festival-content-box">
        
        <h2>‘{keyword}’ 관련 서울 축제</h2>
        <button onClick={onBack} className="back-btn">뒤로가기</button>

        <div className="festival-list">
          {pagedFestivals.length === 0 ? (
            <p className="no-result">검색 결과가 없습니다.</p>
          ) : (
            pagedFestivals.map((f, i) => (
              <div className="festival-card" key={i}>
                {/* 왼쪽: 텍스트 정보 영역 */}
                <div className="card-text-content">
                  <div className="festival-name">{f["축제명"]}</div>
                  <div className="festival-info">
                    <div><span className="festival-label">장소:</span>{f["개최장소"] || '미정'}</div>
                    <div><span className="festival-label">주소:</span>{f["소재지도로명주소"] || '미정'}</div>
                    <div><span className="festival-label">기간:</span>{f["시작일_정리"]} ~ {f["종료일_정리"]}</div>
                  </div>
                </div>
                {/* 오른쪽: QR 코드 공간 */}
                <div className="qr-code-placeholder">
                  QR
                </div>
              </div>
            ))
          )}
        </div>

        <div className="pagination-btns">
          <button
            className="page-nav"
            onClick={() => setPage(p => Math.max(p - 1, 0))}
            disabled={page === 0}
          >
            〈 이전
          </button>
          <span className="page-info">{page + 1} / {totalPages || 1}</span>
          <button
            className="page-nav"
            onClick={() => setPage(p => Math.min(p + 1, totalPages - 1))}
            disabled={page >= totalPages - 1}
          >
            다음 〉
          </button>
        </div>
        
      </div>
    </div>
  );
}

export default FestivalScreen;
