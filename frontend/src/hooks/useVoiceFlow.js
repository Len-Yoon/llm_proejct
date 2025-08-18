// src/hooks/useVoiceFlow.js

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAudioRecorder } from './useAudioRecorder';
import { transcribeAudio, speakText } from '../utils/voiceApi';

const VOICE_FLOW_STATE = {
  IDLE: 'IDLE',
  SPEAKING: 'SPEAKING',
  LISTENING: 'LISTENING',
  PROCESSING: 'PROCESSING',
  ERROR: 'ERROR',
};

export const useVoiceFlow = ({ onCommandReceived, onError }) => {
  const [flowState, setFlowState] = useState(VOICE_FLOW_STATE.IDLE);
  const [isSttQueued, setIsSttQueued] = useState(false);
  const [error, setError] = useState(null);
  const { startRecording, stopRecording, isRecording } = useAudioRecorder();

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

  const handleError = useCallback((errorCode, errorObject) => {
    setFlowState(VOICE_FLOW_STATE.ERROR);
    const err = { code: errorCode, originalError: errorObject };
    setError(err);
    if (onErrorRef.current) {
      onErrorRef.current(err);
    }
    console.error(`VoiceFlow Error [${errorCode}]:`, errorObject);

    console.log('Error handled:', errorCode);
    setTimeout(() => {
      setFlowState(VOICE_FLOW_STATE.IDLE);
    }, 2000);
  }, []);

  const listenAndRecognize = useCallback(async () => {
    console.log('STT listenAndRecognize called!');

    if (flowStateRef.current === VOICE_FLOW_STATE.SPEAKING) {
      console.log("TTS is playing. Queuing STT request.");
      setIsSttQueued(true);
      return;
    }

    if (isRecording) {
      console.log('Already recording, skipping...');
      return;
    }

    setIsSttQueued(false);
    setFlowState(VOICE_FLOW_STATE.LISTENING);

    try {
      const recordingPromise = startRecording();
      setTimeout(stopRecording, 8000); // 8초 녹음
      const audioBlob = await recordingPromise;
      setFlowState(VOICE_FLOW_STATE.PROCESSING);

      if (audioBlob.size < 2000) {
        handleError('STT_NO_SPEECH', new Error('No speech detected'));
        setTimeout(() => listenAndRecognize(), 2000);
        return;
      }

      const transcript = await transcribeAudio(audioBlob);
      if (transcript && transcript.trim()) {
        if (onCommandReceivedRef.current) {
          onCommandReceivedRef.current(transcript);
        }
      } else {
        handleError('STT_LOW_CONFIDENCE', new Error('Could not recognize speech'));
      }

      if (flowStateRef.current === VOICE_FLOW_STATE.PROCESSING) {
        setFlowState(VOICE_FLOW_STATE.IDLE);
      }
    } catch (e) {
      if (e.message === 'MIC_PERMISSION_DENIED' || e.message === 'NO_MICROPHONE') {
        handleError(e.message, e);
      } else {
        handleError('STT_NETWORK_ERROR', e);
      }
    } finally {
      stopRecording();
      console.log('Recording stopped in finally block');
    }
  }, [startRecording, stopRecording, isRecording, handleError]);

  // ----- 수정 시작 -----
  // 기존: TTS 후 큐 확인이 불완전하여 STT가 호출되지 않음.
  // 수정: TTS 완료 후 즉시 큐 확인 및 STT 호출 보장, finally에서 큐 재확인 최소화, 디버깅 로그 추가.
  const speak = useCallback(async (text, { listenAfter = false } = {}) => {
    console.log('TTS speak called!');

    setFlowState(VOICE_FLOW_STATE.SPEAKING);
    try {
      await speakText(text);
      console.log('TTS speakText completed!'); // 디버깅 로그

      // TTS 완료 후 무조건 큐 확인 및 STT 트리거 (강제 처리)
      if (isSttQueuedRef.current || listenAfter) {
        setIsSttQueued(false);
        console.log('TTS ended: running queued STT.'); // 디버깅 로그: 큐 처리 확인
        await listenAndRecognize();
      } else {
        setFlowState(VOICE_FLOW_STATE.IDLE);
      }
    } catch (e) {
      handleError('TTS_PLAYBACK_FAILED', e);
      // 실패 시에도 큐 처리
      if (isSttQueuedRef.current || listenAfter) {
        setIsSttQueued(false);
        console.log('TTS failed but running queued STT.'); // 디버깅 로그
        await listenAndRecognize();
      }
      setFlowState(VOICE_FLOW_STATE.IDLE);
    } finally {
      // Finally에서 큐 재확인 (중복 방지 위해 try/catch 이후에 최소화)
      console.log('TTS finally: Queue state:', isSttQueuedRef.current); // 디버깅 로그: 큐 상태 확인
      if (isSttQueuedRef.current) {
        setIsSttQueued(false);
        await listenAndRecognize();
      }
    }

    // 데드락 방지 타임아웃 (조건 강화)
    setTimeout(() => {
      if (flowStateRef.current === VOICE_FLOW_STATE.SPEAKING) {
        setFlowState(VOICE_FLOW_STATE.IDLE);
        console.warn("TTS 타임아웃: 강제 IDLE 전환");
        // 타임아웃 후에도 큐 처리
        if (isSttQueuedRef.current) {
          setIsSttQueued(false);
          listenAndRecognize();
        }
      }
    }, 8000);
  }, [handleError, listenAndRecognize]);
  // ----- 수정 끝 -----

  return {
    flowState,
    error,
    speak,
    listenAndRecognize,
    stopListening: stopRecording,
  };
};
