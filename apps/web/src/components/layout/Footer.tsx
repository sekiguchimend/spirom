import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-black text-white py-16" role="contentinfo">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-16">
          <nav aria-labelledby="footer-shop">
            <h2 id="footer-shop" className="font-bold text-sm uppercase tracking-widest mb-6 text-gray-400">Shop</h2>
            <ul className="space-y-4">
              <li><Link href="/products" className="text-sm font-bold hover:text-gray-300 transition-colors">Products</Link></li>
              <li><Link href="/categories" className="text-sm font-bold hover:text-gray-300 transition-colors">Categories</Link></li>
            </ul>
          </nav>
          <nav aria-labelledby="footer-support">
            <h2 id="footer-support" className="font-bold text-sm uppercase tracking-widest mb-6 text-gray-400">Support</h2>
            <ul className="space-y-4">
              <li><Link href="/faq" className="text-sm font-bold hover:text-gray-300 transition-colors">FAQ</Link></li>
              <li><Link href="/contact" className="text-sm font-bold hover:text-gray-300 transition-colors">Contact</Link></li>
              <li><Link href="/account/addresses/new" className="text-sm font-bold hover:text-gray-300 transition-colors">住所登録</Link></li>
            </ul>
          </nav>
          <nav aria-labelledby="footer-company">
            <h2 id="footer-company" className="font-bold text-sm uppercase tracking-widest mb-6 text-gray-400">Company</h2>
            <ul className="space-y-4">
              <li><Link href="/about" className="text-sm font-bold hover:text-gray-300 transition-colors">About</Link></li>
              <li><Link href="/blog" className="text-sm font-bold hover:text-gray-300 transition-colors">Blog</Link></li>
            </ul>
          </nav>
          <nav aria-labelledby="footer-legal">
            <h2 id="footer-legal" className="font-bold text-sm uppercase tracking-widest mb-6 text-gray-400">Legal</h2>
            <ul className="space-y-4">
              <li><Link href="/privacy" className="text-sm font-bold hover:text-gray-300 transition-colors">Privacy</Link></li>
              <li><Link href="/terms" className="text-sm font-bold hover:text-gray-300 transition-colors">Terms</Link></li>
            </ul>
          </nav>
        </div>

        <div className="pt-8 border-t border-gray-800 flex flex-col md:flex-row items-center justify-between gap-4">
          <Link href="/" className="text-2xl font-bold tracking-tighter">SPIROM</Link>
          <p className="text-gray-500 text-xs uppercase tracking-wide">&copy; {new Date().getFullYear()} SPIROM INC.</p>
        </div>
      </div>
    </footer>
  );
}
