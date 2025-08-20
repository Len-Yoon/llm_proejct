import os
import httpx
from fastapi import APIRouter, Request
from pydantic import BaseModel

router = APIRouter()

class WeatherRequest(BaseModel):
    city: str

router = APIRouter()

@router.post("/weather/")
async def get_weather(request: Request):
    """
    프론트엔드에서 도시 이름을 받아 OpenWeatherMap API로 날씨 정보를 조회합니다.
    """
    try:
        data = await request.json()
        city = data.get("city", "Seoul")  # 기본값은 서울
        api_key = os.getenv("OPENWEATHER_API_KEY")

        if not api_key:
            return {"error": "Weather API key is not configured"}, 500

        # OpenWeatherMap API URL (units=metric: 섭씨, lang=kr: 한국어)
        url = f"https://api.openweathermap.org/data/2.5/weather?q={city}&appid={api_key}&units=metric&lang=kr"

        async with httpx.AsyncClient() as client:
            response = await client.get(url)
            response.raise_for_status()  # 200 OK가 아니면 에러 발생

        weather_data = response.json()
        print(weather_data)
        print(f"✅ 날씨 정보 조회 성공: {city}")

        return weather_data
    except httpx.HTTPStatusError as e:
        print(f"❌ 날씨 API 오류: {e.response.status_code}")
        return {"error": "Failed to fetch weather data", "details": e.response.json()}, e.response.status_code
    except Exception as e:
        print(f"❌ 서버 내부 오류: {e}")
        return {"error": "An internal server error occurred"}, 500