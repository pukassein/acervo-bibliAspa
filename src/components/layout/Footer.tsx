import { Link } from "react-router-dom";
import { Lock } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-sand-300 bg-sand-100 py-6 sm:h-16 flex flex-col sm:flex-row items-center justify-between px-6 text-[10px] uppercase tracking-widest text-ink-600 font-sans">
      <div>© {new Date().getFullYear()} <a href="https://bibliaspa.org.br/" target="_blank" rel="noopener noreferrer" className="hover:text-terracotta-500 transition-colors font-bold">BibliASPA</a> - Biblioteca e Centro de Pesquisa</div>
      <Link to="/admin" className="mt-4 sm:mt-0 flex items-center gap-1.5 opacity-40 hover:opacity-100 transition-opacity">
        <Lock className="w-3 h-3" />
        Admin
      </Link>
    </footer>
  );
}
