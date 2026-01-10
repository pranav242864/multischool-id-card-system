import { useState, useEffect } from 'react';
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
import { noticeAPI, getCurrentUser } from '../../utils/api';

interface HeaderProps {
  user: {
    name: string;
    email: string;
    role: string;
    schoolName?: string;
  };
  onLogout: () => void;
  onToggleSidebar: () => void;
  onNavigate?: (view: string) => void;
}

export function Header({ user, onLogout, onToggleSidebar, onNavigate }: HeaderProps) {
  const [hasNewNotices, setHasNewNotices] = useState(false);

  const getRoleBadge = (role: string) => {
    const colors = {
      superadmin: 'bg-purple-100 text-purple-700',
      schooladmin: 'bg-blue-100 text-blue-700',
      teacher: 'bg-green-100 text-green-700',
    };
    return colors[role as keyof typeof colors] || colors.teacher;
  };

  // Get or set last viewed timestamp from localStorage
  const getLastViewedTimestamp = (): number => {
    const key = `lastViewedNotices_${user.role}_${user.email}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        return parseInt(stored, 10);
      } catch {
        return 0;
      }
    }
    return 0;
  };

  const setLastViewedTimestamp = (timestamp: number) => {
    const key = `lastViewedNotices_${user.role}_${user.email}`;
    localStorage.setItem(key, timestamp.toString());
  };

  // Check for new notices (only for schooladmin and teacher)
  useEffect(() => {
    const checkNewNotices = async () => {
      // Only check for schooladmin and teacher roles
      if (user.role !== 'schooladmin' && user.role !== 'teacher') {
        return;
      }

      try {
        const response = await noticeAPI.getNotices();
        if (response.success && response.data) {
          const lastViewed = getLastViewedTimestamp();
          let newNoticesFound = false;

          if (user.role === 'schooladmin') {
            // For school admin: check received notices (where current user's ID is in targetAdminIds)
            const currentUser = getCurrentUser();
            const currentUserId = currentUser?.id;
            
            if (!currentUserId) {
              setHasNewNotices(false);
              return;
            }

            const receivedNotices = response.data.filter((notice: any) => {
              const targetAdminIds = notice.targetAdminIds || [];
              const adminIds = Array.isArray(targetAdminIds) 
                ? targetAdminIds.map((admin: any) => {
                    if (typeof admin === 'object' && admin !== null) {
                      return admin._id || admin.id || admin;
                    }
                    return admin;
                  }).map((id: any) => id?.toString())
                : [];
              return adminIds.includes(currentUserId.toString());
            });

            // Check if any received notice was created after last viewed timestamp
            newNoticesFound = receivedNotices.some((notice: any) => {
              if (!notice.createdAt) return false;
              const noticeDate = new Date(notice.createdAt).getTime();
              return noticeDate > lastViewed;
            });
          } else if (user.role === 'teacher') {
            // For teacher: backend already filters notices, so all returned notices are meant for this teacher
            // Check if any notice was created after last viewed timestamp
            newNoticesFound = response.data.some((notice: any) => {
              if (!notice.createdAt) return false;
              const noticeDate = new Date(notice.createdAt).getTime();
              return noticeDate > lastViewed;
            });
          }

          setHasNewNotices(newNoticesFound);
        }
      } catch (err) {
        // Silently fail - don't show error for notification check
        setHasNewNotices(false);
      }
    };

    checkNewNotices();
    // Check every 5 minutes for new notices
    const interval = setInterval(checkNewNotices, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user.role, user.email]);

  const handleNotificationClick = () => {
    // Only navigate for schooladmin and teacher
    if ((user.role === 'schooladmin' || user.role === 'teacher') && onNavigate) {
      // Mark notices as viewed by updating timestamp to now
      setLastViewedTimestamp(Date.now());
      setHasNewNotices(false);
      onNavigate('notices');
    }
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
        {(user.role === 'schooladmin' || user.role === 'teacher') && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="relative"
            onClick={handleNotificationClick}
            title="View notices"
          >
            <Bell className="w-5 h-5" />
            {hasNewNotices && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            )}
          </Button>
        )}

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
