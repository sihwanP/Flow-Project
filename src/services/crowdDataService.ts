/**
 * 실시간 혼잡도 데이터 서비스
 *
 * 이 서비스는 전국 주요 지역의 실시간 인구 혼잡도 데이터를 제공합니다.
 * 현재는 시간 기반 알고리즘을 사용하며, 실제 운영 환경에서는
 * 공공데이터포털 API를 연동하여 사용하십시오.
 *
 * ## 공공데이터 API 연동 가이드:
 *
 * 1. **서울 열린데이터광장 API**
 *    - URL: https://data.seoul.go.kr
 *    - API: 서울시 실시간 도시데이터 API
 *    - 인증키 발급 필요
 *
 * 2. **한국관광공사 Tour API**
 *    - URL: https://www.data.go.kr
 *    - API: 관광지 실시간 혼잡도 API
 *    - 인증키 발급 필요
 *
 * 3. **연동 예제 코드:**
 *    ```typescript
 *    const API_KEY = process.env.REACT_APP_CROWD_API_KEY;
 *    const response = await fetch(
 *      `https://api.example.com/crowd?key=${API_KEY}&location=${location}`
 *    );
 *    const data = await response.json();
 *    ```
 */

export interface CrowdLevel {
  level: "매우혼잡" | "혼잡" | "보통" | "여유";
  color: string;
  percentage: number;
}

export interface HourlyData {
  hour: number;
  population: number;
  level: "매우혼잡" | "혼잡" | "보통" | "여유";
}

export interface LocationCrowdData {
  name: string;
  lat: number;
  lng: number;
  currentPopulation: number;
  currentLevel: "매우혼잡" | "혼잡" | "보통" | "여유";
  hourlyData: HourlyData[];
  lastUpdated: Date;
}

/**
 * 시간대별 혼잡도 데이터 생성
 *
 * 날짜와 위치 정보를 시드로 사용하여 동일한 시간대에는 일관된 데이터를 반환합니다.
 *
 * @param {string} seedName - 위치 기반 시드 이름
 * @param {Date} date - 기준 날짜/시간
 * @returns {HourlyData[]} 24시간 혼잡도 데이터 배열
 */
export function generateHourlyData(seedName: string = "default", date: Date = new Date()): HourlyData[] {
  const hourlyData: HourlyData[] = [];
  const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD

  for (let hour = 0; hour < 24; hour++) {
    // 멱등성 있는 랜덤 시드 생성 (날짜 + 위치 + 시간)
    const seed = `${dateStr}-${seedName}-${hour}`;
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0;
    }
    const pseudoRandom = (Math.abs(hash) % 1000) / 1000;

    let basePopulation = 1000;
    let congestionPercent = 0;

    // 피크 타임 판정
    const isPeakTime =
      (hour >= 8 && hour < 10) || // 출근 시간
      (hour >= 12 && hour < 13) || // 점심시간
      (hour >= 18 && hour < 20);   // 퇴근 시간

    if (isPeakTime) {
      congestionPercent = 75 + pseudoRandom * 35; // 75% ~ 110%
    } else {
      congestionPercent = 15 + pseudoRandom * 45; // 15% ~ 60%
    }

    basePopulation = Math.floor((congestionPercent / 100) * 5000);
    const population = Math.floor(basePopulation * (0.9 + pseudoRandom * 0.2)); // ±10% 변동

    const level = getCrowdLevelFromPercent(congestionPercent);
    hourlyData.push({ hour, population, level });
  }

  return hourlyData;
}

/**
 * 혼잡도 퍼센트를 4단계 레벨로 변환
 *
 * 4단계 신호등 컬러 시스템:
 * - 여유 (초록): 0-50%
 * - 보통 (주황): 51-75%
 * - 혼잡 (연빨강): 76-100%
 * - 매우혼잡 (진빨강): 100% 초과
 *
 * @param {number} percent - 혼잡도 퍼센트
 * @returns {"매우혼잡" | "혼잡" | "보통" | "여유"} 혼잡도 레벨
 */
