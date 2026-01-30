import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/footer";
import WalkCourseList from "../components/WalkCourseList";
import WalkCourseMap from "../components/WalkCourseMap";

interface Course {
  id: number;
  name: string;
  dist: string;
  lat: number;
  lng: number;
  desc: string;
  difficulty: "쉬움" | "보통" | "어려움";
  time: string;
  features: string[];
}

export default function WalkCoursePage() {
  const navigate = useNavigate();
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  // 스크롤 최상단 이동
  useEffect(() => {
    window.scrollTo(0, 0);
    document.body.style.overflow = "auto";
  }, [selectedCourse]);

  if (selectedCourse) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950">
        <WalkCourseMap 
          course={selectedCourse} 
          onBack={() => setSelectedCourse(null)} 
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      <Navbar />
      <main className="flex-1 mt-20">
        <WalkCourseList 
          onBack={() => navigate("/")} 
          onSelect={(course: any) => setSelectedCourse(course)} 
        />
      </main>
      <Footer />
    </div>
  );
}
