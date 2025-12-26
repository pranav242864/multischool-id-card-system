import { 
  LayoutDashboard, 
  School, 
  Users, 
  GraduationCap, 
  UserCircle, 
  Upload, 
  FileText,
  X,
  ChevronLeft
} from 'lucide-react';
import { Button } from '../ui/button';

interface SidebarProps {
  userRole: 'superadmin' | 'schooladmin' | 'teacher';
  currentView: string;
  onNavigate: (view: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export function Sidebar({ userRole, currentView, onNavigate, isOpen, onToggle }: SidebarProps) {
  const superadminItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'schools', label: 'Manage Schools', icon: School },
    { id: 'admins', label: 'Manage Admins', icon: Users },
    { id: 'teachers', label: 'Manage Teachers', icon: UserCircle },
    { id: 'students', label: 'Manage Students', icon: GraduationCap },
    { id: 'templates', label: 'Manage Templates', icon: FileText },
    { id: 'bulk', label: 'Bulk Operations', icon: Upload },
  ];

  const schooladminItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'students', label: 'Manage Students', icon: GraduationCap },
    { id: 'templates', label: 'ID Card Templates', icon: FileText },
    { id: 'teachers', label: 'Manage Teachers', icon: UserCircle },
    { id: 'bulk', label: 'Bulk Operations', icon: Upload },
  ];

  const teacherItems = [
    { id: 'dashboard', label: 'My Class', icon: LayoutDashboard },
    { id: 'bulk', label: 'Bulk Operations', icon: Upload },
  ];

  const menuItems = 
    userRole === 'superadmin' ? superadminItems :
    userRole === 'schooladmin' ? schooladminItems :
    teacherItems;

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-64 bg-white border-r border-gray-200
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${!isOpen ? 'lg:w-20' : 'lg:w-64'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-16 border-b border-gray-200 flex items-center justify-between px-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              {isOpen && (
                <span className="text-gray-900">MultiSchool ID</span>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggle}
              className="lg:hidden"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id);
                    if (window.innerWidth < 1024) {
                      onToggle();
                    }
                  }}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2 rounded-lg
                    transition-colors duration-200
                    ${isActive 
                      ? 'bg-blue-50 text-blue-600' 
                      : 'text-gray-700 hover:bg-gray-100'
                    }
                  `}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {isOpen && <span>{item.label}</span>}
                </button>
              );
            })}
          </nav>

          {/* Collapse Toggle (Desktop) */}
          <div className="hidden lg:block p-4 border-t border-gray-200">
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggle}
              className="w-full justify-start"
            >
              <ChevronLeft className={`w-5 h-5 transition-transform ${!isOpen ? 'rotate-180' : ''}`} />
              {isOpen && <span className="ml-2">Collapse</span>}
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
