import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Search, Edit, Trash2, MoreVertical, X, Save, Loader2, Wand2, CheckSquare, Square } from "lucide-react";
import { Book, fetchBooks } from "@/data/books";
import { supabase } from "@/lib/supabase";

export default function AdminDashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState<"newest" | "oldest" | "title" | "author">("newest");
  const [filterOption, setFilterOption] = useState<"all" | "newly_added" | "needs_verification" | "duplicates">("all");
  const [books, setBooks] = useState<Book[]>([]);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSearchingApi, setIsSearchingApi] = useState(false);
  const [apiResults, setApiResults] = useState<any[]>([]);
  const [showApiModal, setShowApiModal] = useState(false);
  const [isEnrichingAi, setIsEnrichingAi] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const adminLevel = sessionStorage.getItem("adminLevel");
  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    fetchBooks().then(setBooks);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortOption, filterOption]);

  const getDuplicateKey = (b: Book) => {
    const title = (b.translatedTitle || b.arabicTitle || '').trim().toLowerCase();
    const author = (b.author || b.authorArabic || '').trim().toLowerCase();
    return title || author ? `${title}|${author}` : b.id;
  };

  const getCompleteness = (b: Book) => [
    b.arabicTitle, b.titleTransliteration, b.translatedTitle, b.author, b.authorArabic,
    b.language, b.publicationYear, b.publisher, b.isbn, b.pages, b.description,
    b.categories?.length, b.shelf, b.coverImage, b.city, b.series, b.size, b.volumeNumber
  ].filter(value => value !== undefined && value !== null && value !== '' && value !== 0).length;

  const duplicatesMap = new Map<string, number>();
  books.forEach(b => {
    const key = getDuplicateKey(b);
    duplicatesMap.set(key, (duplicatesMap.get(key) || 0) + 1);
  });

  const checkIsDuplicate = (b: Book) => {
    return duplicatesMap.get(getDuplicateKey(b))! > 1;
  };

  const isLessCompleteDuplicate = (b: Book) => {
    if (!checkIsDuplicate(b)) return false;
    const group = books.filter(other => getDuplicateKey(other) === getDuplicateKey(b));
    return getCompleteness(b) < Math.max(...group.map(getCompleteness));
  };

  let filteredBooks = books.filter(book => 
    (book.translatedTitle || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (book.arabicTitle || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (book.author || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (book.isbn || '').includes(searchQuery)
  );

  if (filterOption === "newly_added") {
    // Filter books added in the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    filteredBooks = filteredBooks.filter(book => book.createdAt && new Date(book.createdAt) > sevenDaysAgo);
  } else if (filterOption === "needs_verification") {
    filteredBooks = filteredBooks.filter(book => book.needsVerification);
  } else if (filterOption === "duplicates") {
    filteredBooks = filteredBooks.filter(book => checkIsDuplicate(book));
  }

  filteredBooks = filteredBooks.sort((a, b) => {
    switch (sortOption) {
      case "oldest":
        return (a.createdAt || "").localeCompare(b.createdAt || "");
      case "title":
        return (a.translatedTitle || a.arabicTitle || "").localeCompare(b.translatedTitle || b.arabicTitle || "");
      case "author":
        return (a.author || a.authorArabic || "").localeCompare(b.author || b.authorArabic || "");
      case "newest":
      default:
        return (b.createdAt || "").localeCompare(a.createdAt || "");
    }
  });

  const totalPages = Math.ceil(filteredBooks.length / ITEMS_PER_PAGE);
  const paginatedBooks = filteredBooks.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);


  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja remover este volume do acervo?")) {
      const { error } = await supabase.from('books').delete().eq('id', id);
      if (error) {
        alert(`Erro ao deletar: ${error.message}`);
        return;
      }
      setBooks(books.filter(b => b.id !== id));
      setSelectedIds(prev => { const next = new Set(prev); next.delete(id); return next; });
    }
  };

  const toggleSelected = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAllVisible = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      const allSelected = paginatedBooks.length > 0 && paginatedBooks.every(book => next.has(book.id));
      paginatedBooks.forEach(book => allSelected ? next.delete(book.id) : next.add(book.id));
      return next;
    });
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (!ids.length || !confirm(`Excluir ${ids.length} volume(s) selecionado(s)? Esta ação não pode ser desfeita.`)) return;
    const { error } = await supabase.from('books').delete().in('id', ids);
    if (error) { alert(`Erro ao deletar: ${error.message}`); return; }
    setBooks(prev => prev.filter(book => !selectedIds.has(book.id)));
    setSelectedIds(new Set());
  };

  const handleAIEnrich = async () => {
    if (!editingBook) return;
    setIsEnrichingAi(true);
    try {
      const bookData = {
        arabicTitle: editingBook.arabicTitle,
        translatedTitle: editingBook.translatedTitle,
        transliteration: editingBook.titleTransliteration,
        authorArabic: editingBook.authorArabic,
        authorLatin: editingBook.author,
        synopsis: editingBook.description
      };

      const res = await fetch("/api/gemini/enrich-book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ book: bookData })
      });
      if (!res.ok) throw new Error("Falha no enriquecimento IA");
      const data = await res.json();
      
      setEditingBook({
        ...editingBook,
        arabicTitle: data.arabicTitle || editingBook.arabicTitle,
        translatedTitle: data.translatedTitle || editingBook.translatedTitle,
        titleTransliteration: data.transliteration || editingBook.titleTransliteration,
        authorArabic: data.authorArabic || editingBook.authorArabic,
        author: data.authorLatin || editingBook.author,
        description: data.synopsis || editingBook.description,
        categories: Array.from(new Set([...(editingBook.categories || []), ...(data.categories || [])]))
      });
    } catch (err: any) {
      alert(`Erro IA: ${err.message}`);
    } finally {
      setIsEnrichingAi(false);
    }
  };

  const searchGoogleBooks = async () => {
    if (!editingBook) return;
    const bestTitle = editingBook.arabicTitle || editingBook.translatedTitle || editingBook.titleTransliteration || "";
    const bestAuthor = editingBook.authorArabic || editingBook.author || "";
    
    // As per user request, search using arabic title
    const searchTerms = `${editingBook.arabicTitle || bestTitle} ${editingBook.authorArabic || bestAuthor}`.trim();

    if (!searchTerms) {
       alert("Preencha o título ou autor (preferencialmente em árabe) para buscar.");
       return;
    }
    
    setIsSearchingApi(true);
    try {
      console.log("Iniciando busca na API com:", searchTerms);
      
      const containsArabic = (text: string) => /[\u0600-\u06FF]/.test(text || '');

      const performFetchAndParse = async (queryToSearch: string) => {
        // Fetch concurrently
        const [googleRes, openLibRes] = await Promise.allSettled([
           fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(queryToSearch)}&maxResults=5`, { referrerPolicy: "no-referrer" }),
           fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(queryToSearch)}&limit=5`)
        ]);

        const resultsMap: Record<string, any> = {};

        if (openLibRes.status === 'fulfilled' && openLibRes.value.ok) {
          const data = await openLibRes.value.json();
          const docs = data.docs || [];
          docs.forEach((doc: any) => {
             const id = doc.isbn && doc.isbn.length > 0 ? doc.isbn[0] : doc.key;
             resultsMap[id] = {
               id,
               title: doc.title,
               authors: doc.author_name,
               publishedDate: doc.first_publish_year?.toString(),
               publisher: doc.publisher ? doc.publisher[0] : null,
               pageCount: doc.number_of_pages_median,
               language: doc.language ? "Árabe" : undefined, // Simplify for now
               industryIdentifiers: doc.isbn ? [{type: "ISBN_13", identifier: doc.isbn[0]}] : null,
               imageLinks: doc.cover_i ? { thumbnail: `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` } : null,
               description: "",
               categories: doc.subject ? doc.subject.slice(0, 5) : []
             };
          });
        }

        if (googleRes.status === 'fulfilled' && googleRes.value.ok) {
          const data = await googleRes.value.json();
          const items = data.items || [];
          items.forEach((item: any) => {
             resultsMap[item.id] = { id: item.id, ...item.volumeInfo };
          });
        }

        return Object.values(resultsMap);
      };

      let mergedList = await performFetchAndParse(searchTerms);

      if (mergedList.length === 0) {
         try {
            const fixRes = await fetch("/api/gemini/fix-search-query", {
               method: "POST",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify({ query: searchTerms })
            });
            if (fixRes.ok) {
               const data = await fixRes.json();
               if (data.correctedQuery && data.correctedQuery !== searchTerms) {
                  mergedList = await performFetchAndParse(data.correctedQuery);
               }
            }
         } catch (e) {
            console.error("Failed to spellcheck query", e);
         }
      }

      setApiResults(mergedList);
      
      if (mergedList.length === 0) {
        alert("Nenhum resultado encontrado na API (Google Books e OpenLibrary).");
      } else {
        setShowApiModal(true);
      }
    } catch (err: any) {
      console.error("Erro na busca:", err);
      alert(`Erro na busca: ${err.message}`);
    } finally {
      setIsSearchingApi(false);
    }
  };

  const applyApiResult = (info: any) => {
    if (!editingBook) return;
    setEditingBook({
      ...editingBook,
      publicationYear: editingBook.publicationYear || (info.publishedDate ? parseInt(info.publishedDate.substring(0, 4)) : 0) || 0,
      publisher: editingBook.publisher || info.publisher || "",
      pages: editingBook.pages || parseInt(info.pageCount) || 0,
      language: editingBook.language || info.language || "Árabe",
      isbn: editingBook.isbn || (info.industryIdentifiers ? (info.industryIdentifiers.find((i: any) => i.type === "ISBN_13" || i.type === "ISBN_10")?.identifier || info.industryIdentifiers[0].identifier) : ""),
      coverImage: editingBook.coverImage || (info.imageLinks ? info.imageLinks.thumbnail?.replace('http:', 'https:') : ""),
      description: (editingBook.description && !editingBook.description.startsWith("Source:")) ? editingBook.description : (info.description || editingBook.description || ""),
      categories: Array.from(new Set([...(editingBook.categories || []), ...(info.categories || [])]))
    });
    setApiResults([]);
    setShowApiModal(false);
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBook) return;

    setIsSaving(true);
    try {
      const { error } = await supabase.from('books').update({
        arabic_title: editingBook.arabicTitle,
        transliteration: editingBook.titleTransliteration,
        translated_title: editingBook.translatedTitle,
        author_latin: editingBook.author,
        author_arabic: editingBook.authorArabic,
        language: editingBook.language,
        publication_year: editingBook.publicationYear,
        publisher: editingBook.publisher,
        isbn: editingBook.isbn,
        pages: editingBook.pages,
        synopsis: editingBook.description,
        cover_image: editingBook.coverImage,
        city: editingBook.city,
        series: editingBook.series,
        size: editingBook.size,
        categories: editingBook.categories,
        needs_verification: editingBook.needsVerification,
        bundle_id: editingBook.bundleId || null,
        volume_number: editingBook.volumeNumber || null,
      }).eq('id', editingBook.id);

      if (error) throw error;

      setBooks(books.map(b => b.id === editingBook.id ? editingBook : b));
      setEditingBook(null);
    } catch (error: any) {
      alert(`Erro ao salvar: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-8 md:p-12 relative">
      <div className="mb-10 flex flex-col gap-6 border-b border-ink-900 pb-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="font-serif text-4xl font-bold text-ink-900 mb-2">Painel de Controle</h1>
            <p className="text-sm font-sans uppercase tracking-[0.2em] font-bold text-ink-600">Gestão do Acervo Literário</p>
          </div>
          
          <div className="w-full flex-col sm:flex-row flex md:max-w-xl gap-4 relative">
            <div className="flex items-center flex-1">
              <Search className="h-5 w-5 text-ink-600 mr-2" />
              <input
                type="text"
                placeholder="Buscar no acervo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent w-full text-lg font-serif italic focus:outline-none placeholder:opacity-40 border-b border-ink-900 pb-1"
              />
            </div>
            <div className="flex-shrink-0">
               <select 
                 value={sortOption}
                 onChange={(e) => setSortOption(e.target.value as any)}
                 className="bg-transparent border-b border-ink-900 py-1 font-serif text-ink-900 focus:outline-none cursor-pointer uppercase tracking-widest text-xs font-bold"
               >
                  <option value="newest">Mais Recentes</option>
                  <option value="oldest">Mais Antigos</option>
                  <option value="title">Título A-Z</option>
                  <option value="author">Autor A-Z</option>
               </select>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => setFilterOption("all")}
            className={`px-4 py-1.5 text-xs uppercase tracking-widest font-bold border transition-colors ${filterOption === "all" ? "bg-ink-900 text-white border-ink-900" : "bg-transparent text-ink-600 border-ink-300 hover:border-ink-900"}`}
          >
            Todos
          </button>
          <button 
            onClick={() => setFilterOption("newly_added")}
            className={`px-4 py-1.5 text-xs uppercase tracking-widest font-bold border transition-colors ${filterOption === "newly_added" ? "bg-ink-900 text-white border-ink-900" : "bg-transparent text-ink-600 border-ink-300 hover:border-ink-900"}`}
          >
            Recém Adicionados
          </button>
          <button 
            onClick={() => setFilterOption("needs_verification")}
            className={`px-4 py-1.5 text-xs uppercase tracking-widest font-bold border transition-colors ${filterOption === "needs_verification" ? "bg-terracotta-500 text-white border-terracotta-500" : "bg-transparent text-ink-600 border-ink-300 hover:border-ink-900"}`}
          >
            Para Verificar
          </button>
          <button 
            onClick={() => setFilterOption("duplicates")}
            className={`px-4 py-1.5 text-xs uppercase tracking-widest font-bold border transition-colors ${filterOption === "duplicates" ? "bg-ink-900 text-white border-ink-900" : "bg-transparent text-ink-600 border-ink-300 hover:border-ink-900"}`}
          >
            Duplicados
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-xs text-ink-600 font-sans">
          <button
            onClick={toggleAllVisible}
            className="inline-flex items-center gap-2 px-3 py-2 border border-sand-300 hover:border-ink-900 text-ink-900 uppercase tracking-widest font-bold"
            title="Selecionar ou desselecionar os volumes desta página"
          >
            {paginatedBooks.length > 0 && paginatedBooks.every(book => selectedIds.has(book.id))
              ? <CheckSquare className="h-4 w-4" />
              : <Square className="h-4 w-4" />}
            Selecionar página
          </button>
          <span>{selectedIds.size} selecionado(s)</span>
        </div>
        <button
          onClick={handleBulkDelete}
          disabled={selectedIds.size === 0}
          className="inline-flex items-center gap-2 px-4 py-2 bg-terracotta-500 text-white uppercase tracking-widest text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-terracotta-600"
        >
          <Trash2 className="h-4 w-4" /> Excluir selecionados
        </button>
      </div>

      <div className="bg-white border border-sand-300 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm font-sans">
            <thead className="bg-sand-200 text-ink-900 text-[10px] uppercase tracking-widest border-b border-sand-300">
              <tr>
                <th className="px-6 py-4 font-bold w-12">Selecionar</th>
                <th className="px-6 py-4 font-bold">Título / Autor</th>
                <th className="px-6 py-4 font-bold">Data de Adição</th>
                <th className="px-6 py-4 font-bold">Idioma</th>
                <th className="px-6 py-4 font-bold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand-200">
              {paginatedBooks.map((book) => (
                <tr key={book.id} className={`hover:bg-sand-50 transition-colors ${selectedIds.has(book.id) ? 'bg-sand-50' : ''}`}>
                  <td className="px-6 py-4">
                    <button onClick={() => toggleSelected(book.id)} title={selectedIds.has(book.id) ? "Desselecionar" : "Selecionar"}>
                      {selectedIds.has(book.id) ? <CheckSquare className="h-5 w-5 text-ink-900" /> : <Square className="h-5 w-5 text-ink-400" />}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-serif font-bold text-ink-900 text-base">{book.translatedTitle || book.arabicTitle}</span>
                        {book.needsVerification && (
                          <span className="inline-block px-1.5 py-0.5 bg-terracotta-100 text-terracotta-600 border border-terracotta-200 text-[9px] uppercase tracking-wider font-bold whitespace-nowrap">
                            Para Verificar
                          </span>
                        )}
                        {checkIsDuplicate(book) && (
                          <span className="inline-block px-1.5 py-0.5 bg-yellow-100 text-yellow-800 border border-yellow-300 text-[9px] uppercase tracking-wider font-bold whitespace-nowrap" title="Pode haver outro livro com mesmo título e autor">
                            Duplicado
                          </span>
                        )}
                        {isLessCompleteDuplicate(book) && (
                          <span className="inline-block px-1.5 py-0.5 bg-red-100 text-red-700 border border-red-200 text-[9px] uppercase tracking-wider font-bold whitespace-nowrap" title={`Registro menos completo (${getCompleteness(book)} campos preenchidos)`}>
                            Menos completo
                          </span>
                        )}
                        {book.volumeNumber && (
                          <span className="inline-block px-1.5 py-0.5 bg-blue-100 text-blue-800 border border-blue-300 text-[9px] uppercase tracking-wider font-bold whitespace-nowrap">
                            Vol: {book.volumeNumber}
                          </span>
                        )}
                        {book.bundleId && (
                          <span className="inline-block px-1.5 py-0.5 bg-purple-100 text-purple-800 border border-purple-300 text-[9px] uppercase tracking-wider font-bold whitespace-nowrap" title="Faz parte de uma coleção/bundle">
                            Bundle
                          </span>
                        )}
                      </div>
                      <span className="text-ink-600 text-xs mt-1">{book.author || book.authorArabic}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-ink-600 text-xs tabular-nums">
                      {book.createdAt ? new Date(book.createdAt).toLocaleDateString('pt-BR') : 'Desconhecida'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-block px-2 py-1 bg-sand-100 border border-sand-300 text-[10px] uppercase tracking-wider font-bold text-ink-600">
                      {book.language || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-3">
                      <button 
                        onClick={() => setEditingBook({...book})} 
                        className="text-ink-600 hover:text-ink-900 transition-colors" 
                        title="Editar"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDelete(book.id)} className="text-terracotta-500 hover:text-terracotta-600 transition-colors" title="Excluir">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedBooks.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-ink-600 font-serif italic text-lg bg-sand-100">
                    Nenhum volume encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-sand-300 bg-sand-50">
            <span className="text-xs text-ink-600 uppercase tracking-widest font-bold">Página {currentPage} de {totalPages}</span>
            <div className="flex gap-2">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-xs border border-sand-300 uppercase tracking-widest font-bold text-ink-900 disabled:opacity-30 hover:bg-sand-100"
              >
                Anterior
              </button>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-xs border border-sand-300 uppercase tracking-widest font-bold text-ink-900 disabled:opacity-30 hover:bg-sand-100"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 backdrop-blur-sm p-4">
          <div className="bg-sand-50 w-full max-w-4xl border border-sand-300 shadow-xl flex flex-col max-h-[90vh]">
            <div className="p-4 md:p-6 border-b border-sand-300 flex justify-between items-start bg-white shrink-0">
              <div>
                <h2 className="font-serif text-xl md:text-2xl font-bold text-ink-900 mb-1">Editar Volume</h2>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-ink-500 font-mono bg-sand-100 px-1.5 py-0.5 border border-sand-200">ID: {editingBook.id}</span>
                  <button 
                    type="button" 
                    onClick={() => {
                      navigator.clipboard.writeText(editingBook.id);
                      alert("ID copiado!");
                    }}
                    className="text-[10px] uppercase font-bold text-ink-600 hover:text-ink-900 transition-colors"
                  >
                    Copiar ID
                  </button>
                </div>
              </div>
              <button type="button" onClick={() => setEditingBook(null)} className="text-ink-600 hover:text-ink-900 transition-colors">
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-4 md:p-6 overflow-y-auto flex-1">
              <div className="flex flex-wrap gap-4 mb-6 pb-6 border-b border-sand-300">
                {adminLevel === "full" && (
                <button 
                  type="button"
                  onClick={handleAIEnrich} 
                  disabled={isEnrichingAi}
                  className="text-[10px] flex items-center gap-1.5 uppercase font-bold text-terracotta-500 hover:text-ink-900 transition-colors"
                >
                  {isEnrichingAi ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Wand2 className="w-3.5 h-3.5"/>} Preencher Titulo/Autor via IA
                </button>
                )}
                <button 
                  type="button"
                  onClick={searchGoogleBooks} 
                  disabled={isSearchingApi}
                  className="text-[10px] flex items-center gap-1.5 uppercase font-bold text-ink-600 hover:text-ink-900 transition-colors border border-ink-600 hover:border-ink-900 bg-white px-3 py-1.5"
                >
                  {isSearchingApi ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Search className="w-3.5 h-3.5"/>} Buscar na API
                </button>
              </div>

              {/* API search results moved to separate modal */}

              <form id="edit-form" onSubmit={handleEditSave} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-bold text-ink-900 mb-1">Título Traduzido</label>
                  <input 
                    type="text" 
                    value={editingBook.translatedTitle} 
                    onChange={e => setEditingBook({...editingBook, translatedTitle: e.target.value})}
                    className="w-full bg-white border border-sand-300 px-3 py-2 text-sm focus:outline-none focus:border-terracotta-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-bold text-ink-900 mb-1">Título em Árabe</label>
                  <input 
                    type="text" 
                    value={editingBook.arabicTitle} 
                    onChange={e => setEditingBook({...editingBook, arabicTitle: e.target.value})}
                    className="w-full bg-white border border-sand-300 px-3 py-2 text-sm focus:outline-none focus:border-terracotta-500 text-right"
                    dir="rtl"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-bold text-ink-900 mb-1">Autor (Latim)</label>
                  <input 
                    type="text" 
                    value={editingBook.author} 
                    onChange={e => setEditingBook({...editingBook, author: e.target.value})}
                    className="w-full bg-white border border-sand-300 px-3 py-2 text-sm focus:outline-none focus:border-terracotta-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-bold text-ink-900 mb-1">Autor (Árabe)</label>
                  <input 
                    type="text" 
                    value={editingBook.authorArabic} 
                    onChange={e => setEditingBook({...editingBook, authorArabic: e.target.value})}
                    className="w-full bg-white border border-sand-300 px-3 py-2 text-sm focus:outline-none focus:border-terracotta-500 text-right"
                    dir="rtl"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-bold text-ink-900 mb-1">Idioma</label>
                  <input 
                    type="text" 
                    value={editingBook.language} 
                    onChange={e => setEditingBook({...editingBook, language: e.target.value})}
                    className="w-full bg-white border border-sand-300 px-3 py-2 text-sm focus:outline-none focus:border-terracotta-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-bold text-ink-900 mb-1">Ano de Publicação</label>
                  <input 
                    type="number" 
                    value={editingBook.publicationYear || ''} 
                    onChange={e => setEditingBook({...editingBook, publicationYear: parseInt(e.target.value) || 0})}
                    className="w-full bg-white border border-sand-300 px-3 py-2 text-sm focus:outline-none focus:border-terracotta-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-bold text-ink-900 mb-1">Editora</label>
                  <input 
                    type="text" 
                    value={editingBook.publisher} 
                    onChange={e => setEditingBook({...editingBook, publisher: e.target.value})}
                    className="w-full bg-white border border-sand-300 px-3 py-2 text-sm focus:outline-none focus:border-terracotta-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-bold text-ink-900 mb-1">Cidade (Publicação)</label>
                  <input 
                    type="text" 
                    value={editingBook.city || ''} 
                    onChange={e => setEditingBook({...editingBook, city: e.target.value})}
                    className="w-full bg-white border border-sand-300 px-3 py-2 text-sm focus:outline-none focus:border-terracotta-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-bold text-ink-900 mb-1">Série</label>
                  <input 
                    type="text" 
                    value={editingBook.series || ''} 
                    onChange={e => setEditingBook({...editingBook, series: e.target.value})}
                    className="w-full bg-white border border-sand-300 px-3 py-2 text-sm focus:outline-none focus:border-terracotta-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-bold text-ink-900 mb-1">Tamanho (cm)</label>
                  <input 
                    type="text" 
                    value={editingBook.size || ''} 
                    onChange={e => setEditingBook({...editingBook, size: e.target.value})}
                    className="w-full bg-white border border-sand-300 px-3 py-2 text-sm focus:outline-none focus:border-terracotta-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-bold text-ink-900 mb-1">ISBN</label>
                  <input 
                    type="text" 
                    value={editingBook.isbn} 
                    onChange={e => setEditingBook({...editingBook, isbn: e.target.value})}
                    className="w-full bg-white border border-sand-300 px-3 py-2 text-sm focus:outline-none focus:border-terracotta-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-bold text-ink-900 mb-1">ID do Bundle (Opcional)</label>
                  <input 
                    type="text" 
                    value={editingBook.bundleId || ''} 
                    onChange={e => setEditingBook({...editingBook, bundleId: e.target.value})}
                    placeholder="Cole o ID de outro livro para agrupar"
                    className="w-full bg-white border border-sand-300 px-3 py-2 text-sm focus:outline-none focus:border-terracotta-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-bold text-ink-900 mb-1">Volume/Parte (Opcional)</label>
                  <input 
                    type="text" 
                    value={editingBook.volumeNumber || ''} 
                    onChange={e => setEditingBook({...editingBook, volumeNumber: e.target.value})}
                    placeholder="Ex: Vol 1, Parte 2"
                    className="w-full bg-white border border-sand-300 px-3 py-2 text-sm focus:outline-none focus:border-terracotta-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-bold text-ink-900 mb-1">Capa (URL)</label>
                <input 
                  type="text" 
                  value={editingBook.coverImage || ''} 
                  onChange={e => setEditingBook({...editingBook, coverImage: e.target.value})}
                  className="w-full bg-white border border-sand-300 px-3 py-2 text-sm focus:outline-none focus:border-terracotta-500 mb-2"
                />
                <input 
                  type="file" 
                  accept="image/*"
                  capture="environment"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) {
                      e.target.value = '';
                      alert('Selecione uma imagem válida de até 5 MB.');
                      return;
                    }
                    
                    try {
                      setIsSaving(true);
                      const { default: imageCompression } = await import('browser-image-compression');
                      const options = {
                        maxSizeMB: 0.2,
                        maxWidthOrHeight: 800,
                        useWebWorker: true
                      };
                      const compressedFile = await imageCompression(file, options);
                      
                      const fileName = `thumb_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
                      
                      const { data, error } = await supabase.storage
                        .from('book-thumbnails')
                        .upload(fileName, compressedFile, {
                          cacheControl: '3600',
                          upsert: false
                        });
                        
                      if (error) throw error;
                      
                      const { data: { publicUrl } } = supabase.storage
                        .from('book-thumbnails')
                        .getPublicUrl(fileName);
                        
                      setEditingBook({...editingBook, coverImage: publicUrl});
                      alert("Imagem carregada com sucesso!");
                    } catch (err: any) {
                      console.error("Upload erro:", err);
                      alert(`Erro ao fazer upload: ${err.message}. Verifique se o bucket 'book-thumbnails' existe no Supabase.`);
                    } finally {
                      setIsSaving(false);
                    }
                  }}
                  className="w-full text-xs text-ink-600 file:mr-4 file:py-2 file:px-4 file:border-0 file:text-xs file:font-bold file:bg-sand-200 file:text-ink-900 hover:file:bg-sand-300"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-ink-900 mb-1">
                  <input 
                    type="checkbox" 
                    checked={editingBook.needsVerification || false}
                    onChange={e => setEditingBook({...editingBook, needsVerification: e.target.checked})}
                    className="accent-terracotta-500 h-4 w-4"
                  />
                  Marcado para Verificação
                </label>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-widest font-bold text-ink-900 mb-1">Sinopse</label>
                <textarea 
                  value={editingBook.description} 
                  onChange={e => setEditingBook({...editingBook, description: e.target.value})}
                  className="w-full bg-white border border-sand-300 px-3 py-2 text-sm focus:outline-none focus:border-terracotta-500 h-32"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-widest font-bold text-ink-900 mb-1">Tags / Categorias (Separadas por vírgula)</label>
                <input 
                  type="text" 
                  value={(editingBook.categories || []).join(", ")} 
                  onChange={e => setEditingBook({...editingBook, categories: e.target.value.split(",").map(s => s.trim()).filter(Boolean)})}
                  className="w-full bg-white border border-sand-300 px-3 py-2 text-sm focus:outline-none focus:border-terracotta-500"
                />
              </div>

              </form>
            </div>
            
            <div className="p-4 bg-white border-t border-sand-300 shrink-0 flex justify-end gap-3 rounded-b">
              <button 
                type="button"
                onClick={() => setEditingBook(null)}
                className="px-6 py-2 text-[10px] uppercase tracking-widest font-bold text-ink-600 hover:text-ink-900 transition-colors"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                form="edit-form"
                disabled={isSaving}
                className="bg-terracotta-500 hover:bg-terracotta-600 text-white px-6 py-2 text-[10px] uppercase tracking-widest font-bold transition-colors flex items-center justify-center min-w-[120px]"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 mr-2" /> Salvar</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* API Results Overlay Modal */}
      {showApiModal && apiResults.length > 0 && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink-900/60 backdrop-blur-sm p-4">
          <div className="bg-sand-50 w-full max-w-2xl border border-sand-300 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-sand-300 flex justify-between items-center bg-white shrink-0">
              <h3 className="font-serif text-xl font-bold text-ink-900">Resultados da Busca (API)</h3>
              <button type="button" onClick={() => setShowApiModal(false)} className="text-ink-600 hover:text-ink-900 transition-colors">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto space-y-4">
              {apiResults.map(info => (
                <div 
                  key={info.id} 
                  className="flex gap-4 p-4 border border-sand-300 bg-white hover:border-terracotta-500 hover:shadow-md transition-all cursor-pointer" 
                  onClick={() => applyApiResult(info)}
                >
                  {info.imageLinks?.thumbnail ? (
                    <img src={info.imageLinks.thumbnail} className="w-16 h-24 object-cover border border-sand-200" alt="Capa" />
                  ) : (
                    <div className="w-16 h-24 bg-sand-100 border border-sand-200 flex flex-col items-center justify-center text-center p-2">
                       <span className="text-[10px] text-ink-400 uppercase font-bold">Sem Capa</span>
                    </div>
                  )}
                  <div className="flex-1">
                    <h4 className="font-bold text-ink-900 text-lg font-serif mb-1">{info.title}</h4>
                    <p className="text-sm text-ink-600 mb-2">{info.authors?.join(", ") || "Autor desconhecido"}</p>
                    <div className="text-xs text-ink-500 space-y-1">
                       <p><span className="font-bold">Publicação:</span> {info.publishedDate || "N/A"}</p>
                       <p><span className="font-bold">Editora:</span> {info.publisher || "N/A"}</p>
                       <p><span className="font-bold">Páginas:</span> {info.pageCount || "N/A"}</p>
                       <p><span className="font-bold">Idioma:</span> {info.language || "N/A"}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 bg-sand-100 border-t border-sand-300 text-right shrink-0">
               <button 
                  type="button"
                  onClick={() => setShowApiModal(false)}
                  className="px-6 py-2 text-[10px] uppercase tracking-widest font-bold text-ink-600 hover:text-ink-900 transition-colors"
                >
                  Fechar
                </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
