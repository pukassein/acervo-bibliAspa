import React, { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { BookOpen, Library, PlusCircle, Settings, LayoutDashboard, Printer, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

export function AdminLayout() {
  const location = useLocation();
  const [adminLevel, setAdminLevel] = useState<"full" | "normal" | null>(
    (sessionStorage.getItem("adminLevel") as "full" | "normal" | null) || 
    (sessionStorage.getItem("adminAuth") === "true" ? "normal" : null) // backward compatibility
  );
  const [password, setPassword] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "husseinadmin") {
      setAdminLevel("full");
      sessionStorage.setItem("adminLevel", "full");
      sessionStorage.setItem("adminAuth", "true");
    } else if (password === "bibliaspaadmin") {
      setAdminLevel("normal");
      sessionStorage.setItem("adminLevel", "normal");
      sessionStorage.setItem("adminAuth", "true");
    } else {
      alert("Senha incorreta");
    }
  };

  const navItems = [
    { name: "Painel Principal", href: "/admin", icon: LayoutDashboard },
    { name: "Adicionar Volume", href: "/admin/add-book", icon: PlusCircle },
    ...(adminLevel === "full" ? [{ name: "Importar Catálogo", href: "/admin/import", icon: FileText }] : []),
    { name: "Imprimir Etiquetas", href: "/admin/print-labels", icon: Printer },
    { name: "Ver Acervo (Público)", href: "/browse", icon: Library },
  ];

  if (!adminLevel) {
     return (
       <div className="flex items-center justify-center min-h-screen bg-sand-100 p-4">
         <form onSubmit={handleLogin} className="bg-white p-8 border border-sand-300 shadow-xl max-w-sm w-full">
            <h2 className="font-serif text-2xl text-ink-900 mb-6 font-bold text-center">Acesso Restrito</h2>
            <div className="mb-4">
               <label className="block text-[10px] uppercase tracking-widest font-bold text-ink-900 mb-2">Senha de Administração</label>
               <input 
                  type="password" 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full border border-sand-300 p-2 focus:outline-none focus:border-terracotta-500"
               />
            </div>
            <button type="submit" className="w-full bg-ink-900 text-white p-3 text-xs uppercase tracking-widest font-bold hover:bg-black transition-colors">Entrar</button>
         </form>
       </div>
     );
  }

  return (
    <div className="flex min-h-screen bg-sand-100 flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-ink-900 text-white flex-shrink-0 flex flex-col">
        <div className="p-6 border-b border-white/10">
          <Link to="/" className="flex items-center gap-3 mb-2">
            <img src="https://jvfruuneqfgqvdztspid.supabase.co/storage/v1/object/public/images/bibliaspa%20logo.jpg" alt="BibliASPA Logo" className="h-8 w-auto mix-blend-screen invert" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden') }} />
            <BookOpen className="h-6 w-6 text-terracotta-500 hidden" />
            <span className="font-serif text-xl font-bold">BibliASPA</span>
          </Link>
          <p className="text-[10px] uppercase tracking-[0.2em] font-sans font-bold text-sand-300">Administração</p>
        </div>
        
        <nav className="flex-1 py-6 px-4 space-y-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href || (item.href !== "/admin" && location.pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-sans uppercase tracking-wider font-bold transition-colors",
                  isActive 
                    ? "bg-white/10 text-white" 
                    : "text-sand-300 hover:bg-white/5 hover:text-white"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-6 border-t border-white/10 mt-auto flex justify-between items-center">
          <div className="flex items-center gap-2 text-sand-300">
            <Settings className="h-4 w-4" />
            <span className="text-[10px] uppercase tracking-widest font-sans font-bold">Modo Mock Admin</span>
          </div>
          <button 
            onClick={() => {
              sessionStorage.removeItem("adminLevel");
              sessionStorage.removeItem("adminAuth");
              setAdminLevel(null);
            }}
            className="text-[10px] uppercase tracking-widest font-bold text-terracotta-500 hover:text-white transition-colors"
          >
            Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
