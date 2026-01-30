// Open-Meteo Free API Service
const WEATHER_API_URL = "https://api.open-meteo.com/v1/forecast";
const AIR_QUALITY_API_URL = "https://air-quality-api.open-meteo.com/v1/air-quality";

export interface WeatherData {
  airQuality: {
    level: string;
    value: number; // PM10 기준
    color: string;
  };
  weather: {
    condition: string;
    temp: number;
    icon: string;
  };
  humidity: number;
  windSpeed: number;
}

// WMO Weather Code Mapping
function getWeatherCondition(code: number): { condition: string; icon: string } {
  // 0: Clear
  if (code === 0) return { condition: "맑음", icon: "☀️" };
  // 1-3: Partly Cloudy
  if (code >= 1 && code <= 3) return { condition: "구름 조금", icon: "⛅" };
  // 45, 48: Fog
  if (code === 45 || code === 48) return { condition: "안개", icon: "🌫️" };
  // 51-55: Drizzle
  if (code >= 51 && code <= 55) return { condition: "이슬비", icon: "🌦️" };
  // 61-65: Rain
  if (code >= 61 && code <= 65) return { condition: "비", icon: "🌧️" };
  // 66-67: Freezing Rain
  if (code === 66 || code === 67) return { condition: "진눈깨비", icon: "🌨️" };
  // 71-75: Snow
  if (code >= 71 && code <= 75) return { condition: "눈", icon: "❄️" };
  // 77: Snow grains
  if (code === 77) return { condition: "눈 날림", icon: "❄️" };
  // 80-82: Rain showers
  if (code >= 80 && code <= 82) return { condition: "소나기", icon: "☔" };
  // 85-86: Snow showers
  if (code >= 85 && code <= 86) return { condition: "눈 소나기", icon: "❄️" };
  // 95-99: Thunderstorm
  if (code >= 95 && code <= 99) return { condition: "뇌우", icon: "⚡" };

  return { condition: "맑음", icon: "☀️" };
}

// Korea PM10 Standard Mapping
function getAirQualityLevel(pm10: number): { level: string; color: string } {
  if (pm10 <= 30) return { level: "좋음", color: "#10B981" }; // Green
  if (pm10 <= 80) return { level: "보통", color: "#FBBF24" }; // Yellow
  if (pm10 <= 150) return { level: "나쁨", color: "#F97316" }; // Orange
  return { level: "매우 나쁨", color: "#EF4444" }; // Red
}

// Fetch Real Environment Data
export async function getEnvironmentData(lat: number = 37.5665, lng: number = 126.9780): Promise<WeatherData> {
  try {
    // 1. Fetch Weather
    const weatherRes = await fetch(
      `${WEATHER_API_URL}?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m`
    );
    const weatherJson = await weatherRes.json();

    // 2. Fetch Air Quality
    const airRes = await fetch(
      `${AIR_QUALITY_API_URL}?latitude=${lat}&longitude=${lng}&current=pm10,pm2_5`
    );
    const airJson = await airRes.json();

    if (!weatherRes.ok || !airRes.ok) {
      throw new Error("API response error");
    }

    // Process Weather
    const current = weatherJson.current;
    const weatherInfo = getWeatherCondition(current.weather_code);

    // Process Air Quality (PM10)
    const pm10 = airJson.current.pm10;
    const airInfo = getAirQualityLevel(pm10);

    return {
      airQuality: {
        level: airInfo.level,
        value: pm10,
        color: airInfo.color,
      },
      weather: {
        condition: weatherInfo.condition,
        temp: Math.round(current.temperature_2m),
        icon: weatherInfo.icon,
      },
      humidity: current.relative_humidity_2m,
      windSpeed: current.wind_speed_10m,
    };

  } catch (error) {
    console.warn("Failed to fetch real data, using fallback:", error);
    // Fallback Mock Data
    return {
      airQuality: { level: "보통", value: 45, color: "#FBBF24" },
      weather: { condition: "맑음", temp: 20, icon: "☀️" },
      humidity: 50,
      windSpeed: 2.5,
    };
  }
}

// Deprecated functions kept for compatibility if imported elsewhere, but redirecting to new logic or mock
export async function getAirQuality() {
  return { level: "보통", value: 45, color: "#FBBF24" };
}
export async function getMidTermForecast() {
  return null;
}
