import { useState, useEffect } from 'react';
import { LoginPage } from './components/auth/LoginPage';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { SuperadminDashboard } from './components/superadmin/SuperadminDashboard';
import { ManageSchools } from './components/superadmin/ManageSchools';
import { ManageSessions } from './components/superadmin/ManageSessions';
import { ManageSchoolAdmins } from './components/superadmin/ManageSchoolAdmins';
import { ManageNotices } from './components/superadmin/ManageNotices';
import { ManageNotices as SchooladminManageNotices } from './components/schooladmin/ManageNotices';
import { SchooladminDashboard } from './components/schooladmin/SchooladminDashboard';
import { ManageStudents } from './components/schooladmin/ManageStudents';
import { ManageStudents as SuperadminManageStudents } from './components/superadmin/ManageStudents';
import { ManageClasses } from './components/schooladmin/ManageClasses';
import { ManageClasses as SuperadminManageClasses } from './components/superadmin/ManageClasses';
import { ManageTeachers } from './components/schooladmin/ManageTeachers';
import { ManageTeachers as SuperadminManageTeachers } from './components/superadmin/ManageTeachers';
import { BulkOperations } from './components/schooladmin/BulkOperations';
import { BulkOperations as SuperadminBulkOperations } from './components/superadmin/BulkOperations';
import { TemplateManagement } from './components/schooladmin/TemplateManagement';
import { TemplateManagement as SuperadminTemplateManagement } from './components/superadmin/TemplateManagement';
import { LoginLogs } from './components/superadmin/LoginLogs';
import { TeacherDashboard } from './components/teacher/TeacherDashboard';
import { ManageNotices as TeacherManageNotices } from './components/teacher/ManageNotices';
import { BulkOperations as TeacherBulkOperations } from './components/teacher/BulkOperations';

type UserRole = 'superadmin' | 'schooladmin' | 'teacher';

interface User {
  name: string;
  email: string;
  role: UserRole;
  schoolName?: string;
  assignedClass?: string;
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogin = (userData: {
    email: string;
    role: string;
    name: string;
    schoolId?: string | null;
    schoolName?: string | null;
    assignedClass?: string;
  }) => {
    // Convert role to UserRole type
    const roleMap: Record<string, UserRole> = {
      'SUPERADMIN': 'superadmin',
      'superadmin': 'superadmin',
      'SCHOOLADMIN': 'schooladmin',
      'schooladmin': 'schooladmin',
      'TEACHER': 'teacher',
      'teacher': 'teacher',
    };
    
    const mappedUser: User = {
      email: userData.email,
      role: roleMap[userData.role] || 'teacher',
      name: userData.name,
      schoolName: userData.schoolName || undefined,
      assignedClass: userData.assignedClass,
    };
    
    setCurrentUser(mappedUser);
    setIsAuthenticated(true);
    setCurrentView('dashboard');
  };

  // Session hygiene on mount:
  // Previously we auto-logged in if a token + user were present, which skipped the login screen.
  // To keep the login flow explicit and avoid auto-login as SUPERADMIN, we now only
  // clear obviously invalid data and always show the login screen on first load.
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const userStr = localStorage.getItem('user');

