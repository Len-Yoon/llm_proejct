// src/hooks/useVoiceFlow.js

import {useState, useCallback, useEffect, useRef} from 'react';
import {useAudioRecorder} from './useAudioRecorder';
import {transcribeAudio, speakText} from '../utils/voiceApi';

/////////////////////////////////////// 상태 정의 /////////////////////////////////////////////
const VOICE_FLOW_STATE = {
    IDLE: 'IDLE',
    SPEAKING: 'SPEAKING',
    LISTENING: 'LISTENING',
    PROCESSING: 'PROCESSING',
    ERROR: 'ERROR',
};

export const useVoiceFlow = ({onCommandReceived, onError}) => {
    const [flowState, setFlowState] = useState(VOICE_FLOW_STATE.IDLE);
    const [isSttQueued, setIsSttQueued] = useState(false);
    const [error, setError] = useState(null);
    const {startRecording, stopRecording, isRecording} = useAudioRecorder();

    // ----- refs for latest values -----
    const flowStateRef = useRef(flowState);
    useEffect(() => {
        flowStateRef.current = flowState;
    }, [flowState]);

    const isSttQueuedRef = useRef(isSttQueued);
    useEffect(() => {
        isSttQueuedRef.current = isSttQueued;
    }, [isSttQueued]);

    const onCommandReceivedRef = useRef(onCommandReceived);
    useEffect(() => {
        onCommandReceivedRef.current = onCommandReceived;
    }, [onCommandReceived]);

    const onErrorRef = useRef(onError);
    useEffect(() => {
        onErrorRef.current = onError;
    }, [onError]);

    // ====== NEW: TTS 제어 관련 ======
    const ttsTimeoutRef = useRef(null);
    const ttsActiveRef = useRef(false);

    const clearTtsTimeout = () => {
        if (ttsTimeoutRef.current) {
            clearTimeout(ttsTimeoutRef.current);
            ttsTimeoutRef.current = null;
        }
    };

    /** 외부에서 호출 가능한 TTS 강제중단 (App에서 화면 전환 시 호출 가능) */
    const stopSpeaking = useCallback(() => {
        try {
            window?.speechSynthesis?.cancel();
        } catch (_) {
        }
        ttsActiveRef.current = false;
        clearTtsTimeout();
        // 스피킹 중이었으면 IDLE로 복귀
        if (flowStateRef.current === VOICE_FLOW_STATE.SPEAKING) {
            setFlowState(VOICE_FLOW_STATE.IDLE);
        }
        // 대기 중인 STT 큐는 취향에 따라 유지/해제
        // 여기선 안전하게 큐도 제거
        setIsSttQueued(false);
    }, []);

    ////////////////////////////////////////////// 에러 처리 //////////////////////////////////////////////////
    const handleError = useCallback((errorCode, errorObject) => {
        setFlowState(VOICE_FLOW_STATE.ERROR);
        const err = {code: errorCode, originalError: errorObject};
        setError(err);
        if (onErrorRef.current) onErrorRef.current(err);
        console.error(`VoiceFlow Error [${errorCode}]:`, errorObject);

        // 에러 이후 짧게 쉬고 IDLE로
        setTimeout(() => {
            setFlowState(VOICE_FLOW_STATE.IDLE);
        }, 2000);
    }, []);

    ///////////////////////////////////////////////// STT 동작 흐름 /////////////////////////////////////////////////
    const listenAndRecognize = useCallback(async () => {
        console.log('STT listenAndRecognize called!');

        // 스피킹 중이면 STT를 큐에 넣고 종료
        if (flowStateRef.current === VOICE_FLOW_STATE.SPEAKING) {
            console.log('TTS is playing. Queuing STT request.');
            setIsSttQueued(true);
            return;
        }

        // 이미 녹음 중이면 중복 방지
        if (isRecording) {
            console.log('Already recording, skipping...');
            return;
        }

        // STT 시작
        setIsSttQueued(false);
        setFlowState(VOICE_FLOW_STATE.LISTENING);

        try {
            const recordingPromise = startRecording();
            // 8초 뒤 자동 stop (상황에 맞게 조정)
            const stopTid = setTimeout(stopRecording, 8000);
            const audioBlob = await recordingPromise;
            clearTimeout(stopTid);

            setFlowState(VOICE_FLOW_STATE.PROCESSING);

            // 너무 짧은 입력 제거
            if (!audioBlob || audioBlob.size < 2000) {
                handleError('STT_NO_SPEECH', new Error('No speech detected'));
                setTimeout(() => listenAndRecognize(), 2000);
                return;
            }

            const transcript = await transcribeAudio(audioBlob);
            if (transcript && transcript.trim()) {
                onCommandReceivedRef.current?.(transcript);
            } else {
                handleError('STT_LOW_CONFIDENCE', new Error('Could not recognize speech'));
            }

            if (flowStateRef.current === VOICE_FLOW_STATE.PROCESSING) {
                setFlowState(VOICE_FLOW_STATE.IDLE);
            }
        } catch (e) {
            if (e?.message === 'MIC_PERMISSION_DENIED' || e?.message === 'NO_MICROPHONE') {
                handleError(e.message, e);
            } else {
                handleError('STT_NETWORK_ERROR', e);
            }
        } finally {
            try {
                stopRecording();
            } catch (_) {
            }
            console.log('Recording stopped in finally block');
        }
    }, [startRecording, stopRecording, isRecording, handleError]);

    ///////////////////////////////////////////////// TTS 동작 흐름 /////////////////////////////////////////////////
    // 변경점:
    // - 새로 말하기 전에 항상 기존 발화 강제 중단(stopSpeaking)
    // - TTS 완료/실패/타임아웃에서 STT 큐 정확히 처리
    // - 외부에서 화면 전환 시 stopSpeaking()을 호출하면 즉시 끊김
    const speak = useCallback(async (text, {listenAfter = false} = {}) => {
        console.log('TTS speak called!', {listenAfter});

        // 기존 발화/타임아웃 정리 후 시작
        stopSpeaking();

        setFlowState(VOICE_FLOW_STATE.SPEAKING);
        ttsActiveRef.current = true;

        try {
            // 실제 TTS (voiceApi.speakText 내부 구현이 Web Speech API든 오디오 스트림이든 상관없이)
            const speakPromise = speakText(text);

            // 안전장치 타임아웃 (이벤트 누락 대비)
            clearTtsTimeout();
            ttsTimeoutRef.current = setTimeout(() => {
                if (ttsActiveRef.current) {
                    console.warn('TTS timeout -> forcing stop');
                    stopSpeaking();
                }
            }, 8000);

            await speakPromise;
            console.log('TTS speakText completed!');
        } catch (e) {
            console.warn('TTS speak failed:', e);
            // 실패 시에도 진행
        } finally {
            clearTtsTimeout();
            ttsActiveRef.current = false;

            // 완료/실패 이후 상태 정리
            if (flowStateRef.current === VOICE_FLOW_STATE.SPEAKING) {
                setFlowState(VOICE_FLOW_STATE.IDLE);
            }

            // 큐 처리: listenAfter 플래그 또는 큐가 켜져 있으면 STT 시작
            if (isSttQueuedRef.current || listenAfter) {
                setIsSttQueued(false);
                console.log('Running queued STT after TTS.');
                await listenAndRecognize();
            }
        }
    }, [listenAndRecognize, stopSpeaking]);

    return {
        flowState,
        error,
        speak,
        listenAndRecognize,
        stopListening: stopRecording,
        // NEW: 외부에서 호출 가능한 TTS 중단 API
        stopSpeaking,
    };
};
