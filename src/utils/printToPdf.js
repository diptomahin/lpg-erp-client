const safeFilePart = (value) =>
  String(value || "")
    .replace(/[<>:"/\\|?*]/g, "_")
    .replace(/\s+/g, " ")
    .trim();

export const printToPdf = (filename) => {
  const previousTitle = document.title;
  document.title = safeFilePart(filename) || previousTitle;
  try {
    window.print();
  } finally {
    document.title = previousTitle;
  }
};
