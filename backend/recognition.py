from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()  # APIRouter 객체 생성

class PinRequest(BaseModel):
    pin: str

@router.post("/recognition/")
async def verify_pin(data: PinRequest):
    if data.pin == "1234":
        return {"success": True}
    else:
        return {"success": False}
