#!/usr/bin/env node
import * as fs from 'fs/promises';
import ignore from 'ignore';
import inquirer from 'inquirer';
import { minimatch } from 'minimatch';
import * as path from 'path';

/**
 * Interface defining the configuration options for the script.
 */
interface Options {
  folderPath: string; // Directory to collect files from
  outputFile: string; // Output file name
  fileTypes: string[]; // File extensions to include (e.g., ['.js', '.ts'])
  maxSizeMB: number; // Maximum file size in MB
  maxDepth: number; // Maximum directory depth for recursion
  outputFormat: 'txt' | 'json'; // Output format
  silent: boolean; // Suppress console output if true
  verbose: boolean; // Enable detailed logging if true
  excludeFolders: string[]; // Folder names to exclude
  excludeFiles: string[]; // File names or patterns to exclude
  respectGitignore: boolean; // Respect .gitignore if true
  includePatterns: string[]; // Glob patterns to include files
  excludePatterns: string[]; // Glob patterns to exclude files
}

/**
 * Default configuration options.
 */
const defaultOptions: Options = {
  folderPath: process.cwd(),
  outputFile: `source-snap-${new Date().toISOString().replace(/:/g, '-').split('.')[0]}.txt`,
  fileTypes: ['.js', '.ts'],
  maxSizeMB: 10,
  maxDepth: Infinity,
  outputFormat: 'txt',
  silent: false,
  verbose: false,
  excludeFolders: ['dist', 'node_modules'],
  excludeFiles: [
    'bun.lockb',
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',
    '.prettierignore'
  ],
  respectGitignore: true,
  includePatterns: [],
  excludePatterns: []
};

/**
 * Logs a message to the console unless silent mode is enabled.
 * @param message - The message to log
 * @param options - Configuration options
 */
const log = (message: string, options: Options) => {
  if (!options.silent) {
    console.log(message);
  }
};

/**
 * Loads configuration from a .sourcesnaprc file if it exists.
 * @returns Partial Options or null if the file doesn't exist
 */
const loadConfigFile = async (): Promise<Partial<Options> | null> => {
  const configPath = path.join(process.cwd(), '.sourcesnaprc');
  try {
    const configContent = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(configContent);
  } catch {
    return null;
  }
};

/**
 * Parses the .gitignore file in the specified folder.
 * @param folderPath - Directory containing the .gitignore file
 * @returns An ignore instance with .gitignore patterns
 */
const parseGitignore = async (folderPath: string): Promise<ignore.Ignore> => {
  const gitignorePath = path.join(folderPath, '.gitignore');
  try {
    const gitignoreContent = await fs.readFile(gitignorePath, 'utf-8');
    const ig = ignore().add(gitignoreContent);
    return ig;
  } catch {
    return ignore();
  }
};

/**
 * Recursively collects files from a directory based on options.
 * @param folderPath - Current directory path
 * @param options - Configuration options
 * @param ig - Ignore instance for .gitignore patterns
 * @param depth - Current recursion depth
 * @returns Array of file objects with path and content
 */
const collectFiles = async (
  folderPath: string,
  options: Options,
  ig: ignore.Ignore,
  depth = 0
): Promise<{ path: string; content: string }[]> => {
  if (depth > options.maxDepth) return [];
  const entries = await fs.readdir(folderPath, { withFileTypes: true });
  const results: Promise<{ path: string; content: string }[]>[] = [];
  for (const entry of entries) {
    const fullPath = path.join(folderPath, entry.name);
    const relativePath = path.relative(options.folderPath, fullPath);
    if (options.respectGitignore && ig.ignores(relativePath)) {
      log(`Skipping ignored path: ${fullPath}`, options);
      continue;
    }
    if (entry.isSymbolicLink()) {
      log(`Skipping symlink: ${fullPath}`, options);
      continue;
    }
    if (entry.isDirectory()) {
      if (options.excludeFolders.includes(entry.name)) {
        log(`Skipping folder: ${fullPath}`, options);
        continue;
      }
      results.push(collectFiles(fullPath, options, ig, depth + 1));
    } else if (entry.isFile()) {
      if (
        options.excludeFiles.some((pattern) => minimatch(relativePath, pattern))
      ) {
        log(`Skipping excluded file: ${fullPath}`, options);
        continue;
      }
      if (
        options.includePatterns.length > 0 &&
        !options.includePatterns.some((pattern) =>
          minimatch(relativePath, pattern)
        )
      ) {
        continue;
      }
      if (
        options.excludePatterns.some((pattern) =>
          minimatch(relativePath, pattern)
        )
      ) {
        continue;
      }
      const fileExtension = path.extname(entry.name).toLowerCase();
      if (
        options.fileTypes.length > 0 &&
        !options.fileTypes.includes(fileExtension)
      )
        continue;
      results.push(
        (async () => {
          const stats = await fs.stat(fullPath);
          const fileSizeMB = stats.size / (1024 * 1024);
          if (fileSizeMB > options.maxSizeMB) {
            log(
              `Skipping large file: ${fullPath} (${fileSizeMB.toFixed(2)} MB)`,
              options
            );
            return [];
          }
          const fileContent = await fs.readFile(fullPath, 'utf-8');
          return [{ path: relativePath, content: fileContent }];
        })()
      );
    }
  }
  const nestedResults = await Promise.all(results);
  return nestedResults.flat();
};

