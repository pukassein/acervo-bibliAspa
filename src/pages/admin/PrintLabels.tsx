import { useState, useMemo, useEffect } from "react";
import { Book, fetchBooks } from "@/data/books";
import { Printer, Check, Square, Search, Filter, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

type DateFilterOption = "all" | "today" | "last7days" | "last30days" | "custom";

export default function AdminPrintLabels() {
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBooks, setSelectedBooks] = useState<Set<string>>(new Set());
  const [isPrintMode, setIsPrintMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilterOption>("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  useEffect(() => {
    fetchBooks().then(setBooks);
  }, []);

  const allCategories = useMemo(() => {
    const categories = new Set<string>();
    books.forEach(b => b.categories.forEach(c => categories.add(c)));
    return Array.from(categories).sort();
  }, [books]);

  const filteredBooks = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    let startCustom: Date | null = null;
    let endCustom: Date | null = null;
    
    if (customStartDate) {
      startCustom = new Date(customStartDate);
      startCustom.setHours(0, 0, 0, 0);
    }
    if (customEndDate) {
      endCustom = new Date(customEndDate);
      endCustom.setHours(23, 59, 59, 999);
    }

    return books.filter(book => {
      const matchesSearch = 
        book.translatedTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        book.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
        book.titleTransliteration.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = selectedCategory ? book.categories.includes(selectedCategory) : true;
      
      let matchesDate = true;
      if (book.createdAt) {
        const bookDate = new Date(book.createdAt);
        
        switch (dateFilter) {
          case "today":
            matchesDate = bookDate >= today;
            break;
          case "last7days":
            matchesDate = bookDate >= sevenDaysAgo;
            break;
          case "last30days":
            matchesDate = bookDate >= thirtyDaysAgo;
            break;
          case "custom":
            if (startCustom && bookDate < startCustom) matchesDate = false;
            if (endCustom && bookDate > endCustom) matchesDate = false;
            break;
        }
      } else if (dateFilter !== "all") {
        // If a filter is applied but the book has no date, it doesn't match
        matchesDate = false;
      }

      return matchesSearch && matchesCategory && matchesDate;
    });
  }, [books, searchTerm, selectedCategory, dateFilter, customStartDate, customEndDate]);

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
    // Configuration for the print grid:
    // Change these values to effortlessly adjust the layout (e.g. 3x7, 2x4).
    // The cards will automatically stretch to fill the grid cells.
    const PRINT_ROWS = 5;
    const PRINT_COLS = 2;
    const CARDS_PER_PAGE = PRINT_ROWS * PRINT_COLS;
    
    // Chunk the selected books into pages
    const pages = [];
    for (let i = 0; i < selectedBooksList.length; i += CARDS_PER_PAGE) {
      pages.push(selectedBooksList.slice(i, i + CARDS_PER_PAGE));
    }

    return (
      <div className="bg-sand-50 text-black min-h-screen py-8">
        <style>
          {`
            @media print {
              body, html {
                background-color: white !important;
              }
              body * {
                visibility: hidden;
              }
              #print-container, #print-container * {
                visibility: visible;
              }
              #print-container {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                background-color: white !important;
              }
              @page {
                size: A4;
                margin: 10mm;
              }
              .print-page {
                --page-height: 99vh !important;
                --page-width: 100% !important;
                --page-padding: 0 !important;
                box-shadow: none !important;
                margin-bottom: 0 !important;
              }
            }
          `}
        </style>
        
        <div className="mb-8 print:hidden flex justify-between items-center max-w-[210mm] mx-auto bg-white p-4 border border-sand-300 shadow-sm">
          <button 
             onClick={() => setIsPrintMode(false)}
             className="border border-ink-900 px-6 py-2 text-xs font-bold uppercase tracking-widest hover:bg-sand-50 transition-colors"
          >
            Voltar
          </button>
          <button 
             onClick={() => window.print()}
             className="bg-ink-900 text-white px-6 py-2 text-xs font-bold uppercase tracking-widest hover:bg-black transition-colors flex items-center gap-2"
          >
            <Printer className="h-4 w-4" />
            Imprimir ({selectedBooks.size})
          </button>
        </div>

        <div id="print-container" className="mx-auto">
          {pages.map((pageBooks, pageIndex) => (
            <div 
              key={pageIndex} 
              className="print-page shadow-md mb-8 bg-white mx-auto"
              style={{ 
                display: 'grid', 
                gridTemplateColumns: `repeat(${PRINT_COLS}, 1fr)`,
                gridTemplateRows: `repeat(${PRINT_ROWS}, 1fr)`,
                gap: '3mm',
                height: 'var(--page-height, 297mm)', 
                width: 'var(--page-width, 210mm)',
                padding: 'var(--page-padding, 10mm)',
                pageBreakAfter: 'always',
                boxSizing: 'border-box'
              }}
            >
              {pageBooks.map((book) => (
                <div 
                  key={book.id} 
                  className="bg-white border border-gray-400 border-dashed p-4 font-serif relative flex flex-col justify-center"
                  style={{ boxSizing: 'border-box' }}
                >
                  <div className="mb-2 text-[10px] uppercase tracking-wider text-ink-500 font-sans font-bold">
                    {book.categories[0] || "Sem Categoria"}
                  </div>
                  <div className="text-[12px] text-ink-800 leading-snug">
                    {book.author}{book.authorArabic ? `; ${book.authorArabic}` : ''}.
                  </div>
                  <div className="font-bold text-[14px] mt-1 text-ink-900 leading-tight">
                    {book.translatedTitle || book.titleTransliteration}. 
                  </div>
                  <div className="mt-1 text-[12px] text-ink-800 leading-snug">
                    -- {book.publisher || "Editora"}, {book.publicationYear || "s.d."}.
                  </div>
                  <div className="mt-1 text-[11px] text-ink-600">
                    {book.pages || "?"} p.; 21 cm.
                  </div>
                </div>
              ))}
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

      <div className="mb-6 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row gap-4">
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
          <div className="relative md:w-64">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-ink-400" />
            <select 
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as DateFilterOption)}
              className="w-full pl-10 pr-4 py-3 bg-white border border-sand-300 focus:outline-none focus:border-ink-900 font-sans text-sm transition-colors appearance-none"
            >
              <option value="all">Qualquer data</option>
              <option value="today">Adicionado hoje</option>
              <option value="last7days">Últimos 7 dias</option>
              <option value="last30days">Últimos 30 dias</option>
              <option value="custom">Data personalizada</option>
            </select>
          </div>
        </div>
        
        {dateFilter === 'custom' && (
          <div className="flex flex-col md:flex-row gap-4 items-center bg-sand-50 p-4 border border-sand-300">
            <span className="text-sm font-bold text-ink-900 uppercase tracking-wider">Período:</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-ink-600">De</span>
              <input 
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-2 bg-white border border-sand-300 focus:outline-none focus:border-ink-900 font-sans text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-ink-600">Até</span>
              <input 
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-2 bg-white border border-sand-300 focus:outline-none focus:border-ink-900 font-sans text-sm"
              />
            </div>
          </div>
        )}
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
