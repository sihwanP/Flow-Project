import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { 
  majorLocations, 
  generateLocationData, 
  getLevelColor 
} from "../services/crowdDataService";
import type { 
  LocationCrowdData, 
  HourlyData 
} from "../services/crowdDataService";

declare global {
  interface Window {
    kakao: any;
  }
}

interface CrowdProps {
  onBack: () => void;
}

export default function Crowd({ }: CrowdProps) {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [hourlyUpdateTime, setHourlyUpdateTime] = useState(new Date()); // 1시간 단위 업데이트용
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapStatus, setMapStatus] = useState<string>("준비 중...");

  // 1초마다 현재 시각 업데이트 (UI 시간 표시용)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000); // 1초마다 갱신

    return () => clearInterval(timer);
  }, []);

  // 1시간마다 혼잡도 데이터 업데이트 (Top 5 혼잡 지역 등)
  useEffect(() => {
    const hourlyTimer = setInterval(() => {
      setHourlyUpdateTime(new Date());
    }, 3600000); // 1시간(3,600,000ms)마다 갱신

    return () => clearInterval(hourlyTimer);
  }, []);

  // 공통 데이터 관리 로직
  const allLocations = useMemo(() => {
    return majorLocations.map(loc => generateLocationData(loc.name, loc.lat, loc.lng));
  }, [hourlyUpdateTime]);

  // 전국 혼잡도 지도 초기화
  useEffect(() => {
    const initializeMap = () => {
      const initLogic = () => {
        if (!window.kakao || !window.kakao.maps) {
          setMapError("카카오 맵 SDK를 찾을 수 없습니다.");
          return;
        }

        window.kakao.maps.load(() => {
          if (mapContainerRef.current && !mapRef.current) {
            try {
              setMapStatus("지도 초기화 중...");
              const center = new window.kakao.maps.LatLng(36.5, 127.5);
              const options = {
                center: center,
                level: 13,
                draggable: true,
                zoomable: false,
              };

              const map = new window.kakao.maps.Map(mapContainerRef.current, options);
              mapRef.current = map;

              setTimeout(() => {
                map.relayout();
                map.setCenter(center);
                setMapStatus("완료");
              }, 500);

              allLocations.forEach((data) => {
                const color = getLevelColor(data.currentLevel);
                const radius = data.currentLevel === "매우혼잡" ? 45 :
                  data.currentLevel === "혼잡" ? 38 :
                    data.currentLevel === "보통" ? 32 : 28;

                const markerContent = document.createElement('div');
                markerContent.style.cssText = `position: relative; width: ${radius}px; height: ${radius}px; cursor: pointer;`;
                markerContent.innerHTML = `
                  <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;">
                    <div style="width: 100%; height: 100%; border-radius: 50%; background: ${color}; border: 3px solid white; box-shadow: 0 0 15px ${color}, 0 4px 10px rgba(0,0,0,0.3); animation: pulse 2s ease-in-out infinite;"></div>
                    <div style="position: absolute; font-size: 10px; font-weight: bold; color: white; text-shadow: 0 1px 3px rgba(0,0,0,0.8); white-space: nowrap; top: -20px;">${data.name}</div>
                    <div style="position: absolute; font-size: 8px; font-weight: bold; color: white; text-shadow: 0 1px 2px rgba(0,0,0,0.8); bottom: -18px;">${data.currentLevel}</div>
                  </div>
                `;

                const customOverlay = new window.kakao.maps.CustomOverlay({
                  position: new window.kakao.maps.LatLng(data.lat, data.lng),
                  content: markerContent,
                  yAnchor: 0.5,
                });
                customOverlay.setMap(map);

                markerContent.onclick = () => {
                  navigate("/crowd");
                };
              });
            } catch (err) {
              console.error(err);
              setMapError("지도 생성 중 오류가 발생했습니다: " + (err as Error).message);
            }
          }
        });
      };

      if (window.kakao && window.kakao.maps) {
        initLogic();
      } else {
        const scriptId = "kakao-map-sdk";
        const script = document.getElementById(scriptId);
        if (script) {
          script.addEventListener("load", initLogic);
          script.addEventListener("error", () => setMapError("SDK 스크립트 로드 실패"));
        } else {
          setMapError("SDK 스크립트 태그를 찾을 수 없습니다.");
        }
      }
    };

    initializeMap();
  }, [allLocations, navigate]);

  // 중복 함수들 제거 (crowdDataService 사용으로 대체)

  // 현재 시각을 "HH:mm:ss" 형식으로 반환 (초 단위 실시간)

  // 현재 날짜를 "YYYY년 MM월 DD일" 형식으로 반환



  // const stats = calculateAverageStats();

  // 1시간 단위 업데이트용 Top 5 혼잡 지역 데이터 (hourlyUpdateTime 기준)
  const hourlyTop5Data = useMemo(() => {
    return [...allLocations]
      .sort((a, b) => b.currentPopulation - a.currentPopulation)
      .slice(0, 5);
  }, [allLocations]);

  // 1시간 단위 업데이트 시간 표시 (HH:mm:ss 형식)
  const getHourlyUpdateTimeString = () => {
    const hours = String(hourlyUpdateTime.getHours()).padStart(2, '0');
    const minutes = String(hourlyUpdateTime.getMinutes()).padStart(2, '0');
    const seconds = String(hourlyUpdateTime.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  // 줌 컨트롤 핸들러
  const handleZoomIn = () => {
    if (mapRef.current) {
      mapRef.current.setLevel(mapRef.current.getLevel() - 1);
    }
  };

  const handleZoomOut = () => {
    if (mapRef.current) {
      mapRef.current.setLevel(mapRef.current.getLevel() + 1);
    }
  };

  return (
    <section className="w-full bg-transparent py-20 md:py-32 lg:py-40 4xl:py-52 5xl:py-64 px-4 5xl:px-12 flex items-center justify-center transition-colors duration-500">
      <div className="w-full max-w-[1400px] mx-auto">
        {/* 제목 및 설명 */}
        <div className="flex flex-col items-center text-center mb-16 gap-5 4xl:gap-10 5xl:gap-16">
          <h2 className="text-3xl xs:text-4xl md:text-5xl lg:text-6xl 3xl:text-7xl 4xl:text-8xl 5xl:text-9xl font-black text-slate-900 dark:text-white">
            실시간 혼잡도 모니터링
          </h2>
          <p className="text-base xs:text-lg md:text-xl 3xl:text-2xl 4xl:text-3xl 5xl:text-4xl text-slate-800 dark:text-slate-200 max-w-3xl 3xl:max-w-4xl 4xl:max-w-6xl 5xl:max-w-7xl text-center font-medium">
            전국 주요 지역의 인구 밀집도를 확인하고<br />
            최적의 방문 시간을 계획하세요
          </p>
        </div>

        {/* 전국 혼잡도 현황 - 실시간 지도 + 분포도 그래프 */}
        <div className="mb-16 4xl:mb-32 5xl:mb-40 bg-white/80 dark:bg-white/5 backdrop-blur-md rounded-2xl shadow-2xl border-2 border-indigo-200 dark:border-indigo-900 p-8 md:p-12 4xl:p-16 5xl:p-24">
          <div className="flex flex-col items-center justify-center text-center w-full mb-16 4xl:mb-24 5xl:mb-32">
            <h3 className="text-xl xs:text-2xl md:text-3xl lg:text-4xl 3xl:text-5xl 4xl:text-6xl 5xl:text-7xl font-black text-slate-900 dark:text-white">전국 혼잡도 현황</h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 4xl:gap-20 5xl:gap-32">
            {/* 좌측: 실시간 지도 */}
            <div className="w-full">
              <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 border-2 border-indigo-200 dark:border-indigo-800 relative group">
                <h4 className="text-lg font-bold mb-3 text-center text-slate-900 dark:text-white">실시간 혼잡도 지도</h4>
                <div className="relative">
                  <div
                    ref={mapContainerRef}
                    className="w-full h-[400px] rounded-lg shadow-lg"
                    style={{ border: "2px solid #e0e7ff" }}
                  />

                  {/* 진단 오버레이 */}
                  {(mapError || mapStatus !== "완료") && (
                    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-gray-50/90 dark:bg-slate-900/90 backdrop-blur-sm p-6 text-center rounded-lg">
                      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                      <h3 className="text-xl font-bold mb-2">지도 진단 중...</h3>
                      <p className="text-base text-gray-700 dark:text-gray-300 mb-2">상태: <span className="font-mono text-blue-600 dark:text-blue-400">{mapStatus}</span></p>
                      {mapError && (
                        <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                          <p className="text-sm font-bold text-red-600 dark:text-red-400 mb-1">오류 발생</p>
                          <p className="text-sm text-red-500 dark:text-red-300">{mapError}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Custom Zoom Controls (Inside Map Wrapper) */}
                  <div className="absolute bottom-4 left-4 z-20 flex flex-col gap-2">
                    <button
                      onClick={handleZoomIn}
                      className="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-50 transition-all hover:scale-110 active:scale-95 z-30 !p-0 overflow-hidden"
                      title="확대"
                    >
                      <img src={`${import.meta.env.BASE_URL}image/zoom-in.png`} alt="확대" className="w-full h-full object-contain p-2" />
                    </button>
                    <button
                      onClick={handleZoomOut}
                      className="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-50 transition-all hover:scale-110 active:scale-95 z-30 !p-0 overflow-hidden"
                      title="축소"
                    >
                      <img src={`${import.meta.env.BASE_URL}image/zoom-out.png`} alt="축소" className="w-full h-full object-contain p-2" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-gray-600 text-center mt-3">
                  * 지도를 드래그하여 각 지역의 혼잡도를 확인하세요
                </p>
              </div>
            </div>

            {/* 우측: 분포도 그래프 */}
            <div className="w-full">
              <div className="bg-gradient-to-br from-purple-50/50 to-pink-50/50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-6 border-2 border-purple-200 dark:border-purple-800 h-full flex flex-col justify-center">
                <h4 className="text-xl font-black mb-6 text-center text-slate-900 dark:text-white">전국 혼잡 분포도</h4>

                {/* 혼잡도별 지역 개수 */}
                <div className="space-y-4">
                  {(() => {
                    const levelCounts = {
                      "매우혼잡": allLocations.filter(l => l.currentLevel === "매우혼잡").length,
                      "혼잡": allLocations.filter(l => l.currentLevel === "혼잡").length,
                      "보통": allLocations.filter(l => l.currentLevel === "보통").length,
                      "여유": allLocations.filter(l => l.currentLevel === "여유").length,
                    };

                    return Object.entries(levelCounts).map(([level, count]) => {
                      const color = getLevelColor(level);
                      const percentage = (count / allLocations.length) * 100;

                      return (
                        <div key={level}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-black text-slate-800 dark:text-slate-200">{level}</span>
                            <span className="text-sm font-black" style={{ color }}>{count}개 지역 ({percentage.toFixed(0)}%)</span>
                          </div>
                          <div className="relative h-4 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="absolute left-0 top-0 h-full rounded-full transition-all duration-1000 ease-out"
                              style={{
                                width: `${percentage}%`,
                                backgroundColor: color,
                                boxShadow: `0 0 10px ${color}88`
                              }}
                            />
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* [NEW] Top 5 혼잡 지역 Spotlight - 독립 섹션화 및 강조 */}
        <div className="mb-24 w-full">
          <div className="flex flex-col items-center mb-10 gap-2">
            <h3 className="text-2xl md:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white">🏆 실시간 혼잡 TOP 5</h3>
            <p className="text-slate-500 dark:text-slate-400 font-bold">인구 밀집도가 가장 높은 주요 요충지 분석</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {hourlyTop5Data.map((location, index) => {
              const color = getLevelColor(location.currentLevel);
              const isFirst = index === 0;
              const isSecond = index === 1;
              const isThird = index === 2;

              // 트렌드 아이콘 (임시 로직: 이름 길이와 시간 시 조합)
              const trendValue = (location.name.length + currentTime.getHours()) % 3;
              const TrendIcon = trendValue === 0 ? (
                <span className="text-red-500">▲</span>
              ) : trendValue === 1 ? (
                <span className="text-blue-500">▼</span>
              ) : (
                <span className="text-gray-400">-</span>
              );

              return (
                <div 
                  key={location.name} 
                  className={`
                    relative group p-6 rounded-3xl border-2 transition-all duration-500 hover:-translate-y-2
                    ${isFirst 
                      ? "bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30 border-orange-200 dark:border-orange-800/50 shadow-orange-100 dark:shadow-none" 
                      : "bg-white dark:bg-slate-900/50 border-slate-100 dark:border-slate-800 shadow-sm"}
                    hover:shadow-2xl hover:border-indigo-400 dark:hover:border-indigo-700
                  `}
                >
                  {/* 순위 마크 */}
                  <div className={`
                    absolute -top-4 -left-2 w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg transform -rotate-12 group-hover:rotate-0 transition-transform
                    ${isFirst ? "bg-gradient-to-br from-yellow-400 to-orange-500 text-white scale-110" : 
                      isSecond ? "bg-gradient-to-br from-slate-300 to-slate-400 text-white" :
                      isThird ? "bg-gradient-to-br from-orange-400 to-orange-600 text-white" :
                      "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"}
                  `}>
                    {index + 1}
                  </div>

                  <div className="mt-4 flex flex-col items-center">
                    <div className="flex items-center gap-2 mb-2">
                       <span className="text-lg font-black text-slate-900 dark:text-white truncate max-w-[120px]">{location.name}</span>
                       <span className="text-xs font-black">{TrendIcon}</span>
                    </div>

                    <div className="w-full flex flex-col items-center gap-3">
                       <div className="text-3xl font-black" style={{ color }}>
                         {location.currentPopulation.toLocaleString()}
                       </div>
                       <div className="text-[10px] font-black uppercase tracking-tighter text-slate-400 uppercase">Current Density</div>
                       <div className={`
                         px-4 py-1.5 rounded-full text-xs font-black w-full text-center
                         ${location.currentLevel === "매우혼잡" ? "bg-red-500 text-white" : 
                           location.currentLevel === "혼잡" ? "bg-orange-500 text-white" :
                           location.currentLevel === "보통" ? "bg-yellow-500 text-white" :
                           "bg-green-500 text-white"}
                        shadow-lg shadow-black/5`}>
                         {location.currentLevel}
                       </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-sm text-slate-500 dark:text-slate-400 text-center mt-10 font-bold opacity-70">
            * {getHourlyUpdateTimeString()} 기준 데이터입니다 (1시간 단위 자동 필터링)
          </p>
        </div>

        {/* 목적지 검색창 */}
        {/* Video Section */}
        {/* 목적지 검색창 */}
      </div>
    </section>
  );
}
