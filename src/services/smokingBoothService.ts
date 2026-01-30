/**
 * 전국 흡연부스 데이터 서비스
 *
 * 전국 주요 도시의 흡연부스 위치 데이터를 제공합니다.
 * 실제 운영 환경에서는 공공데이터포털 API를 연동하여 사용하십시오.
 */

export interface SmokingBooth {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address: string;
  city: string;
}

/**
 * 전국 흡연부스 데이터 생성 함수
 *
 * 실제 운영 환경에서는 공공데이터포털 또는 지자체 API를 통해
 * 실시간 데이터를 가져와야 합니다.
 *
 * @returns {SmokingBooth[]} 전국 흡연부스 배열
 */
export function getNationalSmokingBooths(): SmokingBooth[] {
  // 전국 주요 도시 중심 좌표
  const majorCities = [
    { name: "서울", lat: 37.5665, lng: 126.978 },
    { name: "부산", lat: 35.1796, lng: 129.0756 },
    { name: "대구", lat: 35.8714, lng: 128.6014 },
    { name: "인천", lat: 37.4563, lng: 126.7052 },
    { name: "광주", lat: 35.1595, lng: 126.8526 },
    { name: "대전", lat: 36.3504, lng: 127.3845 },
    { name: "울산", lat: 35.5384, lng: 129.3114 },
    { name: "세종", lat: 36.4801, lng: 127.2890 },
    { name: "경기", lat: 37.4138, lng: 127.5183 },
    { name: "강원", lat: 37.8228, lng: 128.1555 },
    { name: "충북", lat: 36.6357, lng: 127.4917 },
    { name: "충남", lat: 36.5184, lng: 126.8000 },
    { name: "전북", lat: 35.7175, lng: 127.1530 },
    { name: "전남", lat: 34.8679, lng: 126.9910 },
    { name: "경북", lat: 36.4919, lng: 128.8889 },
    { name: "경남", lat: 35.4606, lng: 128.2132 },
    { name: "제주", lat: 33.4996, lng: 126.5312 },
  ];

  const booths: SmokingBooth[] = [];
  let idCounter = 1;

  // 각 도시별로 흡연부스 생성 (도시당 15-25개)
  majorCities.forEach((city) => {
    const boothCount = Math.floor(Math.random() * 11) + 15; // 15-25개

    for (let i = 0; i < boothCount; i++) {
      // 중심 좌표로부터 반경 약 5km 내에 랜덤 배치
      const latOffset = (Math.random() - 0.5) * 0.09; // 약 ±5km
      const lngOffset = (Math.random() - 0.5) * 0.09;

      booths.push({
        id: `booth-${idCounter}`,
        name: `${city.name} 흡연부스 ${i + 1}`,
        latitude: city.lat + latOffset,
        longitude: city.lng + lngOffset,
        address: `${city.name} 지역 흡연부스`,
        city: city.name,
      });

      idCounter++;
    }
  });

  return booths;
}

/**
 * 특정 지역 근처의 흡연부스 필터링
 *
 * @param {number} centerLat - 중심 위도
 * @param {number} centerLng - 중심 경도
 * @param {number} radiusKm - 반경 (km)
 * @returns {SmokingBooth[]} 필터링된 흡연부스 배열
 */
export function getNearbySmokingBooths(
  centerLat: number,
  centerLng: number,
  radiusKm: number = 10
): SmokingBooth[] {
  const allBooths = getNationalSmokingBooths();

  return allBooths.filter((booth) => {
    const distance = calculateDistance(
      centerLat,
      centerLng,
      booth.latitude,
      booth.longitude
    );
    return distance <= radiusKm;
  });
}

/**
 * 두 좌표 간의 거리 계산 (Haversine formula)
 *
 * Haversine Formula: 지구 곡면 위 두 지점 사이의 최단 거리를 계산하는 공식입니다.
 *
 * @param {number} lat1 - 첫 번째 위도
 * @param {number} lng1 - 첫 번째 경도
 * @param {number} lat2 - 두 번째 위도
 * @param {number} lng2 - 두 번째 경도
 * @returns {number} 거리 (km)
 */
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // 지구 반경 (km)
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
}
