import { useState, useEffect, useRef } from "react";

export default function WalkCourseMap({
  course,
  onBack,
}: {
  course: any;
  onBack: () => void;
}) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const kakaoMapRef = useRef<any>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapStatus, setMapStatus] = useState<string>("준비 중...");

  useEffect(() => {
    const initLogic = () => {
      if (!window.kakao || !window.kakao.maps) return;

      window.kakao.maps.load(() => {
        if (mapContainerRef.current && !kakaoMapRef.current) {
          try {
            setMapStatus("지도 초기화 중...");
            const options = {
              center: new window.kakao.maps.LatLng(course.lat, course.lng),
              level: 3,
            };
            const map = new window.kakao.maps.Map(mapContainerRef.current, options);
            kakaoMapRef.current = map;

            // 회색 화면 방지를 위한 레이아웃 갱신
            setTimeout(() => {
              map.relayout();
              map.setCenter(new window.kakao.maps.LatLng(course.lat, course.lng));
              setMapStatus("완료");
            }, 500);

            map.setZoomable(false);

            new window.kakao.maps.Marker({
              position: new window.kakao.maps.LatLng(course.lat, course.lng),
              map: map,
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
  }, [course]);

  // 줌 컨트롤 핸들러
  const handleZoomIn = () => {
    if (kakaoMapRef.current) {
      kakaoMapRef.current.setLevel(kakaoMapRef.current.getLevel() - 1);
    }
  };

  const handleZoomOut = () => {
    if (kakaoMapRef.current) {
      kakaoMapRef.current.setLevel(kakaoMapRef.current.getLevel() + 1);
    }
  };

  return (
    <div className="fixed inset-0 bg-white dark:bg-slate-950 z-[10000] flex flex-col items-center">
      <div className="w-full max-w-[1024px] p-6 flex justify-between items-center bg-white dark:bg-slate-900 rounded-t-2xl">
        <h2 className="text-2xl font-black text-slate-900 dark:text-white">{course.name} 지도</h2>
        <button onClick={onBack} className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-black">
          닫기
        </button>
      </div>

      {/* 지도 컨테이너 */}
      <div className="relative rounded-2xl shadow-2xl border overflow-hidden" style={{ width: "1024px", height: "700px" }}>
        <div className="relative w-full h-full">
          <div ref={mapContainerRef} className="w-full h-full" />

          {/* 진단 오버레이 */}
          {(mapError || mapStatus !== "완료") && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-gray-50/90 backdrop-blur-sm p-6 text-center rounded-lg">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">지도 진단 중...</h3>
              <p className="text-base text-gray-600 mb-2">상태: <span className="font-mono text-blue-600">{mapStatus}</span></p>
              {mapError && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-sm font-bold text-red-600 mb-1">오류 발생</p>
                  <p className="text-sm text-red-500">{mapError}</p>
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
      </div>

      <div className="mt-6 text-center">
        <p className="text-slate-800 dark:text-slate-200 mb-4 font-black">{course.desc}</p>
        <button
          onClick={onBack}
          className="bg-gradient-to-r from-blue-600 to-green-600 text-white px-12 py-3 rounded-full font-bold shadow-lg hover:from-blue-700 hover:to-green-700 transition-all"
        >
          확인 완료
        </button>
      </div>
    </div>
  );
}
