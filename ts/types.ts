export interface TrackInfo {
  name: string;
  type: 'Audio' | 'MIDI' | 'Return' | 'Master' | 'Unknown';
  colorId: number;
}

export interface ProjectInfo {
  name: string;
  filePath: string;
  trackCount: number;
  tracks: TrackInfo[];
  lastModified: Date;
  longestTrackLength?: number; // in seconds
}

export interface ProjectGroup {
  directoryPath: string;
  projectName: string; // Name derived from directory or first project
  versions: ProjectInfo[];
  selectedVersionIndex: number; // For UI state
}
