export default function PricingPage() {
  return (
    <div className="min-h-screen p-8 text-center">
      <h1 className="text-3xl font-bold mb-8">
        Pricing
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        <Plan
          name="Free"
          price="$0"
          features={[
            'Early Access',
            'Limited Automation',
          ]}
        />

        <Plan
          name="Pro"
          price="$19 / month"
          features={[
            'Unlimited Farming',
            'Auto Upgrades',
            'Priority Support',
          ]}
        />

        <Plan
          name="Enterprise"
          price="Custom"
          features={[
            'Alliance Support',
            'Advanced AI',
            'Custom Features',
          ]}
        />
      </div>
    </div>
  )
}

function Plan({
  name,
  price,
  features,
}: {
  name: string
  price: string
  features: string[]
}) {
  return (
    <div className="border rounded p-6">
      <h2 className="text-xl font-bold mb-2">{name}</h2>
      <p className="text-2xl mb-4">{price}</p>
      <ul className="space-y-2 text-sm">
        {features.map((f) => (
          <li key={f}>✓ {f}</li>
        ))}
      </ul>
    </div>
  )
}
