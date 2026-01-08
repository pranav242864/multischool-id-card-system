import { useState } from 'react';
import { LoginPage } from './components/auth/LoginPage';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { SuperadminDashboard } from './components/superadmin/SuperadminDashboard';
import { ManageSchools } from './components/superadmin/ManageSchools';
import { ManageSessions } from './components/superadmin/ManageSessions';
import { ManageSchoolAdmins } from './components/superadmin/ManageSchoolAdmins';
import { SchooladminDashboard } from './components/schooladmin/SchooladminDashboard';
import { ManageStudents } from './components/schooladmin/ManageStudents';
import { ManageStudents as SuperadminManageStudents } from './components/superadmin/ManageStudents';
import { ManageTeachers } from './components/schooladmin/ManageTeachers';
import { ManageTeachers as SuperadminManageTeachers } from './components/superadmin/ManageTeachers';
import { BulkOperations } from './components/schooladmin/BulkOperations';
import { BulkOperations as SuperadminBulkOperations } from './components/superadmin/BulkOperations';
import { TemplateManagement } from './components/schooladmin/TemplateManagement';
import { TemplateManagement as SuperadminTemplateManagement } from './components/superadmin/TemplateManagement';
import { TeacherDashboard } from './components/teacher/TeacherDashboard';
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

  const handleLogin = (email: string, role: UserRole) => {
    const userData: User = {
      email,
      role,
      name: role === 'superadmin' ? 'Admin User' : role === 'schooladmin' ? 'John Doe' : 'Sarah Johnson',
      schoolName: role !== 'superadmin' ? 'Greenfield Public School' : undefined,
      assignedClass: role === 'teacher' ? 'Class 10-A' : undefined,
    };
    setCurrentUser(userData);
    setIsAuthenticated(true);
    setCurrentView('dashboard');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    setCurrentView('dashboard');
  };

  const renderContent = () => {
    if (!currentUser) return null;

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
        case 'teachers':
          return <SuperadminManageTeachers />;
        case 'templates':
          return <SuperadminTemplateManagement />;
        case 'students':
          return <SuperadminManageStudents />;
        case 'bulk':
          return <SuperadminBulkOperations userRole="superadmin" />;
        default:
          return <SuperadminDashboard onNavigate={setCurrentView} />;
      }
    }

    // Schooladmin views
    if (currentUser.role === 'schooladmin') {
      switch (currentView) {
        case 'dashboard':
          return <SchooladminDashboard onNavigate={setCurrentView} />;
        case 'students':
          return <ManageStudents />;
        case 'teachers':
          return <ManageTeachers />;
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
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