/**
 * Writes the collected files to the output file in the specified format.
 * @param result - Array of file objects
 * @param options - Configuration options
 * @returns Mapping of file paths to line numbers in the output
 */
const writeOutput = async (
  result: { path: string; content: string }[],
  options: Options
): Promise<Array<{ path: string; line: number }>> => {
  const fileLineMap: Array<{ path: string; line: number }> = [];
  if (options.outputFormat === 'txt') {
    const outputLines: string[] = result.reduce((acc, file) => {
      const currentLine = acc.length + 1;
      fileLineMap.push({ path: file.path, line: currentLine });
      return [...acc, `// ${file.path}`, ...file.content.split('\n'), ''];
    }, [] as string[]);
    await fs.writeFile(options.outputFile, outputLines.join('\n'), 'utf-8');
  } else {
    await fs.writeFile(
      options.outputFile,
      JSON.stringify(result, null, 2),
      'utf-8'
    );
  }
  return fileLineMap;
};

/**
 * Displays collected files with line numbers in the terminal.
 * @param fileLineMap - Mapping of file paths to line numbers
 * @param options - Configuration options
 */
const displayInTerminal = (
  fileLineMap: Array<{ path: string; line: number }>,
  options: Options
) => {
  const outputFileName = path.basename(options.outputFile);
  fileLineMap.forEach((entry) => {
    const link = `${outputFileName}:${entry.line}:0`;
    log(`${entry.line}:0 // ${entry.path}`, options);
    log(`Ctrl+Click to open: ${link}\n`, options);
  });
};

/**
 * Interface for collection statistics.
 */
interface Stats {
  totalFiles: number; // Total number of files collected
  totalLines: number; // Total lines across all files
  fileTypeStats: Map<string, { files: number; lines: number }>; // Stats per file type
}

/**
 * Main function to collect and process source files.
 * @param options - Configuration options
 */
const sourceSnap = async (options: Options) => {
  log(
    `Starting code collection with options: ${JSON.stringify(options)}`,
    options
  );
  const ig = await parseGitignore(options.folderPath);
  const result = await collectFiles(options.folderPath, options, ig);
  const stats: Stats = {
    totalFiles: 0,
    totalLines: 0,
    fileTypeStats: new Map()
  };
  result.forEach((file) => {
    const lines = file.content.split('\n').length;
    stats.totalFiles++;
    stats.totalLines += lines;
    const ext = path.extname(file.path).toLowerCase();
    if (!stats.fileTypeStats.has(ext)) {
      stats.fileTypeStats.set(ext, { files: 0, lines: 0 });
    }
    const typeStats = stats.fileTypeStats.get(ext)!;
    typeStats.files++;
    typeStats.lines += lines;
  });
  const fileLineMap = await writeOutput(result, options);
  if (!options.silent) {
    displayInTerminal(fileLineMap, options);
  }
  if (options.verbose) {
    log(`Summary:`, options);
    log(`Total files: ${stats.totalFiles}`, options);
    log(`Total lines: ${stats.totalLines}`, options);
    for (const [ext, typeStats] of stats.fileTypeStats) {
      log(
        `${ext}: ${typeStats.files} files, ${typeStats.lines} lines`,
        options
      );
    }
  }
  log(
    `\nCode collection completed! Output file: ${path.resolve(options.outputFile)}`,
    options
  );
};

