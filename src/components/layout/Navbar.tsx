import { Link, useLocation } from "react-router-dom";
import { BookOpen, Menu, Search, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { name: "Início / الرئيسية", path: "/" },
  { name: "Acervo / الكتالوج", path: "/browse" },
  { name: "Categorias / الفئات", path: "/categories" },
];

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-sand-300 bg-sand-100">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center space-x-3 transition-opacity hover:opacity-80">
          <img src="https://jvfruuneqfgqvdztspid.supabase.co/storage/v1/object/public/images/bibliaspa%20logo.jpg" alt="BibliASPA Logo" className="h-10 w-auto mix-blend-multiply" width="160" height="80" decoding="async" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          <div className="flex items-baseline space-x-3">
             <span className="text-2xl font-bold tracking-tighter uppercase text-ink-900 font-serif">BibliASPA</span>
             <span className="text-xs uppercase tracking-widest text-terracotta-500 border-l border-sand-300 pl-3">Acervo Literário</span>
          </div>
        </Link>
        <nav className="hidden md:flex space-x-8 text-xs uppercase tracking-[0.2em] font-sans font-semibold">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={cn(
                "transition-colors",
                location.pathname === link.path ? "text-terracotta-500 border-b border-terracotta-500" : "text-ink-600 hover:text-terracotta-500"
              )}
            >
              {link.name.split(" / ")[0]}
            </Link>
          ))}
        </nav>
        <button
          className="md:hidden text-ink-900 py-2 px-1"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden border-t border-sand-300 bg-sand-100 pb-4 pt-2 font-sans">
          <div className="flex flex-col space-y-4 px-4 py-4 text-xs uppercase tracking-widest font-semibold">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "block",
                  location.pathname === link.path ? "text-terracotta-500" : "text-ink-600"
                )}
              >
                {link.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
