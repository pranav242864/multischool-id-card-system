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
import { sessionAPI, APIError } from '../../utils/api';

interface Session {
  _id?: string;
  sessionName: string;
  startDate: string;
  endDate: string;
  activeStatus?: boolean;
  archived?: boolean;
  schoolId?: string;
}

interface AddSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId: string | null;
  onSave: () => void;
}

export function AddSessionModal({ isOpen, onClose, schoolId, onSave }: AddSessionModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    sessionName: '',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    if (!isOpen) {
      setFormData({
        sessionName: '',
        startDate: '',
        endDate: '',
      });
      setError(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!schoolId) {
      setError('School ID is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await sessionAPI.createSession({
        sessionName: formData.sessionName.trim(),
        startDate: formData.startDate,
        endDate: formData.endDate,
        schoolId: schoolId,
      });
      
      // Close modal and trigger parent to re-fetch
      onClose();
      onSave();
    } catch (err) {
      const apiError = err as APIError;
      setError(apiError.message || 'Failed to create session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Session</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md mt-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="sessionName" className="mb-2 block">Session Name *</Label>
              <Input
                id="sessionName"
                value={formData.sessionName}
                onChange={(e) => setFormData({ ...formData, sessionName: e.target.value })}
                placeholder="e.g., 2024-2025"
                required
                disabled={loading}
              />
            </div>

            <div>
              <Label htmlFor="startDate" className="mb-2 block">Start Date *</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
                disabled={loading}
              />
            </div>

            <div>
              <Label htmlFor="endDate" className="mb-2 block">End Date *</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                required
                disabled={loading}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !schoolId}>
              {loading ? 'Creating...' : 'Create Session'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

