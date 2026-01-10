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
import { schoolAPI, adminAPI, APIError } from '../../utils/api';

interface SchoolAdmin {
  id: string;
  name: string;
  email: string;
  phone: string;
  assignedSchool: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

interface AddAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  admin?: SchoolAdmin | null;
  onSave: (admin: SchoolAdmin) => void;
}

export function AddAdminModal({ isOpen, onClose, admin, onSave }: AddAdminModalProps) {
  const [loadingSchools, setLoadingSchools] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [schools, setSchools] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    schoolId: '',
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
    if (admin && isOpen) {
      // For editing, populate form with admin data
      // Find schoolId from admin's schoolId or assignedSchool name
      let schoolIdForForm = '';
      if (admin.schoolId) {
        // If schoolId is an object (populated), extract _id
        schoolIdForForm = typeof admin.schoolId === 'object' && admin.schoolId._id
          ? admin.schoolId._id.toString()
          : admin.schoolId.toString();
      } else if (admin.assignedSchool && schools.length > 0) {
        // Find schoolId by name
        const matchingSchool = schools.find(s => s.name === admin.assignedSchool);
        if (matchingSchool) {
          schoolIdForForm = (matchingSchool._id || matchingSchool.id || '').toString();
        }
      }
      
      setFormData({
        name: admin.name || '',
        email: admin.email || '',
        phone: admin.phone || '',
        password: '', // Don't pre-fill password for security
        schoolId: schoolIdForForm,
      });
    } else if (!admin && isOpen) {
      // For creating new admin
      setFormData({
        name: '',
        email: '',
        phone: '',
        password: '',
        schoolId: '',
      });
    }
    setError(null);
  }, [admin, isOpen, schools]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields based on create vs edit
    if (admin) {
      // Edit mode: name, email, and schoolId are required (password optional)
      if (!formData.name || !formData.email || !formData.schoolId) {
        setError('Name, email, and school are required');
        return;
      }
    } else {
      // Create mode: all fields including password are required
      if (!formData.name || !formData.email || !formData.password || !formData.schoolId) {
        setError('All fields are required');
        return;
      }
    }

    setSubmitting(true);
    setError(null);

    try {
      if (admin) {
        // Update existing admin
        const adminId = admin.id || admin._id;
        if (!adminId) {
          setError('Admin ID is required for update');
          setSubmitting(false);
          return;
        }

        // Get schoolId for query param (required for SUPERADMIN)
        const schoolIdForQuery = formData.schoolId || 
          (typeof admin.schoolId === 'object' && admin.schoolId._id 
            ? admin.schoolId._id.toString() 
            : admin.schoolId?.toString() || '');

        const response = await adminAPI.updateSchoolAdmin(
          adminId,
          {
            name: formData.name.trim(),
            email: formData.email.trim(),
          },
          schoolIdForQuery
        );

        if (response.success) {
          // Call onSave callback with the updated admin data
          onSave({
            id: adminId,
            name: response.data.name || formData.name,
            email: response.data.email || formData.email,
            phone: formData.phone,
            assignedSchool: schools.find(s => (s._id || s.id) === formData.schoolId)?.name || admin.assignedSchool || '',
            status: admin.status || 'active',
            createdAt: admin.createdAt || new Date().toISOString(),
          });
          // Close modal only on success
          onClose();
        } else {
          setError(response.message || 'Failed to update admin');
        }
      } else {
        // Create new admin
        const response = await adminAPI.createSchoolAdmin({
          name: formData.name.trim(),
          email: formData.email.trim(),
          password: formData.password,
          schoolId: formData.schoolId,
        });

        if (response.success) {
          // Call onSave callback with the created admin data
          onSave({
            id: response.data.id,
            name: response.data.name,
            email: response.data.email,
            phone: formData.phone,
            assignedSchool: schools.find(s => (s._id || s.id) === formData.schoolId)?.name || '',
            status: 'active',
            createdAt: new Date().toISOString(),
          });
          // Close modal only on success
          onClose();
        } else {
          setError(response.message || 'Failed to create admin');
        }
      }
    } catch (err) {
      const apiError = err as APIError;
      setError(apiError.message || (admin ? 'Failed to update admin' : 'Failed to create admin'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{admin ? 'Edit School Admin' : 'Add New School Admin'}</DialogTitle>
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
            />
          </div>

          <div>
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="admin@school.edu"
              required
            />
          </div>

          <div>
            <Label htmlFor="phone">Phone Number *</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+1 234 567 8900"
              required
            />
          </div>

          {!admin && (
            <div>
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Enter password"
                required
              />
            </div>
          )}

          <div>
            <Label htmlFor="school">Assigned School *</Label>
            {loadingSchools ? (
              <p className="text-gray-500 text-sm mt-1">Loading schools...</p>
            ) : (
              <Select
                value={formData.schoolId}
                onValueChange={(value) => setFormData({ ...formData, schoolId: value })}
                required
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
              {submitting ? 'Creating...' : (admin ? 'Update Admin' : 'Create Admin')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
