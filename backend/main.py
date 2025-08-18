# -*- coding: utf-8 -*-
import os
import sys
import json
import tempfile
import subprocess
from typing import Optional

from dotenv import load_dotenv
from loguru import logger
from fastapi import FastAPI, Request, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from openai import OpenAI

# (선택) 다른 라우터들
from recognition import router as recognition_router
from weather import router as weather_router

# --- 프로젝트 경로 계산 ---
BACKEND_DIR = os.path.abspath(os.path.dirname(__file__))
ROOT_DIR = os.path.abspath(os.path.join(BACKEND_DIR, ".."))

# 실행 경로 문제 방지: 루트 디렉터리를 sys.path에 추가
if ROOT_DIR not in sys.path:
    sys.path.append(ROOT_DIR)

# --- STT/TTS 통합 모듈 ---
# factory_backup -> factory 로 맞췄다고 가정
from backend.Utility.STT_TTS.factory import (
    load_config,
    create_stt,
    create_tts,
    setup_logging,
)
from backend.Utility.STT_TTS.def_exceptions import TranscriptionError, TTSError

# --- 환경변수 로드 ---
load_dotenv()  # 현재 작업 디렉토리 기준 .env
load_dotenv(os.path.join(ROOT_DIR, ".env"))  # 루트 기준 .env도 시도
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

client = OpenAI(api_key=OPENAI_API_KEY)

# --- FastAPI 앱 ---
app = FastAPI()
app.include_router(recognition_router)
app.include_router(weather_router)

# --- CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # CRA
        "http://localhost:5173",  # Vite
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 키워드 사전 ---
MINWON_KEYWORDS = {
    "등본": "주민등록등본 발급 요청",
    "주민등록등본": "주민등록등본 발급 요청",
    "주민등본": "주민등록등본 발급 요청",
    "초본": "주민등록초본 발급 요청",
    "주민등록초본": "주민등록초본 발급 요청",
    "주민초본": "주민등록초본 발급 요청",
    "가족관계증명서": "가족관계증명서 발급 요청",
    "가족관계증명": "가족관계증명서 발급 요청",
    "가족관계": "가족관계증명서 발급 요청",
    "가족증명": "가족관계증명서 발급 요청",
    "건강보험득실확인서": "건강보험득실확인서 발급 요청",
    "건강보험": "건강보험득실확인서 발급 요청",
    "건보": "건강보험득실확인서 발급 요청",
    "보험득실": "건강보험득실확인서 발급 요청",
    "보험득실확인": "건강보험득실확인서 발급 요청",
    "날씨": "날씨 정보 조회 요청",
    "오늘날씨": "날씨 정보 조회 요청",
    "내일날씨": "날씨 정보 조회 요청",
    "강수확률": "날씨 정보 조회 요청",
    "행사": "행사 정보 조회 요청",
    "축제": "행사 정보 조회 요청",
    "이벤트": "행사 정보 조회 요청",
    "페스티벌": "행사 정보 조회 요청",
}

def get_purpose_by_keyword(user_input: str) -> Optional[str]:
    """간단한 포함 매칭으로 민원 목적 유추"""
    for keyword, purpose in MINWON_KEYWORDS.items():
        if keyword in user_input:
            return purpose
    return None

# --- LLM 프롬프트 ---
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
- "오늘 날씨 알려줘" → "날씨 정보 조회 요청"
- "내일 비 오나?" → "날씨 정보 조회 요청"
- "근처 축제 뭐 있어?" → "행사 정보 조회 요청"
- "지역 행사 일정 알려줘" → "행사 정보 조회 요청"
- "공무원 시험 접수 안내해줘" → "민원 목적을 알 수 없음"
- "키오스크 고장났어요" → "민원 목적을 알 수 없음"
- "잡담" → "민원 목적을 알 수 없음"