/**
 * Collects user input interactively to configure the script.
 * @returns Configured options based on user input
 */
const getUserInput = async (): Promise<Options> => {
  const configOptions = await loadConfigFile();
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'folderPath',
      message: 'Enter the folder path (default is current working directory):',
      default: configOptions?.folderPath ?? defaultOptions.folderPath,
      validate: async (input) => {
        try {
          await fs.access(input);
          return true;
        } catch {
          return 'This path does not exist. Please enter a valid path.';
        }
      }
    },
    {
      type: 'input',
      name: 'outputFile',
      message: 'Enter the output file name (default is generated name):',
      default: configOptions?.outputFile ?? defaultOptions.outputFile
    },
    {
      type: 'input',
      name: 'fileTypes',
      message: `Enter file types to include (comma separated, e.g., ${defaultOptions.fileTypes.join(',')}):`,
      default: (configOptions?.fileTypes ?? defaultOptions.fileTypes).join(',')
    },
    {
      type: 'number',
      name: 'maxSizeMB',
      message: `Enter the maximum file size in MB (default is ${defaultOptions.maxSizeMB} MB):`,
      default: configOptions?.maxSizeMB ?? defaultOptions.maxSizeMB
    },
    {
      type: 'number',
      name: 'maxDepth',
      message:
        'Enter the maximum depth for file collection (default is Infinity):',
      default: configOptions?.maxDepth ?? defaultOptions.maxDepth
    },
    {
      type: 'list',
      name: 'outputFormat',
      message: 'Select the output format:',
      choices: ['txt', 'json'],
      default: configOptions?.outputFormat ?? defaultOptions.outputFormat
    },
    {
      type: 'confirm',
      name: 'silent',
      message: 'Enable silent mode?',
      default: configOptions?.silent ?? defaultOptions.silent
    },
    {
      type: 'confirm',
      name: 'verbose',
      message: 'Enable verbose logging?',
      default: configOptions?.verbose ?? defaultOptions.verbose
    },
    {
      type: 'input',
      name: 'excludeFolders',
      message: `Enter folders to exclude from collection (comma separated, e.g., ${defaultOptions.excludeFolders.join(',')}):`,
      default: (
        configOptions?.excludeFolders ?? defaultOptions.excludeFolders
      ).join(',')
    },
    {
      type: 'input',
      name: 'excludeFiles',
      message:
        'Enter files to exclude from collection (comma separated, e.g., .prettierrc,.package.json):',
      default: (
        configOptions?.excludeFiles ?? defaultOptions.excludeFiles
      ).join(',')
    },
    {
      type: 'confirm',
      name: 'respectGitignore',
      message: 'Respect .gitignore settings?',
      default:
        configOptions?.respectGitignore ?? defaultOptions.respectGitignore
    },
    {
      type: 'input',
      name: 'includePatterns',
      message:
        'Enter include patterns (comma separated glob patterns, e.g., **/*.js):',
      default: (
        configOptions?.includePatterns ?? defaultOptions.includePatterns
      ).join(',')
    },
    {
      type: 'input',
      name: 'excludePatterns',
      message:
        'Enter exclude patterns (comma separated glob patterns, e.g., **/*.test.js):',
      default: (
        configOptions?.excludePatterns ?? defaultOptions.excludePatterns
      ).join(',')
    }
  ]);
  answers.fileTypes = answers.fileTypes
    .split(',')
    .map((type: string) => type.trim().toLowerCase());
  answers.excludeFolders = answers.excludeFolders
    .split(',')
    .map((folder: string) => folder.trim());
  answers.excludeFiles = answers.excludeFiles
    .split(',')
    .map((file: string) => file.trim());
  answers.includePatterns = answers.includePatterns
    .split(',')
    .map((pattern: string) => pattern.trim());
  answers.excludePatterns = answers.excludePatterns
    .split(',')
    .map((pattern: string) => pattern.trim());
  return { ...defaultOptions, ...configOptions, ...answers };
};

/**
 * Entry point of the script.
 */
getUserInput()
  .then(sourceSnap)
  .catch((err) => {
    console.error('Error during code collection: ', err);
  });

export { sourceSnap };
export default getUserInput;
