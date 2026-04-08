import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import ClipManager from '../src/components/ClipManager';
import * as storage from '../src/utils/storage';

// Mock the storage module
vi.mock('../src/utils/storage', () => ({
  getClips: vi.fn(),
  deleteClip: vi.fn(),
}));

describe('ClipManager Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly with no clips', () => {
    (storage.getClips as any).mockReturnValue([]);
    render(<ClipManager />);
    expect(screen.getByText('Recorded Clips')).toBeInTheDocument();
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
  });

  it('renders clips correctly', () => {
    const mockClips = [
      { id: 1, timestamp: new Date('2023-01-01T10:00:00Z') },
      { id: 2, timestamp: new Date('2023-01-01T11:00:00Z') },
    ];
    (storage.getClips as any).mockReturnValue(mockClips);

    render(<ClipManager />);

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    // Both clips should be rendered.
    // Since they have the same date (different times), we check that we find 2 elements matching the date string.
    expect(screen.getAllByText(/Jan 01 2023/i)).toHaveLength(2);
  });

  it('calls deleteClip and refreshes when delete button is clicked', () => {
    const mockClips = [
      { id: 1, timestamp: new Date('2023-01-01T10:00:00Z') },
    ];
    (storage.getClips as any).mockReturnValueOnce(mockClips).mockReturnValue([]);

    render(<ClipManager />);

    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);

    expect(storage.deleteClip).toHaveBeenCalledWith(1);
    expect(storage.getClips).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
  });
});
