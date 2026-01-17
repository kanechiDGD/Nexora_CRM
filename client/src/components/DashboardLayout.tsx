import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { APP_LOGO, APP_TITLE, getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { usePermissions } from "@/hooks/usePermissions";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { LayoutDashboard, LogOut, PanelLeft, Users, FileText, Building2, ArrowLeft, UserCircle, FileSignature, Calendar, CheckSquare, Sun, Moon, Settings, Bell } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";
import LanguageSelector from "./LanguageSelector";
import { useTranslation } from "react-i18next";


const getMenuItems = (canManageUsers: boolean, canManageWorkflow: boolean, t: any) => {
  const items = [
    { icon: LayoutDashboard, label: t('dashboard.menu.dashboard'), path: "/dashboard" },
    { icon: Users, label: t('dashboard.menu.clients'), path: "/clients" },
    { icon: FileText, label: t('dashboard.menu.logs'), path: "/logs" },
    { icon: Bell, label: t('dashboard.menu.notifications'), path: "/notifications" },
    { icon: Building2, label: t('dashboard.menu.construction'), path: "/construction" },
    { icon: Calendar, label: t('dashboard.menu.calendar'), path: "/calendar" },
    { icon: CheckSquare, label: t('dashboard.menu.tasks'), path: "/tasks" },
    { icon: UserCircle, label: t('dashboard.menu.profile'), path: "/profile" },
    { icon: FileSignature, label: t('dashboard.menu.contracts'), path: "/contracts" },
  ];

  if (canManageWorkflow) {
    items.push({ icon: Settings, label: t('dashboard.menu.workflow'), path: "/workflow" });
  }

  if (canManageUsers) {
    items.push({ icon: Settings, label: t('dashboard.menu.users'), path: "/users" });
  }

  return items;
};

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();
  const { t } = useTranslation();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-6">
            <div className="relative group">
              <div className="relative">
                <img
                  src={APP_LOGO}
                  alt={APP_TITLE}
                  className="h-20 w-20 rounded-xl object-cover shadow"
                />
              </div>
            </div>
            <div className="text-center space-y-2">
              <span className="text-2xl font-bold tracking-tight">{APP_TITLE}</span>
              <p className="text-sm text-muted-foreground">
                {t('dashboard.user.pleaseSignIn')}
              </p>
            </div>
          </div>
          <Button
            onClick={() => {
              window.location.href = getLoginUrl();
            }}
            size="lg"
            className="w-full shadow-lg hover:shadow-xl transition-all"
          >
            {t('dashboard.user.signIn')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, loading, logout } = useAuth();
  const { role, canManageUsers, canEdit } = usePermissions();
  const { t } = useTranslation();
  const { data: organization } = trpc.organizations.getMyOrganization.useQuery(undefined, {
    enabled: !!user,
  });
  const { data: membership } = trpc.organizations.checkMembership.useQuery(undefined, {
    enabled: !!user,
    refetchOnWindowFocus: false,
  });
  const setupMutation = trpc.billing.createSetupSession.useMutation({
    onSuccess: (data) => {
      if (data?.url) {
        window.location.href = data.url;
      }
    },
  });
  const { data: notifications = [] } = trpc.notifications.list.useQuery(
    { limit: 200 },
    { enabled: !!user }
  );
  const menuItems = getMenuItems(canManageUsers, canEdit, t);
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeMenuItem = menuItems.find(item => item.path === location);
  const isMobile = useIsMobile();
  const { theme, toggleTheme } = useTheme();
  const unreadCount = useMemo(
    () => notifications.filter((notification: any) => !notification.readAt).length,
    [notifications]
  );
  const isComped = membership?.billing?.isComped === true;
  const trialDaysLeft = membership?.billing?.trialDaysLeft ?? null;
  const showTrialCountdown = Boolean(
    trialDaysLeft !== null &&
      trialDaysLeft > 0 &&
      !membership?.billing?.hasPaymentMethod &&
      !isComped
  );
  const returnPath = `${location}${window.location.search || ""}`;
  const handleAddPaymentMethod = () => {
    setupMutation.mutate({ successPath: returnPath, cancelPath: returnPath });
  };

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r-0"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-16 justify-center">
            <div className="flex items-center gap-3 pl-2 group-data-[collapsible=icon]:px-0 transition-all w-full">
              {isCollapsed ? (
                <div className="relative h-8 w-8 shrink-0 group">
                  <img
                    src={APP_LOGO}
                    className="h-8 w-8 rounded-md object-cover ring-1 ring-border"
                    alt="Logo"
                  />
                  <button
                    onClick={toggleSidebar}
                    className="absolute inset-0 flex items-center justify-center bg-accent rounded-md ring-1 ring-border opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <PanelLeft className="h-4 w-4 text-foreground" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={APP_LOGO}
                      className="h-8 w-8 rounded-md object-cover ring-1 ring-border shrink-0"
                      alt="Logo"
                    />
                    <span className="font-semibold tracking-tight truncate">
                      {organization?.name || APP_TITLE}
                    </span>
                  </div>
                  <button
                    onClick={toggleSidebar}
                    className="ml-auto h-8 w-8 flex items-center justify-center hover:bg-accent rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                  >
                    <PanelLeft className="h-4 w-4 text-muted-foreground" />
                  </button>
                </>
              )}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0">
            <SidebarMenu className="px-2 py-1">
              {menuItems.map(item => {
                const isActive = location === item.path;
                const showUnreadDot = item.path === "/notifications" && unreadCount > 0;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className={`h-10 transition-all font-normal`}
                    >
                      {showUnreadDot ? (
                        <span className="relative inline-flex">
                          <item.icon
                            className={`h-4 w-4 ${isActive ? "text-primary" : ""}`}
                          />
                          <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500" />
                        </span>
                      ) : (
                        <item.icon
                          className={`h-4 w-4 ${isActive ? "text-primary" : ""}`}
                        />
                      )}
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-3 space-y-2">
            {showTrialCountdown && (
              <div className="rounded-lg border border-border bg-card p-3 space-y-2">
                <p className="text-xs font-medium text-foreground">
                  {t("billing.trialCountdownTitle")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("billing.trialCountdownLabel", { days: trialDaysLeft })}
                </p>
                <Button
                  size="sm"
                  className="w-full"
                  onClick={handleAddPaymentMethod}
                  disabled={setupMutation.isPending}
                >
                  {t("billing.addPaymentMethod")}
                </Button>
                <button
                  type="button"
                  className="text-[11px] text-muted-foreground underline underline-offset-2"
                  onClick={() => {
                    window.location.href = "/billing";
                  }}
                >
                  {t("billing.haveCoupon")}
                </button>
              </div>
            )}
            {/* Selector de Idioma */}
            <LanguageSelector />

            {/* Botón de Modo Día/Noche */}
            <Button
              variant="outline"
              size="sm"
              onClick={toggleTheme}
              className="w-full justify-start gap-2"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="h-4 w-4" />
                  <span className="group-data-[collapsible=icon]:hidden">{t('dashboard.theme.dayMode')}</span>
                </>
              ) : (
                <>
                  <Moon className="h-4 w-4" />
                  <span className="group-data-[collapsible=icon]:hidden">{t('dashboard.theme.nightMode')}</span>
                </>
              )}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-9 w-9 border shrink-0">
                    <AvatarFallback className="text-xs font-medium">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate leading-none">
                        {user?.name || "-"}
                      </p>
                      <Badge variant={role === 'ADMIN' ? 'default' : role === 'CO_ADMIN' ? 'secondary' : 'outline'} className="text-xs px-1 py-0">
                        {role === 'ADMIN' ? 'Admin' : role === 'CO_ADMIN' ? 'Co-Admin' : 'Vendedor'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-1">
                      {user?.email || "-"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{t('dashboard.user.signOut')}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-2 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-background" />
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-1">
                  <span className="tracking-tight text-foreground">
                    {activeMenuItem?.label ?? APP_TITLE}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
        <main className="flex-1 p-4">
          {!isMobile && location !== '/dashboard' && location !== '/clients' && (
            <button
              onClick={() => setLocation('/clients')}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('dashboard.navigation.backToClients')}
            </button>
          )}
          {children}
        </main>
      </SidebarInset>
    </>
  );
}
