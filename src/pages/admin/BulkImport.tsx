import React, { useState } from "react";
import * as XLSX from "xlsx";
import { Upload, CheckCircle, AlertCircle, Play, Database, FileSpreadsheet, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface ImportRow {
  index: number;
  data: any;
  status: "pending" | "valid" | "invalid" | "imported" | "error";
  errors: string[];
}

export default function BulkImport() {
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const columnMapping: Record<string, string> = {
    "título em português": "translated_title",
    "título original": "arabic_title",
    "título original (árabe)": "arabic_title",
    "título em árabe": "arabic_title",
    "autor (latim)": "author_latin",
    "autor em latim": "author_latin",
    "autor": "author_latin",
    "autor (árabe)": "author_arabic",
    "autor em árabe": "author_arabic",
    "transliteração": "transliteration",
    "isbn": "isbn",
    "ano de publicação": "publication_year",
    "ano": "publication_year",
    "número de páginas": "pages",
    "páginas": "pages",
    "editora": "publisher",
    "idioma": "language",
    "sinopse": "synopsis",
    "categorias (separadas por vírgula)": "categories",
    "categorias": "categories",
    "prateleira/localização": "shelf",
    "prateleira": "shelf",
    "localização": "shelf"
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setRows([]);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      // Fetch all existing ISBNs to check for duplicates
      const { data: existingBooks } = await supabase
        .from('books')
        .select('isbn')
        .not('isbn', 'is', null)
        .neq('isbn', '');

      const existingIsbns = new Set(existingBooks?.map(b => b.isbn) || []);

      const processedRows = json.map((row: any, index) => {
        const normalizedData: any = {};
        
        // Map columns
        for (const key in row) {
          const normalizedKey = key.trim().toLowerCase();
          const dbField = columnMapping[normalizedKey] || null;
          if (dbField) {
            normalizedData[dbField] = row[key];
          }
        }

        const errors: string[] = [];
        if (!normalizedData.translated_title) errors.push("Título em Português é obrigatório");
        if (!normalizedData.arabic_title) errors.push("Título Original é obrigatório");
        if (!normalizedData.author_latin) errors.push("Autor (Latim) é obrigatório");

        if (normalizedData.isbn && existingIsbns.has(normalizedData.isbn)) {
          errors.push(`Possível duplicata: ISBN ${normalizedData.isbn} já existe no acervo`);
        }

        // Clean categories
        if (normalizedData.categories && typeof normalizedData.categories === 'string') {
          normalizedData.categories = normalizedData.categories.split(',').map((c: string) => c.trim()).filter(Boolean);
        } else {
          normalizedData.categories = [];
        }

        // Clean numbers
        if (normalizedData.publication_year) {
          const year = parseInt(normalizedData.publication_year, 10);
          normalizedData.publication_year = isNaN(year) ? null : year;
        } else {
           normalizedData.publication_year = null;
        }

        if (normalizedData.pages) {
          const pages = parseInt(normalizedData.pages, 10);
          normalizedData.pages = isNaN(pages) ? null : pages;
        } else {
          normalizedData.pages = null;
        }

        return {
          index: index + 2, // 1 for header, 1 for 0-index
          data: normalizedData,
          status: errors.length > 0 ? "invalid" : "valid",
          errors
        } as ImportRow;
      });

      setRows(processedRows);
    } catch (error) {
      console.error("Error reading file:", error);
      alert("Erro ao ler o arquivo Excel. Verifique se o formato está correto.");
    } finally {
      setIsProcessing(false);
      // Reset input
      e.target.value = '';
    }
  };

  const handleImport = async () => {
    const validRows = rows.filter(r => r.status === "valid");
    if (validRows.length === 0) return;

    setIsImporting(true);

    try {
      const booksToInsert = validRows.map(r => ({
        ...r.data,
        needs_verification: false // Bulk imports assumed verified, or can be set to true
      }));

      // We might need to handle large batches, but Supabase can handle hundreds easily.
      const { data, error } = await supabase
        .from('books')
        .insert(booksToInsert)
        .select('id');

      if (error) {
        throw error;
      }

      setRows(prev => prev.map(r => 
        r.status === "valid" ? { ...r, status: "imported" } : r
      ));

      alert(`${booksToInsert.length} livros importados com sucesso!`);

    } catch (error) {
      console.error("Import error:", error);
      alert("Erro ao importar para o banco de dados.");
    } finally {
      setIsImporting(false);
    }
  };

  const validCount = rows.filter(r => r.status === "valid").length;
  const invalidCount = rows.filter(r => r.status === "invalid").length;
  const importedCount = rows.filter(r => r.status === "imported").length;

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="font-serif text-3xl text-ink-900 font-bold mb-2">Importação em Lote</h1>
        <p className="text-sand-600 font-sans">
          Importe múltiplos livros de uma vez usando uma planilha Excel (.xlsx).
        </p>
      </div>

      <div className="bg-white border border-sand-300 p-8 flex flex-col items-center justify-center space-y-4 shadow-sm text-center">
        <div className="h-16 w-16 bg-sand-100 rounded-full flex items-center justify-center text-ink-900 mb-2">
          <FileSpreadsheet className="h-8 w-8" />
        </div>
        <div>
          <h3 className="font-sans font-bold text-ink-900 mb-1">Selecione o Arquivo</h3>
          <p className="text-sm text-sand-500 max-w-md mx-auto">
             Faça o upload do seu arquivo .xlsx com uma linha para cada livro. Certifique-se de usar os cabeçalhos corretos para mapeamento automático.
          </p>
        </div>
        
        <label className="cursor-pointer bg-ink-900 text-white px-6 py-3 text-xs uppercase tracking-widest font-bold hover:bg-black transition-colors flex items-center gap-2 mt-4 inline-flex">
          <Upload className="h-4 w-4" />
          <span>{isProcessing ? "Processando..." : "Procurar Arquivo"}</span>
          <input 
            type="file" 
            accept=".xlsx" 
            onChange={handleFileUpload} 
            className="hidden" 
            disabled={isProcessing || isImporting}
          />
        </label>
      </div>

      {rows.length > 0 && (
        <div className="space-y-6">
          <div className="bg-sand-100 border border-sand-300 p-4 flex flex-wrap gap-4 items-center justify-between">
            <div className="flex gap-4">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-bold text-ink-900">{rows.length}</span>
                <span className="text-sand-600">Lidas</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-green-700">
                <CheckCircle className="h-4 w-4" />
                <span className="font-bold">{validCount}</span>
                <span>Válidas</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span className="font-bold">{invalidCount}</span>
                <span>Inválidas</span>
              </div>
              {importedCount > 0 && (
                <div className="flex items-center gap-2 text-sm text-blue-600">
                  <Database className="h-4 w-4" />
                  <span className="font-bold">{importedCount}</span>
                  <span>Importadas</span>
                </div>
              )}
            </div>

            {validCount > 0 && importedCount === 0 && (
              <button
                onClick={handleImport}
                disabled={isImporting}
                className="bg-terracotta-500 text-white px-6 py-2 text-xs uppercase tracking-widest font-bold hover:bg-terracotta-600 transition-colors flex items-center gap-2"
              >
                {isImporting ? (
                  <span>Salvando...</span>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    <span>Importar {validCount} Válidas</span>
                  </>
                )}
              </button>
            )}
          </div>

          <div className="bg-white border border-sand-300 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm font-sans">
                <thead className="bg-sand-100 border-b border-sand-300">
                  <tr>
                    <th className="px-4 py-3 font-bold text-ink-900 text-xs uppercase tracking-wider w-16">Linha</th>
                    <th className="px-4 py-3 font-bold text-ink-900 text-xs uppercase tracking-wider w-24">Status</th>
                    <th className="px-4 py-3 font-bold text-ink-900 text-xs uppercase tracking-wider">Título (PT)</th>
                    <th className="px-4 py-3 font-bold text-ink-900 text-xs uppercase tracking-wider">Título (Original)</th>
                    <th className="px-4 py-3 font-bold text-ink-900 text-xs uppercase tracking-wider">Autor</th>
                    <th className="px-4 py-3 font-bold text-ink-900 text-xs uppercase tracking-wider">Detalhes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sand-200">
                  {rows.slice(0, 100).map((row) => (
                    <tr key={row.index} className={row.status === 'invalid' ? 'bg-red-50/50' : row.status === 'imported' ? 'bg-blue-50/30' : ''}>
                      <td className="px-4 py-3 text-sand-500 font-mono text-xs">{row.index}</td>
                      <td className="px-4 py-3">
                        {row.status === 'valid' && <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-[10px] uppercase font-bold tracking-wider rounded-full"><CheckCircle className="h-3 w-3 mr-1"/> Pronto</span>}
                        {row.status === 'invalid' && <span className="inline-flex items-center px-2 py-1 bg-red-100 text-red-800 text-[10px] uppercase font-bold tracking-wider rounded-full"><XCircle className="h-3 w-3 mr-1"/> Erro</span>}
                        {row.status === 'imported' && <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-[10px] uppercase font-bold tracking-wider rounded-full"><Database className="h-3 w-3 mr-1"/> Salvo</span>}
                      </td>
                      <td className="px-4 py-3 font-medium text-ink-900">
                        {row.data.translated_title || <span className="text-red-400 italic">Vazio</span>}
                      </td>
                      <td className="px-4 py-3 text-sand-700">
                        {row.data.arabic_title || <span className="text-red-400 italic">Vazio</span>}
                      </td>
                      <td className="px-4 py-3 text-sand-700">
                        {row.data.author_latin || <span className="text-red-400 italic">Vazio</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-sand-600">
                        {row.status === 'invalid' ? (
                          <ul className="list-disc pl-4 text-red-600">
                            {row.errors.map((err, i) => <li key={i}>{err}</li>)}
                          </ul>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {row.data.isbn && <span className="bg-sand-100 px-2 py-0.5 rounded">ISBN</span>}
                            {row.data.publication_year && <span className="bg-sand-100 px-2 py-0.5 rounded">Ano</span>}
                            {row.data.categories?.length > 0 && <span className="bg-sand-100 px-2 py-0.5 rounded">{row.data.categories.length} Cat</span>}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 100 && (
                <div className="p-4 text-center text-sm text-sand-500 border-t border-sand-300">
                  Mostrando as primeiras 100 linhas de {rows.length}.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
