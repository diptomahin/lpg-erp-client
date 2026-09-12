const key = "lpg_report_settings";

export function getReportSettings() {
  try {
    return {
      showTheoreticalProfit: true,
      ...JSON.parse(localStorage.getItem(key) || "{}"),
    };
  } catch {
    return { showTheoreticalProfit: true };
  }
}

export function setReportSettings(settings) {
  localStorage.setItem(key, JSON.stringify(settings));
}
