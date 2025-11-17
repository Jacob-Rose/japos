export interface ProjectDirectory {
  path: string;
  enabled: boolean;
  recursive: boolean; // If false, only scan 1 level deep (immediate subfolders)
}

export interface UserPreferences {
  hideReturnTracks: boolean;
  hideMasterTrack: boolean;
  directories: ProjectDirectory[];
}

export const defaultPreferences: UserPreferences = {
  hideReturnTracks: false,
  hideMasterTrack: false,
  directories: []
};
