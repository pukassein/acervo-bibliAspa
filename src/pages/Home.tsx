import { Link } from "react-router-dom";
import { Book, fetchBooks } from "@/data/books";
import { BookCard } from "@/components/ui/BookCard";
import { ArrowRight, Search } from "lucide-react";
import { useEffect, useState } from "react";

export default function Home() {
  const [featuredBooks, setFeaturedBooks] = useState<Book[]>([]);

  useEffect(() => {
    fetchBooks().then(books => setFeaturedBooks(books.slice(0, 4)));
  }, []);

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative py-24 sm:py-32 border-b border-sand-300 overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-[0.06] pointer-events-none flex items-center justify-center">
            <img 
               src="https://jvfruuneqfgqvdztspid.supabase.co/storage/v1/object/public/images/bibliaspa%20logo.jpg" 
               alt="" 
               className="w-full h-full object-cover sm:object-contain sm:w-2/3 mix-blend-multiply" 
            />
        </div>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center relative z-10">
          <h1 className="font-arabic text-6xl md:text-8xl text-ink-900 mb-6 drop-shadow-sm font-bold" dir="rtl">
            أهلاً بكم في مكتبتكم
          </h1>
          <h2 className="font-serif text-3xl md:text-5xl lg:text-7xl text-ink-900 tracking-tighter leading-tight max-w-3xl">
            Uma ponte para a <span className="text-terracotta-500 italic">literatura árabe</span> em São Paulo
          </h2>
          <p className="mt-8 max-w-xl text-sm uppercase tracking-widest text-ink-600 leading-relaxed font-sans">
            Explore a rica herança cultural do mundo árabe através de nossa coleção
          </p>
          
          <div className="mt-10 flex flex-col sm:flex-row gap-4 items-center justify-center w-full max-w-md">
            <Link 
              to="/browse" 
              className="w-full sm:w-auto bg-ink-900 text-white px-8 py-4 text-xs uppercase tracking-[0.2em] font-sans font-bold hover:bg-black transition-colors border border-ink-900"
            >
              Explorar Acervo
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Books Section */}
      <section className="py-20 border-b border-sand-300">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-12 border-b border-ink-900 pb-4">
            <div>
              <h2 className="text-[10px] uppercase tracking-[0.3em] font-bold text-terracotta-500 mb-2 font-sans">Destaques do Acervo</h2>
              <p className="font-arabic text-4xl text-ink-900" dir="rtl">كتب مختارة</p>
            </div>
            <Link 
              to="/browse" 
              className="hidden sm:inline-block text-xs uppercase tracking-widest text-ink-900 border-b border-ink-900 hover:text-terracotta-500 hover:border-terracotta-500 transition-colors font-sans font-bold"
            >
              Ver todos do acervo
            </Link>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {featuredBooks.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
          
          <div className="mt-10 sm:hidden flex justify-center border-t border-sand-300 pt-8">
            <Link 
              to="/browse" 
              className="text-xs uppercase tracking-widest text-ink-900 border-b border-ink-900 hover:text-terracotta-500 hover:border-terracotta-500 transition-colors font-sans font-bold"
            >
              Ver todos do acervo
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
