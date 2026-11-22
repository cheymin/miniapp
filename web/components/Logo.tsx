import Link from 'next/link';

export function Logo({ href = '/', withSub = true }: { href?: string; withSub?: boolean }) {
  return (
    <Link href={href} className="brand" aria-label="Cheymin Pen 首页">
      <span className="brand-mark">CP</span>
      <span>
        Cheymin Pen
        {withSub ? <span className="brand-sub" style={{ display: 'block', lineHeight: 1.1 }}>pocket toolkit</span> : null}
      </span>
    </Link>
  );
}
