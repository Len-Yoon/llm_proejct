// src/components/WeatherScreen.js

import React from 'react';
import hamster6 from '../assets/hamster6.png'; 
import '../styles/WeatherScreen.css';

function WeatherScreen({ weatherInfo, keyword, onBack }) {
    let weatherData = null;
    try {
        if (weatherInfo && typeof weatherInfo === 'string') {
            weatherData = JSON.parse(weatherInfo);
        }
    } catch (e) {
        console.error("날씨 정보 파싱 실패:", e);
    }

    const renderWeatherContent = () => {
        if (!weatherData || weatherData.cod !== 200) {
            return <p className="weather-error">날씨 정보를 불러오는 데 실패했습니다.</p>;
        }

        const description = weatherData.weather[0].description;
        const temp = weatherData.main.temp;
        const feels_like = weatherData.main.feels_like;
        const humidity = weatherData.main.humidity;
        const wind_speed = weatherData.wind.speed;
        const iconUrl = `http://openweathermap.org/img/wn/${weatherData.weather[0].icon}@2x.png`;

        return (
            <div className="weather-details-grid">
                <div className="weather-main-info">
                    <img src={iconUrl} alt={description} className="weather-icon" />
                    <span className="weather-temp">{Math.round(temp)}°</span>
                    <span className="weather-desc">{description}</span>
                </div>
                <div className="weather-sub-info">
                    <div className="info-item">
                        <span className="label">체감온도</span>
                        <span className="value">{Math.round(feels_like)}°</span>
                    </div>
                    <div className="info-item">
                        <span className="label">습도</span>
                        <span className="value">{humidity}%</span>
                    </div>
                    <div className="info-item">
                        <span className="label">풍속</span>
                        <span className="value">{wind_speed}m/s</span>
                    </div>
                </div>
            </div>
        );
    };

    const getCityNameInKorean = (cityName) => {
        const cityMap = { "Seoul": "서울" };
        return cityMap[cityName] || cityName;
    }

    return (
        <div className="welcome-container weather-container">
            <img src={hamster6} alt="날씨 안내 햄스터" className="hamster-image-large" />
            <div className="speech-bubble-large weather-bubble">
                {/* 1. 뒤로가기 버튼을 말풍선 밖으로 이동시켰습니다. */}
                <h2 className="weather-title">
                    {getCityNameInKorean(weatherData?.name || '도시')} 날씨 정보
                </h2>
                <div className="weather-info-card">
                    {renderWeatherContent()}
                </div>
            </div>
            {/* 2. 뒤로가기 버튼을 말풍선 아래에 배치합니다. */}
            <button onClick={onBack} className="back-btn-bottom">뒤로가기</button>
        </div>
    );
}

export default WeatherScreen;
