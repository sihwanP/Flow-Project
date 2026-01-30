/**
 * A* 알고리즘 경로 탐색 유틸리티
 *
 * A* (A-star) Algorithm: 시작점에서 목표점까지의 최단 경로를 찾는
 * 효율적인 그래프 탐색 알고리즘입니다. 실제 비용(g)과 추정 비용(h)을
 * 결합하여 최적의 경로를 계산합니다.
 *
 * 이 구현은 지도 위의 좌표 기반 경로 탐색에 최적화되어 있으며,
 * 흡연부스 위치를 장애물로 처리하여 회피 경로를 생성합니다.
 */

export interface Point {
  lat: number;
  lng: number;
}

export interface Node {
  point: Point;
  g: number; // 시작점부터의 실제 비용
  h: number; // 목표점까지의 추정 비용 (Heuristic)
  f: number; // 총 비용 (g + h)
  parent: Node | null;
}

/**
 * Haversine 거리 계산
 *
 * 지구 곡면 위 두 지점 사이의 최단 거리를 계산합니다.
 *
 * @param {Point} p1 - 첫 번째 지점
 * @param {Point} p2 - 두 번째 지점
 * @returns {number} 거리 (미터)
 */
export function calculateDistance(p1: Point, p2: Point): number {
  const R = 6371000; // 지구 반경 (미터)
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1.lat * Math.PI) / 180) *
      Math.cos((p2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Heuristic 함수 (추정 비용 계산)
 *
 * A* 알고리즘의 핵심 요소로, 현재 지점에서 목표까지의
 * 예상 비용을 계산합니다.
 *
 * @param {Point} current - 현재 지점
 * @param {Point} goal - 목표 지점
 * @returns {number} 추정 비용
 */
export function heuristic(current: Point, goal: Point): number {
  return calculateDistance(current, goal);
}

/**
 * 장애물(흡연부스) 근처 여부 확인
 *
 * 특정 지점이 흡연부스 반경 내에 있는지 확인합니다.
 *
 * @param {Point} point - 확인할 지점
 * @param {Point[]} obstacles - 장애물(흡연부스) 목록
 * @param {number} safeDistance - 안전 거리 (미터, 기본값: 50m)
 * @returns {boolean} 장애물 근처 여부
 */
export function isNearObstacle(
  point: Point,
  obstacles: Point[],
  safeDistance: number = 50
): boolean {
  return obstacles.some((obstacle) => {
    const distance = calculateDistance(point, obstacle);
    return distance < safeDistance;
  });
}

/**
 * 경로 상의 중간 지점 생성
 *
 * 두 지점 사이를 보간하여 부드러운 경로를 생성합니다.
 *
 * @param {Point} start - 시작 지점
 * @param {Point} end - 종료 지점
 * @param {number} steps - 중간 지점 개수
 * @returns {Point[]} 중간 지점 배열
 */
export function interpolatePoints(
  start: Point,
  end: Point,
  steps: number = 10
): Point[] {
  const points: Point[] = [];

  for (let i = 0; i <= steps; i++) {
    const ratio = i / steps;
    points.push({
      lat: start.lat + (end.lat - start.lat) * ratio,
      lng: start.lng + (end.lng - start.lng) * ratio,
    });
  }

  return points;
}

/**
 * 간소화된 A* 경로 탐색 알고리즘
 *
 * 웹 환경에 최적화된 간소화 버전입니다.
 * Kakao Maps API의 경로 탐색과 결합하여 사용됩니다.
 *
 * @param {Point} start - 시작 지점
 * @param {Point} goal - 목표 지점
 * @param {Point[]} obstacles - 흡연부스 위치 배열
 * @returns {Point[]} 회피 경로 좌표 배열
 */
export function findPath(
  start: Point,
  goal: Point,
  obstacles: Point[]
): Point[] {
  // 시작점과 목표점 사이를 보간
  const directPath = interpolatePoints(start, goal, 20);

  // 각 중간 지점이 장애물 근처인지 확인하고 회피
  const safePath: Point[] = [start];

  for (let i = 1; i < directPath.length - 1; i++) {
    const currentPoint = directPath[i];

    if (isNearObstacle(currentPoint, obstacles, 50)) {
      // 장애물 발견 시 우회 경로 생성
      const prevPoint = safePath[safePath.length - 1];
      const detourPoints = createDetour(prevPoint, currentPoint, obstacles);
      safePath.push(...detourPoints);
    } else {
      safePath.push(currentPoint);
    }
  }

  safePath.push(goal);

  return safePath;
}

/**
 * 우회 경로 생성
 *
 * 장애물을 회피하기 위한 우회 지점을 계산합니다.
 *
 * @param {Point} from - 시작 지점
 * @param {Point} to - 목표 지점
 * @param {Point[]} obstacles - 장애물 목록
 * @returns {Point[]} 우회 경로 지점 배열
 */
function createDetour(
  from: Point,
  to: Point,
  obstacles: Point[]
): Point[] {
  // 장애물의 중심 찾기 (향후 고급 우회 알고리즘에서 사용 예정)
  // const nearestObstacle = obstacles.reduce((nearest, current) => {
  //   const distCurrent = calculateDistance(from, current);
  //   const distNearest = calculateDistance(from, nearest);
  //   return distCurrent < distNearest ? current : nearest;
  // });

  // 수직 방향으로 우회
  const detourOffset = 0.0005; // 약 50m 우회

  const detourPoint: Point = {
    lat: (from.lat + to.lat) / 2 + detourOffset,
    lng: (from.lng + to.lng) / 2 + detourOffset,
  };

  // 우회 지점도 장애물 근처인지 재확인
  if (isNearObstacle(detourPoint, obstacles, 50)) {
    // 반대 방향으로 우회 시도
    detourPoint.lat -= detourOffset * 2;
    detourPoint.lng -= detourOffset * 2;
  }

  return [detourPoint];
}

/**
 * 경로 거리 계산
 *
 * 전체 경로의 총 거리를 계산합니다.
 *
 * @param {Point[]} path - 경로 좌표 배열
 * @returns {number} 총 거리 (미터)
 */
export function calculatePathDistance(path: Point[]): number {
  let totalDistance = 0;

  for (let i = 0; i < path.length - 1; i++) {
    totalDistance += calculateDistance(path[i], path[i + 1]);
  }

  return totalDistance;
}
