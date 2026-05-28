-- Create the books table for the 'Acervo'
CREATE TABLE public.books (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Titles
    arabic_title TEXT NOT NULL,
    transliteration TEXT,
    translated_title TEXT NOT NULL,
    
    -- Authors
    author_latin TEXT NOT NULL,
    author_arabic TEXT,
    
    -- Publishers & Metadata
    isbn TEXT,
    publication_year INTEGER,
    pages INTEGER,
    publisher TEXT,
    language TEXT,
    
    -- Content & Media
    synopsis TEXT,
    cover_image TEXT,
    categories TEXT[] DEFAULT '{}',
    
    -- Physical Location in the Library
    shelf TEXT
);

-- Enable Row Level Security (RLS)
-- This is a Supabase security best practice to protect your data
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

-- 1. Read Policy: Allow anyone (even unauthenticated users) to view and search the books
CREATE POLICY "Permitir leitura pública de livros" 
    ON public.books FOR SELECT 
    USING (true);

-- 2. Insert Policy: Allow anyone to add new books (Since Auth is not implemented yet)
CREATE POLICY "Permitir inserção de livros" 
    ON public.books FOR INSERT 
    TO public 
    WITH CHECK (true);

-- 3. Update Policy: Allow anyone to edit book details
CREATE POLICY "Permitir atualização de livros" 
    ON public.books FOR UPDATE
    TO public 
    USING (true);

-- 4. Delete Policy: Allow anyone to remove books
CREATE POLICY "Permitir exclusão de livros" 
    ON public.books FOR DELETE
    TO public 
    USING (true);
