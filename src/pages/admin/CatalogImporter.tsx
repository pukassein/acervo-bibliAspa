import { useState } from "react";
import { UploadCloud, CheckCircle2, Loader2, Trash2, Wand2, Search } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface ExtractedRecord {
  id: string; // generated client-side for keys
  title: string;
  author: string;
  category: string;
  city: string;
  publisher: string;
  year: number | null;
  pages: number | null;
  size: string;
  series: string;
  originalText: string;
  synopsis: string;
  arabic_title: string;
  transliteration: string;
  author_arabic: string;
  language: string;
  isbn: string;
  coverImage: string;
  selected: boolean;
}

export default function CatalogImporter() {
  const [pasteText, setPasteText] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [records, setRecords] = useState<ExtractedRecord[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isBatchEnriching, setIsBatchEnriching] = useState(false);
  const [loadingAction, setLoadingAction] = useState<Record<string, 'ai' | 'api'>>({});

  const containsArabic = (text: string) => /[\u0600-\u06FF]/.test(text || '');

  const handleAPISearch = async (id: string) => {
    const record = records.find(r => r.id === id);
    if (!record) return;
    
    const bestTitle = record.arabic_title || record.title || record.transliteration || "";
    const bestAuthor = record.author_arabic || record.author || "";
    
    const searchTerms = `${bestTitle} ${bestAuthor}`.trim();

    if (!searchTerms) {
      alert("Nenhum dado para buscar.");
      return;
    }

    setLoadingAction(prev => ({ ...prev, [id]: 'api' }));

    try {
      const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(searchTerms)}&maxResults=1`;
      const res = await fetch(url, { referrerPolicy: "no-referrer" });
      if (res.ok) {
        const data = await res.json();
        if (data.items && data.items.length > 0) {
          const info = data.items[0].volumeInfo;
          
          let title = info.title || "";
          const isArabicTitle = containsArabic(title) || info.language === 'ar';
          let rTitle = record.title;
          let rArabic = record.arabic_title;
          
          if (isArabicTitle && !rArabic) rArabic = title;
          else if (!isArabicTitle && !rTitle) rTitle = title;
          
          let rAuthorAr = record.author_arabic;
          let rAuthorLa = record.author;
          if (info.authors && info.authors.length > 0) {
            const authorData = info.authors[0];
            if (containsArabic(authorData) && !rAuthorAr) rAuthorAr = authorData;
            else if (!containsArabic(authorData) && !rAuthorLa) rAuthorLa = authorData;
          }

          setRecords(prev => prev.map(r => r.id === id ? {
            ...r,
            title: rTitle || r.title,
            arabic_title: rArabic || r.arabic_title,
            author: rAuthorLa || r.author,
            author_arabic: rAuthorAr || r.author_arabic,
            year: r.year || (info.publishedDate ? parseInt(info.publishedDate.substring(0, 4)) : null),
            publisher: r.publisher || info.publisher || "",
            pages: r.pages || info.pageCount || null,
            language: r.language || info.language || "Árabe",
            isbn: r.isbn || (info.industryIdentifiers ? info.industryIdentifiers.find((i: any) => i.type === "ISBN_13" || i.type === "ISBN_10")?.identifier || info.industryIdentifiers[0].identifier : ""),
            coverImage: r.coverImage || (info.imageLinks ? info.imageLinks.thumbnail?.replace('http:', 'https:') : "")
          } : r));
        } else {
           alert("Nenhum resultado encontrado na API.");
        }
      } else {
        alert("Erro ao buscar dados na API.");
      }
    } catch (err: any) {
      console.error(err);
      alert(`Erro na busca: ${err.message}`);
    } finally {
      setLoadingAction(prev => { const n = {...prev}; delete n[id]; return n; });
    }
  };

  const handleAIEnrich = async (id: string) => {
    const record = records.find(r => r.id === id);
    if (!record) return;

    setLoadingAction(prev => ({ ...prev, [id]: 'ai' }));
    try {
      const bookData = {
        arabicTitle: record.arabic_title,
        translatedTitle: record.title,
        transliteration: record.transliteration,
        authorArabic: record.author_arabic,
        authorLatin: record.author,
        synopsis: record.originalText
      };

      const res = await fetch("/api/gemini/enrich-book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ book: bookData })
      });
      if (!res.ok) throw new Error("Falha no enriquecimento IA");
      const data = await res.json();
      
      setRecords(prev => prev.map(r => r.id === id ? {
        ...r,
        arabic_title: data.arabicTitle || r.arabic_title,
        title: data.translatedTitle || r.title,
        transliteration: data.transliteration || r.transliteration,
        author_arabic: data.authorArabic || r.author_arabic,
        author: data.authorLatin || r.author,
        category: (data.categories && data.categories.length > 0) ? data.categories.join(", ") : r.category
      } : r));
    } catch (err: any) {
      console.error(err);
      alert(`Erro IA: ${err.message}`);
    } finally {
      setLoadingAction(prev => { const n = {...prev}; delete n[id]; return n; });
    }
  };

  const handleExtract = async () => {
    if (!pasteText.trim()) return;

    setIsExtracting(true);
    try {
      const res = await fetch("/api/gemini/extract-catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: pasteText })
      });

      if (!res.ok) throw new Error("Failed to extract data.");
      
      const data = await res.json();
      if (data.records && Array.isArray(data.records)) {
        const enhancedRecords = data.records.map((r: any) => ({
          ...r,
          id: crypto.randomUUID(),
          title: r.title || "",
          arabic_title: r.arabicTitle || "",
          transliteration: r.transliteration || "",
          author: r.author || "",
          author_arabic: r.authorArabic || "",
          category: r.category && Array.isArray(r.category) ? r.category.join(", ") : (r.category || ""),
          synopsis: r.synopsis || "",
          language: "Árabe",
          isbn: "",
          coverImage: "",
          selected: true // default to selected
        }));
        setRecords(enhancedRecords);
      }
    } catch (error: any) {
      alert(`Erro na extração: ${error.message}`);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleBatchEnrich = async () => {
    const toEnrich = records.filter(r => r.selected);
    if (toEnrich.length === 0) return;

    setIsBatchEnriching(true);
    try {
      const payload = toEnrich.map(r => ({
        id: r.id,
        arabicTitle: r.arabic_title,
        translatedTitle: r.title,
        transliteration: r.transliteration,
        authorArabic: r.author_arabic,
        authorLatin: r.author,
        synopsis: r.originalText
      }));

      const res = await fetch("/api/gemini/enrich-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ books: payload })
      });
      if (!res.ok) throw new Error("Falha no enriquecimento em lote");
      const enrichedData = await res.json();
      
      setRecords(prev => prev.map(r => {
        const enhanced = enrichedData.find((ed: any) => ed.id === r.id);
        if (enhanced) {
          return {
            ...r,
            arabic_title: enhanced.arabicTitle || r.arabic_title,
            title: enhanced.translatedTitle || r.title,
            transliteration: enhanced.transliteration || r.transliteration,
            author_arabic: enhanced.authorArabic || r.author_arabic,
            author: enhanced.authorLatin || r.author,
            category: (enhanced.categories && enhanced.categories.length > 0) ? enhanced.categories.join(", ") : r.category,
            synopsis: enhanced.synopsis || r.synopsis
          };
        }
        return r;
      }));
    } catch (err: any) {
      console.error(err);
      alert(`Erro IA Lote: ${err.message}`);
    } finally {
      setIsBatchEnriching(false);
    }
  };

  const handleRecordChange = (id: string, field: keyof ExtractedRecord, value: any) => {
    setRecords(records.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const toggleSelectAll = () => {
    const allSelected = records.every(r => r.selected);
    setRecords(records.map(r => ({ ...r, selected: !allSelected })));
  };

  const removeRecord = (id: string) => {
    setRecords(records.filter(r => r.id !== id));
  };

  const handleSaveSelected = async () => {
    const toSave = records.filter(r => r.selected);
    if (toSave.length === 0) return;

    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const payload = toSave.map(r => ({
        translated_title: r.title || "",
        arabic_title: r.arabic_title || "",
        transliteration: r.transliteration || "",
        author_latin: r.author || "",
        author_arabic: r.author_arabic || "",
        language: r.language || "",
        isbn: r.isbn || "",
        cover_image: r.coverImage || null,
        publisher: r.publisher || "",
        publication_year: r.year || null,
        pages: r.pages || null,
        city: r.city || "",
        series: r.series || "",
        size: r.size || "",
        categories: r.category ? r.category.split(",").map((c: string) => c.trim()).filter(Boolean) : [], 
        synopsis: r.synopsis || r.originalText || ""
      }));

      const { error } = await supabase.from('books').insert(payload);
      if (error) throw error;

      setSaveSuccess(true);
      // Remove saved ones from the list
      setRecords(records.filter(r => !r.selected));
      
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error: any) {
      console.error(error);
      alert(`Erro ao salvar no banco: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-8 md:p-12">
      <div className="mb-10 border-b border-ink-900 pb-6">
        <h1 className="font-serif text-4xl font-bold text-ink-900 mb-2">Importar Catálogo (PDF)</h1>
        <p className="text-sm font-sans uppercase tracking-[0.2em] font-bold text-ink-600">Extração inteligente de registros em texto</p>
      </div>

      {!records.length && (
        <div className="bg-white border border-sand-300 p-8 shadow-sm">
          <div className="mb-6">
            <label className="block text-[10px] uppercase tracking-widest font-bold text-ink-900 mb-2">Cole o texto do PDF</label>
            <p className="text-sm text-ink-600 mb-4">Copie o texto do catálogo em PDF e cole abaixo. Nossa IA irá analisar e estruturar os livros encontrados.</p>
            <textarea 
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              className="w-full bg-sand-50 border border-sand-300 p-4 min-h-[300px] font-mono text-sm focus:outline-none focus:border-terracotta-500"
              placeholder={'Exemplo:\n\nPoemas para o tempo distante – Poesia árabe\nAl-Zubaidi, Ibrahim.\n– Beirute: Dar al-Awda, 1971.\n157 p.; 24 cm.'}
            />
          </div>

          <button 
            onClick={handleExtract}
            disabled={isExtracting || !pasteText.trim()}
            className="bg-terracotta-500 hover:bg-terracotta-600 disabled:opacity-50 text-white px-8 py-3 text-[10px] uppercase tracking-widest font-bold transition-colors flex items-center gap-2"
          >
            {isExtracting ? <Loader2 className="w-4 h-4 animate-spin"/> : <UploadCloud className="w-4 h-4"/>}
            {isExtracting ? "Analisando..." : "Extrair Registros"}
          </button>
        </div>
      )}

      {records.length > 0 && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-sand-100 p-4 border border-sand-300">
            <div className="flex items-center gap-4">
              <button onClick={toggleSelectAll} className="text-[10px] uppercase font-bold text-ink-600 hover:text-ink-900 underline">
                Alternar Seleção
              </button>
              <span className="text-sm font-bold text-ink-900">{records.filter(r => r.selected).length} selecionados</span>
            </div>
            <div className="flex gap-4 items-center">
              {saveSuccess && <span className="text-emerald-600 text-[10px] font-bold uppercase flex items-center gap-1"><CheckCircle2 className="w-4 h-4"/> Salvo</span>}
              <button 
                onClick={() => setRecords([])} 
                className="text-ink-600 text-[10px] font-bold uppercase hover:text-ink-900"
              >
                Voltar/Limpar
              </button>
              <button 
                onClick={handleBatchEnrich}
                disabled={isBatchEnriching || records.filter(r => r.selected).length === 0}
                className="bg-white border border-terracotta-500 hover:bg-sand-100 disabled:opacity-50 text-terracotta-500 px-6 py-2 text-[10px] uppercase tracking-widest font-bold transition-colors flex items-center gap-2"
              >
                {isBatchEnriching ? <Loader2 className="w-4 h-4 animate-spin"/> : <Wand2 className="w-4 h-4"/>}
                Preencher Selecionados (IA)
              </button>
              <button 
                onClick={handleSaveSelected}
                disabled={isSaving || records.filter(r => r.selected).length === 0}
                className="bg-terracotta-500 hover:bg-terracotta-600 disabled:opacity-50 text-white px-6 py-2 text-[10px] uppercase tracking-widest font-bold transition-colors flex items-center gap-2"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : <CheckCircle2 className="w-4 h-4"/>}
                Salvar Selecionados
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {records.map((record) => (
              <div key={record.id} className={`bg-white border p-6 flex gap-6 ${record.selected ? 'border-terracotta-500 shadow-sm' : 'border-sand-300 opacity-60'}`}>
                <div className="pt-2">
                  <input 
                    type="checkbox" 
                    checked={record.selected}
                    onChange={(e) => handleRecordChange(record.id, 'selected', e.target.checked)}
                    className="w-5 h-5 accent-terracotta-500 cursor-pointer"
                  />
                </div>
                
                <div className="flex-1">
                  <div className="flex justify-end gap-4 mb-4 pb-4 border-b border-sand-200">
                    <button 
                      onClick={() => handleAPISearch(record.id)} 
                      disabled={loadingAction[record.id] === 'api'}
                      className="text-[10px] flex items-center gap-1.5 uppercase font-bold text-ink-600 hover:text-ink-900 transition-colors"
                    >
                      {loadingAction[record.id] === 'api' ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Search className="w-3.5 h-3.5"/>} Preencher via API (Google)
                    </button>
                    <button 
                      onClick={() => handleAIEnrich(record.id)} 
                      disabled={loadingAction[record.id] === 'ai'}
                      className="text-[10px] flex items-center gap-1.5 uppercase font-bold text-terracotta-500 hover:text-ink-900 transition-colors"
                    >
                      {loadingAction[record.id] === 'ai' ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Wand2 className="w-3.5 h-3.5"/>} Preencher Titulo/Autor via IA
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                     <div>
                        <label className="text-[10px] uppercase font-bold text-ink-600">Título (Traduzido / Principal)</label>
                        <input type="text" value={record.title} onChange={e => handleRecordChange(record.id, 'title', e.target.value)} className="w-full border-b border-sand-300 pb-1 focus:border-terracotta-500 focus:outline-none text-lg font-serif font-bold text-ink-900" />
                     </div>
                     <div className="flex gap-4">
                        <div className="w-1/2">
                           <label className="text-[10px] uppercase font-bold text-ink-600">Título Árabe</label>
                           <input type="text" value={record.arabic_title} onChange={e => handleRecordChange(record.id, 'arabic_title', e.target.value)} className="w-full border-b border-sand-300 pb-1 focus:border-terracotta-500 focus:outline-none text-right" dir="rtl" />
                        </div>
                        <div className="w-1/2">
                           <label className="text-[10px] uppercase font-bold text-ink-600">Transliteração</label>
                           <input type="text" value={record.transliteration} onChange={e => handleRecordChange(record.id, 'transliteration', e.target.value)} className="w-full border-b border-sand-300 pb-1 focus:border-terracotta-500 focus:outline-none" />
                        </div>
                     </div>
                     <div className="flex gap-4">
                        <div className="w-1/2">
                           <label className="text-[10px] uppercase font-bold text-ink-600">Autor (Latim)</label>
                           <input type="text" value={record.author} onChange={e => handleRecordChange(record.id, 'author', e.target.value)} className="w-full border-b border-sand-300 pb-1 focus:border-terracotta-500 focus:outline-none" />
                        </div>
                        <div className="w-1/2">
                           <label className="text-[10px] uppercase font-bold text-ink-600">Autor (Árabe)</label>
                           <input type="text" value={record.author_arabic} onChange={e => handleRecordChange(record.id, 'author_arabic', e.target.value)} className="w-full border-b border-sand-300 pb-1 focus:border-terracotta-500 focus:outline-none text-right" dir="rtl" />
                        </div>
                     </div>
                     <div className="flex gap-4">
                        <div className="flex-1">
                           <label className="text-[10px] uppercase font-bold text-ink-600">Categoria/Série</label>
                           <input type="text" value={record.category || record.series || ''} onChange={e => handleRecordChange(record.id, 'category', e.target.value)} className="w-full border-b border-sand-300 pb-1 focus:border-terracotta-500 focus:outline-none" />
                        </div>
                     </div>
                  </div>

                  <div className="space-y-3">
                     <div className="flex gap-4">
                        <div className="flex-1">
                           <label className="text-[10px] uppercase font-bold text-ink-600">Editora</label>
                           <input type="text" value={record.publisher || ''} onChange={e => handleRecordChange(record.id, 'publisher', e.target.value)} className="w-full border-b border-sand-300 pb-1 focus:border-terracotta-500 focus:outline-none" />
                        </div>
                        <div className="w-24">
                           <label className="text-[10px] uppercase font-bold text-ink-600">Ano</label>
                           <input type="number" value={record.year || ''} onChange={e => handleRecordChange(record.id, 'year', parseInt(e.target.value) || null)} className="w-full border-b border-sand-300 pb-1 focus:border-terracotta-500 focus:outline-none" />
                        </div>
                     </div>
                     <div className="flex gap-4">
                        <div className="w-1/3">
                           <label className="text-[10px] uppercase font-bold text-ink-600">Páginas</label>
                           <input type="number" value={record.pages || ''} onChange={e => handleRecordChange(record.id, 'pages', parseInt(e.target.value) || null)} className="w-full border-b border-sand-300 pb-1 focus:border-terracotta-500 focus:outline-none" />
                        </div>
                        <div className="flex-1">
                           <label className="text-[10px] uppercase font-bold text-ink-600">Cidade</label>
                           <input type="text" value={record.city || ''} onChange={e => handleRecordChange(record.id, 'city', e.target.value)} className="w-full border-b border-sand-300 pb-1 focus:border-terracotta-500 focus:outline-none" />
                        </div>
                        <div className="w-1/3">
                           <label className="text-[10px] uppercase font-bold text-ink-600">Idioma</label>
                           <input type="text" value={record.language || ''} onChange={e => handleRecordChange(record.id, 'language', e.target.value)} className="w-full border-b border-sand-300 pb-1 focus:border-terracotta-500 focus:outline-none" />
                        </div>
                     </div>
                     <div className="flex gap-4">
                        <div className="w-1/2">
                           <label className="text-[10px] uppercase font-bold text-ink-600">ISBN</label>
                           <input type="text" value={record.isbn || ''} onChange={e => handleRecordChange(record.id, 'isbn', e.target.value)} className="w-full border-b border-sand-300 pb-1 focus:border-terracotta-500 focus:outline-none" />
                        </div>
                        <div className="w-1/2">
                           <label className="text-[10px] uppercase font-bold text-ink-600">Tamanho (cm)</label>
                           <input type="text" value={record.size || ''} onChange={e => handleRecordChange(record.id, 'size', e.target.value)} className="w-full border-b border-sand-300 pb-1 focus:border-terracotta-500 focus:outline-none" />
                        </div>
                     </div>
                     <div>
                        <label className="text-[10px] uppercase font-bold text-ink-600">Texto Original</label>
                        <div className="p-2 bg-sand-50 border border-sand-200 text-xs font-mono text-ink-600 mt-1 max-h-24 overflow-y-auto whitespace-pre-wrap">
                           {record.originalText}
                        </div>
                     </div>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button onClick={() => removeRecord(record.id)} className="text-ink-400 hover:text-terracotta-500 transition-colors">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
