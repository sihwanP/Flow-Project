import { Routes, Route, BrowserRouter } from "react-router-dom";
import Home from "./pages/Home";
import ServicePage from "./pages/ServicePage";
import SmokingBoothDetailPage from "./pages/SmokingBoothDetailPage";
import CrowdDetailPage from "./pages/CrowdDetailPage";
import WalkCoursePage from "./pages/WalkCoursePage";
import SmokingMapPage from "./pages/SmokingMapPage";
import CrowdMapPage from "./pages/CrowdMapPage";

export default function App() {
  return (
    <>
      <BrowserRouter basename="/flow">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/service" element={<ServicePage />} />
          <Route path="/smoking-booth" element={<SmokingBoothDetailPage />} />
          <Route path="/crowd" element={<CrowdDetailPage />} />
          <Route path="/walk-course" element={<WalkCoursePage />} />
          <Route path="/smoking-map" element={<SmokingMapPage />} />
          <Route path="/crowd-map" element={<CrowdMapPage />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

