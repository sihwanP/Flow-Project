import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getNationalSmokingBooths } from "../services/smokingBoothService";
import type { SmokingBooth } from "../services/smokingBoothService";

declare global {
  interface Window {
    kakao: any;
  }
}

interface LocationServiceProps {
  onBack: () => void;
}

export default function LocationService({ onBack }: LocationServiceProps) {
  const navigate = useNavigate();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [nationalBooths] = useState<SmokingBooth[]>(getNationalSmokingBooths());
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [stats, setStats] = useState({ within500m: 0, within1km: 0, within2km: 0 });
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapStatus, setMapStatus] = useState<string>("준비 중...");

  // 스크롤 잠금 해제 지원
  useEffect(() => {
    document.body.style.overflow = "auto";
    window.scrollTo(0, 0);
    return () => {
      // 컴포넌트가 사라질 때의 부작용 방지 (필요 시)
    };
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
          // 위치 권한 거부 시 서울 중심으로 설정
          setUserLocation({ lat: 37.5665, lng: 126.978 });
        }
      );
    } else {
      setUserLocation({ lat: 37.5665, lng: 126.978 });
    }
  }, []);

  // 거리 계산 (Haversine formula)
  const getDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371000; // Earth radius in meters
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

  // 가장 가까운 흡연부스 찾기
  const nearestBooths = useMemo(() => {
    if (!userLocation) return [];

    const boothsWithDist = nationalBooths
      .map((booth) => ({
        ...booth,
        distance: getDistance(
          userLocation.lat,
          userLocation.lng,
          booth.latitude,
          booth.longitude
        ),
      }))
      .sort((a, b) => a.distance - b.distance);

    // 통계 업데이트
    setStats({
      within500m: boothsWithDist.filter(b => b.distance <= 500).length,
      within1km: boothsWithDist.filter(b => b.distance <= 1000).length,
      within2km: boothsWithDist.filter(b => b.distance <= 2000).length,
    });

    return boothsWithDist.slice(0, 10);
  }, [userLocation, nationalBooths]);

  // 지도 초기화
  useEffect(() => {
    if (!userLocation) return;

    const initializeMap = () => {
      const initLogic = () => {
        if (!window.kakao || !window.kakao.maps) return;

        window.kakao.maps.load(() => {
          if (mapContainerRef.current && !mapRef.current) {
            try {
              setMapStatus("지도 초기화 중...");
              const options = {
                center: new window.kakao.maps.LatLng(userLocation.lat, userLocation.lng),
                level: 8,
              };
              const map = new window.kakao.maps.Map(mapContainerRef.current, options);
              mapRef.current = map;

              // 회색 화면 방지를 위한 레이아웃 갱신 (Sequential Relayout Pattern)
              const relayout = () => {
                if (map) {
                  map.relayout();
                  map.setCenter(new window.kakao.maps.LatLng(userLocation.lat, userLocation.lng));
                }
              };

              // 1. 즉시 실행
              relayout();

              // 2. 0ms (Next Tick)
              setTimeout(relayout, 0);

              // 3. 500ms (Animation Safety)
              setTimeout(() => {
                relayout();
                setMapStatus("완료");
              }, 500);

              // 4. ResizeObserver로 컨테이너 크기 변경 감지
              const resizeObserver = new ResizeObserver(() => {
                relayout();
              });
              resizeObserver.observe(mapContainerRef.current);

              // 줌 컨트롤 비활성화 (마우스 휠 확대/축소 금지)
              map.setZoomable(false);

              // 사용자 위치 마커
              const userMarkerImage = new window.kakao.maps.MarkerImage(
                `${import.meta.env.BASE_URL}image/user-marker.svg`,
                new window.kakao.maps.Size(32, 32)
              );
              new window.kakao.maps.Marker({
                position: new window.kakao.maps.LatLng(userLocation.lat, userLocation.lng),
                map: map,
                image: userMarkerImage,
              });


              // 전국 흡연부스 마커 (가까운 50개)
              nearestBooths.slice(0, 50).forEach((booth) => {
                const markerContent = document.createElement('div');
                markerContent.style.cssText = 'position: relative; width: 32px; height: 32px;';
                markerContent.innerHTML = `
                <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;">
                  <div class="smoke-marker-ripple"></div>
                  <div class="smoke-marker-ripple"></div>
                  <div class="smoke-marker-ripple"></div>
                  <div class="smoke-marker-ripple"></div>
                  <img src="${import.meta.env.BASE_URL}image/smoke_icon.png" alt="흡연부스" style="width: 28px; height: 28px; position: relative; z-index: 10; mix-blend-mode: multiply; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3)); background: transparent;" />
                </div>
              `;

                const customOverlay = new window.kakao.maps.CustomOverlay({
                  position: new window.kakao.maps.LatLng(booth.latitude, booth.longitude),
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
        // 이미 스크립트가 존재하면 로드 이벤트를 기다리거나, 이미 로드되었는지 확인
        // 주의: 이미 로드된 경우 load 이벤트가 발생하지 않을 수 있음.
        // 하지만 window.kakao 체크가 상단에 있으므로 여기는 로딩 중인 경우임.
        existingScript.addEventListener("load", initializeMap);
      }
    }
  }, [userLocation, nationalBooths]);

  // 지역별 흡연부스 통계
  const getRegionalStats = () => {
    const regions: { [key: string]: number } = {};

    nationalBooths.forEach((booth: SmokingBooth) => {
      const region = booth.address.split(" ")[0]; // 시/도 단위
      regions[region] = (regions[region] || 0) + 1;
    });

    return Object.entries(regions)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  };

  const regionalStats = getRegionalStats();

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
            🗺️ 위치 서비스
          </h1>
          <p className="text-lg sm:text-xl text-slate-800 dark:text-slate-200 leading-relaxed max-w-3xl mx-auto font-black">
            전국 300개 이상의 흡연부스 위치를 실시간으로 확인하고 가장 가까운 곳을 찾아보세요
          </p>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="w-full max-w-[1400px] mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-blue-700 text-white p-6 rounded-2xl shadow-xl">
            <p className="text-sm font-black mb-2 opacity-90">전국 흡연부스</p>
            <p className="text-4xl font-black">{nationalBooths.length}개</p>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-700 text-white p-6 rounded-2xl shadow-xl">
            <p className="text-sm font-black mb-2 opacity-90">서비스 지역</p>
            <p className="text-4xl font-black">{regionalStats.length}곳</p>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-purple-700 text-white p-6 rounded-2xl shadow-xl">
            <p className="text-sm font-black mb-2 opacity-90">가장 가까운 부스</p>
            <p className="text-4xl font-black">
              {nearestBooths.length > 0 ? `${(nearestBooths[0].distance / 1000).toFixed(1)}km` : "-"}
            </p>
          </div>
          <div className="bg-gradient-to-br from-orange-500 to-orange-700 text-white p-6 rounded-2xl shadow-xl">
            <p className="text-sm font-black mb-2 opacity-90">평균 거리</p>
            <p className="text-4xl font-black">
              {nearestBooths.length > 0
                ? `${(nearestBooths.slice(0, 5).reduce((sum: number, b) => sum + b.distance, 0) / 5 / 1000).toFixed(1)}km`
                : "-"}
            </p>
          </div>
        </div>
      </div>

      {/* 지도 + 가까운 흡연부스 목록 */}
      <div className="w-full max-w-[1400px] mb-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 지도 */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border-2 border-blue-200 dark:border-blue-900/30 p-6">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-4">실시간 지도</h3>
            <div className="relative">
              <div
                ref={mapContainerRef}
                className="w-full rounded-lg shadow-lg"
                style={{ width: "100%", height: "450px", border: "2px solid #dbeafe" }}
              />

              {/* 진단 오버레이 */}
              {(mapError || mapStatus !== "완료") && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-gray-50/90 backdrop-blur-sm p-6 text-center rounded-lg">
                  <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                  <h3 className="text-sm font-bold text-gray-900 mb-2">지도 진단 중...</h3>
                  <p className="text-[11px] text-gray-600 mb-1">상태: <span className="font-mono text-blue-600">{mapStatus}</span></p>
                  {mapError && (
                    <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-xs font-bold text-red-600 mb-1">오류 발생</p>
                      <p className="text-xs text-red-500">{mapError}</p>
                    </div>
                  )}
                </div>
              )}

              {/* 거리별 흡연구역 수량 박스 (Top Left Overlay) */}
              <div className="absolute top-4 left-4 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-4 rounded-2xl shadow-xl border-2 border-blue-100 dark:border-blue-900/50 min-w-[170px]">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">📍</span>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white text-left">주변 현황</h4>
                </div>
                <div className="space-y-2 text-left">
                  <div className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <span className="text-[10px] font-black text-blue-700 dark:text-blue-300">반경 500m</span>
                    <span className="text-sm font-black text-blue-900 dark:text-white">{stats.within500m}개</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                    <span className="text-[10px] font-black text-indigo-700 dark:text-indigo-300">반경 1km</span>
                    <span className="text-sm font-black text-indigo-900 dark:text-white">{stats.within1km}개</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <span className="text-[10px] font-black text-purple-700 dark:text-purple-300">반경 2km</span>
                    <span className="text-sm font-black text-purple-900 dark:text-white">{stats.within2km}개</span>
                  </div>
                </div>
              </div>

              {/* Custom Zoom Controls (Inside Map Wrapper) */}
              <div className="absolute bottom-4 left-4 z-20 flex flex-col gap-2">
                <button
                  onClick={handleZoomIn}
                  className="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-white transition-all hover:scale-110 active:scale-95 z-30 !p-0 overflow-hidden"
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
            <p className="text-xs text-slate-800 dark:text-slate-200 mt-3 font-black">
              * 파란색 마커는 흡연부스 위치입니다. 지도를 드래그하거나 확대/축소하여 자세히 확인하세요.
            </p>
          </div>
 
          {/* 가까운 흡연부스 Top 10 */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border-2 border-green-200 dark:border-green-900/30 p-6">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-4">가까운 흡연부스 Top 10</h3>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {nearestBooths.map((booth, index) => (
                <div
                  key={booth.id}
                  className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-slate-800 dark:to-blue-900/10 p-4 rounded-lg border-2 border-green-200 dark:border-green-800/30 hover:shadow-md transition-all"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-black text-slate-800 dark:text-slate-200 opacity-50">#{index + 1}</span>
                      <span className="text-sm font-black text-slate-900 dark:text-white">{booth.name}</span>
                    </div>
                    <span className="text-sm font-black text-blue-600 dark:text-blue-400">
                      {(booth.distance / 1000).toFixed(2)}km
                    </span>
                  </div>
                  <p className="text-xs text-slate-800 dark:text-slate-200 font-bold">{booth.address}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 지역별 흡연부스 통계 */}
      <div className="w-full max-w-[1440px] mb-8">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border-2 border-purple-200 dark:border-purple-900/30 p-6">
          <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-6 text-center">지역별 흡연부스 분포</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {regionalStats.map((region, index) => (
              <div
                key={region.name}
                className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-slate-800 dark:to-purple-900/10 p-4 rounded-xl border-2 border-purple-200 dark:border-purple-800/30 text-center hover:shadow-lg transition-all"
              >
                <p className="text-xs font-black text-slate-800 dark:text-slate-200 mb-1 opacity-50">#{index + 1}</p>
                <p className="text-lg font-black text-slate-900 dark:text-white mb-2">{region.name}</p>
                <p className="text-3xl font-black text-purple-600 dark:text-purple-400">{region.count}</p>
                <p className="text-xs text-slate-800 dark:text-slate-200 mt-1 font-bold">개소</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 하단 버튼 */}
      <div className="w-full max-w-[1440px] mb-8">
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
