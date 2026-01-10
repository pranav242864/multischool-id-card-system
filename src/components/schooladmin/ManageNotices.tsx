import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Plus, Bell, Calendar, Users, FileText, ExternalLink, Trash2, Loader2 } from 'lucide-react';
import { noticeAPI, teacherAPI, APIError, getCurrentUser } from '../../utils/api';
import { AddNoticeModalForTeachers } from '../modals/AddNoticeModalForTeachers';
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deletingNoticeId, setDeletingNoticeId] = useState<string | null>(null);

  useEffect(() => {
    const fetchNotices = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await noticeAPI.getNotices();
        if (response.success && response.data) {
          // Filter to show only notices created by the current school admin
          const currentUser = getCurrentUser();
          const currentUserId = currentUser?.id;
          
          if (currentUserId) {
            const filteredNotices = response.data.filter((notice: Notice) => {
              // Handle createdBy being an object (populated) or string (ID)
              let createdById: string | undefined;
              if (typeof notice.createdBy === 'string') {
                createdById = notice.createdBy;
              } else if (notice.createdBy && typeof notice.createdBy === 'object') {
                createdById = notice.createdBy._id || notice.createdBy.id;
              }
              return createdById?.toString() === currentUserId.toString();
            });
            setNotices(filteredNotices);
            
            // Mark notices as viewed by updating the last viewed timestamp
            // Get received notices (notices where current user is in targetAdminIds)
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
            
            // Find the most recent received notice timestamp
            if (receivedNotices.length > 0) {
              const latestNotice = receivedNotices.reduce((latest: any, notice: any) => {
                if (!notice.createdAt) return latest;
                const noticeTime = new Date(notice.createdAt).getTime();
                const latestTime = latest ? new Date(latest.createdAt).getTime() : 0;
                return noticeTime > latestTime ? notice : latest;
              }, null);
              
              if (latestNotice && latestNotice.createdAt) {
                const key = `lastViewedNotices_schooladmin_${currentUser.email || ''}`;
                localStorage.setItem(key, new Date(latestNotice.createdAt).getTime().toString());
              }
            } else {
              // If no received notices, mark current time as viewed
              const key = `lastViewedNotices_schooladmin_${currentUser.email || ''}`;
              localStorage.setItem(key, Date.now().toString());
            }
          } else {
            setNotices([]);
          }
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

  const handleCreateNotice = async (noticeData: {
    title: string;
    description: string;
    targetTeacherIds: string[];
    attachmentFiles?: File[];
  }) => {
    setCreating(true);
    setError(null);
    try {
      const response = await noticeAPI.createNotice({
        title: noticeData.title,
        description: noticeData.description,
        visibleTo: ['TEACHER'], // Default to TEACHER role
        targetTeacherIds: noticeData.targetTeacherIds,
      }, noticeData.attachmentFiles);

      if (response.success && response.data) {
        // Refresh notices list to get the updated data with createdBy populated
        const refreshResponse = await noticeAPI.getNotices();
        if (refreshResponse.success && refreshResponse.data) {
          const currentUser = getCurrentUser();
          const currentUserId = currentUser?.id;
          
          if (currentUserId) {
            const filteredNotices = refreshResponse.data.filter((notice: Notice) => {
              // Handle createdBy being an object (populated) or string (ID)
              let createdById: string | undefined;
              if (typeof notice.createdBy === 'string') {
                createdById = notice.createdBy;
              } else if (notice.createdBy && typeof notice.createdBy === 'object') {
                createdById = notice.createdBy._id || notice.createdBy.id;
              }
              return createdById?.toString() === currentUserId.toString();
            });
            setNotices(filteredNotices);
          }
        }
        setIsModalOpen(false);
        return true;
      } else {
        setError(response.message || 'Failed to create notice');
        return false;
      }
    } catch (err) {
      const apiError = err as APIError;
      setError(apiError.message || 'Failed to create notice');
      return false;
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteNotice = async (noticeId: string) => {
    if (!window.confirm('Are you sure you want to delete this notice? This action cannot be undone.')) {
      return;
    }

    setDeletingNoticeId(noticeId);
    setError(null);
    try {
      const response = await noticeAPI.archiveNotice(noticeId);
      
      if (response.success) {
        // Remove notice from list after successful deletion
        setNotices(prev => prev.filter(notice => (notice._id || notice.id) !== noticeId));
      } else {
        setError(response.message || 'Failed to delete notice');
      }
    } catch (err) {
      const apiError = err as APIError;
      setError(apiError.message || 'Failed to delete notice');
    } finally {
      setDeletingNoticeId(null);
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
          <p className="text-gray-600">Create and manage notices for teachers</p>
        </div>

        <div className="flex gap-2 items-center">
          <Button 
            onClick={() => setIsModalOpen(true)} 
            className="bg-blue-600 hover:bg-blue-700"
            disabled={creating}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add New Notice
          </Button>
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
          <Button 
            onClick={() => setIsModalOpen(true)} 
            variant="outline"
            disabled={creating}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add New Notice
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {notices.map((notice) => {
            const noticeId = notice._id || notice.id || '';
            const targetTeachers = notice.targetTeacherIds || [];
            const teacherCount = Array.isArray(targetTeachers) 
              ? targetTeachers.length 
              : (targetTeachers && typeof targetTeachers === 'object' && 'length' in targetTeachers ? targetTeachers.length : 0);
            const isDeleting = deletingNoticeId === noticeId;

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
                    {teacherCount > 0 && (
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        <span>{teacherCount} teacher{teacherCount !== 1 ? 's' : ''}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Delete Button - Bottom Right Corner */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleDeleteNotice(noticeId)}
                    disabled={isDeleting || creating}
                    title="Delete notice"
                  >
                    {isDeleting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
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

      {/* Modal */}
      <AddNoticeModalForTeachers
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setError(null);
        }}
        onSave={handleCreateNotice}
        loading={creating}
      />
    </div>
  );
}
