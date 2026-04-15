import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
    Package,
    LayoutDashboard,
    Warehouse,
    DollarSign,
    Calculator,
    Upload,
    Settings,
    LogOut,
} from 'lucide-react';
import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect('/login');

    const handleLogout = async () => {
        'use server';
        const supabase = await createClient();
        await supabase.auth.signOut();
        redirect('/login');
    };

    const navItems = [
        { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { href: '/products', icon: Package, label: 'Productos' },
        { href: '/inventory', icon: Warehouse, label: 'Inventario' },
        { href: '/sales', icon: DollarSign, label: 'Ventas' },
        { href: '/calculator', icon: Calculator, label: 'Calculadora' },
        { href: '/import', icon: Upload, label: 'Importar' },
        { href: '/settings', icon: Settings, label: 'Configuración' },
    ];

    return (
        <div className="min-h-screen bg-background">
            {/* Mobile Bottom Nav */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/90 backdrop-blur-lg border-t border-border px-2 py-1.5 flex justify-around">
                {navItems.slice(0, 5).map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className="flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl text-muted-foreground hover:text-primary transition-colors"
                    >
                        <item.icon className="w-5 h-5" />
                        <span className="text-[10px] font-medium">{item.label}</span>
                    </Link>
                ))}
            </nav>

            {/* Mobile Top Bar */}
            <header className="lg:hidden sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-card/90 backdrop-blur-lg border-b border-border">
                <h1 className="text-lg font-bold text-gradient">FBA Manager</h1>
                <ThemeToggle compact />
            </header>

            {/* Desktop Layout */}
            <div className="flex">
                {/* Desktop Sidebar */}
                <aside className="hidden lg:flex w-64 flex-col fixed h-screen bg-[hsl(var(--sidebar-bg))] border-r border-[hsl(var(--sidebar-border))]">
                    <div className="p-5 border-b border-[hsl(var(--sidebar-border))]">
                        <h1 className="text-xl font-bold text-gradient">FBA Manager</h1>
                        <p className="text-[10px] text-muted-foreground mt-0.5 tracking-wider uppercase">
                            Amazon Analytics
                        </p>
                    </div>

                    <nav className="p-3 space-y-0.5 flex-1 overflow-y-auto">
                        {navItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[hsl(var(--sidebar-text))] hover:text-[hsl(var(--sidebar-text-hover))] hover:bg-[hsl(var(--sidebar-hover))] transition-all duration-200 group"
                            >
                                <div className="w-8 h-8 rounded-lg bg-transparent group-hover:bg-[hsl(var(--sidebar-active))] flex items-center justify-center transition-all duration-200">
                                    <item.icon className="w-4 h-4 text-[hsl(var(--sidebar-icon))] group-hover:text-[hsl(var(--sidebar-icon-hover))] transition-colors duration-200" />
                                </div>
                                <span className="text-sm font-medium">{item.label}</span>
                            </Link>
                        ))}
                    </nav>

                    <div className="p-3 border-t border-[hsl(var(--sidebar-border))] space-y-0.5">
                        <ThemeToggle />
                        <form action={handleLogout}>
                            <button
                                type="submit"
                                className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-red-500/70 hover:text-red-500 hover:bg-red-500/5 transition-all duration-200 group"
                            >
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center group-hover:bg-red-500/10 transition-all duration-200">
                                    <LogOut className="w-4 h-4" />
                                </div>
                                <span className="text-sm font-medium">Cerrar Sesión</span>
                            </button>
                        </form>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 lg:ml-64 min-h-screen pb-20 lg:pb-0">
                    <div className="p-4 sm:p-6 lg:p-8">{children}</div>
                </main>
            </div>
        </div>
    );
}