import { useEffect, useRef, useState } from "react";

interface SmokingBooth {
  lat: number;
  lng: number;
}

export default function GuideVd() {
  const mapRef = useRef<HTMLDivElement>(null);
  const kakaoMapRef = useRef<any>(null);
  const currentMarkerRef = useRef<any>(null);
  const polylineRef = useRef<any>(null);
  const watchIdRef = useRef<number | null>(null);
  const smokingMarkersRef = useRef<any[]>([]);
  const turnOverlaysRef = useRef<any[]>([]);
  const destOverlayRef = useRef<any>(null);

  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [startPosition, setStartPosition] = useState<{ lat: number; lng: number; name: string } | null>(null);
  const [destination, setDestination] = useState<{ lat: number; lng: number; name: string } | null>(null);
  const [startKeyword, setStartKeyword] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [navigationActive, setNavigationActive] = useState(false);
  const [useCurrentLocation, setUseCurrentLocation] = useState(true);
  const [smokingBooths, setSmokingBooths] = useState<SmokingBooth[]>([]);
  const [routePath, setRoutePath] = useState<{ lat: number; lng: number }[]>([]);
  const [direction, setDirection] = useState("");
  const [distance, setDistance] = useState(0);
  const [nextTurn, setNextTurn] = useState<{ direction: string; distance: number } | null>(null);
  const [error, setError] = useState<string>("");
  const [nearbyBoothsCount, setNearbyBoothsCount] = useState<number>(0);
  const [mapStatus, setMapStatus] = useState<string>("준비 중...");

  // 실제 흡연구역 위치 데이터 (지정된 실제 흡연구역)
  const generateSmokingBooths = (): SmokingBooth[] => {
    const booths: SmokingBooth[] = [
      // 서울 주요 지하철역 흡연구역
      { lat: 37.5547, lng: 126.9707 }, // 서울역 북측 광장
      { lat: 37.5546, lng: 126.9717 }, // 서울역 동측
      { lat: 37.4979, lng: 127.0276 }, // 강남역 10번 출구
      { lat: 37.4981, lng: 127.0286 }, // 강남역 11번 출구
      { lat: 37.5572, lng: 126.9247 }, // 홍대입구역 9번 출구
      { lat: 37.5663, lng: 126.9779 }, // 시청역 광장
      { lat: 37.5759, lng: 126.9768 }, // 광화문역 광장
      { lat: 37.5663, lng: 126.9996 }, // 동대문역사문화공원
      { lat: 37.5145, lng: 127.0595 }, // 잠실역 광장
      { lat: 37.5081, lng: 127.0633 }, // 잠실새내역
      { lat: 37.5406, lng: 127.0693 }, // 건대입구역
      { lat: 37.5400, lng: 127.0695 }, // 건대입구역 2번 출구
      { lat: 37.5219, lng: 126.9245 }, // 신촌역 광장
      { lat: 37.4838, lng: 126.9829 }, // 사당역
      { lat: 37.4954, lng: 127.0280 }, // 역삼역
      { lat: 37.5013, lng: 127.0396 }, // 선릉역
      { lat: 37.5048, lng: 127.0492 }, // 삼성역

      // 인천국제공항 흡연구역 (실제 지정구역)
      { lat: 37.4602, lng: 126.4407 }, // 제1여객터미널 3층 출국장
      { lat: 37.4605, lng: 126.4410 }, // 제1여객터미널 탑승구 28번 근처
      { lat: 37.4600, lng: 126.4405 }, // 제1여객터미널 탑승구 14번 근처
      { lat: 37.4608, lng: 126.4400 }, // 제2여객터미널 3층
      { lat: 37.4606, lng: 126.4412 }, // 제2여객터미널 탑승구

      // 김포공항 흡연구역
      { lat: 37.5583, lng: 126.7906 }, // 국내선 청사
      { lat: 37.5585, lng: 126.7910 }, // 국제선 청사

      // 부산 주요역 흡연구역
      { lat: 35.1796, lng: 129.0756 }, // 서면역 광장
      { lat: 35.1150, lng: 129.0403 }, // 부산역 광장
      { lat: 35.1585, lng: 129.1606 }, // 해운대역
      { lat: 35.1540, lng: 129.0595 }, // 남포동

      // 대구 주요역 흡연구역
      { lat: 35.8714, lng: 128.6014 }, // 반월당역
      { lat: 35.8800, lng: 128.6300 }, // 동대구역

      // 대전 주요역 흡연구역
      { lat: 36.3504, lng: 127.3845 }, // 대전역
      { lat: 36.3515, lng: 127.3850 }, // 유성 온천

      // 광주 주요역 흡연구역
      { lat: 35.1595, lng: 126.8526 }, // 광주송정역
      { lat: 35.1546, lng: 126.9161 }, // 금남로

      // 제주 주요 흡연구역
      { lat: 33.5067, lng: 126.4927 }, // 제주공항
      { lat: 33.4996, lng: 126.5312 }, // 제주시청
      { lat: 33.2541, lng: 126.5603 }, // 서귀포

      // 수원역 흡연구역
      { lat: 37.2636, lng: 127.0286 }, // 수원역 광장
      { lat: 37.2650, lng: 127.0300 }, // 수원역 남측

      // 기타 주요 도시
      { lat: 35.5384, lng: 129.3114 }, // 울산역
      { lat: 35.2280, lng: 128.6811 }, // 창원역
      { lat: 37.4201, lng: 127.1262 }, // 성남 분당구
      { lat: 36.6424, lng: 127.4890 }, // 청주역
      { lat: 35.8242, lng: 127.1480 }, // 전주역
      { lat: 36.8151, lng: 127.1139 }, // 천안역
    ];

    console.log(`실제 흡연구역 총 ${booths.length}개`);
    return booths;
  };

  // 두 지점 간 거리 계산 (미터)
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  // 방향 계산
  const calculateBearing = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    const θ = Math.atan2(y, x);
    const bearing = ((θ * 180) / Math.PI + 360) % 360;

    return bearing;
  };

  // 방향 텍스트 변환
  const getDirectionText = (bearing: number): string => {
    if (bearing >= 337.5 || bearing < 22.5) return "북쪽";
    if (bearing >= 22.5 && bearing < 67.5) return "북동쪽";
    if (bearing >= 67.5 && bearing < 112.5) return "동쪽";
    if (bearing >= 112.5 && bearing < 157.5) return "남동쪽";
    if (bearing >= 157.5 && bearing < 202.5) return "남쪽";
    if (bearing >= 202.5 && bearing < 247.5) return "남서쪽";
    if (bearing >= 247.5 && bearing < 292.5) return "서쪽";
    return "북서쪽";
  };

  // OSRM API를 사용한 도보 경로 검색 (실제 도로를 따라감)
  const getWalkingRoute = async (
    start: { lat: number; lng: number },
    end: { lat: number; lng: number }
  ): Promise<{ lat: number; lng: number }[]> => {
    try {
      console.log('도보 경로 검색 시작:', { start, end });

      // OSRM API 호출 (도보 모드)
      const url = `https://router.project-osrm.org/route/v1/foot/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson&steps=true`;

      const response = await fetch(url);

      if (!response.ok) {
        console.error('OSRM API 응답 오류:', response.status);
        throw new Error('경로 검색 실패');
      }

      const data = await response.json();
      console.log('OSRM API 응답:', data);

      // 경로 좌표 추출
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const coordinates: { lat: number; lng: number }[] = [];

        // GeoJSON 좌표를 추출 (경로 전체)
        if (route.geometry && route.geometry.coordinates) {
          route.geometry.coordinates.forEach((coord: [number, number]) => {
            coordinates.push({
              lng: coord[0],
              lat: coord[1],
            });
          });
        }

        console.log(`추출된 도보 경로 좌표 개수: ${coordinates.length}`);
        console.log(`예상 거리: ${(route.distance / 1000).toFixed(2)}km, 예상 시간: ${Math.round(route.duration / 60)}분`);

        if (coordinates.length > 0) {
          return coordinates;
        }
      }

      console.warn('유효한 경로 데이터가 없음');
    } catch (error) {
      console.error('경로 검색 오류:', error);
    }

    // API 실패 시 시작점과 끝점만 반환
    console.log('API 실패 - 직선 경로 사용');
    return [start, end];
  };

  // 경로 세그먼트 분석 및 턴 지점 찾기
  const analyzePathSegments = (path: { lat: number; lng: number }[]) => {
    const segments: { point: { lat: number; lng: number }; bearing: number; instruction: string }[] = [];

    for (let i = 0; i < path.length - 1; i++) {
      const bearing = calculateBearing(path[i].lat, path[i].lng, path[i + 1].lat, path[i + 1].lng);

      let instruction = "직진";
      if (i > 0) {
        const prevBearing = segments[i - 1].bearing;
        let bearingDiff = Math.abs(bearing - prevBearing);

        // 360도 경계를 넘는 경우 처리
        if (bearingDiff > 180) {
          bearingDiff = 360 - bearingDiff;
        }

        // 더 엄격한 기준으로 턴 판단
        if (bearingDiff >= 160) {
          // 160도 이상만 유턴으로 판단
          instruction = "유턴";
        } else if (bearingDiff >= 45 && bearingDiff < 135) {
          // 45도~135도 사이만 회전으로 판단
          // 오른쪽/왼쪽 판단
          let angleDiff = bearing - prevBearing;
          if (angleDiff < 0) angleDiff += 360;
          if (angleDiff > 180) angleDiff -= 360;

          instruction = angleDiff > 0 ? "우회전" : "좌회전";
        }
        // 45도 미만은 모두 직진
      }

      segments.push({
        point: path[i],
        bearing,
        instruction,
      });
    }

    return segments;
  };

  // 흡연부스 회피 경로 계산 (실제 도로 기반)
  const calculateAvoidanceRoute = async (
    start: { lat: number; lng: number },
    end: { lat: number; lng: number },
    booths: SmokingBooth[]
  ): Promise<{ lat: number; lng: number }[]> => {
    try {
      // 1. Kakao Mobility API로 실제 도보 경로 가져오기
      const walkingPath = await getWalkingRoute(start, end);

      // 2. 경로가 API에서 제대로 반환되었는지 확인
      if (walkingPath.length > 2) {
        // API 경로가 유효함 - 흡연부스 회피 로직 적용
        const avoidancePath: { lat: number; lng: number }[] = [start];

        for (let i = 1; i < walkingPath.length; i++) {
          const point = walkingPath[i];

          // 이 지점이 흡연부스에 너무 가까운지 확인
          let tooClose = false;
          let closestBooth: SmokingBooth | null = null;
          let minDistance = Infinity;

          for (const booth of booths) {
            const dist = calculateDistance(point.lat, point.lng, booth.lat, booth.lng);
            if (dist < 50 && dist < minDistance) { // 50m 이내
              tooClose = true;
              closestBooth = booth;
              minDistance = dist;
            }
          }

          if (tooClose && closestBooth) {
            // 흡연부스를 피하는 우회 지점 추가
            const prevPoint = avoidancePath[avoidancePath.length - 1];

            // 흡연부스 반대 방향으로 우회 지점 계산
            const bearing = calculateBearing(closestBooth.lat, closestBooth.lng, prevPoint.lat, prevPoint.lng);
            const avoidDist = 0.0006; // 약 60-70m 우회

            const avoidLat = closestBooth.lat + avoidDist * Math.cos((bearing * Math.PI) / 180);
            const avoidLng = closestBooth.lng + avoidDist * Math.sin((bearing * Math.PI) / 180);

            avoidancePath.push({ lat: avoidLat, lng: avoidLng });
          } else {
            avoidancePath.push(point);
          }
        }

        // 목적지 추가
        if (avoidancePath[avoidancePath.length - 1] !== end) {
          avoidancePath.push(end);
        }

        return avoidancePath;
      }
    } catch (error) {
      console.error("경로 계산 오류:", error);
    }

    // 3. API 실패 시 또는 경로가 짧은 경우, 간단한 직선 경로 생성
    console.warn("API 경로를 가져올 수 없어 직선 경로를 사용합니다.");
    const simplePath: { lat: number; lng: number }[] = [start];

    // 중간 지점 생성 (더 자연스러운 경로를 위해)
    const steps = 10;
    for (let i = 1; i <= steps; i++) {
      const ratio = i / steps;
      const lat = start.lat + (end.lat - start.lat) * ratio;
      const lng = start.lng + (end.lng - start.lng) * ratio;

      // 각 중간 지점에서 흡연부스 회피 확인
      let adjustedLat = lat;
      let adjustedLng = lng;

      for (const booth of booths) {
        const dist = calculateDistance(lat, lng, booth.lat, booth.lng);
        if (dist < 50) {
          // 흡연부스에서 멀어지는 방향으로 조정
          const bearing = calculateBearing(booth.lat, booth.lng, lat, lng);
          const offset = 0.0005; // 약 50m 오프셋
          adjustedLat += offset * Math.cos((bearing * Math.PI) / 180);
          adjustedLng += offset * Math.sin((bearing * Math.PI) / 180);
        }
      }

      simplePath.push({ lat: adjustedLat, lng: adjustedLng });
    }

    simplePath.push(end);
    return simplePath;
  };

  // 출발지 검색
  const handleStartSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startKeyword.trim() || !kakaoMapRef.current) return;

    const ps = new window.kakao.maps.services.Places();
    ps.keywordSearch(startKeyword, (data: any, status: any) => {
      if (status === window.kakao.maps.services.Status.OK && data.length > 0) {
        const result = data[0];
        const startPos = {
          lat: parseFloat(result.y),
          lng: parseFloat(result.x),
          name: result.place_name,
        };
        setStartPosition(startPos);
        setUseCurrentLocation(false);
        setNavigationActive(false);

        // 출발지 마커 추가
        new window.kakao.maps.Marker({
          position: new window.kakao.maps.LatLng(startPos.lat, startPos.lng),
          map: kakaoMapRef.current,
        });

        kakaoMapRef.current.setCenter(new window.kakao.maps.LatLng(startPos.lat, startPos.lng));
      } else {
        alert("검색 결과가 없습니다.");
      }
    });
  };

  // 목적지 검색
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchKeyword.trim() || !kakaoMapRef.current) return;

    const ps = new window.kakao.maps.services.Places();
    ps.keywordSearch(searchKeyword, (data: any, status: any) => {
      if (status === window.kakao.maps.services.Status.OK && data.length > 0) {
        const result = data[0];
        const destPos = {
          lat: parseFloat(result.y),
          lng: parseFloat(result.x),
          name: result.place_name,
        };
        setDestination(destPos);
        setNavigationActive(false);

        // 목적지 마커 추가
        new window.kakao.maps.Marker({
          position: new window.kakao.maps.LatLng(destPos.lat, destPos.lng),
          map: kakaoMapRef.current,
        });

        kakaoMapRef.current.setCenter(new window.kakao.maps.LatLng(destPos.lat, destPos.lng));
      } else {
        alert("검색 결과가 없습니다.");
      }
    });
  };

  // 경로 안내 시작
  const startNavigation = async () => {
    // 출발지 결정 (현재 위치 or 검색한 출발지)
    const origin = useCurrentLocation ? currentPosition : startPosition;

    if (!origin || !destination) {
      alert("출발지 또는 목적지가 설정되지 않았습니다.");
      return;
    }

    setNavigationActive(true);

    // 회피 경로 계산 (비동기)
    const avoidancePath = await calculateAvoidanceRoute(origin, destination, smokingBooths);
    setRoutePath(avoidancePath);

    // 경로 그리기
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
    }

    const linePath = avoidancePath.map(
      (coord: { lat: number; lng: number }) => new window.kakao.maps.LatLng(coord.lat, coord.lng)
    );

    // 메인 경로선
    const polyline = new window.kakao.maps.Polyline({
      path: linePath,
      strokeWeight: 6,
      strokeColor: "#3b82f6",
      strokeOpacity: 0.9,
      strokeStyle: "solid",
    });

    polyline.setMap(kakaoMapRef.current);
    polylineRef.current = polyline;

    // 경로 세그먼트 분석
    const segments = analyzePathSegments(avoidancePath);

    // 턴 지점에 화살표 표시
    segments.forEach((segment, index) => {
      if (segment.instruction !== "직진" && index < segments.length - 1) {
        const arrowContent = document.createElement('div');
        arrowContent.innerHTML = `
          <div style="
            background: #10b981;
            color: white;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: bold;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            white-space: nowrap;
            border: 2px solid white;
          ">
            ${segment.instruction}
          </div>
        `;

        const turnOverlay = new window.kakao.maps.CustomOverlay({
          position: new window.kakao.maps.LatLng(segment.point.lat, segment.point.lng),
          content: arrowContent,
          yAnchor: 1.5,
        });
        turnOverlay.setMap(kakaoMapRef.current);
        turnOverlaysRef.current.push(turnOverlay);
      }
    });

    // 목적지 마커
    const destContent = document.createElement('div');
    destContent.innerHTML = `
      <div style="
        width: 40px;
        height: 40px;
        background: #3b82f6;
        border: 4px solid white;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 3px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <span style="transform: rotate(45deg); font-size: 20px;">🎯</span>
      </div>
    `;

    const destOverlay = new window.kakao.maps.CustomOverlay({
      position: new window.kakao.maps.LatLng(destination.lat, destination.lng),
      content: destContent,
      yAnchor: 1.3,
    });
    destOverlay.setMap(kakaoMapRef.current);
    destOverlayRef.current = destOverlay;

    // 초기 방향 및 거리 계산
    if (avoidancePath.length > 1) {
      const bearing = calculateBearing(
        origin.lat,
        origin.lng,
        avoidancePath[1].lat,
        avoidancePath[1].lng
      );
      setDirection(getDirectionText(bearing));
      setDistance(calculateDistance(origin.lat, origin.lng, destination.lat, destination.lng));

      // 다음 턴까지의 거리 계산
      const nextTurnSegment = segments.find(seg => seg.instruction !== "직진");
      if (nextTurnSegment) {
        const distToTurn = calculateDistance(
          origin.lat,
          origin.lng,
          nextTurnSegment.point.lat,
          nextTurnSegment.point.lng
        );
        setNextTurn({ direction: nextTurnSegment.instruction, distance: distToTurn });
      }
    }
  };

  // 경로 안내 취소
  const stopNavigation = () => {
    setNavigationActive(false);
    setRoutePath([]);
    setDirection("");
    setDistance(0);
    setNextTurn(null);

    // 경로선 제거
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }

    // 회전 안내 오버레이 제거
    turnOverlaysRef.current.forEach(overlay => overlay.setMap(null));
    turnOverlaysRef.current = [];

    // 목적지 마커 제거
    if (destOverlayRef.current) {
      destOverlayRef.current.setMap(null);
      destOverlayRef.current = null;
    }
  };

  // 주변 흡연부스 개수 계산 (500m 이내)
  useEffect(() => {
    if (!currentPosition || smokingBooths.length === 0) return;

    let count = 0;
    for (const booth of smokingBooths) {
      const dist = calculateDistance(
        currentPosition.lat,
        currentPosition.lng,
        booth.lat,
        booth.lng
      );
      if (dist <= 500) {
        count++;
      }
    }
    setNearbyBoothsCount(count);
  }, [currentPosition, smokingBooths]);

  // 네비게이션 업데이트
  useEffect(() => {
    if (!navigationActive || !currentPosition || !destination || routePath.length === 0) return;

    // 현재 위치에서 가장 가까운 경로 지점 찾기
    let closestIndex = 0;
    let minDist = Infinity;

    for (let i = 0; i < routePath.length; i++) {
      const dist = calculateDistance(
        currentPosition.lat,
        currentPosition.lng,
        routePath[i].lat,
        routePath[i].lng
      );
      if (dist < minDist) {
        minDist = dist;
        closestIndex = i;
      }
    }

    // 다음 지점으로 방향 안내
    if (closestIndex < routePath.length - 1) {
      const nextPoint = routePath[closestIndex + 1];
      const bearing = calculateBearing(
        currentPosition.lat,
        currentPosition.lng,
        nextPoint.lat,
        nextPoint.lng
      );
      setDirection(getDirectionText(bearing));

      // 다음 턴 찾기
      const segments = analyzePathSegments(routePath.slice(closestIndex));
      const nextTurnSegment = segments.find(seg => seg.instruction !== "직진");

      if (nextTurnSegment) {
        const distToTurn = calculateDistance(
          currentPosition.lat,
          currentPosition.lng,
          nextTurnSegment.point.lat,
          nextTurnSegment.point.lng
        );
        setNextTurn({ direction: nextTurnSegment.instruction, distance: distToTurn });
      } else {
        setNextTurn(null);
      }
    }

    // 목적지까지 거리
    const distToDestination = calculateDistance(
      currentPosition.lat,
      currentPosition.lng,
      destination.lat,
      destination.lng
    );
    setDistance(distToDestination);

    // 목적지 도착 확인
    if (distToDestination < 10) {
      setNavigationActive(false);
      alert("목적지에 도착했습니다! 🎉");
    }
  }, [currentPosition, navigationActive, destination, routePath]);

  useEffect(() => {
    let intervalId: number | null = null;

    // 마커 생성 유틸리티
    const createMarkers = (map: any, lat: number, lng: number, booths: SmokingBooth[]) => {
      // 1. 사용자 마커
      const markerImage = new window.kakao.maps.MarkerImage(
        `${import.meta.env.BASE_URL}image/user-marker.svg`,
        new window.kakao.maps.Size(40, 50),
        { offset: new window.kakao.maps.Point(20, 50) }
      );

      const marker = new window.kakao.maps.Marker({
        position: new window.kakao.maps.LatLng(lat, lng),
        map: map,
        image: markerImage,
        zIndex: 10,
      });
      currentMarkerRef.current = marker;

      // 2. 흡연부스 마커 및 원
      booths.forEach((booth) => {
        const circle = new window.kakao.maps.Circle({
          center: new window.kakao.maps.LatLng(booth.lat, booth.lng),
          radius: 50,
          strokeWeight: 2,
          strokeColor: '#ff6b35',
          strokeOpacity: 0.6,
          strokeStyle: 'dashed',
          fillColor: '#ff6b35',
          fillOpacity: 0.15,
        });
        circle.setMap(map);

        const content = document.createElement('div');
        content.innerHTML = `
          <div style="position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
            <div style="width: 36px; height: 36px; background: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 3px 8px rgba(0,0,0,0.3); border: 2px solid #ff6b35;">
              <img src="${import.meta.env.BASE_URL}image/smoke_icon.png" style="width: 24px; height: 24px; object-fit: contain; mix-blend-mode: multiply; background: transparent;" />
            </div>
            <div style="position: absolute; top: -2px; right: -2px; width: 12px; height: 12px; background: #ff4444; border-radius: 50%; border: 2px solid white; animation: pulse 1.5s infinite;"></div>
          </div>
        `;

        const customOverlay = new window.kakao.maps.CustomOverlay({
          position: new window.kakao.maps.LatLng(booth.lat, booth.lng),
          content: content,
          map: map,
          yAnchor: 0.5,
          zIndex: 3,
        });

        smokingMarkersRef.current.push(customOverlay);
        smokingMarkersRef.current.push(circle);
      });
    };

    const startTracking = (map: any) => {
      if (watchIdRef.current) return;
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setCurrentPosition({ lat, lng });
          const movePos = new window.kakao.maps.LatLng(lat, lng);
          if (currentMarkerRef.current) {
            currentMarkerRef.current.setPosition(movePos);
          }
          if (navigationActive) {
            map.setCenter(movePos);
          }
        },
        (err) => console.error("Tracking error:", err),
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 }
      );
    };

    const initMap = () => {
      const booths = generateSmokingBooths();
      setSmokingBooths(booths);

      // 기본 위치 (서울) 설정
      const defaultLat = 37.5665;
      const defaultLng = 126.978;

      if (!mapRef.current || !window.kakao || !window.kakao.maps) return;

      window.kakao.maps.load(() => {
        try {
          setMapStatus("초기화 중...");
          const options = {
            center: new window.kakao.maps.LatLng(defaultLat, defaultLng),
            level: 5,
            scrollwheel: false,
          };
          const map = new window.kakao.maps.Map(mapRef.current!, options);
          map.setZoomable(false);
          kakaoMapRef.current = map;

          // 즉시 마커 생성 (기본 위치 기준)
          createMarkers(map, defaultLat, defaultLng, booths);

          setTimeout(() => {
            map.relayout();
            setMapStatus("위치 동기화 중...");
          }, 100);

          // 비동기로 실제 위치 가져오기
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                const { latitude, longitude } = pos.coords;
                const newPos = new window.kakao.maps.LatLng(latitude, longitude);
                setCurrentPosition({ lat: latitude, lng: longitude });
                map.setCenter(newPos);
                if (currentMarkerRef.current) {
                  currentMarkerRef.current.setPosition(newPos);
                }
                setMapStatus("완료");

                // 위치 추적 시작
                startTracking(map);
              },
              (err) => {
                console.warn("Geolocation failed, using default center.", err);
                setMapStatus("완료 (기본 위치)");
              },
              { enableHighAccuracy: true, timeout: 5000, maximumAge: 10000 }
            );
          }
        } catch (e) {
          console.error("Map init error:", e);
          setError("지도 로드에 실패했습니다.");
        }
      });
    };

    // CSS 애니메이션 추가 (한 번만)
    if (!document.querySelector('style[data-smoking-animation]')) {
      const style = document.createElement('style');
      style.setAttribute('data-smoking-animation', 'true');
      style.textContent = `
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.1); }
        }
      `;
      document.head.appendChild(style);
    }

    if (window.kakao && window.kakao.maps) {
      initMap();
    } else {
      intervalId = window.setInterval(() => {
        if (window.kakao && window.kakao.maps) {
          if (intervalId) clearInterval(intervalId);
          initMap();
        }
      }, 100);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, []);

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
    <section className="w-full py-0 flex items-center justify-center">
      <div className="w-full max-w-[1400px] mx-auto px-4 flex flex-col space-y-12">
        {/* 검색 및 네비게이션 컨트롤 */}
        <div className="bg-white/80 dark:bg-white/5 backdrop-blur-md p-6 rounded-2xl shadow-2xl border-2 border-green-200 dark:border-green-900 w-full text-center">
          <h2 className="text-2xl font-black mb-4 text-slate-900 dark:text-white">흡연부스 회피 네비게이션</h2>

          {/* 출발지 검색 */}
          <div className="mb-4">
            <div className="flex items-center justify-center gap-3 mb-2">
              <input
                type="checkbox"
                id="useCurrentLocation"
                checked={useCurrentLocation}
                onChange={(e) => setUseCurrentLocation(e.target.checked)}
                className="w-4 h-4 text-blue-600"
              />
              <label htmlFor="useCurrentLocation" className="text-sm font-bold text-slate-800 dark:text-slate-200">
                현재 위치를 출발지로 사용
              </label>
            </div>

            {!useCurrentLocation && (
              <form onSubmit={handleStartSearch} className="flex justify-center gap-4">
                <input
                  type="text"
                  placeholder="출발지를 검색하세요 (예: 서울역)"
                  className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-700 dark:bg-black/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  value={startKeyword}
                  onChange={(e) => setStartKeyword(e.target.value)}
                />
                <button
                  type="submit"
                  className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 font-semibold"
                >
                  출발지 검색
                </button>
              </form>
            )}

            {startPosition && (
              <p className="mt-2 text-sm text-slate-700 dark:text-slate-300 font-medium">
                출발지: <span className="font-black text-green-700 dark:text-green-400">{startPosition.name}</span>
              </p>
            )}
          </div>

          {/* 목적지 검색 */}
          <form onSubmit={handleSearch} className="flex flex-wrap justify-center gap-4 mb-4">
            <input
              type="text"
              placeholder="목적지를 검색하세요 (예: 강남역)"
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-700 dark:bg-black/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
            />
            <button
              type="submit"
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-semibold"
            >
              목적지 검색
            </button>
          </form>

          {destination && (
            <div className="flex items-center justify-center gap-4">
              <p className="text-gray-700 dark:text-gray-300">목적지: <span className="font-semibold">{destination.name}</span></p>
              <div className="flex gap-2">
                <button
                  onClick={startNavigation}
                  disabled={navigationActive}
                  className={`px-6 py-3 rounded-lg font-semibold ${navigationActive
                    ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                    : "bg-green-500 text-white hover:bg-green-600"
                    }`}
                >
                  {navigationActive ? "안내 중" : "경로 안내 시작"}
                </button>
                {navigationActive && (
                  <button
                    onClick={stopNavigation}
                    className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 font-semibold transition-all shadow-md active:scale-95"
                  >
                    경로안내취소
                  </button>
                )}
              </div>
            </div>
          )}

          {navigationActive && (
            <div className="mt-4 space-y-3">
              <div className="p-4 bg-green-50 rounded-lg border-2 border-green-500">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-2xl font-bold text-green-700 mb-1 text-center">
                      {direction} 방향으로 직진
                    </p>
                    <p className="text-sm text-gray-600 text-center">
                      목적지까지 약 {distance.toFixed(0)}m 남았습니다
                    </p>
                  </div>
                  <div className="text-5xl ml-4">
                    {direction.includes("북") && "⬆️"}
                    {direction.includes("남") && "⬇️"}
                    {direction.includes("동") && "➡️"}
                    {direction.includes("서") && "⬅️"}
                  </div>
                </div>
              </div>

              {nextTurn && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-300">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">
                      {nextTurn.direction === "좌회전" && "↰"}
                      {nextTurn.direction === "우회전" && "↱"}
                      {nextTurn.direction === "유턴" && "⤴️"}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-blue-700">
                        {nextTurn.distance.toFixed(0)}m 후 {nextTurn.direction}
                      </p>
                      <p className="text-xs text-gray-600">
                        턴 지점이 가까워지고 있습니다
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-300">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🚬</span>
                  <p className="text-xs text-gray-700">
                    <span className="font-semibold">흡연부스 회피 경로:</span> 주황색 원형 영역을 피해서 이동합니다
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 지도 영역 */}
        <div className="w-full flex-1">
          <div className="relative rounded-2xl overflow-hidden shadow-2xl border-2 border-blue-200 bg-gray-200 h-full">
            <div className="relative w-full h-[60vh] min-h-[400px]">
              <div ref={mapRef} className="w-full h-full"></div>

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

            {error && (
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-10">
                {error}
              </div>
            )}
            {/* 주변 흡연부스 개수 표시 (상시 또는 현재 위치 기준) */}
            <div className="absolute top-4 left-4 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-4 rounded-2xl shadow-xl border-2 border-orange-400 dark:border-orange-900/30 min-w-[180px]">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">🚬</span>
                <h4 className="text-sm font-black text-slate-900 dark:text-white">주변 흡연구역</h4>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-orange-50 rounded-lg">
                  <span className="text-[10px] font-bold text-orange-700">반경 500m</span>
                  <span className="text-sm font-black text-orange-900">{nearbyBoothsCount}개</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-yellow-50 rounded-lg">
                  <span className="text-[10px] font-bold text-yellow-700">전국 합계</span>
                  <span className="text-sm font-black text-yellow-900">{smokingBooths.length}개</span>
                </div>
              </div>
              <p className="text-[9px] text-slate-700 dark:text-slate-300 mt-2 text-center font-bold">
                {currentPosition ? "실시간 근처 수량" : "위치 탐색 대기 중"}
              </p>
            </div>

            <div className="absolute top-4 right-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg border border-gray-100 dark:border-slate-800 z-50">
              <p className="text-xs font-semibold text-gray-700 mb-2">범례</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                <span className="text-xs text-gray-600">현재 위치</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-base">🚬</span>
                <span className="text-xs text-gray-600">흡연부스 (50m 반경)</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-8 h-1 bg-green-500"></div>
                <span className="text-xs text-gray-600">안전 경로</span>
              </div>
            </div>
            {mapStatus !== "완료" && mapStatus !== "완료 (기본 위치)" && (
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/60 text-white px-4 py-2 rounded-full backdrop-blur-md z-[60] text-sm font-medium">
                {mapStatus}
              </div>
            )}
          </div>
        </div>

      </div>
    </section>
  );
}
