import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dictation, recognitionFactory } from "./dictation";

/** Hỏi bằng giọng nói (LMS-021). `supported = false` thì ẩn nút micro. */
export function useDictation() {
  const factory = useMemo(() => recognitionFactory(), []);
  const dictationRef = useRef<Dictation | null>(null);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Lượt vừa xong có đoạn trình duyệt nghe không chắc: nhắc đọc lại trước khi gửi. */
  const [unsure, setUnsure] = useState(false);

  // Rời trang thì tắt micro.
  useEffect(() => () => dictationRef.current?.cancel(), []);

  /** Bắt đầu nghe. `base` là chữ đang có trong ô, câu nói được nối vào sau. */
  const start = useCallback(
    (
      base: string,
      onText: (text: string) => void,
      options: { maxLength?: number; onHeard?: () => void } = {},
    ) => {
      if (!factory) return;
      dictationRef.current ??= new Dictation(factory);
      setError(null);
      setUnsure(false);
      const started = dictationRef.current.start(
        base,
        {
          onText,
          onEnd: (outcome) => {
            setListening(false);
            setError(outcome.error);
            setUnsure(outcome.unsure);
            if (outcome.heard) options.onHeard?.();
          },
        },
        { maxLength: options.maxLength },
      );
      setListening(started);
    },
    [factory],
  );

  const stop = useCallback(() => dictationRef.current?.stop(), []);

  /** Hủy lượt nghe và bỏ các lời nhắc (gửi câu hỏi, tự gõ). */
  const cancel = useCallback(() => {
    dictationRef.current?.cancel();
    setListening(false);
    setUnsure(false);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return {
    supported: factory !== null,
    listening,
    error,
    unsure,
    start,
    stop,
    cancel,
    clearError,
  };
}