export function getCrowdLevelFromPercent(
  percent: number
): "매우혼잡" | "혼잡" | "보통" | "여유" {
  if (percent > 100) return "매우혼잡"; // 진빨강
  if (percent >= 76) return "혼잡"; // 연빨강
  if (percent >= 51) return "보통"; // 주황
  return "여유"; // 초록
}

/**
 * 혼잡도 레벨에 따른 색상 코드 반환
 *
 * @param {string} level - 혼잡도 레벨
 * @returns {string} 색상 코드 (Hex)
 */
export function getLevelColor(level: string): string {
  switch (level) {
    case "매우혼잡":
      return "#DC2626"; // 진빨강
    case "혼잡":
      return "#FF6B6B"; // 연빨강
    case "보통":
      return "#F97316"; // 주황
    case "여유":
      return "#10B981"; // 초록
    default:
      return "#6B7280"; // 회색
  }
}

/**
 * 특정 위치의 혼잡도 데이터 생성
 *
 * @param {string} name - 위치 이름
 * @param {number} lat - 위도
 * @param {number} lng - 경도
 * @returns {LocationCrowdData} 위치별 혼잡도 데이터
 */
export function generateLocationData(
  name: string,
  lat: number,
  lng: number
): LocationCrowdData {
  const currentTime = new Date();
  const hourlyData = generateHourlyData(name, currentTime);
  const currentHour = currentTime.getHours();
  const currentData = hourlyData[currentHour];

  return {
    name,
    lat,
    lng,
    currentPopulation: currentData.population,
    currentLevel: currentData.level,
    hourlyData,
    lastUpdated: currentTime,
  };
}

/**
 * 전국 주요 지역 목록
 */
export const majorLocations = [
  { name: "서울 명동", lat: 37.5636, lng: 126.9825 },
  { name: "서울 강남역", lat: 37.4979, lng: 127.0276 },
  { name: "서울 홍대입구", lat: 37.5564, lng: 126.9233 },
  { name: "부산 해운대", lat: 35.1588, lng: 129.1603 },
  { name: "부산 서면", lat: 35.1577, lng: 129.0595 },
  { name: "대구 동성로", lat: 35.8690, lng: 128.5936 },
  { name: "인천 차이나타운", lat: 37.4756, lng: 126.6164 },
  { name: "광주 충장로", lat: 35.1472, lng: 126.9169 },
  { name: "대전 성심당", lat: 36.3275, lng: 127.4258 },
  { name: "경주 불국사", lat: 35.7898, lng: 129.3320 },
  { name: "제주 중문", lat: 33.2545, lng: 126.4116 },
  { name: "강릉 경포대", lat: 37.7951, lng: 128.8964 },
];

/**
 * API 연동 준비 함수 (실제 구현 예정)
 *
 * 실제 운영 환경에서는 이 함수를 사용하여 공공데이터 API를 호출합니다.
 *
 * @param {string} location - 위치 이름
 * @returns {Promise<LocationCrowdData>} 실시간 혼잡도 데이터
 */
export async function fetchRealTimeCrowdData(
  location: string
): Promise<LocationCrowdData | null> {
  // TODO: 실제 API 연동 구현
  // const API_KEY = process.env.REACT_APP_CROWD_API_KEY;
  // const response = await fetch(`API_URL?key=${API_KEY}&location=${location}`);
  // const data = await response.json();
  // return parseApiResponse(data);

  console.warn(
    "실시간 API 연동이 필요합니다. 현재는 시뮬레이션 데이터를 사용합니다."
  );

  // 시뮬레이션 데이터 반환 (실제 환경에서 삭제 필요)
  const locationData = majorLocations.find((loc) => loc.name === location);
  if (locationData) {
    return generateLocationData(
      locationData.name,
      locationData.lat,
      locationData.lng
    );
  }

  return null;
}
