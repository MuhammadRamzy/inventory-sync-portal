import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">404</h1>
        <h2 className="text-xl md:text-2xl font-bold text-slate-800">Page Not Found</h2>
        <p className="text-slate-600 text-sm md:text-base leading-relaxed">
          The page you are looking for does not exist, has been moved, or is temporarily unavailable.
        </p>
        <div className="pt-4">
          <Link 
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 bg-brand-900 text-white font-bold text-sm uppercase tracking-wide rounded-full shadow-md hover:bg-brand-800 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
          >
            Return to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
