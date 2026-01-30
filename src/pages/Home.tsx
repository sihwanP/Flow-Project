import { useState, useEffect, useRef } from "react";
import Navbar from "../components/Navbar";
import { motion } from "framer-motion";
import SmokingMap from "../components/SmokingMap";
import CrowdMap from "../components/CrowdMap";
import Hero from "../components/Hero";
import SmokingBooth from "../components/SmokingBooth";
import Crowd from "../components/Crowd";
import GuideVd from "../components/GuidVd";
import SectionDivider from "../components/SectionDivider";
import Guide from "../components/Guide";
import Footer from "../components/footer";
import ScrollNavigator from "../components/ScrollNavigator";
import ScrollZoom from "../components/ScrollZoom";
import FocusScroll from "../components/FocusScroll";
import ServiceVideo from "../components/ServiceVideo";
import CrowdContent from "../components/CrowdContent";

export default function Home() {
  const [showMap, setShowMap] = useState(false);
  const [showCrowdMap, setShowCrowdMap] = useState(false);
  const [crowdSearchKeyword, setCrowdSearchKeyword] = useState<string>("");
  const [isJumping, setIsJumping] = useState(false);
  const isInitialMount = useRef(true);


  // URL 해시(#) 감지 및 해당 섹션으로 스크롤
  useEffect(() => {
    const handleHashScroll = (isMount: boolean = false) => {
      // 1. 새로고침(reload) 또는 첫 접속인지 확인
      const navigationEntries = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
      const isReload = navigationEntries.length > 0 && navigationEntries[0].type === "reload";

      // 2. 만약 새로고침이거나, 마운트 시점에 해시가 없는 순수 첫 진입이라면 최상단으로 강제 이동
      if (isMount && (isReload || !window.location.hash)) {
        window.scrollTo(0, 0);
        setIsJumping(false);
        isInitialMount.current = false;
        return;
      }

      const hash = window.location.hash;
      if (hash) {
        if (isMount) setIsJumping(true);

        const targetId = hash.split('#').pop();
        const element = targetId ? document.getElementById(targetId) : null;

        if (element) {
          const delay = isMount ? 300 : 0;
          const behavior = isMount ? "auto" : "smooth";

          setTimeout(() => {
            element.scrollIntoView({ behavior: behavior as ScrollBehavior, block: "start" });
            if (isMount) {
              setTimeout(() => setIsJumping(false), 200);
            }
          }, delay);
        } else {
          if (isMount) setIsJumping(false);
        }
      }
    };

    handleHashScroll(true);
    isInitialMount.current = false;

    const onHashChange = () => handleHashScroll(false);
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  // 지도를 닫을 때 특정 섹션으로 복귀하는 핸들러
  const handleCloseSmokingMap = () => {
    setShowMap(false);
    setTimeout(() => {
      document
        .getElementById("section-location")
        ?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleCloseCrowdMap = () => {
    setShowCrowdMap(false);
    setCrowdSearchKeyword(""); // 검색어 초기화
    setTimeout(() => {
      document
        .getElementById("section-crowd")
        ?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };


  if (showMap) return <SmokingMap onBack={handleCloseSmokingMap} />;
  if (showCrowdMap) return <CrowdMap onBack={handleCloseCrowdMap} initialKeyword={crowdSearchKeyword} />;

  return (
    <div className="relative w-full min-h-screen overflow-x-hidden">


      {/* 초기 점프 커튼 (플래시 방지) */}
      {isJumping && (
        <div className="fixed inset-0 z-[100] bg-white dark:bg-slate-950 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-600 dark:text-gray-400 font-bold animate-pulse">잠시만 기다려주세요...</p>
          </div>
        </div>
      )}

      <main className="w-full">
        {/* Navbar 연동 */}
        <Navbar />

        {/* Hero 섹션 - 영상 사이즈에 맞춰 고정 (내부에서 휠 인터랙션 처리) */}
        <section id="section-hero" className="relative w-full h-screen">
          <Hero />
          <SectionDivider type="wave" position="bottom" color="text-gray-100/60 dark:text-slate-900/40" />
        </section>

        {/* GuideVd 섹션 - 흡연부스 회피 네비게이션 */}
        <section id="section-guidevd" className="relative w-full page-section min-h-[600px]">
          <GuideVd />
          <SectionDivider type="curve" position="bottom" color="text-blue-100/60 dark:text-blue-900/30" />
        </section>

        {/* ServiceVideo 섹션 - 서비스 소개 영상 */}
        <section id="section-servicevideo" className="relative w-full page-section min-h-[400px]">
          <ServiceVideo />
          <SectionDivider type="wave" position="bottom" color="text-purple-100/60 dark:text-purple-900/30" />
        </section>

        {/* SmokingBooth 섹션 */}
        <section id="section-location" className="relative w-full page-section min-h-[500px]">
          <SmokingBooth onShowMap={() => setShowMap(true)} onShowCrowdMap={() => setShowCrowdMap(true)} />
          <SectionDivider type="slant" position="bottom" color="text-green-100/60 dark:text-green-900/30" />
        </section>

        {/* Crowd 섹션 */}
        <section id="section-crowd" className="relative w-full page-section min-h-[500px]">
          <Crowd onBack={() => { }} />
          <SectionDivider type="curve" position="bottom" color="text-indigo-100/60 dark:text-indigo-900/30" />
        </section>

        {/* New Crowd Sibling Section */}
        <section id="section-crowdcontent" className="relative w-full page-section">
          <CrowdContent />
          <SectionDivider type="slant" position="bottom" color="text-slate-100/60 dark:text-slate-900/30" />
        </section>

        {/* Guide 섹션 */}
        <section id="section-guide" className="relative w-full page-section">
          <Guide />
          <SectionDivider type="wave" position="bottom" color="text-indigo-100/60 dark:text-gray-800/40" />
        </section>

        {/* FAQ 섹션 - 넷플릭스 스타일 아코디언 */}
        <section id="section-faq" className="relative w-full page-section bg-transparent transition-colors duration-500 overflow-hidden">
          <div className="w-full max-w-[900px] mx-auto pt-[60px] pb-[60px] px-6">
            <h2 className="relative -top-[50px] text-4xl md:text-5xl font-black text-center text-slate-900 dark:text-white mb-[160px] tracking-tight">
              자주 묻는 질문
            </h2>
            
            <div className="flex flex-col gap-[15px]">
              {[
                {
                  q: "Flow 서비스는 무엇인가요?",
                  a: "Flow는 실시간 보행 혼잡도와 흡연 부스 위치 정보를 결합하여, 사용자에게 가장 쾌적하고 건강한 이동 경로를 제안하는 스마트 어반 가이드 서비스입니다."
                },
                {
                  q: "데이터의 실시간성은 보장되나요?",
                  a: "네, 전국 주요 요충지의 유동인구 데이터를 1분 단위로 실시간 수집 및 분석하여 매우 정밀한 혼잡도 정보를 제공합니다."
                },
                {
                  q: "흡연 부스 회피 경로는 어떤 원리인가요?",
                  a: "사용자의 현재 위치와 목적지 사이에 위치한 모든 흡연 시설의 영향 반경을 계산하여, 담배 연기 노출을 최소화할 수 있는 최적의 우회 경로를 실시간으로 길안내합니다."
                },
                {
                  q: "별도의 앱 설치가 필요한가요?",
                  a: "Flow는 웹 기반 반응형 서비스로 제공되어, 앱 설치 없이 브로우저에서 바로 모든 기능을 이용할 수 있습니다."
                }
              ].map((faq, idx) => {
                const [isOpen, setIsOpen] = useState(false);
                return (
                  <div key={idx} className="w-full">
                    <button
                      onClick={() => setIsOpen(!isOpen)}
                      className="w-full flex justify-between items-center bg-[#f7f7f7] dark:bg-[#2d2d2d] p-6 md:p-8 hover:bg-[#efefef] dark:hover:bg-[#3d3d3d] transition-colors text-left group border-b border-gray-200 dark:border-white/5 active:scale-[0.99]"
                    >
                      <span className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                        {faq.q}
                      </span>
                      <motion.div
                        animate={{ rotate: isOpen ? 45 : 0 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="text-3xl md:text-4xl text-slate-900 dark:text-white flex-shrink-0"
                      >
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                          <line x1="12" y1="5" x2="12" y2="19" />
                          <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                      </motion.div>
                    </button>
                    
                    <motion.div
                      initial={false}
                      animate={{ 
                        height: isOpen ? "auto" : 0,
                        opacity: isOpen ? 1 : 0
                      }}
                      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }} 
                      className="overflow-hidden bg-[#f7f7f7] dark:bg-[#2d2d2d]"
                    >
                      <div className="p-6 md:p-8 pt-0 md:pt-0 text-lg md:text-xl font-bold leading-relaxed text-slate-800 dark:text-slate-200 border-b-4 border-blue-500/30">
                        {faq.a}
                      </div>
                    </motion.div>
                  </div>
                );
              })}
            </div>
            
            <p className="text-center mt-[206px] text-slate-500 dark:text-slate-400 font-bold text-lg">
              더 궁금하신 점이 있나요? <span className="text-blue-600 dark:text-blue-400 cursor-pointer hover:underline">1:1 문의하기</span>
            </p>
          </div>
          <SectionDivider type="slant" position="bottom" color="text-blue-50/60 dark:text-blue-900/10" />
        </section>

        {/* Footer 섹션 */}
        <section id="section-footer" className="relative w-full">
          <Footer />
        </section>

        <ScrollNavigator />
        <ScrollZoom />
        <FocusScroll />
      </main>
    </div>
  );
}
