import { useNavigate } from "react-router-dom";
import { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function Hero() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0); // 0: Video only, 1: Text revealed
  const lastScrollTime = useRef(0);
  const scrollAccumulator = useRef(0);
  const scrollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      const now = Date.now();

      // Allow default scroll if at step 0 and scrolling up
      if (step === 0 && e.deltaY < 0) return;

      // CRITICAL: Prevent default for internal step control
      e.preventDefault();

      if (now - lastScrollTime.current < 200) return;

      // Clear existing reset timeout
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }

      // Reset accumulator if scrolling stops for 100ms
      scrollTimeout.current = setTimeout(() => {
        scrollAccumulator.current = 0;
      }, 100);

      // Accumulate deltaY
      scrollAccumulator.current += e.deltaY;

      if (e.deltaY > 0) {
        // --- SCROLL DOWN ---
        if (scrollAccumulator.current > 20) {
          if (step < 2) {
            e.preventDefault();
            setStep((prev) => prev + 1);
            lastScrollTime.current = now;
            scrollAccumulator.current = 0;
          } else {
            // Step 2: Move to Next Section on 3rd scroll
            const nextSection = document.getElementById("section-guidevd");
            if (nextSection) {
              nextSection.scrollIntoView({ behavior: "smooth" });
            }
            lastScrollTime.current = now;
            scrollAccumulator.current = 0;
          }
        } else {
          e.preventDefault();
        }
      } else {
        // --- SCROLL UP ---
        if (scrollAccumulator.current < -20) { // Threshold Minimal (100 -> 20)
          if (step > 0) {
            // Step 3->2, 2->1, 1->0
            if (step === 1) {
              window.scrollTo({ top: 0, behavior: "smooth" });
            }
            setStep((prev) => prev - 1);
            lastScrollTime.current = now;
            scrollAccumulator.current = 0;
          }
        }
      }
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, [step]);

  useEffect(() => {
    if (videoRef.current) {
      if (step >= 1) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(() => { });
      }
    }
  }, [step]);

  // Detect visibility to reset/play video when fully in view
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        // If >80% visible, reset to initial state (video playing, no text)
        if (entry.isIntersecting && entry.intersectionRatio > 0.8) {
          setStep(0);
        }
      },
      { threshold: 0.8 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-screen bg-black overflow-hidden"
    >
      {/* Background Video */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover z-0"
        src={`${import.meta.env.BASE_URL}video/test.mp4`}
        autoPlay
        muted
        loop
        playsInline
      />

      {/* Global Overlay */}
      <div className="absolute inset-0 bg-black/40 z-10" />

      {/* Content Layer */}
      <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
        <AnimatePresence>
          {step >= 1 && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="flex flex-col items-center w-full px-4 md:px-8 max-w-[90%] 3xl:max-w-[1600px] 4xl:max-w-[2200px] 5xl:max-w-[3200px] text-center text-white gap-5 4xl:gap-8 5xl:gap-12 pointer-events-auto"
            >
              <h1 className="text-4xl xs:text-5xl md:text-7xl 3xl:text-8xl 4xl:text-9xl 5xl:text-[10rem] font-bold leading-tight !text-white drop-shadow-2xl">
                Flow
              </h1>
              <p className="text-base xs:text-lg md:text-2xl 3xl:text-3xl 4xl:text-4xl 5xl:text-5xl max-w-3xl 3xl:max-w-4xl 4xl:max-w-6xl 5xl:max-w-[80rem] text-center font-medium !text-white/95 drop-shadow-lg">
                흡연부스 회피 내비게이션과 실시간 환경 정보를 통해 <br />
                더 쾌적한 도시 생활을 경험하세요.
              </p>
              <button
                onClick={() => navigate("/service")}
                className="bg-gradient-to-r from-blue-600 to-green-600 text-white font-bold py-3 px-8 xs:py-4 xs:px-12 md:py-5 md:px-16 3xl:py-6 3xl:px-20 4xl:py-8 4xl:px-24 5xl:py-10 5xl:px-32 rounded-full text-base xs:text-lg md:text-xl 3xl:text-2xl 4xl:text-3xl 5xl:text-4xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
              >
                서비스 자세히 보기
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
