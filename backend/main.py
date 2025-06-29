# -*- coding: utf-8 -*-
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from dotenv import load_dotenv
import os
import json

# 환경변수 불러오기
load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

client = OpenAI(api_key=OPENAI_API_KEY)

app = FastAPI()

# ✅ CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React 개발 서버 주소
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ✅ POST 엔드포인트 (슬래시 포함)
@app.post("/receive-text/")
async def receive_text(request: Request):
    try:
        # JSON 본문 직접 처리 + 인코딩 문제 방지
        raw_body = await request.body()
        data = json.loads(raw_body.decode("utf-8"))

        user_input = data.get("text", "")
        print("받은 텍스트:", user_input)

        # GPT-4 요청
        prompt = f"""사용자가 다음과 같이 말했습니다:\n\n\"{user_input}\"\n\n이 사용자의 주요 목적이 무엇인지 한 줄로 요약해 주세요. (예: '주민등록등본 발급 요청')"""

        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "당신은 공공기관 키오스크 안내 도우미입니다. 사용자의 목적만 파악해 짧게 알려주세요"},
                {"role": "user", "content": prompt}
            ]
        )

        summary = response.choices[0].message.content.strip()
        print("🤖 분석된 목적:", summary)

        return {"purpose": summary}

    except Exception as e:
        print("OpenAI 오류:", e)
        return {"purpose": "분석 실패"}
