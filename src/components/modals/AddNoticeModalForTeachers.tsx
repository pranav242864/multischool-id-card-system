import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Checkbox } from '../ui/checkbox';
import { Badge } from '../ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../ui/popover';
import { teacherAPI, APIError } from '../../utils/api';
import { Loader2, ChevronDown, Users, Paperclip, X } from 'lucide-react';

interface Teacher {
  _id: string;
  id: string;
  userId: string;
  name: string;
  email?: string;
  mobile?: string;
}

interface AddNoticeModalForTeachersProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (noticeData: {
    title: string;
    description: string;
    targetTeacherIds: string[];
    attachmentFiles?: File[];
  }) => Promise<boolean>;
  loading?: boolean;
}

export function AddNoticeModalForTeachers({ isOpen, onClose, onSave, loading = false }: AddNoticeModalForTeachersProps) {
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [teacherError, setTeacherError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<Set<string>>(new Set());
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
  });

  useEffect(() => {
    const fetchTeachers = async () => {
      if (!isOpen) return;
      setLoadingTeachers(true);
      setTeacherError(null);
      try {
        // Fetch all teachers for the current school admin's school
        const response = await teacherAPI.getTeachers();
        
        if (response.success && response.data && Array.isArray(response.data)) {
          // Map teachers - use userId for targeting
          const mappedTeachers = response.data
            .filter((teacher: any) => {
              return teacher.userId && teacher.name;
            })
            .map((teacher: any) => {
              const teacherId = teacher._id || teacher.id;
              const userId = teacher.userId?._id || teacher.userId?.id || teacher.userId;
              
              if (!userId) {
                console.warn('Teacher missing userId:', teacher);
                return null;
              }
              
              return {
                _id: teacherId,
                id: teacherId,
                userId: userId,
                name: teacher.name || 'Unknown',
                email: teacher.email || '',
                mobile: teacher.mobile || '',
              };
            })
            .filter((teacher): teacher is Teacher => teacher !== null);
          
          setTeachers(mappedTeachers);
          
          if (mappedTeachers.length === 0) {
            setTeacherError('No teachers found in your school');
          }
        } else {
          setTeacherError('Failed to load teachers');
        }
      } catch (err) {
        const apiError = err as APIError;
        setTeacherError(apiError.message || 'Failed to load teachers');
      } finally {
        setLoadingTeachers(false);
      }
    };

    fetchTeachers();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      // Reset form when modal closes
      setFormData({ title: '', description: '' });
      setSelectedTeacherIds(new Set());
      setSelectedFiles([]);
      setError(null);
      setTeacherError(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }

    if (!formData.description.trim()) {
      setError('Description is required');
      return;
    }

    if (selectedTeacherIds.size === 0) {
      setError('Please select at least one teacher');
      return;
    }

    const success = await onSave({
      title: formData.title.trim(),
      description: formData.description.trim(),
      targetTeacherIds: Array.from(selectedTeacherIds),
      attachmentFiles: selectedFiles.length > 0 ? selectedFiles : undefined,
    });

    if (success) {
      // Form will be reset by useEffect when modal closes
    }
  };

  const toggleTeacher = (userId: string) => {
    setSelectedTeacherIds(prev => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...filesArray]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const selectedTeachers = teachers.filter(teacher => selectedTeacherIds.has(teacher.userId));

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Notice</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-4">
          <div className="space-y-4">
            {/* Title */}
            <div>
              <Label htmlFor="title" className="mb-2 block">
                Notice Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter notice title"
                disabled={loading || loadingTeachers}
                required
              />
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description" className="mb-2 block">
                Notice Content <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter notice content"
                rows={5}
                disabled={loading || loadingTeachers}
                required
              />
            </div>

            {/* Target Teachers */}
            <div>
              <Label className="mb-2 block">
                Target Teachers <span className="text-red-500">*</span>
              </Label>
              <Popover open={isDropdownOpen} onOpenChange={setIsDropdownOpen} modal={false}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-between mt-2"
                    disabled={loading || loadingTeachers}
                  >
                    <span>
                      {selectedTeacherIds.size === 0
                        ? 'Select teachers'
                        : `${selectedTeacherIds.size} teacher${selectedTeacherIds.size !== 1 ? 's' : ''} selected`}
                    </span>
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full min-w-[300px]" style={{ zIndex: 9999 }}>
                  {loadingTeachers ? (
                    <div className="flex items-center justify-center p-4">
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      <span className="text-sm text-gray-500">Loading teachers...</span>
                    </div>
                  ) : teacherError ? (
                    <div className="p-4 text-sm text-red-600">{teacherError}</div>
                  ) : teachers.length === 0 ? (
                    <div className="p-4 text-sm text-gray-500">No teachers found</div>
                  ) : (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {teachers.map((teacher) => {
                        const isSelected = selectedTeacherIds.has(teacher.userId);
                        return (
                          <div
                            key={teacher.userId}
                            className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                            onClick={() => toggleTeacher(teacher.userId)}
                          >
                            <div 
                              className="pointer-events-none"
                            >
                              <Checkbox
                                checked={isSelected}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900 truncate">
                                {teacher.name}
                              </div>
                              {teacher.email && (
                                <div className="text-xs text-gray-500 truncate">
                                  {teacher.email}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </PopoverContent>
              </Popover>

              {/* Selected Teachers */}
              {selectedTeachers.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedTeachers.map((teacher) => (
                    <Badge
                      key={teacher.userId}
                      variant="secondary"
                      className="flex items-center gap-1 pr-1"
                    >
                      <span className="max-w-[200px] truncate text-xs">{teacher.name}</span>
                      <button
                        type="button"
                        onClick={() => toggleTeacher(teacher.userId)}
                        className="ml-1 hover:text-gray-900 rounded-full hover:bg-gray-300 p-0.5"
                        disabled={loading}
                        title="Remove teacher"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Attachments */}
            <div>
              <Label className="mb-2 block">Attachments (Optional)</Label>
              <div className="mt-2 space-y-2">
                <input
                  type="file"
                  id="file-input-teachers"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png"
                  disabled={loading || loadingTeachers}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('file-input-teachers')?.click()}
                  disabled={loading || loadingTeachers}
                  className="w-full sm:w-auto"
                >
                  <Paperclip className="w-4 h-4 mr-2" />
                  Add Attachment
                </Button>
                {selectedFiles.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedFiles.map((file, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="flex items-center gap-1 pr-1"
                      >
                        <span className="max-w-[200px] truncate text-xs" title={file.name}>
                          {file.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(index)}
                          className="ml-1 hover:text-gray-900 rounded-full hover:bg-gray-300 p-0.5"
                          disabled={loading}
                          title="Remove file"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Back
            </Button>
            <Button
              type="submit"
              disabled={loading || loadingTeachers}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
