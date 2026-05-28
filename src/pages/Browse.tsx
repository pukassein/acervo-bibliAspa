import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Book, fetchBooks } from "@/data/mockBooks";
import { BookCard } from "@/components/ui/BookCard";
import { Search, Filter, X } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Browse() {
  const [searchParams] = useSearchParams();
  
  const [books, setBooks] = useState<Book[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("All");

  useEffect(() => {
    fetchBooks().then(setBooks);
  }, []);

  useEffect(() => {
    const cat = searchParams.get("category");
    if (cat) {
      setSelectedCategory(cat);
    }
  }, [searchParams]);

  const categories = ["All", ...Array.from(new Set(books.flatMap(b => b.categories)))];
  const languages = ["All", ...Array.from(new Set(books.map(b => b.language)))];

  const filteredBooks = useMemo(() => {
    return books.filter((book) => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = 
        book.translatedTitle.toLowerCase().includes(searchLower) ||
        book.arabicTitle.toLowerCase().includes(searchLower) ||
        book.author.toLowerCase().includes(searchLower) ||
        book.titleTransliteration.toLowerCase().includes(searchLower);

      const matchesCategory = selectedCategory === "All" || book.categories.includes(selectedCategory);
      const matchesLanguage = selectedLanguage === "All" || book.language === selectedLanguage;

      return matchesSearch && matchesCategory && matchesLanguage;
    });
  }, [books, searchQuery, selectedCategory, selectedLanguage]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <h1 className="font-serif text-5xl font-bold text-ink-900">Acervo Digital</h1>
          <p className="font-arabic text-3xl text-terracotta-500 mt-2" dir="rtl">الكتالوج الرقمي</p>
        </div>
        
        <div className="w-full md:max-w-md relative border-b border-ink-900 pb-2">
          <div className="flex items-center">
            <input
              type="text"
              placeholder="Buscar título, autor ou ISBN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent w-full text-xl font-serif italic focus:outline-none placeholder:opacity-30"
            />
            {searchQuery ? (
              <button 
                onClick={() => setSearchQuery("")}
                className="text-ink-600 hover:text-ink-900 ml-2"
              >
                <X className="h-6 w-6" />
              </button>
            ) : (
              <Search className="h-6 w-6 text-ink-900 ml-2" />
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Mobile Filters */}
        <div className="lg:hidden flex flex-col sm:flex-row gap-4 w-full">
          <div className="flex-1">
             <label className="text-[10px] uppercase tracking-[0.2em] text-ink-600 mb-2 block font-sans font-bold">Categoria</label>
             <select 
               value={selectedCategory}
               onChange={(e) => setSelectedCategory(e.target.value)}
               className="w-full bg-transparent border-b border-ink-900 py-2 font-serif text-ink-900 focus:outline-none cursor-pointer"
             >
               {categories.map(cat => (
                 <option key={cat} value={cat}>{cat === "All" ? "Ver Todas" : cat}</option>
               ))}
             </select>
          </div>
          <div className="flex-1">
             <label className="text-[10px] uppercase tracking-[0.2em] text-ink-600 mb-2 block font-sans font-bold">Idioma / Dialeto</label>
             <select 
               value={selectedLanguage}
               onChange={(e) => setSelectedLanguage(e.target.value)}
               className="w-full bg-transparent border-b border-ink-900 py-2 font-serif text-ink-900 focus:outline-none cursor-pointer"
             >
               {languages.map(lang => (
                 <option key={lang} value={lang}>{lang === "All" ? "Todos os Idiomas" : lang}</option>
               ))}
             </select>
          </div>
        </div>

        {/* Desktop Filters Sidebar */}
        <div className="hidden lg:block lg:w-64 flex-shrink-0 space-y-10">
          <section>
            <h3 className="text-[10px] uppercase tracking-[0.2em] text-ink-600 mb-4 font-sans font-bold">Categoria</h3>
            <ul className="space-y-3 text-sm">
              {categories.map(cat => (
                <li key={cat} className="flex justify-between items-center group cursor-pointer" onClick={() => setSelectedCategory(cat)}>
                  <span className={cn("group-hover:italic font-serif", selectedCategory === cat ? "font-bold text-ink-900 italic" : "text-ink-800")}>
                    {cat === "All" ? "Ver Todas" : cat}
                  </span>
                  {cat !== "All" && (
                    <span className="text-[10px] opacity-50 font-sans">
                      {books.filter(b => b.categories.includes(cat)).length}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h3 className="text-[10px] uppercase tracking-[0.2em] text-ink-600 mb-4 font-sans font-bold">Idioma / Dialeto</h3>
            <div className="space-y-3">
              {languages.map(lang => (
                <label key={lang} className="flex items-center justify-between text-sm cursor-pointer group">
                  <div className="flex items-center space-x-3">
                    <div className={cn(
                      "w-3 h-3 border border-ink-900",
                      selectedLanguage === lang ? "bg-ink-900" : "bg-transparent group-hover:bg-sand-300"
                    )}></div>
                    <span className="font-serif">
                      {lang === "All" ? "Todos os Idiomas" : lang}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </section>
        </div>

        {/* Results Grid */}
        <div className="flex-1">
          <p className="text-[10px] text-ink-600 mb-6 font-bold uppercase tracking-widest font-sans">
            Exibindo {filteredBooks.length} volume{filteredBooks.length !== 1 && 's'}
          </p>
          
          {filteredBooks.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredBooks.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-center border-y border-sand-300 bg-sand-200">
              <p className="text-ink-600 mb-4 font-serif text-lg italic">Nenhum livro encontrado com estes filtros.</p>
              <button 
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("All");
                  setSelectedLanguage("All");
                }}
                className="text-xs uppercase tracking-widest font-bold text-ink-900 border-b border-ink-900 hover:text-terracotta-500 hover:border-terracotta-500 transition-colors font-sans"
              >
                Limpar filtros
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
