import * as zlib from 'zlib';
import * as fs from 'fs';
import * as fsp from 'fs/promises';
import * as path from 'path';
import { XMLParser } from 'fast-xml-parser';
import { ProjectInfo, TrackInfo } from './types';

// Timeout for parsing a single project file (30 seconds)
const PROJECT_PARSE_TIMEOUT = 30000;

/**
 * Parse a single project with timeout
 */
async function parseProjectWithTimeout(projectPath: string, timeoutMs: number): Promise<ProjectInfo> {
  return new Promise<ProjectInfo>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout: Project "${projectPath}" took longer than ${timeoutMs / 1000}s to parse`));
    }, timeoutMs);

    parseProject(projectPath)
      .then((project) => {
        clearTimeout(timer);
        resolve(project);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

// Parse a single .als project file
async function parseProject(projectPath: string): Promise<ProjectInfo> {
  const projectDir = path.dirname(projectPath);
  const projectFile = path.basename(projectPath);
  const projectName = projectFile.replace('.als', '');

  // Get file stats for last modified date (async)
  const stats = await fsp.stat(projectPath);
  const lastModified = stats.mtime;

  // Create temp directory if it doesn't exist (async)
  const tempDir = path.join(projectDir, 'Ableton Project Info');
  await fsp.mkdir(tempDir, { recursive: true });

  const outputPath = path.join(tempDir, projectFile.replace('.als', '.xml'));

  // Decompress the .als file (it's gzipped XML)
  return new Promise((resolve, reject) => {
    const input = fs.createReadStream(projectPath);
    const output = fs.createWriteStream(outputPath);
    const unzip = zlib.createUnzip();

    input.pipe(unzip).pipe(output);

    output.on('finish', async () => {
      try {
        // Read and parse the XML (async)
        const xmlData = await fsp.readFile(outputPath, 'utf-8');
        const parser = new XMLParser({
          ignoreAttributes: false,
          attributeNamePrefix: '@_'
        });

        const parsed = parser.parse(xmlData);

        // Extract track information
        const tracks: TrackInfo[] = [];

        // Navigate the XML structure to find tracks
        // Typical structure: Ableton > LiveSet > Tracks
        const liveSet = parsed.Ableton?.LiveSet;
        if (liveSet && liveSet.Tracks) {
          // Handle different track types
          const trackTypes = ['AudioTrack', 'MidiTrack', 'ReturnTrack', 'MasterTrack'];

          for (const trackType of trackTypes) {
            const trackArray = liveSet.Tracks[trackType];
            if (trackArray) {
              const tracksOfType = Array.isArray(trackArray) ? trackArray : [trackArray];

              for (const track of tracksOfType) {
                if (track && track.Name) {
                  const trackName = track.Name.EffectiveName?.['@_Value'] ||
                                   track.Name.UserName?.['@_Value'] ||
                                   'Unnamed Track';

                  const colorId = parseInt(track.Color?.['@_Value'] || '0', 10);

                  let type: TrackInfo['type'] = 'Unknown';
                  if (trackType === 'AudioTrack') type = 'Audio';
                  else if (trackType === 'MidiTrack') type = 'MIDI';
                  else if (trackType === 'ReturnTrack') type = 'Return';
                  else if (trackType === 'MasterTrack') type = 'Master';

                  tracks.push({
                    name: trackName,
                    type: type,
                    colorId: colorId
                  });
                }
              }
            }
          }
        }

        const projectInfo: ProjectInfo = {
          name: projectName,
          filePath: projectPath,
          trackCount: tracks.length,
          tracks: tracks,
          lastModified: lastModified
        };

        console.log(`Parsed project: ${projectName} with ${tracks.length} tracks`);
        resolve(projectInfo);

      } catch (error) {
        console.error(`Error parsing XML for ${projectPath}:`, error);
        reject(error);
      }
    });

    output.on('error', (error) => {
      console.error(`Error writing XML for ${projectPath}:`, error);
      reject(error);
    });

    input.on('error', (error) => {
      console.error(`Error reading project file ${projectPath}:`, error);
      reject(error);
    });
  });
}

// Recursively scan directory for .als files and parse them
export async function loadProjectsInDirectory(
  directoryPath: string,
  maxDepth: number = 1,
  onProjectFound?: (project: ProjectInfo) => void
): Promise<ProjectInfo[]> {
  const allProjects: ProjectInfo[] = [];

  async function scanDirectory(dirPath: string, currentDepth: number = 0) {
    // Use async readdir instead of sync
    const files = await fsp.readdir(dirPath);
    const alsFiles = files.filter(file => path.extname(file) === '.als');

    // Parse .als files in this directory
    for (const alsFile of alsFiles) {
      const filePath = path.join(dirPath, alsFile);
      // Skip files in Backup directories
      if (!filePath.includes('Backup')) {
        try {
          // Parse with timeout - skip file if it takes too long
          const projectInfo = await parseProjectWithTimeout(filePath, PROJECT_PARSE_TIMEOUT);
          allProjects.push(projectInfo);

          // Notify callback if provided (for incremental updates)
          if (onProjectFound) {
            onProjectFound(projectInfo);
          }

          // Yield to event loop after each file to keep UI responsive
          await new Promise(resolve => setImmediate(resolve));
        } catch (error) {
          console.error(`Failed to parse ${filePath}:`, error);
          // Continue with next file instead of failing entire directory
        }
      }
    }

    // Recursively scan subdirectories (async) - only if we haven't reached max depth
    if (currentDepth < maxDepth) {
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        try {
          const stat = await fsp.lstat(filePath);
          if (stat.isDirectory() && file !== 'Ableton Project Info' && file !== 'Backup') {
            await scanDirectory(filePath, currentDepth + 1);
          }
        } catch (error) {
          console.error(`Error accessing ${filePath}:`, error);
        }
      }
    }
  }

  await scanDirectory(directoryPath, 0);
  return allProjects;
}
