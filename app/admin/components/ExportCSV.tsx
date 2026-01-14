export default function ExportCSV({ data }: { data: any[] }) {
  function download() {
    const csv =
      "email,created_at\n" +
      data.map((r) => `${r.email},${r.created_at}`).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "early_access.csv";
    a.click();
  }

  return (
    <button
      onClick={download}
      className="px-3 py-1 bg-blue-600 text-white rounded"
    >
      Export CSV
    </button>
  );
}
