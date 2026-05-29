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

export const fetchMetadata = async () => {
  const { data, error } = await supabase.from('books').select('categories, language');
  if (error) {
    console.error("Error fetching metadata:", error);
    return { mainCategories: [], allTags: [], languages: ["All"] };
  }
  
  const allCategories = data.map(d => d.categories || []);
  const mainCategories = Array.from(new Set(allCategories.map(c => c[0]).filter(Boolean)));
  const allTags = Array.from(new Set(allCategories.flatMap(c => c.slice(1)).filter(Boolean)));
  const languages = ["All", ...Array.from(new Set(data.map(d => d.language).filter(Boolean)))];
  
  return { mainCategories, allTags, languages };
};

export const searchBooks = async (params: {
  page: number;
  limit: number;
  searchQuery?: string;
  categories?: string[];
  language?: string;
}): Promise<{ books: Book[], totalCount: number }> => {
  const { page, limit, searchQuery, categories, language } = params;

  let query = supabase.from('books').select('*', { count: 'exact' });

  if (language && language !== 'All') {
    query = query.eq('language', language);
  }

  if (categories && categories.length > 0) {
    // contains operator in Supabase for JSON/Arrays
    query = query.contains('categories', categories);
  }

  if (searchQuery) {
    const term = `%${searchQuery}%`;
    query = query.or(`translated_title.ilike.${term},arabic_title.ilike.${term},author_latin.ilike.${term},transliteration.ilike.${term}`);
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to).order('created_at', { ascending: false });

  const { data, error, count } = await query;

  if (error) {
    console.error("Error searching books:", error);
    return { books: [], totalCount: 0 };
  }

  return { 
    books: data.map(mapSupabaseBook), 
    totalCount: count || 0 
  };
};


