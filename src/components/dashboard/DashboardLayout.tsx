import { useState } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  TrendingUp,
  Target,
  Radio,
  Menu,
  X,
  LogOut,
  Moon,
  Sun,
  Bell,
  Sparkles,
  FileEdit,
  FlaskConical,
  Landmark,
  MessageSquare,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { MarketTicker } from './MarketTicker'
import { ErrorBoundary } from '../ErrorBoundary'
import { MobileBottomNav } from '../MobileBottomNav'
import { Breadcrumbs } from '../Breadcrumbs'
import { CommandPalette } from '../CommandPalette'
import { useAuth } from '../../hooks/useAuth'
import { useTheme } from '../../hooks/useTheme'
import { GlobalSearch } from '../GlobalSearch'
import logoIcon from '../../assets/logo-icon.png'

const navigation = [
  { name: 'Market Pulse', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Live Signals', href: '/dashboard/signals', icon: Radio },
  { name: 'ML Signals', href: '/dashboard/ml-signals', icon: Sparkles },
  { name: 'Tickers', href: '/dashboard/tickers', icon: TrendingUp },
  { name: 'Predictions', href: '/dashboard/predictions', icon: Target },
  { name: 'Sources', href: '/dashboard/sources', icon: Users },
  { name: 'Gov Calendar', href: '/dashboard/government', icon: Landmark },
  { name: 'Query Signals', href: '/dashboard/query', icon: MessageSquare },
  { name: 'Backtest', href: '/dashboard/backtest', icon: FlaskConical },
  { name: 'Alerts', href: '/dashboard/alerts', icon: Bell },
  { name: 'Drafts', href: '/dashboard/drafts', icon: FileEdit },
]

export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { signOut, session } = useAuth()
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-60 bg-card border-r flex flex-col transition-transform duration-200 lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="h-14 flex items-center justify-between px-5 border-b">
          <div className="flex items-center gap-2">
            <img src={logoIcon} alt="" className="h-10 w-auto" />
            <div>
              <h1 className="text-sm font-bold tracking-tight">STREET INSIGHTS</h1>
              <p className="text-xs text-muted-foreground font-medium tracking-wider uppercase">
                Boxford Partners
              </p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2.5 -mr-1 rounded-md hover:bg-accent active:bg-accent/80 lg:hidden"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-3 space-y-0.5">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              end={item.href === '/dashboard'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors active:bg-accent/80',
                  isActive
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )
              }
            >
              <item.icon className="h-4 w-4" />
              <span {...(item.name === 'Alerts' ? { 'data-tour-alerts': true } : {})}>
                {item.name}
              </span>
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t px-5 py-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse-glow" />
              <span className="text-xs text-muted-foreground">System Online</span>
            </div>
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-md hover:bg-accent active:bg-accent/80 text-muted-foreground hover:text-foreground transition-colors"
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground active:text-foreground/80 transition-colors w-full py-2"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="truncate">{session?.user?.email || "Sign out"}</span>
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-60">
        {/* Desktop header with search */}
        <div className="sticky top-0 z-30 hidden lg:flex items-center justify-between h-14 px-6 border-b bg-card/95 backdrop-blur">
          <div className="flex-1 max-w-2xl" data-tour-search>
            <GlobalSearch />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Mobile header */}
        <div className="sticky top-0 z-30 flex items-center h-14 px-4 border-b bg-card lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2.5 rounded-md hover:bg-accent active:bg-accent/80 mr-3"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <img src={logoIcon} alt="" className="h-8 w-auto" />
            <span className="text-sm font-bold tracking-tight">STREET INSIGHTS</span>
          </div>
          <div className="ml-auto">
            <GlobalSearch />
          </div>
        </div>

        <MarketTicker />
        <main className="p-4 sm:p-6 pb-20 lg:pb-6">
          <ErrorBoundary>
            <Breadcrumbs />
            <Outlet />
          </ErrorBoundary>
        </main>

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav />
      </div>

      {/* Command Palette */}
      <CommandPalette />
    </div>
  )
}
