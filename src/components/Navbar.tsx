import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
// 1. 인터페이스에 부모(App.tsx)로부터 받는 함수 타입을 정의합니다.
import { motion } from "framer-motion";
import { useTheme } from "../context/ThemeContext";

import ThemeToggle from "./ThemeToggle";

export default function Navbar() {
  useTheme();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1280);
  const [menuOpen, setMenuOpen] = useState(window.innerWidth >= 1280);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const isHome = location.pathname === "/";
  const isHeroMode = isHome && !isScrolled;
  const useDropdown = !isHeroMode || isMobile;

  // Hero 모드에서 벗어나면 메뉴 닫기 (데스크탑)
  useEffect(() => {
    if (!isHeroMode && !isMobile) {
      setMenuOpen(false);
    } else if (isHeroMode && !isMobile) {
      setMenuOpen(true);
    }
  }, [isHeroMode, isMobile]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1280;
      setIsMobile(mobile);
      if (mobile) {
        setMenuOpen(false);
      } else {
        // 리사이즈 시 Hero 모드면 열기, 아니면 닫기
        setMenuOpen(location.pathname === "/" && window.scrollY <= 50);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleScrollToSection = (targetId: string) => {
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    setMenuOpen(false);
  };

  const menuItems = [
    { name: "홈", target: "section-hero", type: "scroll" },
    { name: "흡연구역", target: "section-location", type: "scroll" },
    { name: "혼잡도", target: "section-crowd", type: "scroll" },
    { name: "산책로", target: "/walk-course", type: "navigate" },
    { name: "FAQ", target: "section-faq", type: "scroll" },
  ];

  const handleMenuItemClick = (item: typeof menuItems[0]) => {
    if (item.type === "scroll") {
      handleScrollToSection(item.target);
    } else if (item.type === "navigate") {
      navigate(item.target);
      setMenuOpen(false); // 메뉴 닫기
    }
  };

  return (
    <>
      {/* 1. Scrolling Navbar Portion (Logo & Menu) */}
      <nav
        className={`absolute top-0 left-0 w-full transition-all duration-300 ${isScrolled ? "bg-black/20 backdrop-blur-md" : "bg-transparent"
          }`}
        style={{ zIndex: 99999 }}
      >
        <div className="relative">
          <div className="flex justify-between items-center px-8 py-6 w-full mx-auto relative">
            {/* Logo 및 서비스 명 - 클릭시 홈으로 이동 */}
            <div
              className="flex items-center gap-3"
            >
              <div className="w-14 h-14 overflow-hidden rounded-full">
                <img
                  src={`${import.meta.env.BASE_URL}image/flowLogo.svg`}
                  alt="FLOW 로고"
                  className="w-full h-full object-contain scale-[1.15]"
                />
              </div>
              <span className="font-bold text-4xl text-white leading-none tracking-wide">
                FLOW
              </span>
            </div>



            {/* Right side placeholder to maintain spacing if needed */}
            <div className="w-12 h-12"></div>
          </div>

          {/* 기존 드롭다운 메뉴 삭제됨 */}
        </div>
      </nav>

      {/* 2. Menu Layer (Moved out of Nav for Fixed Positioning Context) */}
      <motion.ul
        initial={useDropdown ? "closed" : "open"}
        animate={menuOpen ? "open" : "closed"}
        variants={{
          open: {
            opacity: 1,
            scale: 1,
            x: useDropdown ? 0 : "-50%", // 데스크탑 Hero 모드에서만 중앙 정렬
            y: useDropdown ? 0 : "-50%", // 수직 중앙 정렬
            pointerEvents: "auto",
            transition: { duration: 0.3 }
          },
          closed: {
            opacity: useDropdown ? 0 : 1,
            scale: useDropdown ? 0.95 : 1,
            x: useDropdown ? 0 : "-50%",
            y: useDropdown ? 0 : "-50%",
            pointerEvents: useDropdown ? "none" : "auto",
            transition: { duration: 0.3 }
          }
        }}
        className={`
                ${useDropdown
            ? "flex flex-col items-center py-8 gap-6 fixed top-[115px] right-8 w-64 bg-gray-900/95 backdrop-blur-3xl border border-white/10 shadow-2xl rounded-[30px]"
            : "flex items-center justify-center gap-[150px] absolute top-[68px] left-1/2 whitespace-nowrap"
          }
                z-[99999]
              `}
      >
        {menuItems.map((item, index) => (
          <motion.li
            key={item.name}
            custom={index}
            initial={useDropdown ? "closed" : "open"}
            animate={menuOpen ? "open" : "closed"}
            variants={{
              open: (i: number) => ({
                opacity: 1,
                x: 0,
                y: 0,
                scale: 1,
                filter: "blur(0px)",
                transition: {
                  type: "spring",
                  stiffness: 180,
                  damping: 24,
                  delay: i * 0.04
                }
              }),
              closed: (i: number) => ({
                opacity: 0,
                // Dropdown 모드: 위쪽으로 사라짐 / Hero 모드: 중앙 버튼으로 모임
                x: useDropdown ? 0 : 600 - (i - 2) * 150,
                y: useDropdown ? -50 : 20,
                scale: 0,
                filter: "blur(12px)",
                transition: {
                  duration: 0.3,
                  ease: [0.32, 0, 0.67, 0],
                  delay: (menuItems.length - 1 - i) * 0.03
                }
              }
              )
            }}
            onClick={() => handleMenuItemClick(item)}
            whileHover={{ scale: 1.5 }}
            className={`cursor-pointer transition font-bold text-2xl ${useDropdown ? "text-white" : "text-white"} hover:text-indigo-400`}
          >
            <span className="relative inline-block group">
              {item.name}
              {!isMobile && (
                <span className="absolute left-0 -bottom-[7px] w-full h-[2px] bg-indigo-400 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
              )}
            </span>
          </motion.li>
        ))}
      </motion.ul>

      <div className="fixed top-[45px] right-8 flex items-center z-[100000] gap-5">
        <ThemeToggle 
          transparent={false} 
          className="shadow-xl shadow-black/5 border border-white/60 dark:border-white/10 bg-white/70 dark:bg-black/40 backdrop-blur-xl text-slate-900 dark:text-white rounded-full w-14 h-14 flex items-center justify-center" 
        />

        <button
          onClick={() => setMenuOpen((prev) => !prev)}
          className="flex items-center justify-center w-14 h-14 rounded-full transition-all bg-white/70 dark:bg-black/40 backdrop-blur-xl text-slate-900 dark:text-white shadow-xl shadow-black/5 border border-white/60 dark:border-white/10 relative z-[99999] hover:scale-110 active:scale-95 group cursor-pointer"
        >
          {menuOpen ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 drop-shadow-md">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          ) : (
            <div className="flex flex-col gap-[6px]">
              <div className={`h-1 rounded-full transition-all duration-300 ${menuOpen ? 'w-8' : 'w-8'} bg-current`} />
              <div className={`h-1 rounded-full transition-all duration-300 ${menuOpen ? 'w-8' : 'w-6 ml-auto'} bg-current`} />
              <div className={`h-1 rounded-full transition-all duration-300 ${menuOpen ? 'w-8' : 'w-4 ml-auto'} bg-current`} />
            </div>
          )}
        </button>
      </div>
    </>
  );
}
