import { GraduationCap, Users, BookOpen, FileText, Upload, CreditCard } from 'lucide-react';
import { StatCard } from '../ui/StatCard';
import { Button } from '../ui/button';

interface SchooladminDashboardProps {
  onNavigate: (view: string) => void;
}

export function SchooladminDashboard({ onNavigate }: SchooladminDashboardProps) {
  const notices = [
    {
      id: 1,
      title: 'New Session Started',
      message: 'Academic session 2025-26 has begun',
      date: '1 day ago',
      type: 'info',
    },
    {
      id: 2,
      title: 'ID Card Generation Complete',
      message: '1,150 student ID cards generated successfully',
      date: '2 days ago',
      type: 'success',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-gray-900 mb-2">School Dashboard</h1>
        <p className="text-gray-600">Manage your school's students, teachers, and ID cards</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Students"
          value="1,247"
          icon={GraduationCap}
          trend={{ value: '12 new', isPositive: true }}
          color="blue"
        />
        <StatCard
          title="Total Teachers"
          value="48"
          icon={Users}
          trend={{ value: '2 new', isPositive: true }}
          color="green"
        />
        <StatCard
          title="Total Classes"
          value="36"
          icon={BookOpen}
          color="purple"
        />
        <StatCard
          title="ID Cards Generated"
          value="1,150"
          icon={CreditCard}
          trend={{ value: '92%', isPositive: true }}
          color="orange"
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Button
            variant="outline"
            className="h-auto py-4 flex flex-col items-start gap-2"
            onClick={() => onNavigate('students')}
          >
            <GraduationCap className="w-5 h-5 text-blue-600" />
            <div className="text-left">
              <div className="text-gray-900">Add Student</div>
              <div className="text-gray-600">Register new student</div>
            </div>
          </Button>
          <Button
            variant="outline"
            className="h-auto py-4 flex flex-col items-start gap-2"
            onClick={() => onNavigate('bulk')}
          >
            <Upload className="w-5 h-5 text-green-600" />
            <div className="text-left">
              <div className="text-gray-900">Bulk Upload</div>
              <div className="text-gray-600">Import data via Excel</div>
            </div>
          </Button>
          <Button
            variant="outline"
            className="h-auto py-4 flex flex-col items-start gap-2"
            onClick={() => onNavigate('templates')}
          >
            <FileText className="w-5 h-5 text-purple-600" />
            <div className="text-left">
              <div className="text-gray-900">Manage Templates</div>
              <div className="text-gray-600">ID card designs</div>
            </div>
          </Button>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* School Notices */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-gray-900 mb-4">School Notices</h2>
          <div className="space-y-4">
            {notices.map((notice) => (
              <div
                key={notice.id}
                className="p-4 rounded-lg border border-gray-200"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-gray-900">{notice.title}</h3>
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      notice.type === 'success'
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

        {/* Recent Activity */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-gray-900 mb-4">Recent Activity</h2>
          <div className="space-y-4">
            {[
              {
                action: 'Student Added',
                detail: 'John Smith - Class 10-A',
                time: '10 minutes ago',
              },
              {
                action: 'Bulk Upload Complete',
                detail: '45 student records imported',
                time: '1 hour ago',
              },
              {
                action: 'ID Cards Generated',
                detail: 'Class 9-B (38 students)',
                time: '2 hours ago',
              },
              {
                action: 'Teacher Assigned',
                detail: 'Sarah Johnson to Class 8-C',
                time: '3 hours ago',
              },
            ].map((activity, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 rounded-lg border border-gray-200"
              >
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                <div className="flex-1">
                  <p className="text-gray-900">{activity.action}</p>
                  <p className="text-gray-600">{activity.detail}</p>
                  <p className="text-gray-500">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
