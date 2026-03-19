import { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff } from 'lucide-react';

export default function CameraPreview({ className = "" }) {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let currentStream = null;

    async function startCamera() {
      try {
        const constraints = {
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user'
          },
          audio: false // We only need video here
        };

        currentStream = await navigator.mediaDevices.getUserMedia(constraints);
        if (videoRef.current) {
          videoRef.current.srcObject = currentStream;
        }
        setStream(currentStream);
      } catch (err) {
        console.error("Error accessing camera:", err);
        setError(err.message);
      }
    }

    startCamera();

    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div className={`relative bg-slate-800 rounded-xl overflow-hidden shadow-2xl transition-all ${className}`}>
      {stream ? (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover mirror"
          />
          <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 bg-black/50 backdrop-blur-md rounded-full border border-white/10">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-bold text-white uppercase tracking-wider">LIVE</span>
          </div>
        </>
      ) : error ? (
        <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-4 text-center">
          <CameraOff size={24} className="text-red-400 opacity-50" />
          <p className="text-[10px] text-slate-400 leading-tight">Camera access denied or unavailable</p>
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Tailwind's utility for mirroring video */}
      <style flex>{`
        .mirror {
          transform: scaleX(-1);
        }
      `}</style>
    </div>
  );
}
