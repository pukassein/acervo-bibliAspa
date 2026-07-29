import { Link, useParams } from "react-router-dom";
import { Book, fetchBooks } from "@/data/Books";
import { ArrowLeft, BookOpen, Hash, MapPin, Tag } from "lucide-react";
import { useEffect, useState } from "react";

export default function BookDetails() {
  const { id } = useParams();
  const [book, setBook] = useState<Book | null>(null);
  const [allBooks, setAllBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchBooks().then(books => {
      setAllBooks(books);
      const found = books.find((b) => b.id === id);
      setBook(found || null);
      setLoading(false);
    });
  }, [id]);

  const similarBooks = book ? allBooks
    .filter(b => b.id !== book.id)
    .map(b => {
      const commonTags = b.categories.filter(c => book.categories.includes(c));
      return { book: b, common: commonTags.length };
    })
    .filter(x => x.common > 0)
    .sort((a, b) => b.common - a.common)
    .map(x => x.book)
    .slice(0, 4) : [];

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-24 text-center">
        <h1 className="text-3xl font-serif text-ink-900 mb-4">Carregando livro...</h1>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-24 text-center">
        <h1 className="text-3xl font-serif text-ink-900 mb-4">Livro não encontrado</h1>
        <Link to="/browse" className="text-terracotta-500 hover:underline font-sans uppercase tracking-[0.2em] text-xs font-bold">Voltar para o acervo</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <Link to="/browse" className="inline-flex items-center gap-2 text-[10px] font-bold text-ink-600 hover:text-ink-900 mb-8 transition-colors uppercase tracking-[0.2em]">
        <ArrowLeft className="h-4 w-4" /> Voltar para o acervo
      </Link>

      <div className="grid md:grid-cols-12 gap-12">
        <div className="md:col-span-8 md:col-start-3 flex flex-col">
          <div className="border-b border-ink-900 pb-8 mb-8">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-8">
              <div className="flex-1">
                <div className="mb-4">
                  <div className="w-12 h-px bg-ink-900 inline-block mb-2"></div>
                  <span className="ml-4 text-[10px] uppercase tracking-[0.3em] font-bold text-ink-900 font-sans">Identificação do Volume</span>
                </div>
                <h1 className="font-arabic text-5xl md:text-6xl text-ink-900 mb-4 leading-none" dir="rtl">
                  {book.arabicTitle}
                </h1>
                <h2 className="font-serif text-3xl font-medium text-ink-800 leading-snug">
                  {book.translatedTitle} <span className="text-xl text-ink-600 block sm:inline">({book.titleTransliteration})</span>
                </h2>
              </div>
              {book.coverImage && (
                <div className="w-48 sm:w-64 flex-shrink-0">
                  <img src={book.coverImage} alt={`Capa do livro ${book.translatedTitle}`} className="w-full h-auto object-cover border-4 border-sand-200 shadow-sm" referrerPolicy="no-referrer" />
                </div>
              )}
            </div>
            
            <div className="mt-12 flex flex-col sm:flex-row sm:items-center gap-4 text-ink-900">
              <div className="flex-1">
                <p className="font-serif text-2xl font-bold">{book.author}</p>
                <p className="font-arabic text-2xl mt-1 opacity-70" dir="rtl">{book.authorArabic}</p>
              </div>
            </div>
          </div>

          <div className="prose prose-sand max-w-none mb-12">
            <h3 className="font-sans text-[10px] uppercase tracking-[0.3em] font-bold text-ink-900 mb-6 border-b border-sand-300 pb-2">Sinopse</h3>
            <p className="font-serif text-ink-900 text-lg leading-relaxed whitespace-pre-line">
              {book.description}
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-y-4 font-sans text-xs border-y border-sand-300 py-6 mb-8">
            <div className="flex justify-between flex-col items-start px-4 border-r border-sand-300 gap-1">
              <span className="text-ink-600 uppercase tracking-wider text-[10px]">Localização</span>
              <span className="font-bold text-sm font-serif italic text-ink-900">{book.shelf}</span>
            </div>
            <div className="flex justify-between flex-col items-start px-4 border-r border-sand-300 gap-1">
              <span className="text-ink-600 uppercase tracking-wider text-[10px]">Idioma</span>
              <span className="font-bold text-ink-900">{book.language}</span>
            </div>
            <div className="flex justify-between flex-col items-start px-4 border-r border-sand-300 gap-1">
              <span className="text-ink-600 uppercase tracking-wider text-[10px]">Ano</span>
              <span className="font-bold text-ink-900">{book.publicationYear}</span>
            </div>
            <div className="flex justify-between flex-col items-start px-4 gap-1">
              <span className="text-ink-600 uppercase tracking-wider text-[10px]">Páginas</span>
              <span className="font-bold text-ink-900">{book.pages}</span>
            </div>
          </div>
          
          <div className="flex items-start justify-between mt-4">
            <div>
              <p className="font-sans text-[10px] uppercase tracking-[0.3em] font-bold text-ink-900 mb-4">Categoria</p>
              <div className="flex flex-wrap gap-3 mb-6">
                {book.categories.length > 0 && (
                  <Link 
                    to={`/browse?category=${book.categories[0]}`}
                    className="inline-flex items-center border border-ink-900 bg-ink-900 text-white px-4 py-2 font-sans font-bold text-[10px] tracking-widest uppercase transition-colors"
                  >
                    {book.categories[0]}
                  </Link>
                )}
              </div>
              <p className="font-sans text-[10px] uppercase tracking-[0.3em] font-bold text-ink-900 mb-4">Tags</p>
              <div className="flex flex-wrap gap-3">
                {book.categories.slice(1).map((cat) => (
                  <Link 
                    key={cat} 
                    to={`/browse?category=${cat}`}
                    className="inline-flex items-center gap-1.5 border border-ink-900 px-4 py-2 font-sans font-bold text-[10px] tracking-widest uppercase text-ink-900 hover:bg-ink-900 hover:text-white transition-colors"
                  >
                    {cat}
                  </Link>
                ))}
                {book.categories.length <= 1 && (
                   <span className="text-xs text-ink-500 italic">Nenhuma tag adicional</span>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="font-sans text-[10px] uppercase tracking-[0.3em] font-bold text-ink-900 mb-1">ISBN</p>
              <p className="font-serif text-sm italic text-ink-600">{book.isbn}</p>
            </div>
          </div>

          {similarBooks.length > 0 && (
          <div className="mt-24 border-t border-ink-900 pt-12">
            <h3 className="font-sans text-[10px] uppercase tracking-[0.3em] font-bold text-ink-900 mb-8 pb-2">Obras Similares</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
               {similarBooks.map(sim => (
                 <Link key={sim.id} to={`/book/${sim.id}`} className="group relative block">
                   <div className="aspect-[2/3] w-full bg-sand-200 border border-sand-300 relative mx-auto shadow-sm overflow-hidden mb-4">
                     {sim.coverImage ? (
                       <img src={sim.coverImage} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt="Capa" referrerPolicy="no-referrer" />
                     ) : (
                       <div className="absolute inset-0 flex items-center justify-center p-4">
                         <span className="font-arabic text-2xl opacity-20" dir="rtl">{sim.arabicTitle}</span>
                       </div>
                     )}
                   </div>
                   <h4 className="font-serif font-bold text-ink-900 text-sm mb-1 group-hover:text-terracotta-500 transition-colors line-clamp-2">{sim.translatedTitle || sim.arabicTitle}</h4>
                   <p className="text-xs text-ink-600">{sim.author}</p>
                 </Link>
               ))}
            </div>
          </div>
          )}

        </div>
      </div>
    </div>
  );
}
