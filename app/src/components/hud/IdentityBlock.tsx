interface IdentityBlockProps {
  total: number
}

export default function IdentityBlock({ total }: IdentityBlockProps) {
  return (
    <div data-hud-ink className="pointer-events-none select-none">
      <h1 className="font-mono text-base font-bold tracking-[0.34em] text-slate-100 md:text-2xl md:tracking-[0.38em]">
        <span className="inline-block text-cyan-400 drop-shadow-[0_0_12px_rgba(6,182,212,0.8)]">A</span>STROBENDER
      </h1>
      <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.14em] text-slate-400 md:text-[11px] md:tracking-[0.2em]">
        <span className="md:hidden">{total.toLocaleString()} objects tracked</span>
        <span className="max-md:hidden">
          {total.toLocaleString()} objects tracked · 3D Solar System · CelesTrak TLE
        </span>
      </p>
    </div>
  )
}
