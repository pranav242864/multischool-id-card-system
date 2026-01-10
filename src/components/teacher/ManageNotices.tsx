import { useState, useEffect } from 'react';
import { Bell, Calendar, FileText, ExternalLink, Loader2, Users } from 'lucide-react';
import { noticeAPI, APIError } from '../../utils/api';
import { Badge } from '../ui/badge';

interface Notice {
  _id?: string;
  id?: string;
  title: string;
  description: string;
  visibleTo: string[];
  targetTeacherIds?: any[];
  createdAt: string;
  status: string;
  attachments?: string[];
  createdBy?: {
    _id?: string;
    id?: string;
    name?: string;
    email?: string;
  } | string;
}

export function ManageNotices() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notices, setNotices] = useState<Notice[]>([]);

  useEffect(() => {
    const fetchNotices = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await noticeAPI.getNotices();
        if (response.success && response.data) {
          // For teachers, show all notices where they are in targetTeacherIds
          // The backend query already filters this, so we just use the response
          setNotices(response.data);
        }
      } catch (err) {
        const apiError = err as APIError;
        setError(apiError.message || 'Failed to load notices');
      } finally {
        setLoading(false);
      }
    };

    fetchNotices();
  }, []);

  // Helper function to extract filename from URL
  const getFileName = (url: string): string => {
    try {
      const urlPath = new URL(url).pathname;
      return urlPath.split('/').pop() || `Attachment`;
    } catch {
      return `Attachment`;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-gray-900 mb-2 text-2xl font-bold">Notices</h1>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900 mb-2 text-2xl font-bold">Notices</h1>
          <p className="text-gray-600">View notices sent to you by your school admin</p>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Notices List - Row Format */}
      {notices.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Bell className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-600 mb-4">No notices found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notices.map((notice) => {
            const noticeId = notice._id || notice.id || '';
            const targetTeachers = notice.targetTeacherIds || [];
            const teacherCount = Array.isArray(targetTeachers) ? targetTeachers.length : 0;

            return (
              <div
                key={noticeId}
                className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow relative"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-gray-900 font-semibold text-lg flex-1">
                    {notice.title}
                  </h3>
                  <Badge 
                    variant={notice.status === 'ACTIVE' ? 'default' : 'secondary'}
                    className="ml-2 flex-shrink-0"
                  >
                    {notice.status || 'ACTIVE'}
                  </Badge>
                </div>

                <p className="text-gray-600 mb-4 text-sm">
                  {notice.description}
                </p>

                {notice.attachments && notice.attachments.length > 0 && (
                  <div className="mb-4 space-y-2">
                    {notice.attachments.slice(0, 2).map((attachment: string, idx: number) => {
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
                    {notice.attachments.length > 2 && (
                      <p className="text-xs text-gray-500">
                        +{notice.attachments.length - 2} more
                      </p>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-gray-500 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>
                        {notice.createdAt 
                          ? new Date(notice.createdAt).toLocaleDateString()
                          : 'N/A'}
                      </span>
                    </div>
                    {notice.createdBy && typeof notice.createdBy === 'object' && notice.createdBy.name && (
                      <div className="flex items-center gap-1">
                        <span>From: {notice.createdBy.name}</span>
                      </div>
                    )}
                    {teacherCount > 0 && (
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        <span>{teacherCount} teacher{teacherCount !== 1 ? 's' : ''}</span>
                      </div>
                    )}
                  </div>
                </div>

                {notice.visibleTo && notice.visibleTo.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {notice.visibleTo.map((role) => (
                      <Badge key={role} variant="outline" className="text-xs">
                        {role}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
