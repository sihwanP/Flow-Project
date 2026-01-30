import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import ServicePage from "./pages/ServicePage";
import SmokingBoothDetailPage from "./pages/SmokingBoothDetailPage";
import CrowdDetailPage from "./pages/CrowdDetailPage";
import WalkCoursePage from "./pages/WalkCoursePage";

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/service" element={<ServicePage />} />
        <Route path="/smoking-booth" element={<SmokingBoothDetailPage />} />
        <Route path="/crowd" element={<CrowdDetailPage />} />
        <Route path="/walk-course" element={<WalkCoursePage />} />
      </Routes>
    </>
  );
}

