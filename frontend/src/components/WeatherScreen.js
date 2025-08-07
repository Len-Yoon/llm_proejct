// src/components/WeatherScreen.js
import React from 'react';
import hamster6 from '../assets/hamster6.png';
import '../styles/WeatherScreen.css';

function WeatherScreen({ weatherInfo, forecastData, keyword }) {
    let currentWeatherData = null;
    let dailyForecasts = [];

    try {
        if (weatherInfo && typeof weatherInfo === 'string') {
            currentWeatherData = JSON.parse(weatherInfo);
        }
        if (forecastData && forecastData.length > 0) {
            dailyForecasts = forecastData;
        }
    } catch (e) {
        console.error("날씨 정보 파싱 실패:", e);
    }

    const getFormattedDate = (offset = 0) => {
        const today = new Date();
        today.setDate(today.getDate() + offset);
        const month = today.getMonth() + 1;
        const day = today.getDate();
        if (offset === 0) {
            const year = today.getFullYear();
            const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][today.getDay()];
            return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}, ${dayOfWeek}요일`;
        }
        return `${month}.${day}`;
    };

    const translateWeatherDescription = (desc) => {
        if (!desc) return '정보 없음';
        const lowerDesc = desc.toLowerCase();
        if (lowerDesc.includes('rain')) return '비';
        if (lowerDesc.includes('overcast clouds')) return '흐림';
        if (lowerDesc.includes('cloud')) return '구름 많음';
        if (lowerDesc.includes('snow')) return '눈';
        if (lowerDesc.includes('clear')) return '맑음';
        if (lowerDesc.includes('sun')) return '맑음';
        return desc;
    };

    const getWeatherIcon = (description) => {
        const desc = description?.toLowerCase() || '';
        if (desc.includes('rain')) return '🌧️';
        if (desc.includes('cloud')) return '☁️';
        if (desc.includes('snow')) return '❄️';
        if (desc.includes('clear')) return '☀️';
        return '❓';
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
                    <span className="weather-desc">{translateWeatherDescription(weather[0].description)}</span>
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
                    <span className="date-display">({getFormattedDate(0)})</span>
                </h2>
                <div className="weather-info-card">
                    {renderCurrentWeather()}
                </div>

                <div className="forecast-container">
                    {dailyForecasts.slice(0, 3).map((forecast, index) => {
                        // ✅ 안전한 데이터 처리
                        const weatherDesc = typeof forecast.weather === 'object'
                            ? forecast.weather?.description || ''
                            : forecast.weather || '';

                        const tempMax = !isNaN(forecast.temp_max) ? Math.round(forecast.temp_max) : '?';
                        const tempMin = !isNaN(forecast.temp_min) ? Math.round(forecast.temp_min) : '?';

                        return (
                            <div className="forecast-box" key={index}>
                                <div className="forecast-day">{getFormattedDate(index + 1)}</div>
                                <div className="forecast-icon">{getWeatherIcon(String(weatherDesc))}</div>
                                <div className="forecast-temps">
                                    <span className="temp-max">{tempMax}°</span>
                                    <span className="temp-min">{tempMin}°</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

export default WeatherScreen;
