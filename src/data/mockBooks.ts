import { supabase } from "@/lib/supabase";

export interface Book {
  id: string;
  arabicTitle: string;
  titleTransliteration: string;
  translatedTitle: string;
  author: string;
  authorArabic: string;
  language: string;
  publicationYear: number;
  publisher: string;
  isbn: string;
  pages: number;
  description: string;
  categories: string[];
  shelf: string;
  coverImage?: string;
  city?: string;
  series?: string;
  size?: string;
  createdAt?: string;
}

export const mapSupabaseBook = (row: any): Book => ({
  id: row.id,
  arabicTitle: row.arabic_title || "",
  titleTransliteration: row.transliteration || "",
  translatedTitle: row.translated_title || "",
  author: row.author_latin || "",
  authorArabic: row.author_arabic || "",
  language: row.language || "",
  publicationYear: row.publication_year || 0,
  publisher: row.publisher || "",
  isbn: row.isbn || "",
  pages: row.pages || 0,
  description: row.synopsis || "",
  categories: row.categories || [],
  shelf: row.shelf || "",
  coverImage: row.cover_image || "",
  city: row.city || "",
  series: row.series || "",
  size: row.size || "",
  createdAt: row.created_at || ""
});

export const fetchBooks = async (): Promise<Book[]> => {
  const { data, error } = await supabase.from('books').select('*').order('created_at', { ascending: false });
  if (error) {
    console.error("Error fetching books:", error);
    return [];
  }
  return data.map(mapSupabaseBook);
};

