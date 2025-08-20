// src/components/WeatherScreen.js
import React, { useState } from 'react';
import hamster6 from '../assets/hamster6.png';
import '../styles/WeatherScreen.css';

function WeatherScreen({ weatherInfo, keyword }) {
    // ✅ 1. 대화 기록 상태를 빈 배열로 초기화
    const [conversation, setConversation] = useState([]);

    let currentWeatherData = null;

    try {
        if (weatherInfo && typeof weatherInfo === 'string') {
            currentWeatherData = JSON.parse(weatherInfo);
        }
    } catch (e) {
        console.error("날씨 정보 파싱 실패:", e);
    }

    const getFormattedDate = () => {
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth() + 1;
        const day = today.getDate();
        const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][today.getDay()];
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}, ${dayOfWeek}요일`;
    };

    const renderCurrentWeather = () => {
        if (!currentWeatherData || currentWeatherData.cod !== 200) {
            return <p className="weather-error">날씨 정보를 불러오는 데 실패했습니다.</p>;
        }
        const { weather, main, wind } = currentWeatherData;
        const iconUrl = `http://openweathermap.org/img/wn/${weather[0].icon}@2x.png`;

        return (
            <div className="weather-details-grid">
                <div className="weather-main-info">
                    <img src={iconUrl} alt={weather[0].description} className="weather-icon" />
                    <span className="weather-temp">{Math.round(main.temp)}°</span>
                    <span className="weather-desc">{weather.description}</span>
                </div>
                <div className="weather-sub-info">
                    <div className="info-item">
                        <span className="label">체감</span>
                        <span className="value">{Math.round(main.feels_like)}°</span>
                    </div>
                    <div className="info-item">
                        <span className="label">습도</span>
                        <span className="value">{main.humidity}%</span>
                    </div>
                    <div className="info-item">
                        <span className="label">풍속</span>
                        <span className="value">{wind.speed}m/s</span>
                    </div>
                </div>
            </div>
        );
    };

    const getCityNameInKorean = (cityName) => {
        const cityMap = { "Seoul": "서울" };
        return cityMap[cityName] || cityName;
    };

    return (
        <div className="welcome-container weather-container">
            <img src={hamster6} alt="날씨 안내 햄스터" className="hamster-image-large" />
            <div className="speech-bubble-large weather-bubble">
                <h2 className="weather-title">
                    {getCityNameInKorean(currentWeatherData?.name || '도시')} 날씨 정보
                    <span className="date-display">({getFormattedDate()})</span>
                </h2>
                <div className="weather-info-card">
                    {renderCurrentWeather()}
                </div>
            </div>

            <div className="chat-log-container">
                {/* ✅ 2. 대화 내용이 없을 때 안내 문구 표시 */}
                {conversation.length === 0 ? (
                    <p className="chat-placeholder">대화 내용이 여기에 표시됩니다.</p>
                ) : (
                    conversation.map((msg, index) => (
                        <div key={index} className={`chat-message ${msg.speaker}-message`}>
                            <span className="speaker-label">{msg.speaker === 'user' ? '나' : 'AI'}</span>
                            <p>{msg.text}</p>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default WeatherScreen;
