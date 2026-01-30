import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { 
  majorLocations, 
  generateLocationData, 
  getLevelColor, 
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

interface CongestionMonitoringProps {
  onBack: () => void;
}

export default function CongestionMonitoring({ onBack }: CongestionMonitoringProps) {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedLocation, setSelectedLocation] = useState<LocationCrowdData | null>(null);
  const [allLocations, setAllLocations] = useState<LocationCrowdData[]>([]);
  const [lastAnalysisTime, setLastAnalysisTime] = useState<string>("");
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapStatus, setMapStatus] = useState<string>("준비 중...");

  // 스크롤 잠금 해제 지원
  useEffect(() => {
    document.body.style.overflow = "auto";
    window.scrollTo(0, 0);
  }, []);

  // 초기 데이터 로드 및 정시 업데이트 로직
  useEffect(() => {
    const updateAllData = () => {
      const now = new Date();
      const initializedLocations = majorLocations.map(loc => 
        generateLocationData(loc.name, loc.lat, loc.lng)
      );
      setAllLocations(initializedLocations);
      setCurrentTime(now);
      setLastAnalysisTime(`${now.getHours().toString().padStart(2, '0')}:00`);
      
      // 선택된 지역이 있다면 데이터 동기화
      if (selectedLocation) {
        const updatedSelected = initializedLocations.find(l => l.name === selectedLocation.name);
        if (updatedSelected) setSelectedLocation(updatedSelected);
      }
    };

    updateAllData();

    // 1분(60000ms)마다 체크하여 정시(0분)가 되면 업데이트
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      
      // 분이 0이면(매 정시) 데이터 새로고침
      if (now.getMinutes() === 0) {
        updateAllData();
      }
    }, 60000);

    return () => clearInterval(timer);
  }, [selectedLocation?.name]);

  // 지도 초기화
  useEffect(() => {
    const initializeMap = () => {
      const initLogic = () => {
        if (!window.kakao || !window.kakao.maps) return;

        window.kakao.maps.load(() => {
          if (mapContainerRef.current && !mapRef.current) {
            try {
              setMapStatus("지도 초기화 중...");
              const center = new window.kakao.maps.LatLng(36.5, 127.5);
              const options = {
                center: center,
                level: 13,
              };
              const map = new window.kakao.maps.Map(mapContainerRef.current, options);
              mapRef.current = map;

              // 회색 화면 방지를 위한 레이아웃 갱신
              setTimeout(() => {
                map.relayout();
                map.setCenter(center);
                setMapStatus("완료");
              }, 500);

              // 줌 컨트롤 비활성화 (마우스 휠 확대/축소 금지)
              map.setZoomable(false);

              // 모든 지역에 혼잡도 마커 표시
              majorLocations.forEach((loc) => {
                const data = generateLocationData(loc.name, loc.lat, loc.lng);
                const color = getLevelColor(data.currentLevel);
                const radius = data.currentLevel === "매우혼잡" ? 45 :
                  data.currentLevel === "혼잡" ? 38 :
                    data.currentLevel === "보통" ? 32 : 28;

                const markerContent = document.createElement('div');
                markerContent.style.cssText = `position: relative; width: ${radius}px; height: ${radius}px; cursor: pointer;`;
                markerContent.innerHTML = `
                <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;">
                  <div style="width: 100%; height: 100%; border-radius: 50%; background: ${color}; border: 3px solid white; box-shadow: 0 0 15px ${color}, 0 4px 10px rgba(0,0,0,0.3);"></div>
                  <div style="position: absolute; font-size: 10px; font-weight: bold; color: white; text-shadow: 0 1px 3px rgba(0,0,0,0.8);">${loc.name}</div>
                </div>
              `;

                markerContent.onclick = () => {
                  const detailData = generateLocationData(loc.name, loc.lat, loc.lng);
                  setSelectedLocation(detailData);
                  map.setCenter(new window.kakao.maps.LatLng(loc.lat, loc.lng));
                  map.setLevel(8);
                };

                const customOverlay = new window.kakao.maps.CustomOverlay({
                  position: new window.kakao.maps.LatLng(loc.lat, loc.lng),
                  content: markerContent,
                  yAnchor: 0.5,
                });
                customOverlay.setMap(map);
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
        const script = document.getElementById("kakao-map-sdk");
        if (script) {
          script.addEventListener("load", initLogic);
          script.addEventListener("error", () => setMapError("SDK 스크립트 로드 실패"));
        } else {
          setMapError("SDK 스크립트 태그를 찾을 수 없습니다.");
        }
      }
    };

    const scriptId = "kakao-map-sdk";
    const appKey = "7eb77dd1772e545a47f6066b2de87d8f";

    if (window.kakao && window.kakao.maps) {
      initializeMap();
    } else {
      const existingScript = document.getElementById(scriptId);
      if (!existingScript) {
        const script = document.createElement("script");
        script.id = scriptId;
        script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false&libraries=services`;
        script.async = true;
        script.onload = initializeMap;
        document.head.appendChild(script);
      } else {
        existingScript.addEventListener("load", initializeMap);
      }
    }
  }, [currentTime]);

  // 전국 통계 (allLocations 상태 사용)
  const totalPopulation = allLocations.reduce((sum: number, loc: LocationCrowdData) => sum + loc.currentPopulation, 0);
  const avgPopulation = allLocations.length > 0 ? Math.floor(totalPopulation / allLocations.length) : 0;

  const levelCounts = {
    "매우혼잡": allLocations.filter((l: LocationCrowdData) => l.currentLevel === "매우혼잡").length,
    "혼잡": allLocations.filter((l: LocationCrowdData) => l.currentLevel === "혼잡").length,
    "보통": allLocations.filter((l: LocationCrowdData) => l.currentLevel === "보통").length,
    "여유": allLocations.filter((l: LocationCrowdData) => l.currentLevel === "여유").length,
  };

  // 최적 방문 시간 추천
  const getOptimalTime = (location: LocationCrowdData) => {
    const sortedByPopulation = [...location.hourlyData].sort((a: HourlyData, b: HourlyData) => a.population - b.population);
    const top3 = sortedByPopulation.slice(0, 3);
    return top3;
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
    <div className="flex flex-col items-center justify-start w-full min-h-screen bg-transparent transition-colors duration-500 p-4 sm:p-6 md:p-8">
      {/* 헤더 */}
      <div className="w-full max-w-[1400px] mb-8">
        <div className="text-center mb-6">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-900 dark:text-white mb-4">
            📊 혼잡도 모니터링
          </h1>
          <p className="text-lg sm:text-xl text-slate-800 dark:text-slate-200 leading-relaxed max-w-3xl mx-auto font-black flex items-center justify-center gap-2">
            전국 주요 지역의 실시간 혼잡도를 측정합니다
            <span className="inline-flex items-center px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm rounded-full animate-pulse border border-green-200 dark:border-green-800/50">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              실시간 측정 중
            </span>
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 font-bold">
            최종 분석 시각: {lastAnalysisTime} (1시간 주기 업데이트)
          </p>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="w-full max-w-[1400px] mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-blue-700 text-white p-6 rounded-2xl shadow-xl">
            <p className="text-sm font-black mb-2 opacity-90">모니터링 지역</p>
            <p className="text-4xl font-black">{majorLocations.length}곳</p>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-700 text-white p-6 rounded-2xl shadow-xl">
            <p className="text-sm font-black mb-2 opacity-90">전국 평균 인구</p>
            <p className="text-4xl font-black">{avgPopulation.toLocaleString()}</p>
          </div>
          <div className="bg-gradient-to-br from-red-500 to-red-700 text-white p-6 rounded-2xl shadow-xl">
            <p className="text-sm font-black mb-2 opacity-90">혼잡 지역</p>
            <p className="text-4xl font-black">{levelCounts["매우혼잡"] + levelCounts["혼잡"]}곳</p>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-purple-700 text-white p-6 rounded-2xl shadow-xl">
            <p className="text-sm font-black mb-2 opacity-90">여유 지역</p>
            <p className="text-4xl font-black">{levelCounts["여유"]}곳</p>
          </div>
        </div>
      </div>

      {/* 지도 + 선택된 지역 정보 */}
      <div className="w-full max-w-[1400px] mb-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 지도 */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border-2 border-indigo-200 dark:border-indigo-900/30 p-6 relative group">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-4">실시간 혼잡도 지도</h3>
            <div className="relative">
              <div
                ref={mapContainerRef}
                className="w-full h-[400px] rounded-lg shadow-lg"
                style={{ border: "2px solid #e0e7ff" }}
              />

              {/* 진단 오버레이 */}
              {(mapError || mapStatus !== "완료") && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-gray-50/90 backdrop-blur-sm p-6 text-center rounded-lg">
                  <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                  <h3 className="text-sm font-bold text-gray-900 mb-2">지도 진단 중...</h3>
                  <p className="text-[11px] text-gray-600 mb-1">상태: <span className="font-mono text-indigo-600">{mapStatus}</span></p>
                  {mapError && (
                    <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-xs font-bold text-red-600 mb-1">오류 발생</p>
                      <p className="text-xs text-red-500">{mapError}</p>
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

            <p className="text-xs text-gray-600 mt-3">
              * 지역을 클릭하면 상세 정보를 확인할 수 있습니다
            </p>
          </div>

          {/* 선택된 지역 상세 정보 */}
          <div className="bg-white rounded-2xl shadow-2xl border-2 border-purple-200 p-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              {selectedLocation ? `${selectedLocation.name} 상세 정보` : "지역을 선택하세요"}
            </h3>
            {selectedLocation ? (
              <div className="space-y-4">
                {/* 현재 혼잡도 */}
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-slate-800 dark:to-indigo-900/20 p-6 rounded-xl border-2 border-indigo-200 dark:border-indigo-800/30">
                  <p className="text-sm font-black text-slate-800 dark:text-slate-200 mb-2 text-center">현재 혼잡도</p>
                  <p className="text-5xl font-black text-center mb-2" style={{ color: getLevelColor(selectedLocation.currentLevel) }}>
                    {selectedLocation.currentPopulation.toLocaleString()}
                  </p>
                  <p className="text-sm text-slate-800 dark:text-slate-200 text-center mb-3 font-bold">예상 방문객 수 (명)</p>
                  <div className="text-center">
                    <span className={`inline-block px-6 py-2 rounded-full text-lg font-black ${selectedLocation.currentLevel === "매우혼잡" ? "bg-red-100 text-red-700" :
                      selectedLocation.currentLevel === "혼잡" ? "bg-orange-100 text-orange-700" :
                        selectedLocation.currentLevel === "보통" ? "bg-yellow-100 text-yellow-700" :
                          "bg-green-100 text-green-700"
                      }`}>
                      {selectedLocation.currentLevel}
                    </span>
                  </div>
                </div>

                {/* 24시간 혼잡도 그래프 */}
                <div>
                  <p className="text-sm font-black text-slate-900 dark:text-white mb-3">24시간 혼잡도 추이</p>
                  <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-xl">
                    <div className="flex items-end justify-between gap-1 h-32">
                      {selectedLocation.hourlyData.map((data: HourlyData) => {
                        const maxPop = Math.max(...selectedLocation.hourlyData.map((d: HourlyData) => d.population));
                        const height = (data.population / maxPop) * 100;
                        const color = getLevelColor(data.level);
                        const isCurrentHour = data.hour === currentTime.getHours();

                        return (
                          <div key={data.hour} className="flex-1 flex flex-col items-center gap-1">
                            <div
                              className="w-full rounded-t"
                              style={{
                                height: `${height}%`,
                                backgroundColor: color,
                                opacity: isCurrentHour ? 1 : 0.6,
                              }}
                            />
                            {data.hour % 3 === 0 && (
                              <span className="text-xs text-slate-800 dark:text-slate-200 font-bold">{data.hour}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 최적 방문 시간 */}
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border-2 border-green-200 dark:border-green-800/30">
                  <p className="text-sm font-black text-slate-900 dark:text-white mb-3">추천 방문 시간 (여유로운 시간대)</p>
                  <div className="flex gap-2 justify-center">
                    {getOptimalTime(selectedLocation).map((time) => (
                      <div key={time.hour} className="bg-white dark:bg-slate-800 px-4 py-2 rounded-lg border border-green-300 dark:border-green-700/50">
                        <p className="text-2xl font-black text-green-600 dark:text-green-400">{time.hour}시</p>
                        <p className="text-xs text-slate-800 dark:text-slate-200 font-bold">{time.level}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[400px] text-slate-800 dark:text-white font-black">
                <p className="text-center">
                  지도에서 지역을 선택하면<br />
                  상세한 혼잡도 정보를 확인할 수 있습니다
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 전체 지역 혼잡도 순위 */}
      <div className="w-full max-w-[1400px] mb-8">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border-2 border-pink-200 dark:border-pink-900/30 p-6">
          <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-6 text-center">지역별 혼잡도 순위</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {allLocations
              .sort((a: LocationCrowdData, b: LocationCrowdData) => b.currentPopulation - a.currentPopulation)
              .map((location: LocationCrowdData, index: number) => {
                const color = getLevelColor(location.currentLevel);
                return (
                  <div
                    key={location.name}
                    className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-800 dark:to-slate-900 p-4 rounded-xl border-2 hover:shadow-lg transition-all cursor-pointer"
                    style={{ borderColor: color }}
                    onClick={() => setSelectedLocation(location)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xl font-black text-slate-800 dark:text-slate-200 opacity-50">#{index + 1}</span>
                      <span className="text-xs font-black px-2 py-1 rounded" style={{ backgroundColor: color + "22", color }}>
                        {location.currentLevel}
                      </span>
                    </div>
                    <p className="text-lg font-black text-slate-900 dark:text-white mb-1">{location.name}</p>
                    <p className="text-2xl font-black" style={{ color }}>
                      {location.currentPopulation.toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-800 dark:text-slate-200 font-bold">명</p>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* 하단 버튼 */}
      <div className="w-full max-w-[1400px] mb-8">
        <button
          onClick={() => {
            onBack();
            navigate("/#section-guide");
          }}
          className="bg-gradient-to-r from-blue-600 to-green-600 text-white px-10 py-3 rounded-full font-bold text-lg hover:from-blue-700 hover:to-green-700 transition-all shadow-xl hover:shadow-2xl hover:scale-105"
        >
          홈으로 돌아가기
        </button>
      </div>
    </div>
  );
}
