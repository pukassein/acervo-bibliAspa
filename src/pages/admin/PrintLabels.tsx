import { useState, useMemo, useEffect } from "react";
import { Book, fetchBooks } from "@/data/mockBooks";
import { Printer, Check, Square, Search, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminPrintLabels() {
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBooks, setSelectedBooks] = useState<Set<string>>(new Set());
  const [isPrintMode, setIsPrintMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  useEffect(() => {
    fetchBooks().then(setBooks);
  }, []);

  const allCategories = useMemo(() => {
    const categories = new Set<string>();
    books.forEach(b => b.categories.forEach(c => categories.add(c)));
    return Array.from(categories).sort();
  }, [books]);

  const filteredBooks = useMemo(() => {
    return books.filter(book => {
      const matchesSearch = 
        book.translatedTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        book.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
        book.titleTransliteration.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = selectedCategory ? book.categories.includes(selectedCategory) : true;
      return matchesSearch && matchesCategory;
    });
  }, [books, searchTerm, selectedCategory]);

  const toggleBook = (id: string) => {
    const newSet = new Set(selectedBooks);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedBooks(newSet);
  };

  const selectAll = () => {
    const filteredIds = filteredBooks.map(b => b.id);
    const areAllSelected = filteredIds.length > 0 && filteredIds.every(id => selectedBooks.has(id));

    if (areAllSelected) {
      const newSet = new Set(selectedBooks);
      filteredIds.forEach(id => newSet.delete(id));
      setSelectedBooks(newSet);
    } else {
      const newSet = new Set(selectedBooks);
      filteredIds.forEach(id => newSet.add(id));
      setSelectedBooks(newSet);
    }
  };

  const handlePrint = () => {
    setIsPrintMode(true);
    setTimeout(() => {
      window.print();
    }, 500);
  };

  const selectedBooksList = books.filter(b => selectedBooks.has(b.id));

  if (isPrintMode) {
    return (
      <div className="bg-white text-black p-8 min-h-screen">
        <style>
          {`
            @media print {
              body * {
                visibility: hidden;
              }
              #print-section, #print-section * {
                visibility: visible;
              }
              #print-section {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
              }
              @page {
                size: A4;
                margin: 20mm;
              }
            }
          `}
        </style>
        
        <div className="mb-8 print:hidden flex justify-between items-center max-w-[210mm] mx-auto bg-sand-100 p-4 border border-sand-300">
          <button 
             onClick={() => setIsPrintMode(false)}
             className="border border-ink-900 px-6 py-2 text-xs font-bold uppercase tracking-widest hover:bg-white transition-colors"
          >
            Voltar
          </button>
          <button 
             onClick={() => window.print()}
             className="bg-ink-900 text-white px-6 py-2 text-xs font-bold uppercase tracking-widest hover:bg-black transition-colors flex items-center gap-2"
          >
            <Printer className="h-4 w-4" />
            Imprimir
          </button>
        </div>

        <div id="print-section" className="grid grid-cols-1 md:grid-cols-2 gap-8 gap-y-12 max-w-[210mm] mx-auto">
          {selectedBooksList.map((book) => (
            <div key={book.id} className="border border-gray-400 p-6 sm:p-8 w-full font-serif text-[12px] sm:text-[13px] leading-relaxed relative" style={{ maxWidth: "100%", height: "200px" }}>
              <div className="mb-2">
                {book.categories.join(" -- ")}
              </div>
              <div className="mb-1 text-justify">
                {book.author} ; {book.authorArabic}.
              </div>
              <div className="font-bold inline">
                {book.titleTransliteration}. 
              </div>
              <div className="inline">
                {" "}-- {book.publisher}, {book.publicationYear}.
              </div>
              <div className="mt-2">
                1 vol. ; 23 cm.
              </div>
              <div>
                {book.pages} p.
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 md:p-12">
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-ink-900 pb-6">
        <div>
          <h1 className="font-serif text-4xl font-bold text-ink-900 mb-2">Impressão de Etiquetas</h1>
          <p className="text-sm font-sans uppercase tracking-[0.2em] font-bold text-ink-600">Fichas catalográficas para os livros do acervo</p>
        </div>
        
        <button
          onClick={handlePrint}
          disabled={selectedBooks.size === 0}
          className="flex items-center gap-2 bg-ink-900 text-white px-6 py-3 text-xs font-sans font-bold uppercase tracking-widest hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Printer className="h-4 w-4" />
          Gerar Etiquetas ({selectedBooks.size})
        </button>
      </div>

      <div className="mb-6 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-ink-400" />
          <input 
            type="text" 
            placeholder="Buscar por título ou autor..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-sand-300 focus:outline-none focus:border-ink-900 font-sans text-sm transition-colors"
          />
        </div>
        <div className="relative md:w-64">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-ink-400" />
          <select 
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-sand-300 focus:outline-none focus:border-ink-900 font-sans text-sm transition-colors appearance-none"
          >
            <option value="">Todas as Categorias</option>
            {allCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white border border-sand-300 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm font-sans">
            <thead className="bg-sand-200 text-ink-900 text-[10px] uppercase tracking-widest border-b border-sand-300">
              <tr>
                <th className="px-6 py-4 font-bold w-16 text-center cursor-pointer" onClick={selectAll}>
                   <div className="flex justify-center">
                    {filteredBooks.length > 0 && filteredBooks.every(b => selectedBooks.has(b.id)) ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Square className="h-4 w-4 text-ink-400" />
                    )}
                   </div>
                </th>
                <th className="px-6 py-4 font-bold">Título / Autor</th>
                <th className="px-6 py-4 font-bold">Páginas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand-200">
              {filteredBooks.map((book) => (
                <tr 
                  key={book.id} 
                  className={cn(
                    "transition-colors cursor-pointer",
                    selectedBooks.has(book.id) ? "bg-sand-100" : "hover:bg-sand-50"
                  )}
                  onClick={() => toggleBook(book.id)}
                >
                  <td className="px-6 py-4 text-center">
                    <div className="flex justify-center text-ink-900">
                      {selectedBooks.has(book.id) ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Square className="h-4 w-4 text-ink-400" />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-serif font-bold text-ink-900 text-base">{book.translatedTitle}</span>
                      <span className="text-ink-600 text-xs mt-1">{book.author} | {book.titleTransliteration}</span>
                      <div className="flex gap-2 mt-2">
                        {book.categories.slice(0, 2).map((cat, idx) => (
                           <span key={idx} className="text-[9px] uppercase tracking-wider bg-sand-200 px-2 py-0.5 text-ink-600 rounded-sm">
                             {cat}
                           </span>
                        ))}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-bold text-ink-600">
                    {book.pages}
                  </td>
                </tr>
              ))}
              {filteredBooks.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-ink-600 font-serif italic text-lg bg-sand-100">
                    Nenhum volume encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
