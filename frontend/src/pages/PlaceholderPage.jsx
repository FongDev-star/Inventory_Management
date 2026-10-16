export default function PlaceholderPage({ title }) {
  return (
    <div className="rounded-box border border-base-300 bg-base-100 p-10 text-center">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mt-2 text-sm opacity-60">This page is coming next.</p>
    </div>
  );
}