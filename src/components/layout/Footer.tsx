import { Link } from "react-router-dom";
import { BookOpen } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-sand-300 bg-sand-100 py-6 sm:h-16 flex items-center justify-center text-[10px] uppercase tracking-widest text-ink-600 font-sans">
      <div>© {new Date().getFullYear()} <a href="https://bibliaspa.org.br/" target="_blank" rel="noopener noreferrer" className="hover:text-terracotta-500 transition-colors font-bold">BibliASPA</a> - Biblioteca e Centro de Pesquisa</div>
    </footer>
  );
}