    // If either part of the session is missing or malformed, clear both.
    if (!token || !userStr) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      return;
    }

    try {
      // Validate that stored user is at least parseable JSON
      JSON.parse(userStr);
    } catch {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
    }
  }, []);

  const handleLogout = () => {
    // Clear authentication data
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setCurrentUser(null);
    setCurrentView('dashboard');
  };

  // Route guard: Redirect unauthorized users away from admin-only views
  useEffect(() => {
    if (!currentUser || !isAuthenticated) return;

    const superadminOnlyViews = ['schools', 'sessions', 'admins', 'logs'];
    const adminOnlyViews = ['classes', 'students', 'teachers', 'templates', 'bulk'];
    const teacherAllowedViews = ['dashboard', 'notices', 'bulk'];
    
    // Guard: Prevent non-superadmin from accessing superadmin-only views
    if (superadminOnlyViews.includes(currentView) && currentUser.role !== 'superadmin') {
      setCurrentView('dashboard');
    }
    
    // Guard: Prevent teachers from accessing admin-only views (except bulk and notices which are allowed)
    if (adminOnlyViews.includes(currentView) && currentUser.role === 'teacher' && currentView !== 'bulk') {
      setCurrentView('dashboard');
    }
    
    // Guard: Prevent teachers from accessing views they're not allowed to see
    if (currentUser.role === 'teacher' && !teacherAllowedViews.includes(currentView)) {
      setCurrentView('dashboard');
    }
  }, [currentView, currentUser, isAuthenticated]);

  const renderContent = () => {
    if (!currentUser) return null;

    // Define admin-only views
    const superadminOnlyViews = ['schools', 'sessions', 'admins', 'logs'];
    const adminOnlyViews = ['classes', 'students', 'teachers', 'templates', 'bulk'];
    const teacherAllowedViews = ['dashboard', 'notices', 'bulk'];
    
    // Guard: Prevent non-superadmin from accessing superadmin-only views
    if (superadminOnlyViews.includes(currentView) && currentUser.role !== 'superadmin') {
      return currentUser.role === 'schooladmin' 
        ? <SchooladminDashboard onNavigate={setCurrentView} />
        : <TeacherDashboard />;
    }
    
    // Guard: Prevent teachers from accessing admin-only views (except bulk and notices which are allowed)
    if (adminOnlyViews.includes(currentView) && currentUser.role === 'teacher' && currentView !== 'bulk') {
      return <TeacherDashboard />;
    }
    
    // Guard: Prevent teachers from accessing views they're not allowed to see
    if (currentUser.role === 'teacher' && !teacherAllowedViews.includes(currentView)) {
      return <TeacherDashboard />;
    }

    // Superadmin views
    if (currentUser.role === 'superadmin') {
      switch (currentView) {
        case 'dashboard':
          return <SuperadminDashboard onNavigate={setCurrentView} />;
        case 'schools':
          return <ManageSchools />;
        case 'sessions':
          return <ManageSessions />;
        case 'admins':
          return <ManageSchoolAdmins />;
        case 'notices':
          return <ManageNotices />;
        case 'teachers':
          return <SuperadminManageTeachers />;
        case 'classes':
          return <SuperadminManageClasses />;
        case 'templates':
          return <SuperadminTemplateManagement />;
        case 'students':
          return <SuperadminManageStudents />;
        case 'bulk':
          return <SuperadminBulkOperations userRole="superadmin" />;
        case 'logs':
          return <LoginLogs />;
        default:
          return <SuperadminDashboard onNavigate={setCurrentView} />;
      }
    }

    // Schooladmin views
    if (currentUser.role === 'schooladmin') {
      switch (currentView) {
        case 'dashboard':
          return <SchooladminDashboard onNavigate={setCurrentView} />;
        case 'classes':
          return <ManageClasses />;
        case 'students':
          return <ManageStudents />;
        case 'teachers':
          return <ManageTeachers />;
        case 'notices':
          return <SchooladminManageNotices />;
        case 'bulk':
          return <BulkOperations userRole="schooladmin" />;
        case 'templates':
          return <TemplateManagement />;
        default:
          return <SchooladminDashboard onNavigate={setCurrentView} />;
      }
    }

    // Teacher views
    if (currentUser.role === 'teacher') {
      switch (currentView) {
        case 'dashboard':
          return <TeacherDashboard />;
        case 'notices':
          return <TeacherManageNotices />;
        case 'bulk':
          return <TeacherBulkOperations />;
        default:
          return <TeacherDashboard />;
      }
    }
  };

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        userRole={currentUser!.role}
        currentView={currentView}
        onNavigate={setCurrentView}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          user={currentUser!}
          onLogout={handleLogout}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onNavigate={setCurrentView}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
