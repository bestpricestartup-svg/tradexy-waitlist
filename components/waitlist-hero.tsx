const TRUST_BADGES = [
  "Verified results",
  "No fake traders",
  "Early access",
] as const;

export function WaitlistHero() {
  return (
    <div className="text-center sm:text-left">
      <h1 className="bg-gradient-to-br from-white via-slate-100 to-slate-400 bg-clip-text text-3xl font-bold leading-[1.15] tracking-tight text-transparent sm:text-4xl sm:leading-[1.12]">
        <span className="block">Stop trusting fake traders.</span>
        <span className="mt-2 block sm:mt-3">See real performance.</span>
      </h1>
      <div className="mt-6 max-w-lg space-y-3 text-base leading-relaxed text-tx-muted sm:mt-7">
        <p>
          Tradexy shows only verified trading results backed by Myfxbook data.
        </p>
        <p className="text-slate-400">No fake screenshots. Just verified data.</p>
      </div>
      <ul className="mt-8 flex list-none flex-wrap items-center justify-center gap-2 sm:justify-start sm:gap-2.5">
        {TRUST_BADGES.map((label) => (
          <li key={label}>
            <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-slate-300">
              <span aria-hidden className="mr-1.5 text-tx-neon">
                ✔
              </span>
              {label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
