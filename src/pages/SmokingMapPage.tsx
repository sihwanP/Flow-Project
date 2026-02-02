import { useNavigate } from "react-router-dom";
import SmokingMap from "../components/SmokingMap";

export default function SmokingMapPage() {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate("/#section-location");
  };

  return <SmokingMap onBack={handleBack} />;
}
