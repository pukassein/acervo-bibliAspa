import { Link } from "react-router-dom";
import { Book } from "@/data/mockBooks";
import { cn } from "@/lib/utils";
import { BookOpen } from "lucide-react";
import React from "react";

interface BookCardProps {
  book: Book;
  className?: string;
}

export const BookCard: React.FC<BookCardProps> = ({ book, className }) => {
  return (
    <Link 
      to={`/book/${book.id}`}
      className={cn(
        "group flex h-full flex-col cursor-pointer bg-white border border-sand-300 p-6 hover:bg-sand-100 hover:border-ink-900 transition-colors",
        className
      )}
    >
      <div className="flex flex-1 flex-col">
        <h4 className="font-arabic text-xl font-bold mb-2 leading-tight text-ink-900 line-clamp-2" dir="rtl">
          {book.arabicTitle}
        </h4>
        <h5 className="font-serif text-lg font-bold text-ink-900 mb-1 group-hover:italic transition-all">
          {book.translatedTitle} <span className="font-sans text-xs uppercase tracking-wider text-ink-600 font-normal ml-2">({book.titleTransliteration})</span>
        </h5>
        
        <p className="text-sm mt-3 font-serif italic text-ink-600 border-t border-sand-200 pt-3">
          {book.author}
        </p>
        
        <div className="mt-auto pt-4 flex items-center justify-between">
          <span className="text-[10px] font-sans font-bold text-ink-400 uppercase tracking-widest">
            {book.categories[0]}
          </span>
          <span className="text-[10px] font-sans font-bold text-terracotta-500 uppercase tracking-widest">
            Detalhes <BookOpen className="inline-block w-3 h-3 ml-1" />
          </span>
        </div>
      </div>
    </Link>
  );
}
