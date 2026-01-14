export default function StatCard({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-xl bg-white p-5 shadow">
      <p className="text-sm opacity-70">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  )
}
