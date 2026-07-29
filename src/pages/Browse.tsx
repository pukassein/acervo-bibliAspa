import { useState, useMemo, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Book, searchBooks, fetchMetadata } from "@/data/Books";
import { BookCard } from "@/components/ui/BookCard";
import { Search, Filter, X } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Browse() {
  const [searchParams] = useSearchParams();
  
  const [books, setBooks] = useState<Book[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("All");
  const [showTags, setShowTags] = useState(false);
  
  const [currentPage, setCurrentPage] = useState(1);
  const booksPerPage = 20;

  // Metadata arrays
  const [mainCategories, setMainCategories] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>(["All"]);

  // Fetch metadata once
  useEffect(() => {
    fetchMetadata().then((data) => {
      setMainCategories(data.mainCategories as string[]);
      setAllTags(data.allTags as string[]);
      setLanguages(data.languages as string[]);
    });
  }, []);

  // Sync category from URL
  useEffect(() => {
    const cat = searchParams.get("category");
    if (cat) {
      setSelectedCategories([cat]);
    }
  }, [searchParams]);

  const loadBooks = useCallback(async () => {
    setLoading(true);
    const { books: fetchedBooks, totalCount: fetchedTotal } = await searchBooks({
      page: currentPage,
      limit: booksPerPage,
      searchQuery,
      categories: selectedCategories,
      language: selectedLanguage
    });
    setBooks(fetchedBooks);
    setTotalCount(fetchedTotal);
    setLoading(false);
  }, [currentPage, booksPerPage, searchQuery, selectedCategories, selectedLanguage]);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategories, selectedLanguage]);

  const totalPages = Math.ceil(totalCount / booksPerPage);

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
               value={selectedCategories.length === 0 ? "All" : selectedCategories[0]}
               onChange={(e) => {
                 if (e.target.value === "All") {
                   setSelectedCategories([]);
                 } else {
                   setSelectedCategories([e.target.value]);
                 }
               }}
               className="w-full bg-transparent border-b border-ink-900 py-2 font-serif text-ink-900 focus:outline-none cursor-pointer"
             >
               <option value="All">Ver Todas</option>
               {mainCategories.map(cat => (
                 <option key={cat} value={cat}>{cat}</option>
               ))}
             </select>
          </div>
          <div className="flex-1">
             <label className="text-[10px] uppercase tracking-[0.2em] text-ink-600 mb-2 block font-sans font-bold">Tags</label>
             <select 
               value={selectedCategories.length === 0 ? "All" : selectedCategories[0]}
               onChange={(e) => {
                 if (e.target.value === "All") {
                   setSelectedCategories([]);
                 } else {
                   setSelectedCategories([e.target.value]);
                 }
               }}
               className="w-full bg-transparent border-b border-ink-900 py-2 font-serif text-ink-900 focus:outline-none cursor-pointer"
             >
               <option value="All">Todas</option>
               {allTags.map(tag => (
                 <option key={tag} value={tag}>{tag}</option>
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
            <div className="flex justify-between items-center mb-4">
               <h3 className="text-[10px] uppercase tracking-[0.2em] text-ink-600 font-sans font-bold">Categoria</h3>
               {selectedCategories.length > 0 && (
                  <button onClick={() => setSelectedCategories([])} className="text-[10px] uppercase tracking-widest text-terracotta-500 font-bold hover:text-terracotta-600 border-b border-terracotta-500">Limpar</button>
               )}
            </div>
            <div className="space-y-3">
              {mainCategories.map(cat => {
                const isSelected = selectedCategories.includes(cat);
                return (
                  <label key={cat} className="flex items-center justify-between text-sm cursor-pointer group">
                    <div className="flex items-center space-x-3 flex-1 select-none text-ink-800">
                      <div className={cn(
                        "w-3 h-3 border border-ink-900 shrink-0 transition-colors",
                        isSelected ? "bg-ink-900" : "bg-transparent group-hover:bg-sand-300"
                      )}></div>
                      <span className={cn("font-serif group-hover:italic transition-all", isSelected ? "font-bold text-ink-900 italic" : "")}>
                        {cat}
                      </span>
                    </div>
                    <span className="text-[10px] opacity-50 font-sans ml-2 shrink-0">
                      {/* Count removed since we now paginate on the server */}
                    </span>
                    <input 
                       type="checkbox" 
                       className="hidden" 
                       checked={isSelected}
                       onChange={() => {
                          setSelectedCategories(prev => 
                             prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
                          );
                       }}
                    />
                  </label>
                );
              })}
            </div>
          </section>

          <section>
            <div className="flex justify-between items-center mb-4 cursor-pointer" onClick={() => setShowTags(!showTags)}>
               <h3 className="text-[10px] uppercase tracking-[0.2em] text-ink-600 font-sans font-bold flex items-center gap-2">
                 Tags {showTags ? "−" : "+"}
               </h3>
            </div>
            {showTags && (
              <div className="space-y-3">
                {allTags.map(tag => {
                  const isSelected = selectedCategories.includes(tag);
                  return (
                    <label key={tag} className="flex items-center justify-between text-sm cursor-pointer group">
                      <div className="flex items-center space-x-3 flex-1 select-none text-ink-800">
                        <div className={cn(
                          "w-3 h-3 border border-ink-900 shrink-0 transition-colors",
                          isSelected ? "bg-ink-900" : "bg-transparent group-hover:bg-sand-300"
                        )}></div>
                        <span className={cn("font-serif group-hover:italic transition-all", isSelected ? "font-bold text-ink-900 italic" : "")}>
                          {tag}
                        </span>
                      </div>
                      <span className="text-[10px] opacity-50 font-sans ml-2 shrink-0">
                        {/* Count removed */}
                      </span>
                      <input 
                         type="checkbox" 
                         className="hidden" 
                         checked={isSelected}
                         onChange={() => {
                            setSelectedCategories(prev => 
                               prev.includes(tag) ? prev.filter(c => c !== tag) : [...prev, tag]
                            );
                         }}
                      />
                    </label>
                  );
                })}
              </div>
            )}
          </section>

          <section>
            <h3 className="text-[10px] uppercase tracking-[0.2em] text-ink-600 mb-4 font-sans font-bold">Idioma / Dialeto</h3>
            <div className="space-y-3">
              {languages.map(lang => (
                <label key={lang} className="flex items-center justify-between text-sm cursor-pointer group">
                  <div className="flex items-center space-x-3">
                    <input 
                      type="radio" 
                      className="hidden" 
                      checked={selectedLanguage === lang}
                      onChange={() => setSelectedLanguage(lang)}
                    />
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
            Exibindo {totalCount} volume{totalCount !== 1 && 's'}
          </p>
          
          {loading ? (
             <div className="flex flex-col items-center justify-center py-24 text-center">
               <div className="w-8 h-8 border-4 border-ink-900 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
               <p className="text-ink-600 font-serif text-lg italic">Buscando no acervo...</p>
             </div>
          ) : totalCount > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
                {books.map((book) => (
                  <BookCard key={book.id} book={book} />
                ))}
              </div>
              
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 border-t border-sand-300 pt-8">
                  <button 
                    onClick={() => {
                      setCurrentPage(prev => Math.max(prev - 1, 1));
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    disabled={currentPage === 1}
                    className="px-4 py-2 text-xs uppercase tracking-widest font-bold text-ink-900 border border-sand-300 hover:bg-sand-200 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                  >
                    Anterior
                  </button>
                  <span className="font-serif text-ink-600 text-sm mx-4">
                    Página {currentPage} de {totalPages}
                  </span>
                  <button 
                    onClick={() => {
                      setCurrentPage(prev => Math.min(prev + 1, totalPages));
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 text-xs uppercase tracking-widest font-bold text-ink-900 border border-sand-300 hover:bg-sand-200 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                  >
                    Próxima
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-center border-y border-sand-300 bg-sand-200">
              <p className="text-ink-600 mb-4 font-serif text-lg italic">Nenhum livro encontrado com estes filtros.</p>
              <button 
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategories([]);
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
