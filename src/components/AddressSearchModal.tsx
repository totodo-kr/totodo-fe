"use client";

import { useEffect, useRef, useState } from "react";
import { X, Loader2 } from "lucide-react";

interface DaumPostcodeData {
  zonecode: string;
  roadAddress: string;
  jibunAddress: string;
}

declare global {
  interface Window {
    daum?: {
      Postcode: new (options: {
        oncomplete: (data: DaumPostcodeData) => void;
        width?: string | number;
        height?: string | number;
      }) => { embed: (el: HTMLElement) => void };
    };
  }
}

const SCRIPT_SRC = "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";

let scriptPromise: Promise<void> | null = null;

function loadDaumPostcodeScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.daum?.Postcode) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error("주소 검색 서비스를 불러오지 못했습니다."));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

interface AddressSearchModalProps {
  onComplete: (result: { zipcode: string; address: string }) => void;
  onClose: () => void;
}

export default function AddressSearchModal({ onComplete, onClose }: AddressSearchModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadDaumPostcodeScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.daum) return;
        setLoading(false);
        new window.daum.Postcode({
          oncomplete: (data) => {
            onComplete({
              zipcode: data.zonecode,
              address: data.roadAddress || data.jibunAddress,
            });
          },
          width: "100%",
          height: "100%",
        }).embed(containerRef.current);
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [onComplete]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md h-[520px] bg-white rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center transition-colors"
        >
          <X size={18} className="text-gray-700" />
        </button>

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center px-6">
            <p className="text-red-500 text-sm text-center">{error}</p>
          </div>
        )}

        <div ref={containerRef} className="w-full h-full" />
      </div>
    </div>
  );
}
