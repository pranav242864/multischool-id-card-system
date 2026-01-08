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
import { schoolAPI, APIError } from '../../utils/api';

interface School {
  _id?: string;
  id?: string;
  name: string;
  city?: string;
  address?: string;
  contactEmail?: string;
  adminName?: string;
  adminEmail?: string;
  studentCount?: number;
  status?: 'active' | 'inactive' | 'ACTIVE' | 'INACTIVE';
}

interface AddSchoolModalProps {
  isOpen: boolean;
  onClose: () => void;
  school?: School | null;
  onSave: (school: School) => void;
}

export function AddSchoolModal({ isOpen, onClose, school, onSave }: AddSchoolModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    contactEmail: '',
  });

  useEffect(() => {
    if (school) {
      setFormData({
        name: school.name,
        address: school.address || '',
        contactEmail: school.contactEmail || school.adminEmail || '',
      });
    } else {
      setFormData({
        name: '',
        address: '',
        contactEmail: '',
      });
    }
    setError(null);
  }, [school, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Backend requires: name, address, contactEmail
      const schoolData = {
        name: formData.name.trim(),
        address: formData.address.trim(),
        contactEmail: formData.contactEmail.trim(),
      };

      await schoolAPI.createSchool(schoolData);
      
      // Close modal and trigger parent to re-fetch
      onClose();
      onSave(schoolData as any); // Trigger re-fetch in parent
    } catch (err) {
      const apiError = err as APIError;
      setError(apiError.message || 'Failed to create school');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{school ? 'Edit School' : 'Add New School'}</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="name">School Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter school name"
                required
                disabled={loading}
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="address">Address *</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Enter street address"
                required
                disabled={loading}
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="contactEmail">Contact Email *</Label>
              <Input
                id="contactEmail"
                type="email"
                value={formData.contactEmail}
                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                placeholder="contact@school.edu"
                required
                disabled={loading}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : school ? 'Update School' : 'Add School'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
