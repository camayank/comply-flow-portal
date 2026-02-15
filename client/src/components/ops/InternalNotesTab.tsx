import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Send, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Note {
  id: number;
  content: string;
  isClientVisible: boolean;
  createdAt: string;
  authorId: number;
  authorName: string | null;
  authorRole: string | null;
}

interface InternalNotesTabProps {
  notes: Note[];
  onAddNote: (content: string, isClientVisible: boolean) => void;
  isAdding?: boolean;
}

export function InternalNotesTab({ notes, onAddNote, isAdding }: InternalNotesTabProps) {
  const [newNote, setNewNote] = useState('');
  const [isClientVisible, setIsClientVisible] = useState(false);

  const handleSubmit = () => {
    if (newNote.trim()) {
      onAddNote(newNote.trim(), isClientVisible);
      setNewNote('');
      setIsClientVisible(false);
    }
  };

  const formatRole = (role: string | null) => {
    if (!role) return '';
    return role
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="space-y-4">
      {/* Add Note Form */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
        <Textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Add an internal note..."
          rows={3}
          className="bg-white"
        />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Checkbox
              id="clientVisible"
              checked={isClientVisible}
              onCheckedChange={(checked) => setIsClientVisible(checked === true)}
            />
            <Label htmlFor="clientVisible" className="text-sm text-gray-600 cursor-pointer">
              Make visible to client
            </Label>
          </div>
          <Button
            onClick={handleSubmit}
            disabled={!newNote.trim() || isAdding}
            size="sm"
          >
            <Send className="h-4 w-4 mr-2" />
            {isAdding ? 'Adding...' : 'Add Note'}
          </Button>
        </div>
      </div>

      {/* Notes List */}
      <div className="space-y-3">
        {notes.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No notes yet</p>
            <p className="text-xs">Add the first internal note above</p>
          </div>
        ) : (
          notes.map((note) => (
            <div
              key={note.id}
              className="bg-white border rounded-lg p-4 space-y-2"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">
                      {note.authorName || `User #${note.authorId}`}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatRole(note.authorRole)} • {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                {note.isClientVisible && (
                  <Badge variant="outline" className="text-xs">
                    Client Visible
                  </Badge>
                )}
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap pl-10">
                {note.content}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
