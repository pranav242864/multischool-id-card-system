import { Menu, Bell, ChevronDown, LogOut, User } from 'lucide-react';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

interface HeaderProps {
  user: {
    name: string;
    email: string;
    role: string;
    schoolName?: string;
  };
  onLogout: () => void;
  onToggleSidebar: () => void;
}

export function Header({ user, onLogout, onToggleSidebar }: HeaderProps) {
  const getRoleBadge = (role: string) => {
    const colors = {
      superadmin: 'bg-purple-100 text-purple-700',
      schooladmin: 'bg-blue-100 text-blue-700',
      teacher: 'bg-green-100 text-green-700',
    };
    return colors[role as keyof typeof colors] || colors.teacher;
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6">
      {/* Left Side */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleSidebar}
          className="lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </Button>
        
        {user.schoolName && (
          <div className="hidden md:block">
            <p className="text-gray-600">Current School</p>
            <p className="text-gray-900">{user.schoolName}</p>
          </div>
        )}
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-2 md:gap-4">
        {/* Notifications */}
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 hover:bg-gray-100 rounded-lg px-3 py-2 transition-colors">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="hidden md:block text-left">
                <p className="text-gray-900">{user.name}</p>
                <p className="text-gray-600">{user.email}</p>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p>{user.name}</p>
                <p className="text-gray-500">{user.email}</p>
                <span className={`inline-flex items-center px-2 py-1 rounded text-xs w-fit mt-1 ${getRoleBadge(user.role)}`}>
                  {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="w-4 h-4 mr-2" />
              Profile Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onLogout} className="text-red-600">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
