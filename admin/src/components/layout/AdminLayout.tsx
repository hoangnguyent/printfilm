import { useState } from "react";

import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";

import {

  Bell,

  Clapperboard,

  FileVideo,

  Film,

  Image,

  Layers,

  LayoutDashboard,

  ListVideo,

  LogOut,

  Maximize2,

  Menu,

  Receipt,

  Scale,

  Settings,

  Shapes,

  Users,

  Wallet,

} from "lucide-react";

import { clearAuth, getCachedUser } from "@/lib/auth";

import { cn } from "@/lib/utils";



type NavItem = {

  to: string;

  label: string;

  icon: typeof LayoutDashboard;

  end?: boolean;

  matchPrefix?: boolean;

};



type NavGroup = {

  label: string;

  items: NavItem[];

};



const navGroups: NavGroup[] = [

  {

    label: "Overview",
    items: [{ to: "/", label: "Dashboard", icon: LayoutDashboard, end: true }],

  },

  {

    label: "Business",

    items: [

      { to: "/users", label: "Users", icon: Users },
      { to: "/orders", label: "Orders & Ledger", icon: Receipt },
      { to: "/adjustments", label: "Balance Adjustments", icon: Scale },
      { to: "/finance", label: "Finance", icon: Wallet },
      { to: "/projects", label: "Short Video Projects", icon: Clapperboard },
      { to: "/works", label: "Work Review", icon: FileVideo },

    ],

  },

  {

    label: "Drama",

    items: [

      { to: "/drama-projects", label: "Drama Projects", icon: Film, matchPrefix: true },
      { to: "/drama-assets", label: "Asset Library", icon: Image, matchPrefix: true },
      { to: "/drama-episodes", label: "Episode Management", icon: ListVideo, matchPrefix: true },
      { to: "/drama-fragments", label: "Storyboard Management", icon: Layers, matchPrefix: true },

    ],

  },

  {

    label: "Resources",

    items: [

      { to: "/templates", label: "Templates", icon: Shapes },
      { to: "/queues", label: "Task Center", icon: Layers },

    ],

  },

  {

    label: "System",

    items: [{ to: "/settings", label: "System Settings", icon: Settings }],

  },

];



const titles: Record<string, string> = {

  "/": "Dashboard",
  "/users": "Users",
  "/orders": "Orders & Ledger",
  "/adjustments": "Balance Adjustments",
  "/finance": "Finance",
  "/projects": "Short Video Projects",
  "/drama-projects": "Drama Projects",
  "/drama-assets": "Asset Library",
  "/drama-episodes": "Episode Management",
  "/drama-fragments": "Storyboard Management",
  "/works": "Work Review",
  "/templates": "Templates",
  "/settings": "System Settings",
  "/queues": "Task Center",

};



function resolveTitle(pathname: string): string {

  if (pathname.startsWith("/drama-projects/")) return "Drama Project Details";
  if (pathname.startsWith("/drama-assets/")) return "Asset Details";
  if (pathname.startsWith("/drama-episodes/")) return "Episode Details";
  if (pathname.startsWith("/drama-fragments/")) return "Storyboard Details";
  return titles[pathname] ?? "Admin Console";

}



// Admin shell: dark sidebar + glass top bar

export function AdminLayout() {

  const navigate = useNavigate();

  const location = useLocation();

  const user = getCachedUser();

  /*

   * collapsed sidebar collapsed state

   */

  const [collapsed, setCollapsed] = useState(false);



  // Logout and return to login

  function handleLogout() {

    clearAuth();

    navigate("/login");

  }



  const title = resolveTitle(location.pathname);

  const initial = (user?.nickname || user?.email || "A").slice(0, 1).toUpperCase();



  return (

    <div className={cn("admin-app", collapsed && "is-collapsed")}>

      <aside className="admin-sidebar">

        <div className="admin-brand">

          <div className="admin-brand-mark">PF</div>

          {!collapsed && (

            <div>

              <div className="admin-brand-name">PRINTFILM</div>

              <div className="admin-brand-sub">Admin Console</div>

            </div>

          )}

        </div>

        <nav className="admin-nav">

          {navGroups.map((group) => (

            <div key={group.label} className="admin-nav-group">

              {!collapsed ? <div className="admin-nav-group-label">{group.label}</div> : null}

              {group.items.map((item) => (

                <NavLink

                  key={item.to}

                  to={item.to}

                  end={item.end ?? !item.matchPrefix}

                  className={({ isActive }) =>

                    cn(

                      "admin-nav-item",

                      (isActive || (item.matchPrefix && location.pathname.startsWith(`${item.to}/`))) &&

                        "is-active",

                    )

                  }

                  title={item.label}

                >

                  <item.icon className="h-[18px] w-[18px] shrink-0" />

                  {!collapsed && <span>{item.label}</span>}

                </NavLink>

              ))}

            </div>

          ))}

        </nav>

        <div className="admin-user-card">

          <div className="admin-avatar">{initial}</div>

          {!collapsed && (

            <div className="min-w-0 flex-1">

              <div className="truncate text-[13px] font-medium text-[#e8f0eb]">{user?.email}</div>

              <div className="text-xs text-[rgba(240,245,242,0.45)]">Super Admin</div>

            </div>

          )}

          <button type="button" className="admin-icon-btn !text-[rgba(240,245,242,0.55)] hover:!text-[#e8f0eb]" onClick={handleLogout} title="Sign out">

            <LogOut className="h-4 w-4" />

          </button>

        </div>

      </aside>



      <div className="admin-main">

        <header className="admin-topbar">

          <div className="flex items-center gap-3">

            <button

              type="button"

              className="admin-icon-btn"

              onClick={() => setCollapsed((v) => !v)}

              aria-label="Collapse sidebar"

            >

              <Menu className="h-4 w-4" />

            </button>

            <div>

              <div className="admin-topbar-title">{title}</div>

              <div className="admin-topbar-crumb">PRINTFILM · Operations</div>

            </div>

          </div>

          <div className="flex items-center gap-1">

            <button type="button" className="admin-icon-btn" title="Notifications">

              <Bell className="h-4 w-4" />

            </button>

            <button

              type="button"

              className="admin-icon-btn"

              title="Full screen"

              onClick={() => {

                if (!document.fullscreenElement) void document.documentElement.requestFullscreen();

                else void document.exitFullscreen();

              }}

            >

              <Maximize2 className="h-4 w-4" />

            </button>

          </div>

        </header>

        <main className="admin-content">

          <Outlet />

        </main>

      </div>

    </div>

  );

}

