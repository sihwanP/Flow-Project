import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getNationalSmokingBooths } from "../services/smokingBoothService";
import type { SmokingBooth } from "../services/smokingBoothService";
import { MergeSection, MergeCardGrid, FadeInSection } from "../components/MergeScrollAnimation";
import { motion, AnimatePresence } from "framer-motion";
import ThemeToggle from "../components/ThemeToggle";

declare global {
  interface Window {
    kakao: any;
  }
}

export default function SmokingBoothDetailPage() {
  const navigate = useNavigate();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const userMarkerRef = useRef<any>(null);
  const searchMarkerRef = useRef<any>(null);

  // Haversine formula
  const getDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [nationalBooths] = useState<SmokingBooth[]>(getNationalSmokingBooths());
  const [selectedBooth, setSelectedBooth] = useState<(SmokingBooth & { distance: number }) | null>(null);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());
  // 스크롤 잠금 해제
  useEffect(() => {
    document.body.style.overflow = "auto";
  }, []);

  const [mapStatus, setMapStatus] = useState<string>("준비 중...");
  const [mapError, setMapError] = useState<string | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [searchLocation, setSearchLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [searchCity, setSearchCity] = useState<string | null>(null);

  // 1초마다 현재 시각 업데이트
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 사용자 위치 가져오기
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        () => {
          setTimeout(() => setUserLocation({ lat: 37.5665, lng: 126.978 }), 0);
        }
      );
    } else {
      setTimeout(() => setUserLocation({ lat: 37.5665, lng: 126.978 }), 0);
    }
  }, []);

  // 검색 위치 및 도시 기준 필터링된 가까운 흡연부스 계산
  const nearbyBooths = useMemo(() => {
    const baseLocation = searchLocation;
    // 검색 위치나 도시 정보가 없으면 빈 배열 반환 (전국구 자동 표시 방지)
    if (!baseLocation || !searchCity) return [];

    return nationalBooths
      .filter((booth) => booth.city === searchCity) // 특정 지역(도시)으로 엄격하게 필터링
      .map((booth) => ({
        ...booth,
        distance: getDistance(baseLocation.lat, baseLocation.lng, booth.latitude, booth.longitude),
      }))
      .sort((a, b) => a.distance - b.distance);
  }, [searchLocation, searchCity, nationalBooths]);

  // 지도 초기화
  useEffect(() => {
    if (!userLocation) return;

    const initializeMap = () => {
      const initLogic = () => {
        if (!window.kakao || !window.kakao.maps) {
          setMapError("카카오 맵 SDK를 찾을 수 없습니다.");
          return;
        }

        setMapStatus("SDK 로드 중...");
        window.kakao.maps.load(() => {
          if (mapContainerRef.current && !mapRef.current) {
            try {
              setMapStatus("지도 초기화 중...");
              const options = {
                center: new window.kakao.maps.LatLng(userLocation.lat, userLocation.lng),
                level: 5,
                zoomable: false, // 마우스 휠 확대/축소 금지
              };
              const map = new window.kakao.maps.Map(mapContainerRef.current, options);
              mapRef.current = map;

              // 회색 화면 방지를 위한 레이아웃 갱신
              setTimeout(() => {
                map.relayout();
                map.setCenter(new window.kakao.maps.LatLng(userLocation.lat, userLocation.lng));
                setMapStatus("완료");
              }, 500);

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
  }, [userLocation]);

  // 마커 업데이트 (사용자 위치, 검색 위치, 흡연부스)
  useEffect(() => {
    if (!mapRef.current || !window.kakao || !window.kakao.maps) return;

    const map = mapRef.current;

    // 1. 기존 마커들 제거
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];
    if (userMarkerRef.current) userMarkerRef.current.setMap(null);
    if (searchMarkerRef.current) searchMarkerRef.current.setMap(null);

    // 2. 사용자 위치 마커
    if (userLocation) {
      const userMarkerImage = new window.kakao.maps.MarkerImage(
        `${import.meta.env.BASE_URL}image/user-marker.svg`,
        new window.kakao.maps.Size(40, 40)
      );
      userMarkerRef.current = new window.kakao.maps.Marker({
        position: new window.kakao.maps.LatLng(userLocation.lat, userLocation.lng),
        map: map,
        image: userMarkerImage,
        title: "내 위치",
      });
    }

    // 3. 검색 위치 마커 (있을 경우)
    if (searchLocation) {
      searchMarkerRef.current = new window.kakao.maps.Marker({
        position: new window.kakao.maps.LatLng(searchLocation.lat, searchLocation.lng),
        map: map,
        title: "검색 위치",
      });
    }

    // 4. 흡연부스 마커 (nearbyBooths 기준 - 검색 시에만 데이터 있음)
    nearbyBooths.forEach((booth: SmokingBooth & { distance: number }) => {
      const markerContent = document.createElement('div');
      markerContent.style.cssText = 'position: relative; width: 36px; height: 36px; cursor: pointer;';
      markerContent.innerHTML = `
        <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;">
          <div class="smoke-marker-ripple"></div>
          <div class="smoke-marker-ripple"></div>
          <div class="smoke-marker-ripple"></div>
          <img src="${import.meta.env.BASE_URL}image/smoke_icon.png" alt="흡연부스" style="width: 32px; height: 32px; position: relative; z-index: 10; mix-blend-mode: multiply; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));" />
        </div>
      `;

      const customOverlay = new window.kakao.maps.CustomOverlay({
        position: new window.kakao.maps.LatLng(booth.latitude, booth.longitude),
        content: markerContent,
        yAnchor: 0.5,
      });
      customOverlay.setMap(map);
      markersRef.current.push(customOverlay);
    });

  }, [userLocation, searchLocation, nearbyBooths]);


  const formatDistance = (distance: number): string => {
    if (distance < 1000) {
      return `${Math.round(distance)}m`;
    }
    return `${(distance / 1000).toFixed(1)}km`;
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

  const getCurrentTimeString = () => {
    const year = currentTime.getFullYear();
    const month = String(currentTime.getMonth() + 1).padStart(2, '0');
    const day = String(currentTime.getDate()).padStart(2, '0');
    const hours = String(currentTime.getHours()).padStart(2, '0');
    const minutes = String(currentTime.getMinutes()).padStart(2, '0');
    const seconds = String(currentTime.getSeconds()).padStart(2, '0');
    return `${year}.${month}.${day} ${hours}:${minutes}:${seconds}`;
  };

  // 검색 처리
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchKeyword.trim() || !mapRef.current) return;

    const ps = new window.kakao.maps.services.Places();
    ps.keywordSearch(searchKeyword, (data: any[], status: string) => {
      if (status === window.kakao.maps.services.Status.OK) {
        const result = data[0];
        const lat = parseFloat(result.y);
        const lng = parseFloat(result.x);
        
        // 주소에서 도시 이름 추출 (예: "서울특별시" -> "서울", "인천광역시" -> "인천")
        // mock 데이터 형식(["서울", "부산", "인천" 등])에 맞춰 필터링
        const address = result.address_name || "";
        const cityMatch = address.match(/^(서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)/);
        const extractedCity = cityMatch ? cityMatch[1] : null;

        setSearchCity(extractedCity);
        setSearchLocation({ lat, lng });
        if (mapRef.current) {
          mapRef.current.setCenter(new window.kakao.maps.LatLng(lat, lng));
          mapRef.current.setLevel(5);
        }
      }
    });
  };

  // 통계 계산
  const stats = {
    within500m: nearbyBooths.filter(b => b.distance <= 500).length,
    within1km: nearbyBooths.filter(b => b.distance <= 1000).length,
    within2km: nearbyBooths.filter(b => b.distance <= 2000).length,
    total: searchCity 
      ? nationalBooths.filter(b => b.city === searchCity).length 
      : nationalBooths.length,
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 overflow-x-hidden transition-colors duration-500">
      {/* 헤더 */}
      <header className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-lg sticky top-0 z-50 border-b border-gray-100 dark:border-slate-800 transition-colors duration-300">
        <div className="w-full max-w-[1440px] mx-auto px-6 md:px-12 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate("/#section-location")}
                className="w-10 h-10 rounded-full flex items-center justify-center hover:opacity-80 transition-all active:scale-95 overflow-hidden group"
              >
                <img src={`${import.meta.env.BASE_URL}image/flowLogo.svg`} alt="Flow Logo" className="w-8 h-8 object-contain rounded-full scale-[1.1] group-hover:scale-[1.2] transition-transform" />
              </button>
              <div>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white">흡연부스 위치 안내</h1>
                <p className="text-sm text-slate-800 dark:text-slate-200 font-black">전국 흡연부스 위치 및 피해 경로 안내</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-4">
                <div className="bg-gradient-to-r from-green-100 to-emerald-100 px-4 py-2 rounded-full">
                  <span className="text-sm font-bold text-green-700">{getCurrentTimeString()}</span>
                </div>
              </div>
              <ThemeToggle className="bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-white" />
            </div>
          </div>
        </div>
      </header>

      <main className="w-full max-w-[1440px] mx-auto px-6 md:px-12 py-8">
        {/* 실시간 표시 (모바일) */}
        <FadeInSection className="md:hidden mb-6">
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-4 rounded-2xl text-center">
            <p className="text-sm opacity-90">실시간 기준</p>
            <p className="text-2xl font-black">{getCurrentTimeString()}</p>
          </div>
        </FadeInSection>

        {/* 통계 카드 - Merge 애니메이션 적용 */}
        <MergeCardGrid columns={4} className="mb-8">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 border-2 border-green-200 dark:border-green-900/30 transition-colors">
            <p className="text-sm text-slate-900 dark:text-slate-100 mb-1 font-black">반경 500m</p>
            <p className="text-4xl font-black text-green-600 dark:text-green-400">{stats.within500m}</p>
            <p className="text-xs text-slate-800 dark:text-slate-200 font-black">개의 흡연부스</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 border-2 border-emerald-200 dark:border-emerald-900/30 transition-colors">
            <p className="text-sm text-slate-900 dark:text-slate-100 mb-1 font-black">반경 1km</p>
            <p className="text-4xl font-black text-emerald-600 dark:text-emerald-400">{stats.within1km}</p>
            <p className="text-xs text-slate-800 dark:text-slate-200 font-black">개의 흡연부스</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 border-2 border-teal-200 dark:border-teal-900/30 transition-colors">
            <p className="text-sm text-slate-900 dark:text-slate-100 mb-1 font-black">반경 2km</p>
            <p className="text-4xl font-black text-teal-600 dark:text-teal-400">{stats.within2km}</p>
            <p className="text-xs text-slate-800 dark:text-slate-200 font-black">개의 흡연부스</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 border-2 border-blue-200 dark:border-blue-900/30 transition-colors">
            <p className="text-sm text-slate-900 dark:text-slate-100 mb-1 font-black">전국 총</p>
            <p className="text-4xl font-black text-blue-600 dark:text-blue-400">{stats.total}</p>
            <p className="text-xs text-slate-800 dark:text-slate-200 font-black">개의 흡연부스</p>
          </div>
        </MergeCardGrid>

        {/* 검색바 */}
        <div className="mb-8">
          <form onSubmit={handleSearch} className="flex gap-3">
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="목적지를 검색하세요 (예: 강남역, 서울역)"
              className="flex-1 px-6 py-4 rounded-full border-2 border-green-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:border-green-500 focus:outline-none text-lg shadow-md transition-colors"
            />
            <button
              type="submit"
              className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-10 py-4 rounded-full font-bold text-lg hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg"
            >
              검색
            </button>
          </form>
        </div>
        {/* 메인 컨텐츠 - Merge 애니메이션 적용 */}
        <MergeSection
          className="mb-8 lg:h-[860px]"
          gap="gap-8"
          leftContent={
            <div className="space-y-8 h-full flex flex-col">
              {/* 지도 */}
              <div className="flex-initial bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border-2 border-green-100 dark:border-slate-800 relative group transition-colors">
                <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4">
                  <h2 className="text-white font-bold text-xl">실시간 흡연부스 지도</h2>
                  <p className="text-green-100 text-sm">내 위치 기준 주변 흡연부스가 표시됩니다</p>
                </div>
                <div className="relative">
                  <div ref={mapContainerRef} className="w-full h-[400px] md:h-[420px]" />

                  {/* 진단 오버레이 */}
                  {(mapError || mapStatus !== "완료") && (
                    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-gray-50/90 backdrop-blur-sm p-6 text-center">
                      <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                      <h3 className="text-sm font-bold text-gray-900 mb-2">지도 진단 중...</h3>
                      <p className="text-[11px] text-gray-800 mb-1 font-medium">상태: <span className="font-mono text-blue-600">{mapStatus}</span></p>
                      {mapError && (
                        <div className="mt-4 bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-200 dark:border-slate-700 p-6">
                          <p className="text-xs font-bold text-red-600 mb-1">오류 발생</p>
                          <p className="text-xs text-red-500">{mapError}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 거리별 흡연구역 수량 박스 (Top Left Overlay) - 모바일에서는 숨김 */}
                <div className={`hidden md:block absolute top-[86px] left-4 z-50 bg-white/10 dark:bg-slate-900/10 backdrop-blur-lg p-4 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-white/20 dark:border-white/5 min-w-[200px] transition-all duration-300 ${!showStats ? "pb-3" : ""}`}>
                  <div 
                    className="flex items-center justify-between cursor-pointer group"
                    onClick={() => setShowStats(!showStats)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl drop-shadow-sm">📊</span>
                      <h4 className="text-sm font-black text-black dark:text-white text-left drop-shadow-sm">주변 흡연구역</h4>
                    </div>
                    <motion.span 
                      animate={{ rotate: showStats ? 180 : 0 }}
                      className="text-gray-500 dark:text-gray-400 group-hover:text-blue-500 transition-colors"
                    >
                      ▼
                    </motion.span>
                  </div>
                  
                  <AnimatePresence>
                    {showStats && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0, marginTop: 0 }}
                        animate={{ height: "auto", opacity: 1, marginTop: 12 }}
                        exit={{ height: 0, opacity: 0, marginTop: 0 }}
                        className="overflow-hidden space-y-2"
                      >
                        <div className="flex items-center justify-between p-2.5 bg-green-600 dark:bg-green-500 border border-green-400/50 rounded-xl shadow-sm">
                          <span className="text-[11px] font-black text-white uppercase tracking-tight">반경 500m</span>
                          <span className="text-sm font-black text-white">{stats.within500m}개</span>
                        </div>
                        <div className="flex items-center justify-between p-2.5 bg-emerald-600 dark:bg-emerald-500 border border-emerald-400/50 rounded-xl shadow-sm">
                          <span className="text-[11px] font-black text-white uppercase tracking-tight">반경 1km</span>
                          <span className="text-sm font-black text-white">{stats.within1km}개</span>
                        </div>
                        <div className="flex items-center justify-between p-2.5 bg-teal-600 dark:bg-teal-500 border border-teal-400/50 rounded-xl shadow-sm">
                          <span className="text-[11px] font-black text-white uppercase tracking-tight">반경 2km</span>
                          <span className="text-sm font-black text-white">{stats.within2km}개</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

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
              </div>

              {/* 피해 경로 안내 */}
              <div className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 rounded-3xl p-8 text-white shadow-2xl flex flex-col justify-center">
                <div id="SmokeRode" className="mb-8">
                  <h3 className="text-2xl font-black mb-[15px] flex items-center gap-3 tracking-tight">
                    <span className="text-3xl">🚶</span>
                    흡연부스 피해 경로 안내
                  </h3>
                  <p className="text-lg opacity-90 mb-0 leading-relaxed tracking-tight">
                    흡연 구역을 피해서 이동하고 싶으신가요? 아래 기능을 활용해보세요.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-8 border border-white/30 flex flex-col justify-center min-h-[180px] transition-transform hover:scale-[1.02] cursor-default">
                    <h4 className="font-black text-2xl mb-3 tracking-tight">실시간 위치 확인</h4>
                    <p className="text-lg opacity-90 leading-relaxed tracking-tight text-white/95">
                      현재 위치 기준으로 주변 흡연부스 위치를 확인하고, 해당 지역을 피해 이동할 수 있습니다.
                    </p>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-8 border border-white/30 flex flex-col justify-center min-h-[180px] transition-transform hover:scale-[1.02] cursor-default">
                    <h4 className="font-black text-2xl mb-3 tracking-tight">목적지 검색</h4>
                    <p className="text-lg opacity-100 leading-relaxed tracking-tight text-white/95">
                      목적지를 검색하면 해당 지역 주변의 흡연부스 위치를 미리 파악할 수 있습니다.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          }
          rightContent={
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border-2 border-green-100 dark:border-green-900/30 sticky top-24 lg:h-full flex flex-col">
              <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4">
                <h2 className="text-white font-bold text-xl">내 주변 흡연부스</h2>
                <p className="text-green-100 text-sm"> 거리순으로 정렬됩니다</p>
              </div>
              <div className="flex-1 overflow-y-auto scrollbar-hide">
                {nearbyBooths.length > 0 ? (
                  nearbyBooths.map((booth, index) => (
                    <div
                      key={booth.id}
                      onClick={() => {
                        setSelectedBooth(booth);
                        if (mapRef.current) {
                          mapRef.current.setCenter(new window.kakao.maps.LatLng(booth.latitude, booth.longitude));
                          mapRef.current.setLevel(4);
                        }
                      }}
                      className={`p-4 border-b border-gray-100 dark:border-slate-800 cursor-pointer transition-all hover:bg-green-50 dark:hover:bg-green-900/20 ${selectedBooth?.id === booth.id ? "bg-green-100 dark:bg-green-900/40" : "bg-white dark:bg-slate-900"}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white font-bold">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-black text-slate-900 dark:text-white">{booth.name}</h4>
                          <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 font-bold">{booth.address}</p>
                        </div>
                        <div className="text-sm font-black text-green-600 dark:text-green-400">
                          {formatDistance(booth.distance)}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 text-2xl">
                      🔍
                    </div>
                    <p className="text-slate-900 dark:text-white font-black mb-1">검색 결과가 없습니다</p>
                    <p className="text-sm text-slate-700 dark:text-slate-300 font-bold">
                      목적지를 검색하시면 해당 지역 주변의<br />
                      흡연부스 위치가 이곳에 표시됩니다.
                    </p>
                  </div>
                )}
              </div>
            </div>
          }
        />

        {/* 이용 안내 */}
        <div className="mt-8 bg-gradient-to-r from-gray-800 to-gray-900 rounded-3xl p-8 text-white shadow-2xl">
          <h3 className="text-3xl font-black mb-[20px] tracking-tight flex items-center gap-3 text-emerald-400 relative -top-[6px]">
            <span className="text-4xl">ℹ️</span>
            서비스 이용 안내
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/20 backdrop-blur-md rounded-2xl p-8 flex flex-col items-center justify-center text-center min-h-[220px] transition-transform hover:scale-[1.02] cursor-default border border-white/20">
              <div className="text-5xl mb-6 drop-shadow-2xl">📍</div>
              <h4 className="font-black text-2xl mb-3 tracking-tight">위치 기반 서비스</h4>
              <p className="text-lg font-black leading-relaxed tracking-tight text-white">
                현재 위치를 기반으로 가장 가까운 흡연부스를 자동으로 찾아드립니다.
              </p>
            </div>
            <div className="bg-white/20 backdrop-blur-md rounded-2xl p-8 flex flex-col items-center justify-center text-center min-h-[220px] transition-transform hover:scale-[1.02] cursor-default border border-white/20">
              <div className="text-5xl mb-6 drop-shadow-2xl">🗺️</div>
              <h4 className="font-black text-2xl mb-3 tracking-tight">전국 커버리지</h4>
              <p className="text-lg font-black leading-relaxed tracking-tight text-white">
                전국 {stats.total}개 이상의 흡연부스 위치 정보를 제공합니다.
              </p>
            </div>
            <div className="bg-white/20 backdrop-blur-md rounded-2xl p-8 flex flex-col items-center justify-center text-center min-h-[220px] transition-transform hover:scale-[1.02] cursor-default border border-white/20">
              <div className="text-5xl mb-6 drop-shadow-2xl">⏱️</div>
              <h4 className="font-black text-2xl mb-3 tracking-tight">실시간 업데이트</h4>
              <p className="text-lg font-black leading-relaxed tracking-tight text-white">
                위치 정보는 실시간으로 업데이트되어 정확한 정보를 제공합니다.
              </p>
            </div>
          </div>
        </div>

        {/* 선택된 흡연부스 상세 정보 */}
        {selectedBooth && (
          <div className="mt-8 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-8 border-2 border-green-200 dark:border-green-900/30 transition-colors">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-3xl font-black text-gray-900 dark:text-white">{selectedBooth.name}</h3>
                <p className="text-lg text-gray-800 dark:text-gray-300 font-bold">{selectedBooth.address}</p>
              </div>
              <button
                onClick={() => setSelectedBooth(null)}
                className="w-10 h-10 rounded-full bg-gray-200 dark:bg-slate-800 flex items-center justify-center hover:bg-gray-300 dark:hover:bg-slate-700 transition"
              >
                <span className="text-2xl text-gray-700 dark:text-gray-300">×</span>
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-6 rounded-2xl border-2 border-green-200 dark:border-green-800/30">
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-2 font-bold">거리</p>
                <p className="text-4xl font-black text-green-600 dark:text-green-400">{formatDistance(selectedBooth.distance)}</p>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-2xl border-2 border-blue-200 dark:border-blue-800/30">
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-2 font-bold">지역</p>
                <p className="text-4xl font-black text-blue-600 dark:text-blue-400">{selectedBooth.city}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-6 rounded-2xl border-2 border-purple-200 dark:border-purple-800/30">
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-2 font-bold">도보 예상 시간</p>
                <p className="text-4xl font-black text-purple-600 dark:text-purple-400">
                  {Math.ceil(selectedBooth.distance / 80)}분
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 홈으로 돌아가기 버튼 */}
      <div className="w-full flex justify-center mt-12 mb-16 px-4">
        <button
          onClick={() => navigate("/#section-location")}
          className="bg-gradient-to-r from-blue-600 to-green-600 text-white px-12 py-4 rounded-full font-bold text-xl hover:from-blue-700 hover:to-green-700 transition-all shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95"
        >
          홈으로 돌아가기
        </button>
      </div>

      {/* 푸터 */}
      <footer className="bg-gray-900 text-white py-8 mt-16">
        <div className="w-full max-w-[1440px] mx-auto px-6 md:px-12 text-center">
          <p className="text-slate-400 dark:text-slate-400 font-black">© 2024 Flow - 흡연부스 위치 안내 서비스</p>
        </div>
      </footer>
    </div>
  );
}
