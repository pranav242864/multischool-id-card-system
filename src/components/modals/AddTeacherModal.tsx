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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { teacherAPI, APIError } from '../../utils/api';

interface Teacher {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  mobile: string;
  classId?: any;
  userId?: any;
  photoUrl?: string;
}

interface AddTeacherModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacher?: Teacher | null;
  classes: any[];
  onSave: () => void;
}

export function AddTeacherModal({ isOpen, onClose, teacher, classes, onSave }: AddTeacherModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    classId: '',
    userId: '',
    photoUrl: '',
  });

  useEffect(() => {
    if (!isOpen) {
      setFormData({
        name: '',
        email: '',
        mobile: '',
        classId: '',
        userId: '',
        photoUrl: '',
      });
      setError(null);
    } else if (teacher) {
      // Populate form for editing
      setFormData({
        name: teacher.name || '',
        email: teacher.email || '',
        mobile: teacher.mobile || '',
        classId: teacher.classId?._id || teacher.classId || '',
        userId: teacher.userId?._id || teacher.userId || '',
        photoUrl: teacher.photoUrl || '',
      });
    }
  }, [teacher, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setLoading(true);
    setError(null);

    try {
      if (teacher && teacher._id) {
        // Update existing teacher
        // Note: userId cannot be changed, and email is not updatable via backend
        const updateData: any = {
          name: formData.name.trim(),
          mobile: formData.mobile.trim(),
        };
        
        if (formData.classId) {
          updateData.classId = formData.classId;
        } else {
          // Allow setting classId to null (unassign)
          updateData.classId = null;
        }
        
        if (formData.photoUrl.trim()) {
          updateData.photoUrl = formData.photoUrl.trim();
        }

        await teacherAPI.updateTeacher(teacher._id, updateData);
      } else {
        // Create new teacher
        if (!formData.userId || !formData.userId.trim()) {
          setError('User ID is required to create a teacher. Please provide an existing user ID.');
          setLoading(false);
          return;
        }

        const teacherData = {
          name: formData.name.trim(),
          email: formData.email.trim(),
          mobile: formData.mobile.trim(),
          userId: formData.userId.trim(),
          classId: formData.classId || undefined,
          photoUrl: formData.photoUrl.trim() || undefined,
        };

        await teacherAPI.createTeacher(teacherData);
      }
      
      // Close modal and trigger parent to re-fetch
      onClose();
      onSave();
    } catch (err) {
      const apiError = err as APIError;
      setError(apiError.message || (teacher ? 'Failed to update teacher' : 'Failed to create teacher'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{teacher ? 'Edit Teacher' : 'Add New Teacher'}</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {!teacher && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-600">
              <strong>Note:</strong> Teacher creation requires an existing User ID. 
              School Admins cannot create users directly. Use bulk import or contact Superadmin to create teacher users.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter teacher name"
                required
                disabled={loading}
              />
            </div>

            {!teacher && (
              <>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="teacher@example.com"
                    required
                    disabled={loading}
                  />
                </div>

                <div>
                  <Label htmlFor="userId">User ID *</Label>
                  <Input
                    id="userId"
                    value={formData.userId}
                    onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                    placeholder="Existing user ID (ObjectId)"
                    required
                    disabled={loading}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Must be an existing User ID with role TEACHER
                  </p>
                </div>
              </>
            )}

            {teacher && (
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  disabled
                  className="bg-gray-100"
                />
                <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
              </div>
            )}

            <div>
              <Label htmlFor="mobile">Mobile Number *</Label>
              <Input
                id="mobile"
                type="tel"
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                placeholder="10-digit mobile number"
                maxLength={10}
                required
                disabled={loading}
              />
              <p className="text-xs text-gray-500 mt-1">10 digits only</p>
            </div>

            <div>
              <Label htmlFor="classId">Assigned Class</Label>
              <Select
                value={formData.classId}
                onValueChange={(value) => setFormData({ ...formData, classId: value === 'none' ? '' : value })}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select class (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not Assigned</SelectItem>
                  {classes.map((cls) => (
                    <SelectItem key={cls._id} value={cls._id}>
                      {cls.className}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="photoUrl">Photo URL (Optional)</Label>
              <Input
                id="photoUrl"
                value={formData.photoUrl}
                onChange={(e) => setFormData({ ...formData, photoUrl: e.target.value })}
                placeholder="https://example.com/photo.jpg"
                disabled={loading}
              />
              <p className="text-xs text-gray-500 mt-1">Valid image URL (jpg, jpeg, png, gif)</p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading 
                ? (teacher ? 'Updating...' : 'Creating...') 
                : (teacher ? 'Update Teacher' : 'Create Teacher')
              }
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

