import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Speaker,
  pickVietnameseVoice,
  type SynthLike,
  type UtteranceLike,
} from "./speech";

const AUTO_READ_KEY = "chatbot:auto-read";

/**
 * - `unsupported`: trình duyệt không có Web Speech API, ẩn mọi nút đọc.
 * - `no-voice`: có API nhưng máy không có giọng tiếng Việt, bấm nút thì hướng dẫn cài giọng.
 * - `ready`: đọc được. Danh sách giọng rỗng (Chrome Android hay trả rỗng) vẫn coi là đọc được,
 *   vì đặt `lang = "vi-VN"` thì trình duyệt tự chọn giọng.
 */
export type SpeechStatus = "unsupported" | "no-voice" | "ready";

function readAutoRead() {
  try {
    return localStorage.getItem(AUTO_READ_KEY) === "1";
  } catch {
    return false;
  }
}

export function useSpeech() {
  const synth =
    typeof window !== "undefined" && "speechSynthesis" in window
      ? window.speechSynthesis
      : null;
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>(
    () => synth?.getVoices() ?? [],
  );
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [autoRead, setAutoReadState] = useState(readAutoRead);
  const speakerRef = useRef<Speaker | null>(null);

  // Chrome tải danh sách giọng bất đồng bộ, báo qua sự kiện voiceschanged.
  useEffect(() => {
    if (!synth) return;
    const update = () => setVoices(synth.getVoices());
    update();
    synth.addEventListener?.("voiceschanged", update);
    return () => synth.removeEventListener?.("voiceschanged", update);
  }, [synth]);

  // Rời trang thì im lặng.
  useEffect(() => () => speakerRef.current?.stop(), []);

  const voice = useMemo(() => pickVietnameseVoice(voices), [voices]);
  const status: SpeechStatus = !synth
    ? "unsupported"
    : voices.length > 0 && !voice
      ? "no-voice"
      : "ready";

  const speaker = useCallback(() => {
    if (!synth) return null;
    speakerRef.current ??= new Speaker(
      synth as unknown as SynthLike,
      (text) => new SpeechSynthesisUtterance(text) as unknown as UtteranceLike,
    );
    return speakerRef.current;
  }, [synth]);

  const stop = useCallback(() => {
    speakerRef.current?.stop();
    setSpeakingId(null);
  }, []);

  const speak = useCallback(
    (id: string, text: string) => {
      if (status !== "ready") return;
      const started = speaker()?.speak(text, {
        voice,
        onEnd: () =>
          setSpeakingId((current) => (current === id ? null : current)),
      });
      setSpeakingId(started ? id : null);
    },
    [speaker, status, voice],
  );

  /** Bấm nút Đọc của một câu trả lời: đang đọc câu đó thì dừng, không thì đọc. */
  const toggle = useCallback(
    (id: string, text: string) => {
      if (speakingId === id) stop();
      else speak(id, text);
    },
    [speak, speakingId, stop],
  );

  /** Gọi trong thao tác của người dùng (bấm gửi) để Safari iOS cho phép tự đọc sau đó. */
  const prime = useCallback(() => {
    if (status === "ready") speaker()?.prime();
  }, [speaker, status]);

  const setAutoRead = useCallback(
    (value: boolean) => {
      setAutoReadState(value);
      if (!value) stop();
      else prime();
      try {
        localStorage.setItem(AUTO_READ_KEY, value ? "1" : "0");
      } catch {
        // localStorage bị chặn thì chỉ nhớ trong phiên này
      }
    },
    [prime, stop],
  );

  return {
    status,
    voiceName: voice?.name,
    speakingId,
    speak,
    stop,
    toggle,
    prime,
    autoRead,
    setAutoRead,
  };
}
