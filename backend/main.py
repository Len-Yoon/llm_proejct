# -*- coding: utf-8 -*-
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from dotenv import load_dotenv
from recognition import router  # recognition.py에서 router를 import

import os
import json

# 환경변수 불러오기
load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

client = OpenAI(api_key=OPENAI_API_KEY)

app = FastAPI()
app.include_router(router)

# ✅ CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React 개발 서버 주소
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# [1] 주요 민원 키워드와 매핑 목적 정의
MINWON_KEYWORDS = {
    "등본": "주민등록등본 발급 요청",
    "초본": "주민등록초본 발급 요청",
    "가족관계증명": "가족관계증명서 발급 요청",
    "가족관계": "가족관계증명서 발급 요청",
    "토지대장": "토지(임야)대장 발급 요청",
    "여권": "여권 발급 신청",
    "주민등록증": "주민등록증 재발급 요청",
    "출입국": "출입국 사실증명 발급 요청",
    # 필요한 키워드 추가 가능
}

# [2] 키워드 기반 목적 판별 함수
def get_purpose_by_keyword(user_input):
    for kw, purpose in MINWON_KEYWORDS.items():
        if kw in user_input:
            return purpose
    return None

# [3] LLM 프롬프트 (정확도 높이는 예시)
LLM_PROMPT = """
당신은 민원 키오스크 안내 도우미입니다.
아래는 사용자의 다양한 민원 요청 예시입니다.
반드시 **예시와 똑같은 한글 한 줄 요약**만 출력하세요.

[민원 목적 요약 예시]
- "등본 뽑아줘" → "주민등록등본 발급 요청"
- "등본 때고 싶어요" → "주민등록등본 발급 요청"
- "주민등록등본 필요합니다" → "주민등록등본 발급 요청"
- "초본 출력" → "주민등록초본 발급 요청"
- "가족관계증명서 뽑아줘" → "가족관계증명서 발급 요청"
- "가족관계증명 뽑을래" → "가족관계증명서 발급 요청"
- "토지대장 떼고싶어" → "토지(임야)대장 발급 요청"
- "여권 신청하고 싶어요" → "여권 발급 신청"
- "주민등록증 재발급 받아야 해" → "주민등록증 재발급 요청"
- "출입국 사실 증명 해주세요" → "출입국 사실증명 발급 요청"
- "공무원 시험 접수 안내해줘" → "민원 목적을 알 수 없음"
- "오늘 날씨 알려줘" → "민원 목적을 알 수 없음"
- "키오스크 고장났어요" → "민원 목적을 알 수 없음"
- "잡담" → "민원 목적을 알 수 없음"

[지침]
- 예시와 같이 반드시 한글 한 줄 요약으로만 답하세요.
- 예시에 없는 민원/잡담/질문 등은 반드시 '민원 목적을 알 수 없음'만 답하세요.
- 설명, 부가 텍스트, 인삿말 절대 금지.
"""

@app.post("/receive-text/")
async def receive_text(request: Request):
    try:
        raw_body = await request.body()
        data = json.loads(raw_body.decode("utf-8"))
        user_input = data.get("text", "")
        print("받은 텍스트:", user_input)

        # [1차] 키워드 기반 목적 판별
        purpose = get_purpose_by_keyword(user_input)
        if purpose:
            print("키워드 매칭:", purpose)
            return {"purpose": purpose}

        # [2차] LLM에 목적 분석 요청 (키워드 없을 때)
        response = client.chat.completions.create(
            model="gpt-4o",  # gpt-4o 사용 가능하면 교체
            messages=[
                {
                    "role": "system",
                    "content": "넌 공공기관 키오스크 AI야. 사용자 목적만 예시처럼 한 줄로 써줘. 예시 없는 건 '민원 목적을 알 수 없음'만 써."
                },
                {
                    "role": "user",
                    "content": LLM_PROMPT + '\n"' + user_input + '"'
                }
            ]
        )
        summary = response.choices[0].message.content.strip()
        print("🤖 LLM 분석 결과:", summary)
        return {"purpose": summary}

    except Exception as e:
        print("OpenAI 오류:", e)
        return {"purpose": "분석 실패"}
