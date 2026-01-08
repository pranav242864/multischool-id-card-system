import { useState, useEffect } from 'react';
import { GraduationCap, Users, BookOpen, FileText, Upload, CreditCard } from 'lucide-react';
import { StatCard } from '../ui/StatCard';
import { Button } from '../ui/button';
import { noticeAPI, studentAPI, teacherAPI, classAPI, APIError } from '../../utils/api';

interface SchooladminDashboardProps {
  onNavigate: (view: string) => void;
}

export function SchooladminDashboard({ onNavigate }: SchooladminDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notices, setNotices] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalClasses: 0,
    idCardsGenerated: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch students
        const studentsResponse = await studentAPI.getStudents();
        if (studentsResponse.success && studentsResponse.data) {
          setStats(prev => ({ ...prev, totalStudents: studentsResponse.data.length }));
        }

        // Fetch teachers
        const teachersResponse = await teacherAPI.getTeachers();
        if (teachersResponse.success && teachersResponse.data) {
          setStats(prev => ({ ...prev, totalTeachers: teachersResponse.data.length }));
        }

        // Fetch classes
        const classesResponse = await classAPI.getClasses();
        if (classesResponse.success && classesResponse.data) {
          setStats(prev => ({ ...prev, totalClasses: classesResponse.data.length }));
        }

        // Fetch notices
        const noticesResponse = await noticeAPI.getNotices();
        if (noticesResponse.success && noticesResponse.data) {
          setNotices(noticesResponse.data.slice(0, 2)); // Show latest 2
        }
      } catch (err) {
        const apiError = err as APIError;
        setError(apiError.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-gray-900 mb-2">School Dashboard</h1>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-gray-900 mb-2">School Dashboard</h1>
          <p className="text-red-600">Error: {error}</p>
        </div>
      </div>
    );
  }

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
          value={stats.totalStudents.toString()}
          icon={GraduationCap}
          color="blue"
        />
        <StatCard
          title="Total Teachers"
          value={stats.totalTeachers.toString()}
          icon={Users}
          color="green"
        />
        <StatCard
          title="Total Classes"
          value={stats.totalClasses.toString()}
          icon={BookOpen}
          color="purple"
        />
        <StatCard
          title="ID Cards Generated"
          value={stats.idCardsGenerated.toString()}
          icon={CreditCard}
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
            {notices.length === 0 ? (
              <p className="text-gray-500 text-sm">No notices available</p>
            ) : (
              notices.map((notice) => (
                <div
                  key={notice._id || notice.id}
                  className="p-4 rounded-lg border border-gray-200"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-gray-900">{notice.title}</h3>
                    <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">
                      {notice.status || 'ACTIVE'}
                    </span>
                  </div>
                  <p className="text-gray-600 mb-2">{notice.description}</p>
                  <p className="text-gray-500 text-sm">
                    {notice.createdAt ? new Date(notice.createdAt).toLocaleDateString() : ''}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-gray-900 mb-4">Recent Activity</h2>
          <div className="space-y-4">
            <p className="text-gray-500 text-sm">
              Recent activity data is not yet available from the backend API.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
