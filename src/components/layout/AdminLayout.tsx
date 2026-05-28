import { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { BookOpen, Library, PlusCircle, Settings, LayoutDashboard, Printer, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

export function AdminLayout() {
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(
    sessionStorage.getItem("adminAuth") === "true"
  );
  const [password, setPassword] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "bibliaspaadmin") {
      setIsAuthenticated(true);
      sessionStorage.setItem("adminAuth", "true");
    } else {
      alert("Senha incorreta");
    }
  };

  const navItems = [
    { name: "Painel Principal", href: "/admin", icon: LayoutDashboard },
    { name: "Adicionar Volume", href: "/admin/add-book", icon: PlusCircle },
    { name: "Importar Catálogo", href: "/admin/import", icon: FileText },
    { name: "Imprimir Etiquetas", href: "/admin/print-labels", icon: Printer },
    { name: "Ver Acervo (Público)", href: "/browse", icon: Library },
  ];

  if (!isAuthenticated) {
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
            <img src="https://scontent.fbsb9-1.fna.fbcdn.net/v/t39.30808-6/484013488_1206920821433995_2659863590173208802_n.jpg?_nc_cat=108&ccb=1-7&_nc_sid=6ee11a&_nc_eui2=AeFW8KzUli1vnN8jqABv7DiIx-uSuoLSiQrH65K6gtKJCjJITe4W8dEJ-TeTXGqb9kPlUHe6gWOLkQoK6V6dIXoe&_nc_ohc=AAWhCpVj0LUQ7kNvwFFwbx6&_nc_oc=AdoaG7w1qbySw9-gmtN3T_17zxp1qsTdn7PmnfKgT6PkDXPoZS8NB14S21lb21lY_Ew&_nc_zt=23&_nc_ht=scontent.fbsb9-1.fna&_nc_gid=FIOOj4tx9cl-B6TrRB-zZA&_nc_ss=7b2a8&oh=00_Af5R1RwCp6aUijRSNXwMlCNBPOvlgO8oSVXJ26enPwW_TQ&oe=6A1D5B7F" alt="BibliASPA Logo" className="h-8 w-auto mix-blend-screen invert" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden') }} />
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

        <div className="p-6 border-t border-white/10 mt-auto">
          <div className="flex items-center gap-2 text-sand-300">
            <Settings className="h-4 w-4" />
            <span className="text-[10px] uppercase tracking-widest font-sans font-bold">Modo Mock Admin</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
