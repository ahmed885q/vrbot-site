import Link from "next/link";

export const metadata = {
  title: "Download VRBOT Agent - Viking Rise Automation",
  description: "Download and install VRBOT Agent to automate Viking Rise",
};

export default function DownloadPage() {
  return (
    <div className="min-h-screen bg-[#0b0f1a] text-white">
      {/* Header */}
      <nav className="border-b border-white/10 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-xl font-bold">
            🤖 VRBOT
          </Link>
          <div className="flex gap-4">
            <Link href="/dashboard" className="text-sm text-gray-400 hover:text-white">
              Dashboard
            </Link>
            <Link href="/login" className="text-sm text-gray-400 hover:text-white">
              Login
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-16">
        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Download <span className="text-purple-400">VRBOT Agent</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Automate your Viking Rise farms with our desktop agent.
            Connect to your dashboard and control everything remotely.
          </p>
        </div>

        {/* Download Card */}
        <div className="bg-[#1a1f2e] rounded-2xl p-8 mb-12 border border-white/10">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">🖥️</span>
                <div>
                  <h2 className="text-2xl font-bold">VRBOT Agent v3.0</h2>
                  <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">
                    Windows 10/11
                  </span>
                </div>
              </div>
              <p className="text-gray-400 mb-4">
                Multi-instance support · 37+ automated tasks · AI Vision · Real-time dashboard control
              </p>
              <div className="flex flex-wrap gap-2 mb-6">
                {["Multi-Farm", "Kill Monster", "Gather", "Niflung", "Alliance", "Daily Quests"].map((f) => (
                  <span key={f} className="text-xs bg-white/5 text-gray-300 px-2.5 py-1 rounded-full border border-white/10">
                    {f}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-3">
              
                href="https://github.com/ahmed885q/vrbot-agent/archive/refs/heads/main.zip"
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-8 py-4 rounded-xl text-center transition-all hover:scale-105 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download ZIP
              </a>
              
                href="https://github.com/ahmed885q/vrbot-agent"
                target="_blank"
                className="bg-white/5 hover:bg-white/10 text-gray-300 font-medium px-8 py-3 rounded-xl text-center transition-all border border-white/10 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                View on GitHub
              </a>
            </div>
          </div>
        </div>

        {/* Setup Steps */}
        <h2 className="text-2xl font-bold mb-8 text-center">Setup Guide</h2>
        <div className="grid gap-4 mb-12">
          {[
            {
              step: "1",
              title: "Install Requirements",
              desc: "Download and install LDPlayer 9 and Python 3.10+",
              links: [
                { text: "LDPlayer 9", url: "https://www.ldplayer.net/" },
                { text: "Python", url: "https://www.python.org/downloads/" },
              ],
            },
            {
              step: "2",
              title: "Download & Extract",
              desc: "Download the ZIP file above and extract it to any folder on your computer.",
            },
            {
              step: "3",
              title: "Run Setup",
              desc: "Open the extracted folder and double-click setup.bat to install dependencies.",
              code: "setup.bat",
            },
            {
              step: "4",
              title: "Get Your User ID",
              desc: "Log in to vrbot.me, go to your Dashboard, and copy your User ID from Settings.",
            },
            {
              step: "5",
              title: "Launch Agent",
              desc: "Open LDPlayer, start Viking Rise, then double-click start.bat. Paste your User ID and click Start Agent.",
              code: "start.bat",
            },
            {
              step: "6",
              title: "Control from Dashboard",
              desc: "Go to vrbot.me/dashboard, select your farms and tasks, and click Run. Watch the magic happen!",
            },
          ].map((item) => (
            <div key={item.step} className="bg-[#1a1f2e] rounded-xl p-5 border border-white/10 flex gap-4">
              <div className="w-10 h-10 rounded-full bg-purple-600/20 text-purple-400 flex items-center justify-center font-bold text-lg shrink-0">
                {item.step}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-1">{item.title}</h3>
                <p className="text-gray-400 text-sm">{item.desc}</p>
                {item.links && (
                  <div className="flex gap-3 mt-2">
                    {item.links.map((l) => (
                      <a key={l.text} href={l.url} target="_blank"
                        className="text-sm text-purple-400 hover:text-purple-300 underline">
                        {l.text} ↗
                      </a>
                    ))}
                  </div>
                )}
                {item.code && (
                  <code className="mt-2 inline-block bg-black/30 text-green-400 px-3 py-1 rounded text-sm">
                    {item.code}
                  </code>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Requirements */}
        <div className="bg-[#1a1f2e] rounded-2xl p-8 border border-white/10 mb-12">
          <h3 className="text-xl font-bold mb-4">System Requirements</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {[
              { label: "OS", value: "Windows 10/11 (64-bit)" },
              { label: "RAM", value: "8 GB minimum (16 GB for multi-farm)" },
              { label: "CPU", value: "Intel i5 / Ryzen 5 or better" },
              { label: "Storage", value: "2 GB per LDPlayer instance" },
              { label: "Software", value: "LDPlayer 9, Python 3.10+" },
              { label: "Network", value: "Stable internet connection" },
            ].map((r) => (
              <div key={r.label} className="flex justify-between bg-black/20 rounded-lg px-4 py-3">
                <span className="text-gray-400">{r.label}</span>
                <span className="font-medium">{r.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <p className="text-gray-400 mb-4">Need a subscription first?</p>
          <Link href="/pricing"
            className="bg-white/5 hover:bg-white/10 border border-white/10 text-white px-6 py-3 rounded-xl transition-all">
            View Plans & Pricing
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 text-center text-sm text-gray-500">
        <p>© 2026 VRBOT. All rights reserved.</p>
      </footer>
    </div>
  );
}
