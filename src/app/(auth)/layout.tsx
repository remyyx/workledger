import Link from 'next/link';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-navy bg-gradient-glow flex flex-col items-center justify-center px-4">
      <Link href="/" className="flex items-center gap-2 mb-8">
        <div className="w-10 h-10 rounded-lg bg-gradient-brand flex items-center justify-center shadow-glow-sm">
          <span className="text-white font-bold text-lg">S</span>
        </div>
        <span className="text-xl font-semibold text-white">StudioLedger</span>
      </Link>
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  );
}
