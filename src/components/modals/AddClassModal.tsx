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
import { classAPI, APIError } from '../../utils/api';

interface Class {
  _id?: string;
  className: string;
  sessionId?: string;
  frozen?: boolean;
  status?: string;
}

interface AddClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

export function AddClassModal({ isOpen, onClose, onSave }: AddClassModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    className: '',
  });

  useEffect(() => {
    if (!isOpen) {
      setFormData({
        className: '',
      });
      setError(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setLoading(true);
    setError(null);

    try {
      // For SCHOOLADMIN, schoolId comes from JWT, sessionId is auto-set by backend via activeSessionMiddleware
      await classAPI.createClass({
        className: formData.className.trim(),
      });
      
      // Close modal and trigger parent to re-fetch
      onClose();
      onSave();
    } catch (err) {
      const apiError = err as APIError;
      setError(apiError.message || 'Failed to create class');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Class</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="className" className="mb-2 block">Class Name *</Label>
              <Input
                id="className"
                value={formData.className}
                onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                placeholder="e.g., Class 10-A, Grade 5-B"
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
              {loading ? 'Creating...' : 'Create Class'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

