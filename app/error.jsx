'use client';

export default function GlobalError({ reset }) {
  return (
    <main style={{ minHeight: '50vh', display: 'grid', placeItems: 'center', padding: '4rem 1.25rem', background: '#faf7f2' }}>
      <section style={{ maxWidth: '34rem', textAlign: 'center', padding: '2.5rem', background: '#fff', borderRadius: '1.5rem', border: '1px solid #e7e5e4', boxShadow: '0 15px 40px rgba(0,0,0,0.06)' }}>
        <p style={{ margin: 0, color: '#c8a24a', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Luxury &amp; Elegant</p>
        <h1 style={{ margin: '0.75rem 0', color: '#0f3d2e', fontFamily: 'Georgia, serif', fontSize: '1.8rem' }}>This collection needs another moment</h1>
        <p style={{ color: '#57534e', lineHeight: 1.6 }}>The page could not finish loading. Your cart and saved items are still here.</p>
        <button onClick={() => reset()} style={{ marginTop: '0.5rem', border: 0, borderRadius: '9999px', padding: '0.8rem 1.5rem', color: '#fff', background: '#0f3d2e', fontWeight: 700, cursor: 'pointer' }}>Try again</button>
      </section>
    </main>
  );
}
