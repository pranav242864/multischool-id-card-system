import { useState, useEffect } from 'react';
import { GraduationCap, Users, BookOpen, FileText, Upload, CreditCard, ExternalLink, Bell } from 'lucide-react';
import { StatCard } from '../ui/StatCard';
import { Button } from '../ui/button';
import { noticeAPI, studentAPI, teacherAPI, classAPI, APIError, getCurrentUser } from '../../utils/api';

interface SchooladminDashboardProps {
  onNavigate: (view: string) => void;
}

export function SchooladminDashboard({ onNavigate }: SchooladminDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [receivedNotices, setReceivedNotices] = useState<any[]>([]);
  const [sentNotices, setSentNotices] = useState<any[]>([]);
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

        // Fetch notices and separate into Received and Sent
        const noticesResponse = await noticeAPI.getNotices();
        if (noticesResponse.success && noticesResponse.data) {
          const currentUser = getCurrentUser();
          const currentUserId = currentUser?.id;
          
          if (currentUserId) {
            // Received notices: notices where current user's ID is in targetAdminIds (sent by SUPERADMIN)
            const received = noticesResponse.data.filter((notice: any) => {
              const targetAdminIds = notice.targetAdminIds || [];
              const adminIds = Array.isArray(targetAdminIds) 
                ? targetAdminIds.map((admin: any) => {
                    // Handle populated admin object or direct ID
                    if (typeof admin === 'object' && admin !== null) {
                      return admin._id || admin.id || admin;
                    }
                    return admin;
                  }).map((id: any) => id?.toString())
                : [];
              return adminIds.includes(currentUserId.toString());
            }).slice(0, 3); // Show latest 3
            
            // Sent notices: notices created by current school admin (sent to teachers)
            const sent = noticesResponse.data.filter((notice: any) => {
              // Handle createdBy being an object (populated) or string (ID)
              let createdById: string | undefined;
              if (typeof notice.createdBy === 'string') {
                createdById = notice.createdBy;
              } else if (notice.createdBy && typeof notice.createdBy === 'object') {
                createdById = notice.createdBy._id || notice.createdBy.id;
              }
              return createdById?.toString() === currentUserId.toString();
            }).slice(0, 3); // Show latest 3
            
            setReceivedNotices(received);
            setSentNotices(sent);
          } else {
            setReceivedNotices([]);
            setSentNotices([]);
          }
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
          <Button
            variant="outline"
            className="h-auto py-4 flex flex-col items-start gap-2"
            onClick={() => onNavigate('notices')}
          >
            <Bell className="w-5 h-5 text-blue-600" />
            <div className="text-left">
              <div className="text-gray-900">Manage Notices</div>
              <div className="text-gray-600">Send notices to teachers</div>
            </div>
          </Button>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Received Notices */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-gray-900 mb-4">Received Notices</h2>
          <div className="space-y-4 max-h-[500px] overflow-y-auto">
            {receivedNotices.length === 0 ? (
              <p className="text-gray-500 text-sm">No received notices</p>
            ) : (
              receivedNotices.map((notice) => (
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
                  <p className="text-gray-600 mb-2 text-sm">{notice.description}</p>
                  {notice.attachments && notice.attachments.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {notice.attachments.map((attachment: string, idx: number) => {
                        const getFileName = (url: string): string => {
                          try {
                            const urlPath = new URL(url).pathname;
                            return urlPath.split('/').pop() || `Attachment ${idx + 1}`;
                          } catch {
                            return `Attachment ${idx + 1}`;
                          }
                        };
                        const fileName = getFileName(attachment);
                        
                        return (
                          <a
                            key={idx}
                            href={attachment}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center text-sm text-blue-600 hover:text-blue-700"
                          >
                            <FileText className="w-4 h-4 mr-2" />
                            <span className="truncate">{fileName}</span>
                            <ExternalLink className="w-3 h-3 flex-shrink-0 ml-1" />
                          </a>
                        );
                      })}
                    </div>
                  )}
                  <p className="text-gray-500 text-xs mt-2">
                    {notice.createdAt ? new Date(notice.createdAt).toLocaleDateString() : ''}
                    {notice.createdBy && (
                      <span className="ml-2">
                        • From {notice.createdBy.name || 'Super Admin'}
                      </span>
                    )}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Sent Notices */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-gray-900 mb-4">Sent Notices</h2>
          <div className="space-y-4 max-h-[500px] overflow-y-auto">
            {sentNotices.length === 0 ? (
              <p className="text-gray-500 text-sm">No sent notices</p>
            ) : (
              sentNotices.map((notice) => {
                const targetTeachers = notice.targetTeacherIds || [];
                const teacherCount = Array.isArray(targetTeachers) 
                  ? targetTeachers.length 
                  : (targetTeachers && typeof targetTeachers === 'object' && 'length' in targetTeachers ? targetTeachers.length : 0);
                
                return (
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
                    <p className="text-gray-600 mb-2 text-sm">{notice.description}</p>
                    {notice.attachments && notice.attachments.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {notice.attachments.map((attachment: string, idx: number) => {
                          const getFileName = (url: string): string => {
                            try {
                              const urlPath = new URL(url).pathname;
                              return urlPath.split('/').pop() || `Attachment ${idx + 1}`;
                            } catch {
                              return `Attachment ${idx + 1}`;
                            }
                          };
                          const fileName = getFileName(attachment);
                          
                          return (
                            <a
                              key={idx}
                              href={attachment}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center text-sm text-blue-600 hover:text-blue-700"
                            >
                              <FileText className="w-4 h-4 mr-2" />
                              <span className="truncate">{fileName}</span>
                              <ExternalLink className="w-3 h-3 flex-shrink-0 ml-1" />
                            </a>
                          );
                        })}
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-gray-500 text-xs">
                        {notice.createdAt ? new Date(notice.createdAt).toLocaleDateString() : ''}
                      </p>
                      {teacherCount > 0 && (
                        <p className="text-gray-500 text-xs flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {teacherCount} teacher{teacherCount !== 1 ? 's' : ''}
                        </p>
                      )}
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
