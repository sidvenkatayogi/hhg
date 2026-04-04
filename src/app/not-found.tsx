import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <div className="text-8xl mb-6">🪿</div>
      <h1 className="text-4xl font-display text-primary mb-4">404</h1>
      <p className="text-xl text-muted mb-8">
        This goose has flown the coop.
      </p>
      <Link
        href="/"
        className="bg-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-primary/80 transition-colors"
      >
        Back to the Honk Zone
      </Link>
    </div>
  );
}
