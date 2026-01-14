export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center text-center px-6">
      <h1 className="text-4xl font-bold mb-4">
        VRBOT
      </h1>

      <p className="text-lg text-gray-600 max-w-xl mb-8">
        Smart automation bot for Viking Rise.
        Farm, upgrade, and grow — automatically.
      </p>

      <div className="flex gap-4">
        <a
          href="/early-access"
          className="bg-black text-white px-6 py-3 rounded"
        >
          Get Early Access
        </a>

        <a
          href="/pricing"
          className="border px-6 py-3 rounded"
        >
          View Pricing
        </a>
      </div>
    </main>
  )
}
