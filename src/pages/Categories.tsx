import { Link } from "react-router-dom";
import { Book, fetchBooks } from "@/data/books";
import { Folder } from "lucide-react";
import { useEffect, useState } from "react";

export default function Categories() {
  const [books, setBooks] = useState<Book[]>([]);

  useEffect(() => {
    fetchBooks().then(setBooks);
  }, []);

  const categories = Array.from(new Set(books.flatMap(b => b.categories).filter(Boolean) as string[]));

  // Count books per category
  const categoryCounts = categories.map(cat => ({
    name: cat,
    count: books.filter(b => b.categories.includes(cat)).length
  })).sort((a, b) => b.count - a.count);

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-12 border-b border-ink-900 pb-8 flex flex-col md:flex-row md:items-end justify-between">
        <div>
          <h1 className="font-serif text-5xl font-bold text-ink-900">Categorias</h1>
          <p className="font-arabic text-3xl text-terracotta-500 mt-2" dir="rtl">الفئات</p>
        </div>
        <p className="max-w-md text-ink-600 mt-4 md:mt-0 font-serif italic text-lg lg:text-right">
          Explore as coleções de nossa biblioteca digital divididas por estilo e gênero literário.
        </p>
      </div>

      <div className="flex flex-col border-t-2 border-ink-900">
        {categoryCounts.map(({ name, count }) => (
          <Link
            key={name}
            to={`/browse?category=${encodeURIComponent(name)}`}
            className="group flex flex-col md:flex-row md:items-center justify-between py-8 px-4 border-b border-sand-400 hover:bg-sand-200 transition-colors"
          >
            <div>
              <h3 className="font-serif text-3xl md:text-4xl text-ink-900 group-hover:text-terracotta-500 transition-colors">
                {name}
              </h3>
            </div>
            <div className="mt-4 md:mt-0 text-left md:text-right flex items-center md:justify-end">
              <span className="font-sans text-[11px] uppercase tracking-[0.2em] text-ink-600 font-bold group-hover:text-ink-900 transition-colors">
                {count} {count === 1 ? 'Volume' : 'Volumes'}
              </span>
              <span className="ml-6 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all font-serif text-terracotta-500 text-2xl">
                →
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
