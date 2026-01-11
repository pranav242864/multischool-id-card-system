import { useState, useEffect } from 'react';
import { School, Users, GraduationCap, Bell, FileText, ExternalLink, Snowflake } from 'lucide-react';
import { StatCard } from '../ui/StatCard';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { schoolAPI, noticeAPI, adminAPI, teacherAPI, studentAPI, APIError } from '../../utils/api';

interface SuperadminDashboardProps {
  onNavigate: (view: string) => void;
}

export function SuperadminDashboard({ onNavigate }: SuperadminDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schools, setSchools] = useState<any[]>([]);
  const [notices, setNotices] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalSchools: 0,
    totalAdmins: 0,
    totalStudents: 0,
    totalTeachers: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch schools
        const schoolsResponse = await schoolAPI.getSchools();
        if (schoolsResponse.success && schoolsResponse.data) {
          setSchools(schoolsResponse.data);
          setStats(prev => ({ ...prev, totalSchools: schoolsResponse.data.length }));

          // Fetch data for each school (teachers, students, admins)
          const schools = schoolsResponse.data;
          let totalTeachers = 0;
          let totalStudents = 0;
          let totalAdmins = 0;

          // Fetch teachers, students, and admins for each school
          const schoolDataPromises = schools.map(async (school: any) => {
            try {
              const schoolId = school._id || school.id;
              
              // Fetch teachers for this school
              const teachersResponse = await teacherAPI.getTeachers({ schoolId });
              const teacherCount = teachersResponse.success && teachersResponse.data 
                ? teachersResponse.data.length 
                : 0;

              // Fetch students for this school
              const studentsResponse = await studentAPI.getStudents({ schoolId, limit: 1000 });
              const studentCount = studentsResponse.success && studentsResponse.data 
                ? studentsResponse.data.length 
                : 0;

              // Fetch school admins for this school
              // Backend filters by schoolId, so we just count the returned admins
              const adminsResponse = await adminAPI.getSchoolAdmins(schoolId);
              const adminCount = adminsResponse.success && adminsResponse.data 
                ? adminsResponse.data.length 
                : 0;

              return { teacherCount, studentCount, adminCount };
            } catch (err) {
              return { teacherCount: 0, studentCount: 0, adminCount: 0 };
            }
          });

          const schoolDataResults = await Promise.all(schoolDataPromises);
          
          totalTeachers = schoolDataResults.reduce((sum, result) => sum + result.teacherCount, 0);
          totalStudents = schoolDataResults.reduce((sum, result) => sum + result.studentCount, 0);
          totalAdmins = schoolDataResults.reduce((sum, result) => sum + result.adminCount, 0);

          setStats(prev => ({
            ...prev,
            totalTeachers,
            totalStudents,
            totalAdmins
          }));
        }

        // Fetch notices (for SUPERADMIN, no schoolId needed)
        const noticesResponse = await noticeAPI.getNotices();
        if (noticesResponse.success && noticesResponse.data) {
          setNotices(noticesResponse.data.slice(0, 3)); // Show latest 3
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
          <h1 className="text-gray-900 mb-2">Super Admin Dashboard</h1>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-gray-900 mb-2">Super Admin Dashboard</h1>
          <p className="text-red-600">Error: {error}</p>
        </div>
      </div>
    );
  }

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
          value={stats.totalSchools.toString()}
          icon={School}
          color="blue"
        />
        <StatCard
          title="School Admins"
          value={stats.totalAdmins.toString()}
          icon={Users}
          color="green"
        />
        <StatCard
          title="Total Students"
          value={stats.totalStudents.toString()}
          icon={GraduationCap}
          color="purple"
        />
        <StatCard
          title="Total Teachers"
          value={stats.totalTeachers.toString()}
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
            onClick={() => onNavigate('notices')}
          >
            <Bell className="w-5 h-5 text-orange-600" />
            <div className="text-left">
              <div className="text-gray-900">Manage Notices</div>
              <div className="text-gray-600">Create and manage notices</div>
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
            {notices.length === 0 ? (
              <p className="text-gray-500 text-sm">No notices available</p>
            ) : (
              notices.map((notice) => (
                <div
                  key={notice._id || notice.id}
                  className="p-4 rounded-lg border border-gray-200 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-gray-900">{notice.title}</h3>
                    <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">
                      {notice.status || 'ACTIVE'}
                    </span>
                  </div>
                  <p className="text-gray-600 mb-2">{notice.description}</p>
                  {notice.attachments && notice.attachments.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {notice.attachments.map((attachment: string, idx: number) => (
                        <a
                          key={idx}
                          href={attachment}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                        >
                          <FileText className="w-4 h-4" />
                          <span>Attachment {idx + 1}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ))}
                    </div>
                  )}
                  <p className="text-gray-500 text-sm">
                    {notice.createdAt ? new Date(notice.createdAt).toLocaleDateString() : ''}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Schools */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-gray-900">Recently Added Schools</h2>
            <School className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {schools.length === 0 ? (
              <p className="text-gray-500 text-sm">No schools available</p>
            ) : (
              // Sort by creation date (most recent first) and take top 3
              [...schools]
                .sort((a, b) => {
                  const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                  const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                  return dateB - dateA; // Most recent first
                })
                .slice(0, 3)
                .map((school) => {
                  const isFrozen = school.frozen || false;
                  const status = (school.status || 'active').toLowerCase();
                  
                  return (
                    <div
                      key={school._id || school.id}
                      className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <School className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-gray-900 font-medium">{school.name}</p>
                            {isFrozen ? (
                              <Badge variant="outline" className="border-purple-300 text-purple-700 bg-purple-50">
                                <Snowflake className="w-3 h-3 mr-1 fill-current" />
                                Frozen
                              </Badge>
                            ) : (
                              <Badge variant={status === 'active' ? 'default' : 'secondary'}>
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                              </Badge>
                            )}
                          </div>
                          <p className="text-gray-600 text-sm mt-1">
                            {school.city || 'No city specified'}
                          </p>
                          {school.createdAt && (
                            <p className="text-gray-500 text-xs mt-1">
                              Added {new Date(school.createdAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
