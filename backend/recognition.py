from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

class PinRequest(BaseModel):
    pin: str

@app.post("/recognition/")
async def verify_pin(data: PinRequest):
    if data.pin == "1234":
        return {"success": True}
    else:
        return {"success": False}
