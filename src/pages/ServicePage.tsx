import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import { getNationalSmokingBooths } from "../services/smokingBoothService";
import { findPath, calculatePathDistance } from "../utils/pathfinding";
import { getEnvironmentData } from "../services/weatherService";
import type { SmokingBooth } from "../services/smokingBoothService";
import { calculateDistance } from "../utils/pathfinding";
import type { Point } from "../utils/pathfinding";
import type { WeatherData } from "../services/weatherService";
import ThemeToggle from "../components/ThemeToggle";

declare global {
  interface Window {
    kakao: any;
  }
}



/**
 * Merge 스크롤 애니메이션 래퍼 컴포넌트
 */
function MergeAnimation({
  children,
  direction = "left",
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  direction?: "left" | "right";
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  const initialX = direction === "left" ? -100 : 100;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: initialX }}
      animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: initialX }}
      transition={{
        duration: 0.8,
        delay: delay,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default function ServicePage() {
  const navigate = useNavigate();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  const [startKeyword, setStartKeyword] = useState("");
  const [destKeyword, setDestKeyword] = useState("");


  const [nationalBooths] = useState<SmokingBooth[]>(getNationalSmokingBooths());
  const markersRef = useRef<any[]>([]);
  const pathOverlayRef = useRef<any>(null);

  const [environmentData, setEnvironmentData] = useState<WeatherData | null>(null);
  const [routeDistance, setRouteDistance] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [nearbyInfo, setNearbyInfo] = useState<{ within500m: number; within1km: number; within2km: number } | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapStatus, setMapStatus] = useState<string>("준비 중...");

  // 스크롤 잠금 해제 & 최상단 이동
  useEffect(() => {
    document.body.style.overflow = "auto";
    window.scrollTo(0, 0);
  }, []);

  /**
   * 실시간 시간 업데이트
   */
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  /**
   * 환경 데이터 로드
   */
  useEffect(() => {
    const loadEnvironmentData = async () => {
      try {
        const data = await getEnvironmentData();
        setEnvironmentData(data);
      } catch (error) {
        console.error("환경 데이터 로드 실패:", error);
      }
    };

    loadEnvironmentData();
    // 1시간마다 환경 데이터 갱신 (수정: 5분 -> 1시간)
    const interval = setInterval(loadEnvironmentData, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  /**
   * 전국 흡연부스 마커 렌더링
   */
  const renderSmokingBooths = useCallback((map: any) => {
    // 기존 마커 제거
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    // 커스텀 마커 이미지 (투명 원형 처리)
    const markerImage = new window.kakao.maps.MarkerImage(
      `${import.meta.env.BASE_URL}image/smoke_icon.png`,
      new window.kakao.maps.Size(32, 32),
      {
        offset: new window.kakao.maps.Point(16, 16),
      }
    );

    // 전국 흡연부스 마커 생성
    nationalBooths.forEach((booth) => {
      const marker = new window.kakao.maps.Marker({
        position: new window.kakao.maps.LatLng(booth.latitude, booth.longitude),
        image: markerImage,
        map: map,
        title: booth.name,
      });

      markersRef.current.push(marker);
    });
  }, [nationalBooths]);

  /**
   * 경로 그리기 (초록색 입체감)
   */
  const drawPath = (map: any, path: Point[]) => {
    // 기존 경로 제거
    if (pathOverlayRef.current) {
      pathOverlayRef.current.setMap(null);
    }

    // Kakao Maps LatLng 배열로 변환
    const linePath = path.map(
      (p) => new window.kakao.maps.LatLng(p.lat, p.lng)
    );

    // 입체감 있는 초록색 라인
    const polyline = new window.kakao.maps.Polyline({
      path: linePath,
      strokeWeight: 8, // 두께
      strokeColor: "#10B981", // 초록색
      strokeOpacity: 0.9,
      strokeStyle: "solid",
    });

    polyline.setMap(map);
    pathOverlayRef.current = polyline;

    // 경로 거리 계산
    const distance = calculatePathDistance(path);
    setRouteDistance(distance);
  };

  /**
   * 지도 초기화
   */
  useEffect(() => {
    const startApp = () => {
      const initLogic = () => {
        if (!window.kakao || !window.kakao.maps) return;

        const handleInit = (lat: number, lng: number) => {
          setUserLocation({ lat, lng });

          window.kakao.maps.load(() => {
            if (mapContainerRef.current && !mapRef.current) {
              try {
                setMapStatus("지도 초기화 중...");
                const options = {
                  center: new window.kakao.maps.LatLng(lat, lng),
                  level: 8,
                  zoomable: false, // 마우스 휠 확대/축소 금지
                };
                const map = new window.kakao.maps.Map(
                  mapContainerRef.current,
                  options
                );
                mapRef.current = map;

                // 회색 화면 방지를 위한 레이아웃 갱신
                setTimeout(() => {
                  map.relayout();
                  map.setCenter(new window.kakao.maps.LatLng(lat, lng));
                  setMapStatus("완료");
                }, 500);

                // 사용자 위치 마커
                const userMarkerImage = new window.kakao.maps.MarkerImage(
                  `${import.meta.env.BASE_URL}image/user-marker.svg`,
                  new window.kakao.maps.Size(40, 40)
                );

                new window.kakao.maps.Marker({
                  position: new window.kakao.maps.LatLng(lat, lng),
                  map: map,
                  image: userMarkerImage,
                  title: "내 위치",
                });

                // 전국 흡연부스 마커 렌더링
                renderSmokingBooths(map);
              } catch (err) {
                console.error(err);
                setMapError("지도 생성 중 오류가 발생했습니다: " + (err as Error).message);
              }
            }
          });
        };

        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => handleInit(pos.coords.latitude, pos.coords.longitude),
            () => handleInit(37.5665, 126.978)
          );
        } else {
          handleInit(37.5665, 126.978);
        }
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
      startApp();
    } else {
      const existingScript = document.getElementById(scriptId);
      if (!existingScript) {
        const script = document.createElement("script");
        script.id = scriptId;
        script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false&libraries=services`;
        script.async = true;
        script.onload = startApp;
        document.head.appendChild(script);
      } else {
        existingScript.addEventListener("load", startApp);
      }
    }
  }, [nationalBooths, renderSmokingBooths]);

  /**
   * 장소 검색 및 경로 탐색 (실시간 현재 위치 기준)
   */
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();

    if (!destKeyword.trim() || !mapRef.current) {
      alert("목적지를 입력해주세요.");
      return;
    }

    const ps = new window.kakao.maps.services.Places();

    // 출발지: 사용자가 입력했으면 검색, 아니면 현재 위치 사용
    const processRoute = (start: Point) => {

      // 목적지 검색 (전국 단위 지원)
      ps.keywordSearch(destKeyword, (destData: any, destStatus: any) => {
        if (destStatus === window.kakao.maps.services.Status.OK) {
          const dest: Point = {
            lat: parseFloat(destData[0].y),
            lng: parseFloat(destData[0].x),
          };

          // 흡연부스 위치를 Point 배열로 변환
          const obstacles: Point[] = nationalBooths.map((booth) => ({
            lat: booth.latitude,
            lng: booth.longitude,
          }));

          // A* 알고리즘 경로 탐색 (흡연부스 회피)
          const path = findPath(start, dest, obstacles);

          // 경로 그리기
          drawPath(mapRef.current, path);

          // 지도 중심 이동
          const bounds = new window.kakao.maps.LatLngBounds();
          path.forEach((p) => {
            bounds.extend(new window.kakao.maps.LatLng(p.lat, p.lng));
          });
          mapRef.current.setBounds(bounds);

          // 목적지 주변 흡연부스 수량 계산
          let w500 = 0, w1k = 0, w2k = 0;
          nationalBooths.forEach(booth => {
            const dist = calculateDistance(dest, { lat: booth.latitude, lng: booth.longitude });
            if (dist <= 500) w500++;
            if (dist <= 1000) w1k++;
            if (dist <= 2000) w2k++;
          });
          setNearbyInfo({ within500m: w500, within1km: w1k, within2km: w2k });
        } else {
          alert("목적지 검색 결과가 없습니다.");
        }
      });
    };

    if (startKeyword.trim()) {
      // 출발지 검색
      ps.keywordSearch(startKeyword, (startData: any, startStatus: any) => {
        if (startStatus === window.kakao.maps.services.Status.OK) {
          const start: Point = {
            lat: parseFloat(startData[0].y),
            lng: parseFloat(startData[0].x),
          };
          processRoute(start);
        } else {
          alert("출발지 검색 결과가 없습니다.");
        }
      });
    } else if (userLocation) {
      // 현재 위치 사용
      processRoute(userLocation);
    } else {
      alert("출발지를 입력하거나 위치 권한을 허용해주세요.");
    }
  };

  /**
   * 현재 위치로 출발지 설정
   */
  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setStartKeyword("현재 위치");
        },
        () => {
          alert("위치 정보를 가져올 수 없습니다.");
        }
      );
    }
  };

  /**
   * 줌 컨트롤 핸들러
   */
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
    <div className="flex flex-col w-full max-w-[1920px] mx-auto h-screen min-h-screen bg-gradient-to-br from-blue-50 to-green-50 dark:from-slate-900 dark:to-slate-800 overflow-x-hidden overflow-y-auto transition-colors duration-300">
      {/* ========== 섹션 1: 헤더 및 검색 영역 ========== */}
      <section className="w-full px-4 py-6 md:px-8 lg:px-16">
        <div className="w-full max-w-[1400px] mx-auto">
          {/* 상단 헤더 */}
          <MergeAnimation direction="left" className="mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div 
                  className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center overflow-hidden group cursor-pointer transition-all hover:scale-110 active:scale-95"
                  onClick={() => navigate("/")}
                  title="홈으로 이동"
                >
                  <img src={`${import.meta.env.BASE_URL}image/flowLogo.svg`} alt="Flow Logo" className="w-10 h-10 object-contain rounded-full scale-[1.1]" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 dark:text-white">
                    흡연부스 회피 네비게이션
                  </h1>
                  <p className="text-sm sm:text-base text-slate-800 dark:text-slate-200 mt-2 font-black">
                    A* 알고리즘 기반 지능형 경로 탐색 시스템
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <ThemeToggle />
                <button
                  onClick={() => navigate("/#section-guide")}
                  className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-full shadow-lg transition-all text-sm sm:text-base"
                >
                  홈으로
                </button>
              </div>
            </div>
          </MergeAnimation>

          {/* 실시간 정보 카드 */}
          <MergeAnimation direction="right" delay={0.1} className="mb-6">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-4 sm:p-6 transition-colors duration-300">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
                <div className="text-center sm:text-left">
                  <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 font-black">실시간 정보</p>
                  <p className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                    {currentTime.toLocaleDateString("ko-KR", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      weekday: "long",
                    })}
                  </p>
                  <p className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400">
                    {currentTime.toLocaleTimeString("ko-KR")}
                  </p>
                </div>
                {environmentData && (
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 mb-1 font-black">미세먼지</p>
                      <p className="text-lg sm:text-2xl font-black text-blue-600 dark:text-blue-400">
                        {environmentData.airQuality.value}
                      </p>
                      <p className="text-xs text-slate-700 dark:text-slate-300 font-bold">
                        {environmentData.airQuality.level}
                      </p>
                    </div>
                    <div className="border-x border-gray-200 dark:border-gray-700 px-4">
                      <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 mb-1 font-black">날씨</p>
                      <p className="text-lg sm:text-2xl font-black text-green-600 dark:text-green-400">
                        {environmentData.weather.condition}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 mb-1 font-black">기온</p>
                      <p className="text-lg sm:text-2xl font-black text-orange-600 dark:text-orange-400">
                        {environmentData.weather.temp}°C
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </MergeAnimation>

          {/* 검색 폼 */}
          <MergeAnimation direction="left" delay={0.2} className="mb-6">
            <form
              onSubmit={handleSearch}
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-4 sm:p-6 transition-colors duration-300"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="출발지 (비워두면 현재 위치)"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-slate-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base placeholder-gray-400 dark:placeholder-gray-500"
                    value={startKeyword}
                    onChange={(e) => setStartKeyword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                  >
                    현재 위치
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="목적지 (전국 어디든 검색 가능)"
                  className="px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-slate-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm sm:text-base placeholder-gray-400 dark:placeholder-gray-500"
                  value={destKeyword}
                  onChange={(e) => setDestKeyword(e.target.value)}
                />
                <button
                  type="submit"
                  className="lg:col-span-2 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition-all text-sm sm:text-base"
                >
                  흡연부스 회피 경로 탐색
                </button>
              </div>
            </form>
          </MergeAnimation>

          {/* 경로 정보 */}
          {routeDistance && (
            <MergeAnimation direction="right" delay={0.3}>
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-4 sm:p-6 transition-colors duration-300">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-center sm:text-left">
                    <p className="text-sm text-gray-700 dark:text-gray-300">예상 거리</p>
                    <p className="text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-400">
                      {(routeDistance / 1000).toFixed(2)} km
                    </p>
                  </div>
                  <div className="text-center sm:text-right">
                    <p className="text-sm text-gray-700 dark:text-gray-300">흡연부스 회피 경로</p>
                    <p className="text-lg sm:text-xl font-semibold text-gray-700 dark:text-gray-300">
                      최적 경로 적용됨
                    </p>
                  </div>
                </div>
              </div>
            </MergeAnimation>
          )}
        </div>
      </section>

      {/* ========== 섹션 2: 지도 영역 ========== */}
      <section className="flex-1 w-full px-4 pb-6 md:px-8 lg:px-16 min-h-[400px] md:min-h-[500px]">
        <div className="w-full max-w-[1400px] mx-auto h-full">
          <MergeAnimation direction="left" delay={0.4} className="h-full">
            <div className="relative shadow-2xl border border-gray-200 dark:border-slate-700 rounded-2xl overflow-hidden h-full">
              <div ref={mapContainerRef} className="w-full h-full min-h-[400px] md:min-h-[500px]" />

              {/* 진단 오버레이 */}
              {(mapError || mapStatus !== "완료") && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-gray-50/90 backdrop-blur-sm p-6 text-center">
                  <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                  <h3 className="text-sm font-bold text-gray-900 mb-2">지도 진단 중...</h3>
                  <p className="text-[11px] text-gray-700 mb-1">상태: <span className="font-mono text-blue-600">{mapStatus}</span></p>
                  {mapError && (
                    <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-xs font-bold text-red-600 mb-1">오류 발생</p>
                      <p className="text-xs text-red-500">{mapError}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Custom Zoom Controls (Bottom Left) */}
              <div className="absolute bottom-4 left-4 z-20 flex flex-col gap-2">
                <button
                  onClick={handleZoomIn}
                  className="relative w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-50 transition-all hover:scale-110 active:scale-95 z-30 !p-0 overflow-hidden"
                  title="확대"
                >
                  <img src={`${import.meta.env.BASE_URL}image/zoom-in.png`} alt="확대" className="w-full h-full object-contain p-2" />
                </button>
                <button
                  onClick={handleZoomOut}
                  className="relative w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-50 transition-all hover:scale-110 active:scale-95 z-30 !p-0 overflow-hidden"
                  title="축소"
                >
                  <img src={`${import.meta.env.BASE_URL}image/zoom-out.png`} alt="축소" className="w-full h-full object-contain p-2" />
                </button>
              </div>

              {/* 거리별 흡연구역 수량 박스 (상시 또는 검색 결과) */}
              <div className="absolute top-4 left-4 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-4 rounded-2xl shadow-xl border-2 border-red-100 dark:border-red-900/30 min-w-[180px]">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">📊</span>
                  <h4 className="text-sm font-bold text-gray-900">흡연구역 통계</h4>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
                    <span className="text-[10px] font-bold text-red-700">반경 500m</span>
                    <span className="text-sm font-black text-red-900">{nearbyInfo ? nearbyInfo.within500m : "-"}개</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-orange-50 rounded-lg">
                    <span className="text-[10px] font-bold text-orange-700">반경 1km</span>
                    <span className="text-sm font-black text-orange-900">{nearbyInfo ? nearbyInfo.within1km : "-"}개</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-slate-800 rounded-lg">
                    <span className="text-[10px] font-bold text-gray-700">전국 합계</span>
                    <span className="text-sm font-black text-gray-900">{nationalBooths.length}개</span>
                  </div>
                </div>
                <p className="text-[9px] text-gray-600 mt-2 text-center">
                  {nearbyInfo ? "목적지 주변 수량" : "전국 데이터 로드됨"}
                </p>
              </div>
            </div>
          </MergeAnimation>
        </div>
      </section>

      {/* ========== 섹션 3: 안내 및 정보 영역 ========== */}
      <section className="w-full px-4 py-8 md:px-8 lg:px-16 bg-white dark:bg-slate-950">
        <div className="w-full max-w-[1400px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <MergeAnimation direction="left" delay={0.5} className="h-full">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 rounded-2xl p-6 shadow-sm border border-transparent dark:border-blue-700 flex flex-col items-center text-center h-full justify-center">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mb-4 shadow-md">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">A* 알고리즘</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  최적의 경로를 찾는 인공지능 알고리즘으로 흡연부스를 자동으로 회피합니다.
                </p>
              </div>
            </MergeAnimation>

            <MergeAnimation direction="right" delay={0.6} className="h-full">
              <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900 dark:to-green-800 rounded-2xl p-6 shadow-sm border border-transparent dark:border-green-700 flex flex-col items-center text-center h-full justify-center">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mb-4 shadow-md">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">전국 단위 지원</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  서울부터 제주까지 전국 어디든 흡연부스 회피 경로를 제공합니다.
                </p>
              </div>
            </MergeAnimation>

            <MergeAnimation direction="left" delay={0.7} className="h-full">
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900 dark:to-orange-800 rounded-2xl p-6 shadow-sm border border-transparent dark:border-orange-700 flex flex-col items-center text-center h-full justify-center">
                <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center mb-4 shadow-md">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">실시간 업데이트</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  1시간마다 환경 정보가 갱신되어 항상 최신 정보를 제공합니다.
                </p>
              </div>
            </MergeAnimation>
          </div>

          <MergeAnimation direction="right" delay={0.8}>
            <div className="mt-8 text-center">
              <p className="text-sm sm:text-base text-slate-900 dark:text-slate-200 leading-relaxed mx-auto font-black">
                A* 알고리즘을 사용하여 전국 흡연부스를 회피하는 최적의 경로를
                제공합니다. 초록색 라인을 따라 쾌적한 경로로 이동하세요.
              </p>
            </div>
          </MergeAnimation>
        </div>
      </section>
    </div>
  );
}
