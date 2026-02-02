import { useNavigate } from "react-router-dom";
import CrowdMap from "../components/CrowdMap";

export default function CrowdMapPage() {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate("/#section-crowd");
  };

  return <CrowdMap onBack={handleBack} />;
}
