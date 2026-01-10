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
import { adminAPI, APIError } from '../../utils/api';
import { Loader2, ChevronDown, Users, Paperclip, X } from 'lucide-react';

interface Admin {
  _id: string;
  id: string;
  name: string;
  email: string;
  schoolId?: any;
  school?: {
    name: string;
  };
}

interface AddNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (noticeData: {
    title: string;
    description: string;
    targetAdminIds: string[];
    attachmentFiles?: File[];
  }) => Promise<boolean>;
  loading?: boolean;
}

export function AddNoticeModal({ isOpen, onClose, onSave, loading = false }: AddNoticeModalProps) {
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [selectedAdminIds, setSelectedAdminIds] = useState<Set<string>>(new Set());
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
  });

  useEffect(() => {
    const fetchAdmins = async () => {
      if (!isOpen) return;
      setLoadingAdmins(true);
      setAdminError(null);
      try {
        // Fetch all admins (SUPERADMIN can see all)
        // Call without schoolId to get all SCHOOLADMIN users
        const response = await adminAPI.getSchoolAdmins();
        console.log('Fetch admins response:', response);
        
        if (response.success && response.data && Array.isArray(response.data)) {
          // Map and filter to ensure we have SCHOOLADMIN role users
          const mappedAdmins = response.data
            .filter((user: any) => {
              // Filter by SCHOOLADMIN role and ensure user has required fields
              const isValid = user.role === 'SCHOOLADMIN' && user.name && user.email;
              if (!isValid) {
                console.log('Filtered out user:', user);
              }
              return isValid;
            })
            .map((user: any) => {
              const adminId = user._id || user.id;
              if (!adminId) {
                console.warn('User missing ID:', user);
                return null;
              }
              
              // Handle populated schoolId (object) or unpopulated (ObjectId string)
              let schoolName = null;
              if (user.schoolId) {
                if (typeof user.schoolId === 'object') {
                  schoolName = user.schoolId.name || null;
                }
              }
              
              return {
                _id: adminId,
                id: adminId,
                name: user.name || 'Unknown',
                email: user.email || '',
                schoolId: typeof user.schoolId === 'object' && user.schoolId?._id 
                  ? user.schoolId._id 
                  : (user.schoolId?.id || user.schoolId || null),
                school: schoolName ? { name: schoolName } : undefined,
              };
            })
            .filter((admin): admin is Admin => admin !== null);
          
          console.log('Mapped admins:', mappedAdmins);
          setAdmins(mappedAdmins);
          
          // Debug: Log if no admins found
          if (mappedAdmins.length === 0) {
            console.warn('No admins found after filtering. Raw response data:', response.data);
            console.warn('Total users in response:', response.data.length);
            console.warn('Users with SCHOOLADMIN role:', response.data.filter((u: any) => u.role === 'SCHOOLADMIN').length);
            setAdminError('No admins found. Please create admin users first.');
          } else {
            setAdminError(null);
          }
        } else {
          console.warn('Invalid response format:', response);
          setAdmins([]);
          setAdminError('Invalid response from server');
        }
      } catch (err) {
        const apiError = err as APIError;
        const errorMessage = apiError.message || 'Failed to load admins';
        console.error('Error loading admins:', err);
        setAdminError(errorMessage);
        // Ensure admins array is empty on error
        setAdmins([]);
      } finally {
        setLoadingAdmins(false);
      }
    };

    fetchAdmins();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      // Reset form when modal closes
      setFormData({ title: '', description: '' });
      setSelectedAdminIds(new Set());
      setSelectedFiles([]);
      setError(null);
      setAdminError(null);
    }
  }, [isOpen]);

  const handleToggleAdmin = (adminId: string) => {
    const newSelected = new Set(selectedAdminIds);
    if (newSelected.has(adminId)) {
      newSelected.delete(adminId);
    } else {
      newSelected.add(adminId);
    }
    setSelectedAdminIds(newSelected);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const fileArray = Array.from(files);
      setSelectedFiles(prev => [...prev, ...fileArray]);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate required fields
    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }

    if (!formData.description.trim()) {
      setError('Description is required');
      return;
    }

    if (selectedAdminIds.size === 0) {
      setError('Please select at least one admin');
      return;
    }

    const success = await onSave({
      title: formData.title.trim(),
      description: formData.description.trim(),
      targetAdminIds: Array.from(selectedAdminIds),
      attachmentFiles: selectedFiles.length > 0 ? selectedFiles : undefined,
    });

    if (success) {
      // Form will be reset by useEffect when modal closes
      onClose();
    }
  };

  const selectedAdmins = admins.filter(admin => selectedAdminIds.has(admin.id || admin._id));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Notice</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md mt-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div>
            <Label htmlFor="title" className="mb-2 block">Notice Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter notice title"
              required
              disabled={loading || loadingAdmins}
            />
          </div>

          <div>
            <Label htmlFor="description" className="mb-2 block">Notice Content *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter notice content/description"
              rows={6}
              required
              disabled={loading || loadingAdmins}
              className="resize-none"
            />
          </div>

          <div>
            <Label className="mb-2 block">Target Admins *</Label>
            <Popover open={isDropdownOpen} onOpenChange={setIsDropdownOpen} modal={false}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-between"
                  disabled={loading || loadingAdmins}
                >
                  <span className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    {selectedAdminIds.size === 0
                      ? 'Select admins...'
                      : `${selectedAdminIds.size} admin${selectedAdminIds.size !== 1 ? 's' : ''} selected`}
                  </span>
                  <ChevronDown className="w-4 h-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent 
                className="w-[400px] p-0" 
                align="start" 
                sideOffset={4}
                style={{ zIndex: 9999 }}
              >
                <div className="max-h-[300px] overflow-y-auto">
                  {loadingAdmins ? (
                    <div className="p-4 text-center text-sm text-gray-500">
                      <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />
                      Loading admins...
                    </div>
                  ) : adminError ? (
                    <div className="p-4 text-center text-sm text-red-600">
                      {adminError}
                    </div>
                  ) : admins.length === 0 ? (
                    <div className="p-4 text-center text-sm text-gray-500">
                      No admins available. Please create admin users first.
                    </div>
                  ) : (
                    <div className="p-2 space-y-1">
                      {admins.map((admin) => {
                        const adminId = admin.id || admin._id;
                        if (!adminId) return null; // Skip invalid admins
                        const isSelected = selectedAdminIds.has(adminId);
                        return (
                          <div
                            key={adminId}
                            className="flex items-start space-x-2 p-2 rounded hover:bg-gray-50 cursor-pointer"
                            onClick={() => handleToggleAdmin(adminId)}
                          >
                            <Checkbox
                              id={`admin-${adminId}`}
                              checked={isSelected}
                              onCheckedChange={() => handleToggleAdmin(adminId)}
                              className="mt-1"
                            />
                            <label
                              htmlFor={`admin-${adminId}`}
                              className="flex-1 cursor-pointer text-sm"
                            >
                              <div className="font-medium text-gray-900">{admin.name || 'Unknown'}</div>
                              <div className="text-xs text-gray-500">{admin.email || 'No email'}</div>
                              {admin.school?.name && (
                                <div className="text-xs text-gray-400 mt-0.5">{admin.school.name}</div>
                              )}
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
            {selectedAdmins.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedAdmins.map((admin) => {
                  const adminId = admin.id || admin._id;
                  return (
                    <Badge
                      key={adminId}
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      {admin.name}
                      <button
                        type="button"
                        onClick={() => handleToggleAdmin(adminId)}
                        className="ml-1 hover:text-gray-900"
                        disabled={loading}
                      >
                        ×
                      </button>
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <Label className="mb-2 block">Attachments (Optional)</Label>
            <div className="mt-2 space-y-2">
              <input
                type="file"
                id="file-input"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png"
                disabled={loading || loadingAdmins}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('file-input')?.click()}
                disabled={loading || loadingAdmins}
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

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading || loadingAdmins}
            >
              Back
            </Button>
            <Button type="submit" disabled={loading || loadingAdmins}>
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
