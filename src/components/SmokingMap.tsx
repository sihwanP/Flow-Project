import { useEffect, useRef, useState, useMemo } from "react";
import { getNationalSmokingBooths } from "../services/smokingBoothService";
import { calculateDistance } from "../utils/pathfinding";
import ThemeToggle from "./ThemeToggle";
import type { SmokingBooth } from "../services/smokingBoothService";

declare global {
  interface Window {
    kakao: any;
  }
}

interface SmokingMapProps {
  onBack: () => void;
}

interface NearbyBoothsInfo {
  destination: string;
  lat: number;
  lng: number;
  within500m: number;
  within1km: number;
  within2km: number;
}

export default function SmokingMap({ onBack }: SmokingMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapStatus, setMapStatus] = useState<string>("준비 중...");
  const [keyword, setKeyword] = useState("");
  const markersRef = useRef<any[]>([]);
  const destinationMarkerRef = useRef<any>(null);
  const [nationalBooths] = useState<SmokingBooth[]>(getNationalSmokingBooths());
  const [nearbyInfo, setNearbyInfo] = useState<NearbyBoothsInfo | null>(null);

  /**
   * 전국 흡연부스 마커 렌더링 함수
   *
   * 전국 단위의 모든 흡연부스를 지도에 표시합니다.
   * 커스텀 아이콘 (/image/smoke_icon.png)을 사용하고 푸른색 전파 효과를 추가합니다.
   */
  const renderMarkers = (map: any) => {
    // 기존 마커 제거
    markersRef.current.forEach((m: any) => m.setMap(null));
    markersRef.current = [];

    // 전국 흡연부스 마커 생성
    nationalBooths.forEach((booth: SmokingBooth) => {
      // 전파 효과와 아이콘을 포함한 커스텀 오버레이 생성
      const markerContent = document.createElement('div');
      markerContent.style.cssText = 'position: relative; width: 32px; height: 32px; cursor: pointer;';

      markerContent.innerHTML = `
        <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;">
          <div class="smoke-marker-ripple"></div>
          <div class="smoke-marker-ripple"></div>
          <div class="smoke-marker-ripple"></div>
          <div class="smoke-marker-ripple"></div>
          <img src="${import.meta.env.BASE_URL}image/smoke_icon.png" alt="흡연부스" style="width: 32px; height: 32px; position: relative; z-index: 10; mix-blend-mode: multiply; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3)); background: transparent;" />
        </div>
      `;

      const customOverlay = new window.kakao.maps.CustomOverlay({
        position: new window.kakao.maps.LatLng(booth.latitude, booth.longitude),
        content: markerContent,
        yAnchor: 0.5,
      });

      customOverlay.setMap(map);

      // 마커 클릭 시 정보창 표시
      const infowindow = new window.kakao.maps.InfoWindow({
        content: `<div style="padding:8px;font-size:12px;font-weight:bold;white-space:nowrap;">${booth.name}</div>`,
      });

      markerContent.addEventListener('click', () => {
        infowindow.open(map, customOverlay);
      });

      markersRef.current.push(customOverlay);
    });
  };

  useEffect(() => {
    /**
     * 앱 시작 함수
     */
    const startApp = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => initializeMap(pos.coords.latitude, pos.coords.longitude),
          () => {
            console.log("위치 권한이 거부되었지만, 전국 지도를 표시합니다.");
            initializeMap(37.5665, 126.978);
          }
        );
      } else {
        initializeMap(37.5665, 126.978);
      }
    };

    /**
     * 지도 초기화 함수
     */
    const initializeMap = (lat: number, lng: number) => {
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
                center: new window.kakao.maps.LatLng(lat, lng),
                level: 8,
              };
              const map = new window.kakao.maps.Map(mapContainerRef.current, options);
              mapRef.current = map;

              // 회색 화면 방지를 위한 레이아웃 갱신
              const relayout = () => {
                if (map) {
                  map.relayout();
                  map.setCenter(new window.kakao.maps.LatLng(lat, lng));
                }
              };

              relayout();
              setTimeout(relayout, 0);
              setTimeout(() => {
                relayout();
                setMapStatus("완료");
              }, 500);

              // ResizeObserver
              const resizeObserver = new ResizeObserver(() => relayout());
              resizeObserver.observe(mapContainerRef.current);

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

              map.setZoomable(false);
              renderMarkers(map);
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

    startApp();
  }, [nationalBooths]);

  // 상시 통계 계산
  const currentStats = useMemo(() => {
    if (!mapRef.current) return nearbyInfo;

    const center = mapRef.current.getCenter();
    const lat = center.getLat();
    const lng = center.getLng();

    let w500 = 0, w1k = 0, w2k = 0;
    nationalBooths.forEach(booth => {
      const dist = calculateDistance({ lat, lng }, { lat: booth.latitude, lng: booth.longitude });
      if (dist <= 500) w500++;
      if (dist <= 1000) w1k++;
      if (dist <= 2000) w2k++;
    });

    return {
      destination: nearbyInfo?.destination || "현재 중심",
      within500m: w500,
      within1km: w1k,
      within2km: w2k
    };
  }, [nearbyInfo, nationalBooths, mapRef.current]);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim() || !mapRef.current) return;

    const ps = new window.kakao.maps.services.Places();
    ps.keywordSearch(keyword, (data: any, status: any) => {
      if (status === window.kakao.maps.services.Status.OK) {
        const result = data[0];
        const lat = parseFloat(result.y);
        const lng = parseFloat(result.x);
        const moveLatLng = new window.kakao.maps.LatLng(lat, lng);

        mapRef.current.setCenter(moveLatLng);
        mapRef.current.setLevel(6); // 줌 레벨 조정

        // 기존 목적지 마커 제거
        if (destinationMarkerRef.current) {
          destinationMarkerRef.current.setMap(null);
        }

        // 목적지 마커 생성
        const destMarker = new window.kakao.maps.Marker({
          position: moveLatLng,
          map: mapRef.current,
          title: result.place_name,
        });

        // 목적지 라벨 표시
        const destLabel = new window.kakao.maps.InfoWindow({
          content: `<div style="padding:8px 12px;font-size:14px;font-weight:bold;background:#ef4444;color:white;border-radius:8px;">${result.place_name}</div>`,
          removable: false,
        });
        destLabel.open(mapRef.current, destMarker);

        destinationMarkerRef.current = destMarker;

        // 근처 흡연부스 개수 계산
        let within500m = 0;
        let within1km = 0;
        let within2km = 0;

        nationalBooths.forEach((booth: SmokingBooth) => {
          const distance = calculateDistance(
            { lat, lng },
            { lat: booth.latitude, lng: booth.longitude }
          );

          if (distance <= 500) within500m++;
          if (distance <= 1000) within1km++;
          if (distance <= 2000) within2km++;
        });

        // 결과 저장
        setNearbyInfo({
          destination: result.place_name,
          lat,
          lng,
          within500m,
          within1km,
          within2km,
        });
      } else {
        alert("검색 결과가 없습니다.");
      }
    });
  };

  // 줌 컨트롤 핸들러 (Kakao Map: Level이 작을수록 확대)
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
    <div className="flex flex-col items-center justify-center w-full min-h-screen bg-gray-100 dark:bg-slate-950 p-4 sm:p-6 md:p-8 transition-colors duration-300">
      {/* 1. 상단 검색 바 영역 (지도 프레임 밖) */}

      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle
            transparent={false}
            className="shadow-xl shadow-black/5 border border-white/60 dark:border-white/10 bg-white/70 dark:bg-black/40 backdrop-blur-xl text-slate-900 dark:text-white rounded-full w-12 h-12 flex items-center justify-center"
        />
      </div>

      <div className="w-full max-w-[1400px]">
      <div className="w-full mb-4 sm:mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <h2 className="text-lg sm:text-xl md:text-2xl font-black text-slate-900 dark:text-white">
            전국 흡연부스 위치 확인
          </h2>
          <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 font-bold">
            전국 단위의 흡연부스 위치가 표시됩니다.
          </p>
        </div>
        <form
          onSubmit={onSearch}
          className="flex gap-2 p-2 sm:p-3 bg-white dark:bg-slate-900 rounded-lg shadow-md border border-gray-100 dark:border-slate-800 w-full sm:w-auto"
        >
          <input
            type="text"
            placeholder="지역 검색 (예: 강남역)"
            className="flex-1 sm:flex-initial sm:w-48 md:w-64 px-3 sm:px-4 py-2 outline-none border rounded-md focus:border-blue-500 text-sm sm:text-base bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-black"
            value={keyword}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setKeyword(e.target.value)}
          />
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-6 py-2 rounded-md font-black transition-colors text-sm sm:text-base"
          >
            검색
          </button>
        </form>
      </div>

      {/* 2. 지도 프레임 */}
      <div className="relative shadow-2xl border border-gray-200 rounded-xl overflow-hidden w-full aspect-video sm:aspect-[4/3] md:h-[600px] group">
        <div className="relative w-full h-full">
          <div ref={mapContainerRef} className="w-full" style={{ width: "100%", height: "600px" }} />

          {/* 진단 오버레이 (회색 화면 발생 시 원인 파악용) */}
          {(mapError || mapStatus !== "완료") && (
            <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-gray-50/90 backdrop-blur-sm p-6 text-center">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">지도 진단 중...</h3>
              <p className="text-sm text-gray-600 mb-1">상태: <span className="font-mono text-blue-600">{mapStatus}</span></p>
              {mapError && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-xs font-bold text-red-600 mb-1">오류 발생</p>
                  <p className="text-xs text-red-500">{mapError}</p>
                  <p className="text-[10px] text-red-400 mt-2">API 키 도메인 허용 설정이나 네트워크를 확인해주세요.</p>
                </div>
              )}
            </div>
          )}

          {/* Legend (Top Right) */}
          <div className="absolute top-4 right-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm p-3 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 z-50 pointer-events-none">
            <p className="text-xs font-black text-slate-800 dark:text-white mb-2 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
              지도 범례
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <img src={`${import.meta.env.BASE_URL}image/smoke_icon.png`} alt="" className="w-5 h-5 object-contain" />
                <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">흡연부스</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: '#3b82f6' }}></div>
                <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">내 위치</span>
              </div>
              <div className="flex items-center gap-2 opacity-60">
                <div className="w-4 h-4 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: '#ef4444' }}></div>
                <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">검색 목적지</span>
              </div>
            </div>
          </div>

          {/* 거리별 흡연구역 수량 박스 (Top Left Overlay) */}
          <div className="absolute top-4 left-4 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-4 rounded-2xl shadow-xl border-2 border-blue-100 dark:border-blue-900/50 min-w-[200px]">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">📍</span>
              <h4 className="text-sm font-black text-slate-900 dark:text-white truncate max-w-[150px]">
                {currentStats?.destination || "위치 분석 중..."}
              </h4>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <span className="text-[11px] font-black text-blue-700 dark:text-blue-300">반경 500m</span>
                <span className="text-sm font-black text-blue-900 dark:text-white">{currentStats?.within500m || 0}개</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                <span className="text-[11px] font-black text-indigo-700 dark:text-indigo-300">반경 1km</span>
                <span className="text-sm font-black text-indigo-900 dark:text-white">{currentStats?.within1km || 0}개</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <span className="text-[11px] font-black text-purple-700 dark:text-purple-300">반경 2km</span>
                <span className="text-sm font-black text-purple-900 dark:text-white">{currentStats?.within2km || 0}개</span>
              </div>
            </div>
            {nearbyInfo && (
              <button
                onClick={() => {
                  setNearbyInfo(null);
                  if (destinationMarkerRef.current) {
                    destinationMarkerRef.current.setMap(null);
                    destinationMarkerRef.current = null;
                  }
                  setKeyword("");
                }}
                className="w-full mt-3 py-1.5 text-[10px] font-black text-slate-800 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-lg transition-colors border border-gray-100 dark:border-slate-700"
              >
                결과 지우기
              </button>
            )}
          </div>

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
      </div>

      {/* 3. 하단 버튼 영역 */}
      <div className="mt-4 sm:mt-6 flex justify-center">
        <button
          onClick={onBack}
          className="bg-gradient-to-r from-blue-600 to-green-600 text-white px-8 sm:px-10 py-2.5 sm:py-3 rounded-full shadow-lg transition-transform active:scale-95 text-sm sm:text-base hover:from-blue-700 hover:to-green-700"
        >
          홈으로 돌아가기
        </button>
      </div>
      </div>
    </div>
  );
}
