import { School, Users, GraduationCap, TrendingUp, Bell, UserCircle } from 'lucide-react';
import { StatCard } from '../ui/StatCard';
import { Button } from '../ui/button';

interface SuperadminDashboardProps {
  onNavigate: (view: string) => void;
}

export function SuperadminDashboard({ onNavigate }: SuperadminDashboardProps) {
  const notices = [
    {
      id: 1,
      title: 'System Maintenance Scheduled',
      message: 'Server maintenance on Sunday, 2 AM - 4 AM',
      date: '2 hours ago',
      type: 'warning',
    },
    {
      id: 2,
      title: 'New School Onboarded',
      message: 'Riverside High School has been successfully added',
      date: '5 hours ago',
      type: 'success',
    },
    {
      id: 3,
      title: 'Monthly Report Available',
      message: 'October 2025 system-wide report is ready',
      date: '1 day ago',
      type: 'info',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-gray-900 mb-2">Super Admin Dashboard</h1>
        <p className="text-gray-600">Overview of all schools and system-wide statistics</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Schools"
          value="24"
          icon={School}
          color="blue"
        />
        <StatCard
          title="School Admins"
          value="48"
          icon={Users}
          color="green"
        />
        <StatCard
          title="Total Students"
          value="12,847"
          icon={GraduationCap}
          color="purple"
        />
        <StatCard
          title="Total Teachers"
          value="1,243"
          icon={Users}
          color="orange"
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Button
            variant="outline"
            className="h-auto py-4 flex flex-col items-start gap-2"
            onClick={() => onNavigate('schools')}
          >
            <School className="w-5 h-5 text-blue-600" />
            <div className="text-left">
              <div className="text-gray-900">Manage Schools</div>
              <div className="text-gray-600">Add or edit schools</div>
            </div>
          </Button>
          <Button
            variant="outline"
            className="h-auto py-4 flex flex-col items-start gap-2"
            onClick={() => onNavigate('admins')}
          >
            <Users className="w-5 h-5 text-green-600" />
            <div className="text-left">
              <div className="text-gray-900">Manage Admins</div>
              <div className="text-gray-600">Create admin accounts</div>
            </div>
          </Button>
          <Button
            variant="outline"
            className="h-auto py-4 flex flex-col items-start gap-2"
            onClick={() => onNavigate('students')}
          >
            <GraduationCap className="w-5 h-5 text-purple-600" />
            <div className="text-left">
              <div className="text-gray-900">Manage Students</div>
              <div className="text-gray-600">View and manage students</div>
            </div>
          </Button>
          <Button
            variant="outline"
            className="h-auto py-4 flex flex-col items-start gap-2"
            onClick={() => onNavigate('teachers')}
          >
            <UserCircle className="w-5 h-5 text-orange-600" />
            <div className="text-left">
              <div className="text-gray-900">Manage Teachers</div>
              <div className="text-gray-600">View and manage teachers</div>
            </div>
          </Button>
        </div>
      </div>

      {/* Recent Activity & Notices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Notices */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-gray-900">Notices</h2>
            <Bell className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {notices.map((notice) => (
              <div
                key={notice.id}
                className="p-4 rounded-lg border border-gray-200 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-gray-900">{notice.title}</h3>
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      notice.type === 'warning'
                        ? 'bg-yellow-100 text-yellow-700'
                        : notice.type === 'success'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {notice.type}
                  </span>
                </div>
                <p className="text-gray-600 mb-2">{notice.message}</p>
                <p className="text-gray-500">{notice.date}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Schools */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-gray-900 mb-4">Recently Added Schools</h2>
          <div className="space-y-4">
            {[
              { name: 'Riverside High School', admin: 'Michael Chen', students: 850 },
              { name: 'Oakwood Academy', admin: 'Sarah Williams', students: 640 },
              { name: 'Maple Grove School', admin: 'David Brown', students: 520 },
            ].map((school, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 rounded-lg border border-gray-200"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <School className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-gray-900">{school.name}</p>
                    <p className="text-gray-600">Admin: {school.admin}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-gray-900">{school.students}</p>
                  <p className="text-gray-600">students</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
