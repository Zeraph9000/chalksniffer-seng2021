import Link from "next/link";

export default function Landing() {
  return (
    <main className="max-w-3xl mx-auto p-8">
      <section className="py-16 text-center">
        <h1 className="text-5xl font-bold mb-4">Chalksniffer</h1>
        <p className="text-xl text-gray-600 mb-8">The order management platform for bakeries and artisan producers.</p>
        <p className="text-gray-700 mb-8">
          Got a link from a bakery? Paste it into your browser. Run your own bakery?{" "}
          <Link href="/register" className="text-blue-600 underline">Create a store</Link>.
        </p>
      </section>
    </main>
  );
}
