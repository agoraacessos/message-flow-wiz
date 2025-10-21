import { Link, useLocation } from "react-router-dom";
import { Home, Users, MessageSquare, Send, BarChart3, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Contatos", href: "/contacts", icon: Users },
  { name: "Mensagens", href: "/messages", icon: MessageSquare },
  { name: "Campanhas", href: "/campaigns", icon: Send },
  { name: "Configurações", href: "/field-settings", icon: Settings },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-[hsl(var(--sidebar-bg))]">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-glow">
            <Send className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">WhatsApp</h1>
            <p className="text-xs text-muted-foreground">Campaign Manager</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-4">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-accent text-accent-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t p-4">
          <div className="rounded-lg bg-accent/50 p-4">
            <div className="flex items-center gap-2 text-sm">
              <BarChart3 className="h-4 w-4 text-primary" />
              <span className="font-medium text-foreground">Status</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Sistema operacional
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
