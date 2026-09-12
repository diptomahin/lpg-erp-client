import { useEffect, useState } from "react";
import { getReportSettings } from "./reportSettings";

export function useReportSettings() {
  const [settings, setSettings] = useState(getReportSettings);

  useEffect(() => {
    const refresh = () => setSettings(getReportSettings());
    window.addEventListener("report-settings-changed", refresh);
    return () => window.removeEventListener("report-settings-changed", refresh);
  }, []);

  return settings;
}
