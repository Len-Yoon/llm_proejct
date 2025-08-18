// src/hooks/useAudioRecorder.js

import { useState, useRef } from 'react';

/**
 * 마이크 오디오 녹음을 관리하는 커스텀 훅.
 * @returns {{
 *   isRecording: boolean,
 *   startRecording: () => Promise<Blob>,
 *   stopRecording: () => void,
 *   permissionStatus: 'idle' | 'pending' | 'granted' | 'denied'
 * }}
 */
export const useAudioRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState('idle');
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingPromiseResolverRef = useRef(null);

  // ----- 수정 시작 -----
  // 기존: startRecording 함수 내부에 ondataavailable와 onstop이 중첩되어 정의되어 있었음. stopRecording이 catch 블록 안에 있어 접근 불가.
  // 수정: 이벤트 핸들러를 독립적으로 정의하고, stopRecording을 최상위로 이동. Promise와 Ref를 올바르게 초기화하여 청크 손실 방지.
  const startRecording = async () => {
    setPermissionStatus('pending');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setPermissionStatus('granted');
      setIsRecording(true);

      // webm 형식이 호환성이 좋음
      const options = { mimeType: 'audio/webm;codecs=opus' };
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = []; // 청크 초기화

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (recordingPromiseResolverRef.current) {
          recordingPromiseResolverRef.current(audioBlob);
        }
        audioChunksRef.current = [];
        // 스트림 트랙 정지 (마이크 사용 중 아이콘 제거)
        stream.getTracks().forEach(track => track.stop());
        setIsRecording(false);
      };

      mediaRecorder.start();

      // 녹음이 중지될 때 Blob 데이터를 반환하는 Promise 생성
      return new Promise((resolve) => {
        recordingPromiseResolverRef.current = resolve;
      });
    } catch (err) {
      console.error("마이크 접근 오류:", err);
      setPermissionStatus('denied');
      setIsRecording(false);
      if (err.name === 'NotAllowedError') {
        throw new Error('MIC_PERMISSION_DENIED');
      } else {
        throw new Error('NO_MICROPHONE');
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };
  // ----- 수정 끝 -----

  return { isRecording, startRecording, stopRecording, permissionStatus };
};
