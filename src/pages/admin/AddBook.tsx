import { useState, FormEvent, ChangeEvent } from "react";
import { ArrowRight, Info, Search, Loader2, BookImage, CheckCircle2, Wand2 } from "lucide-react";

import { supabase } from "@/lib/supabase";

type SuggestedBook = {
  id: string;
  source: string[];
  arabicTitle: string;
  translatedTitle: string;
  authorLatin: string;
  authorArabic: string;
  isbn: string;
  year: string;
  pages: string;
  publisher: string;
  language: string;
  synopsis: string;
  coverImage: string;
  categories: string[];
};

export default function AddBook() {
  const [success, setSuccess] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SuggestedBook[]>([]);
  
  const [languageChoice, setLanguageChoice] = useState("Árabe");
  const [formData, setFormData] = useState({
    arabicTitle: "",
    transliteration: "",
    translatedTitle: "",
    authorLatin: "",
    authorArabic: "",
    isbn: "",
    year: "",
    pages: "",
    publisher: "",
    language: "Árabe",
    synopsis: "",
    coverImage: "",
    categories: [] as string[]
  });

  const [translationLoading, setTranslationLoading] = useState(false);
  const adminLevel = sessionStorage.getItem("adminLevel");

  const autoEnrichAll = async () => {
    // Collect the current relevant data to send
    const bookData = {
      arabicTitle: formData.arabicTitle,
      translatedTitle: formData.translatedTitle,
      transliteration: formData.transliteration,
      authorArabic: formData.authorArabic,
      authorLatin: formData.authorLatin,
      synopsis: formData.synopsis
    };

    // Make sure we have at least *something* to work with
    if (!bookData.arabicTitle && !bookData.translatedTitle && !bookData.authorArabic && !bookData.authorLatin && !bookData.synopsis) {
      alert("Por favor, preencha pelo menos um campo (Título, Autor ou Sinopse) antes de autocompletar com Inteligência Artificial.");
      return;
    }

    setTranslationLoading(true);
    try {
      const res = await fetch("/api/gemini/enrich-book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ book: bookData })
      });
      if (!res.ok) throw new Error("Falha na tradução");
      const data = await res.json();
      
      setFormData(prev => ({ 
        ...prev, 
        arabicTitle: data.arabicTitle || prev.arabicTitle,
        translatedTitle: data.translatedTitle || prev.translatedTitle,
        transliteration: data.transliteration || prev.transliteration,
        authorArabic: data.authorArabic || prev.authorArabic,
        authorLatin: data.authorLatin || prev.authorLatin,
        synopsis: data.synopsis || prev.synopsis,
        categories: Array.from(new Set([...prev.categories, ...(data.categories || [])]))
      }));
    } catch (err) {
      console.error(err);
      alert("Tradução falhou. Verifique as chaves da API GEMINI_API_KEY.");
    } finally {
      setTranslationLoading(false);
    }
  };

  const handleLanguageChoiceChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setLanguageChoice(val);
    if (val !== "Outro") {
      setFormData(prev => ({ ...prev, language: val }));
    } else {
      setFormData(prev => ({ ...prev, language: "" }));
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const searchAPIs = async (e: FormEvent) => {
    e.preventDefault();
    if (!searchQuery) return;
    
    setIsSearching(true);
    setSearchResults([]);
    
    try {
      const isIsbn = /^\d[-\d]*\d$/.test(searchQuery.trim());
      const initialQuery = searchQuery.trim();

      // Use AbortController for timeouts (10 seconds) to prevent infinite loading
      const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeoutMs = 10000) => {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(new Error("Timeout exceed 10s")), timeoutMs);
        try {
          const response = await fetch(url, { ...options, signal: controller.signal });
          clearTimeout(id);
          return response;
        } catch (err) {
          clearTimeout(id);
          throw err;
        }
      };

      const containsArabic = (text: string) => /[\u0600-\u06FF]/.test(text || '');

      const performFetchAndParse = async (queryToSearch: string) => {
        const [googleRes, openLibRes] = await Promise.allSettled([
          fetchWithTimeout(`https://www.googleapis.com/books/v1/volumes?q=${isIsbn ? 'isbn:' + queryToSearch : encodeURIComponent(queryToSearch)}&maxResults=5`, { referrerPolicy: "no-referrer" }),
          fetchWithTimeout(`https://openlibrary.org/search.json?${isIsbn ? 'isbn=' + queryToSearch : 'q=' + encodeURIComponent(queryToSearch)}&limit=5`)
        ]);

        const mergedResults: Record<string, SuggestedBook> = {};

        // 2. Open Library
        if (openLibRes.status === 'fulfilled' && openLibRes.value.ok) {
          const data = await openLibRes.value.json();
          
          // Fetch works descriptions in parallel for the returned docs
          const docs = data.docs || [];
          const workKeys = docs.map((d: any) => d.key).filter(Boolean);
          const workDetailsEntries = await Promise.all(
             workKeys.map((key: string) => 
                 fetchWithTimeout(`https://openlibrary.org${key}.json`)
                   .then(r => r.ok ? r.json() : null)
                   .then(d => d ? [key, typeof d.description === 'object' ? d.description.value : (d.description || '')] : null)
                   .catch(() => null)
             )
          );
          const workDescriptions = Object.fromEntries(workDetailsEntries.filter(Boolean) as [string, string][]);

          docs.forEach((doc: any) => {
            const isbn = doc.isbn && doc.isbn.length > 0 ? doc.isbn[0] : doc.key;
            let langStr = '';
            if (doc.language) {
               langStr = Array.isArray(doc.language) ? doc.language.join(", ") : doc.language;
            }
            
            const title = doc.title || '';
            const isArabicTitle = containsArabic(title) || (langStr && langStr.includes('ara'));
            
            let authorArabic = '';
            let authorLatin = '';
            if (doc.author_name) {
               authorArabic = doc.author_name.find((a: string) => containsArabic(a)) || '';
               authorLatin = doc.author_name.find((a: string) => !containsArabic(a)) || '';
            }

            const synopsis = workDescriptions[doc.key] || '';

            mergedResults[isbn] = {
               id: isbn,
               source: ['Open Library'],
               translatedTitle: !isArabicTitle ? title : '',
               arabicTitle: isArabicTitle ? title : '',
               authorLatin,
               authorArabic,
               year: doc.first_publish_year ? doc.first_publish_year.toString() : '',
               isbn: doc.isbn ? doc.isbn[0] : '',
               publisher: doc.publisher ? doc.publisher[0] : '',
               pages: doc.number_of_pages_median ? doc.number_of_pages_median.toString() : '',
               language: "Árabe",
               synopsis,
               coverImage: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : '',
               categories: doc.subject ? doc.subject.slice(0, 5) : []
            };
          });
        }

        // 1. Google Books (Overrides OL metadata for imagery and synopsys)
        if (googleRes.status === 'fulfilled' && googleRes.value.ok) {
          const data = await googleRes.value.json();
          data.items?.forEach((item: any) => {
            const info = item.volumeInfo;
            let isbn = item.id;
            if (info.industryIdentifiers) {
              const isbn13 = info.industryIdentifiers.find((i:any) => i.type === 'ISBN_13');
              if (isbn13) isbn = isbn13.identifier;
              else isbn = info.industryIdentifiers[0].identifier;
            }
            
            const cover = info.imageLinks?.thumbnail?.replace('http:', 'https:') || '';
            const title = info.title || '';
            const isArabicTitle = containsArabic(title) || info.language === 'ar';
            
            let authorArabic = '';
            let authorLatin = '';
            if (info.authors) {
               authorArabic = info.authors.find((a: string) => containsArabic(a)) || '';
               authorLatin = info.authors.find((a: string) => !containsArabic(a)) || '';
            }
            
            if (mergedResults[isbn]) {
               if (!mergedResults[isbn].source.includes('Google Books')) {
                   mergedResults[isbn].source.push('Google Books');
               }
               if (isArabicTitle) mergedResults[isbn].arabicTitle = title || mergedResults[isbn].arabicTitle;
               else mergedResults[isbn].translatedTitle = title || mergedResults[isbn].translatedTitle;
               
               if (authorArabic) mergedResults[isbn].authorArabic = authorArabic || mergedResults[isbn].authorArabic;
               if (authorLatin) mergedResults[isbn].authorLatin = authorLatin || mergedResults[isbn].authorLatin;
               
               mergedResults[isbn].year = info.publishedDate ? info.publishedDate.substring(0, 4) : mergedResults[isbn].year;
               mergedResults[isbn].publisher = info.publisher || mergedResults[isbn].publisher;
               mergedResults[isbn].synopsis = (info.description && !info.description.startsWith("Source:")) ? info.description : (mergedResults[isbn].synopsis || info.description || "");
               if (cover) mergedResults[isbn].coverImage = cover;
               mergedResults[isbn].pages = info.pageCount?.toString() || mergedResults[isbn].pages;
               mergedResults[isbn].categories = Array.from(new Set([...(mergedResults[isbn].categories || []), ...(info.categories || [])]));
            } else {
               mergedResults[isbn] = {
                  id: isbn,
                  source: ['Google Books'],
                  translatedTitle: !isArabicTitle ? title : '',
                  arabicTitle: isArabicTitle ? title : '',
                  authorLatin,
                  authorArabic,
                  year: info.publishedDate ? info.publishedDate.substring(0, 4) : '',
                  isbn: isbn,
                  publisher: info.publisher || '',
                  language: "Árabe",
                  synopsis: info.description || '',
                  coverImage: cover,
                  pages: info.pageCount?.toString() || '',
                  categories: info.categories || []
               };
            }
          });
        }
        
        return {
           results: Object.values(mergedResults),
           googleStatus: googleRes.status === 'fulfilled' ? googleRes.value.status : 500
        };
      };

      let searchResult = await performFetchAndParse(initialQuery);

      if (searchResult.results.length === 0 && !isIsbn) {
         try {
            const fixRes = await fetch("/api/gemini/fix-search-query", {
               method: "POST",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify({ query: initialQuery })
            });
            if (fixRes.ok) {
               const data = await fixRes.json();
               if (data.correctedQuery && data.correctedQuery !== initialQuery) {
                  setSearchQuery(data.correctedQuery); // Update input field
                  searchResult = await performFetchAndParse(data.correctedQuery);
               }
            }
         } catch (e) {
            console.error("Failed to spellcheck query", e);
         }
      }

      if (searchResult.results.length === 0) {
        let msg = "Nenhum livro encontrado nas fontes procuradas.";
        if (searchResult.googleStatus === 429) {
          msg += "\n\nO Google Books API está com limite de requisições excedido. Tente novamente mais tarde.";
        }
        alert(msg);
      } else {
        setSearchResults(searchResult.results);
      }
      
    } catch (error) {
      console.error(error);
      alert("Erro ao buscar dados na busca múltipla de APIs.");
    } finally {
      setIsSearching(false);
    }
  };

  const selectMatch = (book: SuggestedBook) => {
    setFormData(prev => ({
      ...prev,
      arabicTitle: book.arabicTitle || prev.arabicTitle,
      translatedTitle: book.translatedTitle || prev.translatedTitle,
      authorLatin: book.authorLatin || prev.authorLatin,
      authorArabic: book.authorArabic || prev.authorArabic,
      isbn: book.isbn || prev.isbn,
      year: book.year || prev.year,
      publisher: book.publisher || prev.publisher,
      language: book.language || prev.language,
      pages: book.pages || prev.pages,
      synopsis: book.synopsis || prev.synopsis,
      coverImage: book.coverImage || prev.coverImage,
      categories: Array.from(new Set([...prev.categories, ...(book.categories || [])]))
    }));
    setSearchResults([]);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!formData.arabicTitle || !formData.translatedTitle || !formData.authorLatin) {
      alert("Por favor, preencha os campos obrigatórios: Título Original (Árabe), Título Traduzido e Autor (Latim).");
      return;
    }

    console.log("handleSubmit triggered", formData);
    try {
      const { error } = await supabase.from('books').insert({
        arabic_title: formData.arabicTitle,
        transliteration: formData.transliteration || null,
        translated_title: formData.translatedTitle,
        author_latin: formData.authorLatin,
        author_arabic: formData.authorArabic || null,
        isbn: formData.isbn || null,
        publication_year: formData.year ? parseInt(formData.year.toString()) : null,
        pages: formData.pages ? parseInt(formData.pages.toString()) : null,
        publisher: formData.publisher || null,
        language: formData.language || null,
        synopsis: formData.synopsis || null,
        cover_image: formData.coverImage || null,
        categories: formData.categories || [],
      });

      if (error) {
        console.error("Supabase Error:", error);
        alert(`Erro ao salvar volume no banco de dados: ${error.message || error.details}`);
        return;
      }
      
      setSuccess(true);
      setLanguageChoice("Árabe");
      setTimeout(() => {
        setSuccess(false);
        setFormData({
          arabicTitle: "",
          transliteration: "",
          translatedTitle: "",
          authorLatin: "",
          authorArabic: "",
          isbn: "",
          year: "",
          pages: "",
          publisher: "",
          language: "Árabe",
          synopsis: "",
          coverImage: "",
          categories: [] as string[]
        });
      }, 3000);
    } catch (err: any) {
      console.error(err);
      alert(`Erro ao conectar com o banco de dados: ${err.message || err.toString()}`);
    }
  };

  return (
    <div className="p-8 md:p-12">
      <div className="mb-10 border-b border-ink-900 pb-6">
        <h1 className="font-serif text-4xl font-bold text-ink-900 mb-2">Adicionar Novo Volume</h1>
        <p className="text-sm font-sans uppercase tracking-[0.2em] font-bold text-ink-600">
          Catalogar entrada no acervo bibliográfico
        </p>
        <div className="mt-6 flex items-start gap-3 bg-sand-200 p-4 border border-sand-300 text-ink-900">
          <Info className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <p className="text-sm font-serif italic">
            Insira os metadados do livro. O sistema integrado com o Google Books e OpenLibrary pode preencher os campos automaticamente. Todos os dados serão salvos no banco de dados Supabase do acervo.
          </p>
        </div>
      </div>
      
      <div className="mb-8 bg-sand-100 border border-sand-300 p-6">
        <h2 className="font-sans text-[10px] uppercase tracking-[0.3em] font-bold text-ink-900 mb-4">Busca Automática</h2>
        <form onSubmit={searchAPIs} className="flex flex-col sm:flex-row gap-4">
          <input 
            type="text" 
            placeholder="Buscar por ISBN ou Título..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-white border border-sand-300 py-3 px-4 font-sans text-sm focus:outline-none focus:border-ink-900"
          />
          <button 
            type="submit" 
            disabled={isSearching || !searchQuery}
            className="bg-ink-900 text-white px-6 py-3 text-xs font-bold uppercase tracking-widest hover:bg-black transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Buscar Dados
          </button>
        </form>
        
        {searchResults.length > 0 && (
           <div className="mt-8">
             <h3 className="font-sans text-[10px] uppercase tracking-[0.2em] font-bold text-ink-900 mb-4 border-b border-sand-300 pb-2">Resultados Encontrados ({searchResults.length})</h3>
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
               {searchResults.map((book) => (
                 <div key={book.id} className="bg-white border border-sand-300 p-4 flex gap-4 hover:border-ink-900 transition-colors">
                   {book.coverImage ? (
                      <img src={book.coverImage} alt="Cover" className="w-16 h-24 object-cover flex-shrink-0 border border-sand-200 bg-sand-100" />
                   ) : (
                      <div className="w-16 h-24 flex-shrink-0 bg-sand-200 flex items-center justify-center border border-sand-300 text-ink-400">
                         <BookImage className="w-6 h-6" />
                      </div>
                   )}
                   <div className="flex-1 flex flex-col min-w-0">
                      <div className="flex flex-wrap gap-1 mb-2">
                         {book.source.map(source => (
                            <span key={source} className="text-[8px] bg-sand-200 text-ink-900 px-1.5 py-0.5 uppercase tracking-wider font-bold">
                               {source}
                            </span>
                         ))}
                      </div>
                      <h4 className="font-serif font-bold text-ink-900 text-sm line-clamp-1">{book.translatedTitle || book.arabicTitle}</h4>
                      <p className="font-sans text-xs text-ink-600 truncate">{book.authorLatin || book.authorArabic}</p>
                      {book.year && <p className="font-sans text-[10px] text-ink-400 mt-1">{book.year}</p>}
                      <button 
                         type="button" 
                         onClick={() => selectMatch(book)} 
                         className="mt-auto self-start flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold text-terracotta-500 hover:text-ink-900 transition-colors"
                      >
                         <CheckCircle2 className="w-3 h-3" /> Usar Dados
                      </button>
                   </div>
                 </div>
               ))}
             </div>
           </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-10 bg-white p-6 md:p-10 border border-sand-300 shadow-sm">
        
        {/* IA Action Bar */}
        {adminLevel === "full" && (
        <div className="bg-sand-100 p-4 border border-sand-300 flex flex-col sm:flex-row items-center justify-between gap-4">
           <div>
             <h3 className="font-sans text-[10px] uppercase tracking-[0.2em] font-bold text-ink-900 mb-1 flex items-center gap-1.5">
               <Wand2 className="w-4 h-4 text-terracotta-500"/> Assistente IA
             </h3>
             <p className="font-sans text-[10px] text-ink-600">Preencha um campo (ex: ISBN, título ou autor) e a IA traduzirá/transliterará automaticamente os demais.</p>
           </div>
           <button 
             type="button" 
             onClick={autoEnrichAll} 
             disabled={translationLoading}
             className="w-full sm:w-auto bg-terracotta-500 text-white px-6 py-2.5 text-[10px] font-bold uppercase tracking-widest hover:bg-terracotta-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
           >
             {translationLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Wand2 className="w-3.5 h-3.5"/>}
             Completar Campos
           </button>
        </div>
        )}

        {/* Title Info */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start border-b border-sand-300 pb-2 mb-6">
             <h2 className="font-sans text-[10px] uppercase tracking-[0.3em] font-bold text-ink-900">1. Identificação</h2>
          </div>
          
          {formData.coverImage && (
             <div className="mb-6 bg-sand-100 p-4 border border-sand-300 flex items-start gap-4">
                <img src={formData.coverImage} className="w-24 h-auto shadow-sm border border-sand-300 bg-white" referrerPolicy="no-referrer" />
                <div className="flex-1">
                   <p className="font-sans text-[10px] uppercase tracking-widest font-bold text-ink-900 mb-1">Capa Associada</p>
                   <p className="font-sans text-xs text-ink-600">A capa foi importada automaticamente das fontes selecionadas.</p>
                </div>
             </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-bold text-ink-900 mb-2 font-sans">Título Original (Árabe) *</label>
              <input name="arabicTitle" value={formData.arabicTitle} onChange={handleInputChange} dir="rtl" type="text" placeholder="مثال: أولاد حارتنا" className="w-full bg-transparent border-b border-ink-900 px-4 py-2 focus:outline-none focus:border-terracotta-500 font-arabic text-xl transition-colors" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-bold text-ink-900 mb-2 font-sans">Transliteração</label>
              <input name="transliteration" value={formData.transliteration} onChange={handleInputChange} type="text" placeholder="Ex: Awlad Haratina" className="w-full bg-transparent border-b border-ink-900 px-4 py-2 focus:outline-none focus:border-terracotta-500 font-serif text-lg transition-colors italic" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest font-bold text-ink-900 mb-2 font-sans">Título Traduzido (Português/Inglês) *</label>
            <input name="translatedTitle" value={formData.translatedTitle} onChange={handleInputChange} type="text" placeholder="Ex: Crianças do Beco" className="w-full bg-transparent border-b border-ink-900 px-4 py-2 focus:outline-none focus:border-terracotta-500 font-serif text-lg transition-colors" />
          </div>
        </div>

        {/* Author Info */}
        <div className="space-y-6 pt-8 border-t border-sand-200">
          <div className="flex flex-col sm:flex-row justify-between items-start border-b border-sand-300 pb-2 mb-6">
             <h2 className="font-sans text-[10px] uppercase tracking-[0.3em] font-bold text-ink-900">2. Autoria</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-bold text-ink-900 mb-2 font-sans">Autor (Latim) *</label>
              <input name="authorLatin" value={formData.authorLatin} onChange={handleInputChange} type="text" placeholder="Ex: Naguib Mahfouz" className="w-full bg-transparent border-b border-ink-900 px-4 py-2 focus:outline-none focus:border-terracotta-500 font-serif text-lg transition-colors" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-bold text-ink-900 mb-2 font-sans">Autor (Árabe)</label>
              <input name="authorArabic" value={formData.authorArabic} onChange={handleInputChange} dir="rtl" type="text" placeholder="مثال: نجيب محفوظ" className="w-full bg-transparent border-b border-ink-900 px-4 py-2 focus:outline-none focus:border-terracotta-500 font-arabic text-xl transition-colors" />
            </div>
          </div>
        </div>

        {/* Details Info */}
        <div className="space-y-6 pt-8 border-t border-sand-200">
          <h2 className="font-sans text-[10px] uppercase tracking-[0.3em] font-bold text-ink-900 border-b border-sand-300 pb-2">3. Detalhes de Publicação</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-bold text-ink-900 mb-2 font-sans">ISBN</label>
              <input name="isbn" value={formData.isbn} onChange={handleInputChange} type="text" className="w-full bg-transparent border-b border-ink-900 px-4 py-2 focus:outline-none focus:border-terracotta-500 font-sans text-sm transition-colors" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-bold text-ink-900 mb-2 font-sans">Ano</label>
              <input name="year" value={formData.year} onChange={handleInputChange} type="number" className="w-full bg-transparent border-b border-ink-900 px-4 py-2 focus:outline-none focus:border-terracotta-500 font-sans text-sm transition-colors" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-bold text-ink-900 mb-2 font-sans">Páginas</label>
              <input name="pages" value={formData.pages} onChange={handleInputChange} type="number" className="w-full bg-transparent border-b border-ink-900 px-4 py-2 focus:outline-none focus:border-terracotta-500 font-sans text-sm transition-colors" />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-bold text-ink-900 mb-2 font-sans">Editora</label>
              <input name="publisher" value={formData.publisher} onChange={handleInputChange} type="text" className="w-full bg-transparent border-b border-ink-900 px-4 py-2 focus:outline-none focus:border-terracotta-500 font-serif text-lg transition-colors" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-bold text-ink-900 mb-2 font-sans">Idioma</label>
              <div className="flex flex-col gap-2">
                <select 
                  value={languageChoice} 
                  onChange={handleLanguageChoiceChange}
                  className="w-full bg-transparent border-b border-ink-900 px-4 py-2 focus:outline-none focus:border-terracotta-500 font-serif text-lg transition-colors cursor-pointer"
                >
                  <option value="Árabe">Árabe</option>
                  <option value="Português">Português</option>
                  <option value="Inglês">Inglês</option>
                  <option value="Árabe-Português (Multilíngue)">Árabe-Português (Multilíngue)</option>
                  <option value="Outro">Outro</option>
                </select>
                {languageChoice === "Outro" && (
                  <input 
                    name="language" 
                    value={formData.language} 
                    onChange={handleInputChange} 
                    type="text" 
                    placeholder="Especifique o idioma..." 
                    className="w-full bg-transparent border-b border-ink-900 px-4 py-2 focus:outline-none focus:border-terracotta-500 font-serif text-lg transition-colors mt-2" 
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Synopsis */}
        <div className="space-y-6 pt-8 border-t border-sand-200">
          <div className="flex flex-col sm:flex-row justify-between items-start border-b border-sand-300 pb-2 mb-6">
             <h2 className="font-sans text-[10px] uppercase tracking-[0.3em] font-bold text-ink-900">4. Conteúdo Temático</h2>
          </div>
          
          <div>
            <label className="block text-[10px] uppercase tracking-widest font-bold text-ink-900 mb-2 font-sans">Sinopse</label>
            <textarea name="synopsis" value={formData.synopsis} onChange={handleInputChange} rows={4} className="w-full bg-transparent border border-ink-900 px-4 py-3 focus:outline-none focus:border-terracotta-500 font-serif text-lg transition-colors mt-2"></textarea>
          </div>
          
          <div>
            <label className="block text-[10px] uppercase tracking-widest font-bold text-ink-900 mb-2 font-sans mt-4">Tags e Categorias (Separadas por vírgula)</label>
            <input 
              type="text" 
              name="categories" 
              value={(formData.categories || []).join(", ")} 
              onChange={e => setFormData({...formData, categories: e.target.value.split(",").map(c => c.trim()).filter(Boolean)})} 
              className="w-full bg-transparent border-b border-ink-900 px-4 py-2 focus:outline-none focus:border-terracotta-500 font-serif text-lg transition-colors" 
            />
          </div>
        </div>

        {/* Submit */}
        <div className="pt-8 border-t border-ink-900">
          <button 
            type="submit" 
            className="w-full bg-ink-900 text-white font-sans font-bold text-[10px] uppercase tracking-[0.3em] py-4 hover:bg-black transition-colors"
          >
            Registrar Volume
          </button>
          
          {success && (
            <p className="mt-6 text-sm font-bold text-ink-900 font-sans uppercase tracking-widest text-center">
              Volume catalogado com sucesso (mock).
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
