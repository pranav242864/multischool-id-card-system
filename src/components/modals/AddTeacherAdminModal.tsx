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
import { schoolAPI, teacherAdminAPI, APIError } from '../../utils/api';

interface AddTeacherAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId?: string;
  onSave: () => void;
}

export function AddTeacherAdminModal({ isOpen, onClose, schoolId: initialSchoolId, onSave }: AddTeacherAdminModalProps) {
  const [loadingSchools, setLoadingSchools] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [schools, setSchools] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    mobile: '',
    schoolId: initialSchoolId || '',
  });

  useEffect(() => {
    const fetchSchools = async () => {
      if (!isOpen) return;
      setLoadingSchools(true);
      setError(null);
      try {
        const response = await schoolAPI.getSchools();
        if (response.success && response.data) {
          setSchools(response.data);
        }
      } catch (err) {
        const apiError = err as APIError;
        setError(apiError.message || 'Failed to load schools');
      } finally {
        setLoadingSchools(false);
      }
    };

    fetchSchools();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setFormData({
        name: '',
        email: '',
        password: '',
        mobile: '',
        schoolId: initialSchoolId || '',
      });
      setError(null);
    }
  }, [isOpen, initialSchoolId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.name || !formData.email || !formData.password || !formData.mobile || !formData.schoolId) {
      setError('All fields are required');
      return;
    }

    // Validate mobile format (10 digits)
    if (!/^[0-9]{10}$/.test(formData.mobile)) {
      setError('Mobile number must be exactly 10 digits');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await teacherAdminAPI.createTeacherUser({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        mobile: formData.mobile,
        schoolId: formData.schoolId,
      });

      if (response.success) {
        // Close modal only on success
        onClose();
        onSave();
      } else {
        setError(response.message || 'Failed to create teacher');
      }
    } catch (err) {
      const apiError = err as APIError;
      setError(apiError.message || 'Failed to create teacher');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Teacher</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter full name"
              required
              disabled={submitting}
            />
          </div>

          <div>
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="teacher@school.edu"
              required
              disabled={submitting}
            />
          </div>

          <div>
            <Label htmlFor="password">Password *</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Enter password"
              required
              disabled={submitting}
            />
          </div>

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
              disabled={submitting}
            />
            <p className="text-xs text-gray-500 mt-1">10 digits only</p>
          </div>

          <div>
            <Label htmlFor="school">Assigned School *</Label>
            {loadingSchools ? (
              <p className="text-gray-500 text-sm mt-1">Loading schools...</p>
            ) : (
              <Select
                value={formData.schoolId}
                onValueChange={(value) => setFormData({ ...formData, schoolId: value })}
                required
                disabled={submitting || !!initialSchoolId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a school" />
                </SelectTrigger>
                <SelectContent>
                  {schools.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-gray-500">No schools available</div>
                  ) : (
                    schools.map((school) => {
                      const schoolId = school._id || school.id || '';
                      return (
                        <SelectItem key={schoolId} value={schoolId}>
                          {school.name}
                        </SelectItem>
                      );
                    })
                  )}
                </SelectContent>
              </Select>
            )}
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || loadingSchools}>
              {submitting ? 'Creating...' : 'Create Teacher'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