[지침]
- 예시와 같이 반드시 한글 한 줄 요약으로만 답하세요.
- 예시에 없는 민원/잡담/질문 등은 반드시 '민원 목적을 알 수 없음'만 답하세요.
- 설명, 부가 텍스트, 인삿말 절대 금지.
"""

# --- STT/TTS 엔진 준비 ---
_stt = None
_tts = None
config = None

try:
    cfg_path = os.path.join(ROOT_DIR, "config.yaml")
    if not os.path.exists(cfg_path):
        logger.error(f"config.yaml 미존재: {cfg_path}")
    else:
        config = load_config(cfg_path)
        setup_logging()
        _stt = create_stt(config)
        _tts = create_tts(config)
        logger.info("STT/TTS 엔진 인스턴스 생성 완료.")
except Exception as e:
    logger.error(f"설정 로드/엔진 생성 실패: {e}")

@app.on_event("startup")
async def on_startup():
    """앱 시작 시 STT/TTS 초기화"""
    try:
        if _stt:
            _stt.initialize()
            logger.info("STT 엔진 초기화 완료.")
        if _tts:
            _tts.initialize()
            logger.info("TTS 엔진 초기화 완료.")
    except Exception as e:
        logger.error(f"엔진 초기화 중 오류: {e}")

# --- 오디오 변환 유틸 ---
def _ensure_wav(input_bytes: bytes, input_mime: Optional[str]) -> bytes:
    """
    브라우저에서 전달된 webm/ogg 등을 ffmpeg로 16kHz, mono WAV로 변환.
    ffmpeg가 PATH에 있어야 함.
    """
    mime = (input_mime or "").lower()

    if not input_bytes:
        logger.error("입력 오디오 데이터가 비어있습니다.")
        raise ValueError("입력 오디오 데이터가 비어있습니다.")

    if "wav" in mime:
        return input_bytes

    with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as src:
        src.write(input_bytes)
        src_path = src.name

    dst_path = src_path + ".wav"

    try:
        if not os.path.exists(src_path):
            raise FileNotFoundError(f"임시 파일 생성 실패: {src_path}")

        # ffmpeg 실행
        command = ["ffmpeg", "-y", "-i", src_path, "-ac", "1", "-ar", "16000", dst_path]
        subprocess.run(
            command,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.PIPE,
            check=True,
            timeout=30,
        )

        if not os.path.exists(dst_path):
            raise FileNotFoundError(f"오디오 변환 결과 파일이 생성되지 않음: {dst_path}")
        if os.path.getsize(dst_path) == 0:
            raise ValueError("변환된 오디오 파일이 비어있습니다.")

        with open(dst_path, "rb") as f:
            converted_bytes = f.read()

        if not converted_bytes:
            raise ValueError("오디오 변환 결과가 비어있습니다.")

        return converted_bytes

    except FileNotFoundError:
        logger.error("ffmpeg를 찾을 수 없습니다. 시스템 PATH에 ffmpeg를 설치/등록하세요.")
        raise
    except subprocess.CalledProcessError as e:
        err = e.stderr.decode() if e.stderr else "알 수 없는 ffmpeg 오류"
        logger.error(f"ffmpeg 변환 실패: {err}")
        raise
    except subprocess.TimeoutExpired:
        logger.error("ffmpeg 변환 시간 초과")
        raise
    finally:
        for p in (src_path, dst_path):
            try:
                if p and os.path.exists(p):
                    os.remove(p)
            except OSError as e:
                logger.warning(f"임시 파일 삭제 실패: {p}, 오류: {e}")

# --- 목적 분류 API ---
@app.post("/receive-text/")
async def receive_text(request: Request):
    try:
        raw_body = await request.body()
        data = json.loads(raw_body.decode("utf-8"))
        user_input = data.get("text", "")
        logger.info(f"📨 받은 텍스트: {user_input}")

        # 1차: 키워드 매핑
        keyword_purpose = get_purpose_by_keyword(user_input)
        logger.info(f"🔍 키워드 매칭: {keyword_purpose}")

        # 2차: LLM
        system_prompt = (
            "너는 공공기관 키오스크 AI야. 사용자 목적만 예시처럼 한 줄로 써줘. "
            "예시 없는 건 '민원 목적을 알 수 없음'만 쓰면 된다."
        )
        if keyword_purpose:
            user_prompt = f"{LLM_PROMPT}\n[예상 목적: {keyword_purpose}]\n\"{user_input}\""
        else:
            user_prompt = f"{LLM_PROMPT}\n\"{user_input}\""

        # OpenAI 호출
        summary = keyword_purpose or "민원 목적을 알 수 없음"
        try:
            resp = client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
            )
            llm_out = (resp.choices[0].message.content or "").strip()
            if llm_out:
                summary = llm_out
        except Exception as oe:
            # LLM 실패 시 키워드 결과로 fallback
            logger.error(f"OpenAI 호출 실패, 키워드 결과로 대체: {oe}")

        logger.info(f"🧐 최종 목적 요약: {summary}")

        return {
            "source": "llm",
            "summary": summary,                 # 프런트에서 표시할 요약
            "purpose": summary,                 # 로직상 목적
            "matched_keyword": keyword_purpose, # 참고용(키워드 매칭 결과)
        }

    except Exception as e:
        logger.error(f"/receive-text 처리 오류: {e}")
        return {
            "source": "error",
            "summary": "",
            "purpose": "분석 실패",
            "matched_keyword": None,
        }

# --- STT API ---
@app.post("/api/stt")
async def stt_once(file: UploadFile = File(...)):
    """
    요청 형식: multipart/form-data, 필드명 'file'
    파일은 webm/ogg/wav 등. 내부에서 wav(16k/mono)로 변환 후 STT 엔진 호출
    """
    try:
        if not _stt or not _stt.is_initialized():
            logger.error("STT 엔진이 준비되지 않았습니다.")
            return JSONResponse({"error": "STT 엔진이 준비되지 않았습니다."}, status_code=503)

        raw_bytes = await file.read()
        if not raw_bytes:
            logger.error("업로드된 오디오가 비어있습니다.")
            return JSONResponse({"error": "오디오 파일이 비어있습니다."}, status_code=400)

        wav_bytes = _ensure_wav(raw_bytes, file.content_type)
        text = _stt.transcribe(wav_bytes)
        logger.info(f"STT 변환 결과: '{text}'")
        return JSONResponse({"text": text})

    except TranscriptionError as e:
        logger.error(f"STT 변환 오류: {e}")
        return JSONResponse({"error": str(e)}, status_code=502)
    except Exception as e:
        logger.error(f"STT 처리 중 알 수 없는 오류: {e}")
        return JSONResponse({"error": "알 수 없는 STT 오류가 발생했습니다."}, status_code=500)

# --- TTS API ---
@app.post("/api/tts")
async def tts_once(text: str = Form(...)):
    """
    요청 형식: application/x-www-form-urlencoded 또는 multipart/form-data
    필드명 'text'
    """
    try:
        if not text or not text.strip():
            return JSONResponse({"error": "TTS 변환을 위한 텍스트가 필요합니다."}, status_code=400)

        if not _tts or not _tts.is_initialized():
            logger.error("TTS 엔진이 준비되지 않았습니다.")
            return JSONResponse({"error": "TTS 엔진이 준비되지 않았습니다."}, status_code=503)

        audio_bytes = _tts.synthesize(text)
        if not audio_bytes:
            logger.error("TTS 변환 결과가 비어있습니다.")
            return JSONResponse({"error": "TTS 변환에 실패했습니다."}, status_code=502)

        logger.info(f"TTS 변환 완료: '{text}' ({len(audio_bytes)} bytes)")
        return Response(content=audio_bytes, media_type="audio/mpeg")

    except TTSError as e:
        logger.error(f"TTS 변환 오류: {e}")
        return JSONResponse({"error": str(e)}, status_code=502)
    except Exception as e:
        logger.error(f"TTS 처리 중 알 수 없는 오류: {e}")
        return JSONResponse({"error": "알 수 없는 TTS 오류가 발생했습니다."}, status_code=500)
