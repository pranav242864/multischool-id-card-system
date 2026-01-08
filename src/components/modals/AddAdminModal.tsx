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
import { schoolAPI, APIError } from '../../utils/api';

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [schools, setSchools] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    assignedSchool: '',
  });

  useEffect(() => {
    const fetchSchools = async () => {
      if (!isOpen) return;
      setLoading(true);
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
        setLoading(false);
      }
    };

    fetchSchools();
  }, [isOpen]);

  useEffect(() => {
    if (admin) {
      setFormData({
        name: admin.name,
        email: admin.email,
        phone: admin.phone,
        password: '',
        assignedSchool: admin.assignedSchool,
      });
    } else {
      setFormData({
        name: '',
        email: '',
        phone: '',
        password: '',
        assignedSchool: '',
      });
    }
  }, [admin, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Wire create/update API when CRUD is implemented
    console.log('Admin data:', formData);
    onClose();
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
            {loading ? (
              <p className="text-gray-500 text-sm mt-1">Loading schools...</p>
            ) : (
              <Select
                value={formData.assignedSchool}
                onValueChange={(value) => setFormData({ ...formData, assignedSchool: value })}
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
                        <SelectItem key={schoolId} value={school.name}>
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
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              {admin ? 'Update Admin' : 'Create Admin'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
