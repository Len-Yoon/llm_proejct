from typing import TypedDict

class STTConfig(TypedDict):
    api_url: str
    language_code: str

class TTSConfig(TypedDict):
    language: str
    speaker_id: int
    sample_rate: int
    device: str

class VADConfig(TypedDict):
    threshold: float
    min_silence_duration_ms: int
    hardware_rate: int
    rate: int

class GeneralConfig(TypedDict):
    timezone: str

class AppConfig(TypedDict):
    stt: STTConfig
    tts: TTSConfig
    vad: VADConfig
    general: GeneralConfig