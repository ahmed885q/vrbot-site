'use client'
export default function Header() {
  return (
    <div className="flex justify-between items-center">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>
      <button
        onClick={() => document.documentElement.classList.toggle('dark')}
        className="px-3 py-1 rounded bg-gray-200"
      >
        Dark
      </button>
    </div>
  )
}
