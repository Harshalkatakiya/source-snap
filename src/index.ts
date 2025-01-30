#!/usr/bin/env node
import * as fs from 'fs/promises';
import inquirer from 'inquirer';
import * as path from 'path';

interface Options {
  folderPath: string;
  outputFile: string;
  fileTypes: string[];
  maxSizeMB: number;
  maxDepth: number;
  outputFormat: 'txt' | 'json';
  silent: boolean;
  verbose: boolean;
  excludeFolders: string[];
  excludeFiles: string[];
  respectGitignore: boolean;
}

const defaultOptions: Options = {
  folderPath: process.cwd(),
  outputFile: `source-snap-${new Date().toISOString().split('T')[0]}.txt`,
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
  respectGitignore: true
};

const log = (message: string, options: Options) => {
  if (!options.silent) {
    console.log(message);
  }
};

const parseGitignore = async (folderPath: string): Promise<string[]> => {
  const gitignorePath = path.join(folderPath, '.gitignore');
  try {
    const gitignoreContent = await fs.readFile(gitignorePath, 'utf-8');
    return gitignoreContent
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'));
  } catch {
    return [];
  }
};

const isIgnored = (filePath: string, ignorePatterns: string[]): boolean =>
  ignorePatterns.some((pattern) => {
    const regexPattern = new RegExp(
      '^' +
        pattern.replace(/\./g, '\\.').replace(/\*/g, '.*').replace(/\?/g, '.') +
        '$'
    );
    return regexPattern.test(filePath);
  });

const collectFiles = async (
  folderPath: string,
  options: Options,
  ignorePatterns: string[],
  depth = 0
): Promise<{ path: string; content: string }[]> => {
  if (depth > options.maxDepth) return [];
  const entries = await fs.readdir(folderPath, { withFileTypes: true });
  const results: Promise<{ path: string; content: string }[]>[] = [];
  for (const entry of entries) {
    const fullPath = path.join(folderPath, entry.name);
    const relativePath = path.relative(options.folderPath, fullPath);
    if (isIgnored(relativePath, ignorePatterns)) {
      log(`Skipping ignored path: ${fullPath}`, options);
      continue;
    }
    if (entry.isDirectory()) {
      if (
        options.excludeFolders.some((exclude) => fullPath.includes(exclude))
      ) {
        log(`Skipping folder: ${fullPath}`, options);
        continue;
      }
      results.push(collectFiles(fullPath, options, ignorePatterns, depth + 1));
    } else if (entry.isFile()) {
      if (
        options.excludeFiles.some((pattern) =>
          new RegExp(
            `^${pattern.replace(/\./g, '\\.').replace(/\*/g, '.*').replace(/\?/g, '.')}$`
          ).test(relativePath)
        )
      ) {
        log(`Skipping excluded file: ${fullPath}`, options);
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

const writeOutput = async (
  result: { path: string; content: string }[],
  options: Options
): Promise<Array<{ path: string; line: number }>> => {
  const fileLineMap: Array<{ path: string; line: number }> = [];
  const outputLines: string[] = result.reduce((acc, file) => {
    const currentLine = acc.length + 1;
    fileLineMap.push({ path: file.path, line: currentLine });
    return [...acc, `// ${file.path}`, ...file.content.split('\n'), ''];
  }, [] as string[]);
  if (options.outputFormat === 'txt') {
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

const displayInTerminal = (
  fileLineMap: Array<{ path: string; line: number }>,
  options: Options
) => {
  const outputFileName = path.basename(options.outputFile);
  fileLineMap.forEach((entry) => {
    const link = `${outputFileName}:${entry.line}:0`;
    log(`${entry.line}:0 // ${entry.path}`, options);
    console.log(`Ctrl+Click to open: ${link}\n`);
  });
};

const sourceSnap = async (options: Options) => {
  log(
    `Starting code collection with options: ${JSON.stringify(options)}`,
    options
  );
  const ignorePatterns =
    options.respectGitignore ? await parseGitignore(options.folderPath) : [];
  const result = await collectFiles(
    options.folderPath,
    options,
    ignorePatterns
  );
  const fileLineMap = await writeOutput(result, options);
  if (!options.silent) {
    displayInTerminal(fileLineMap, options);
  }
  log(
    `\nCode collection completed! Output file: ${path.resolve(options.outputFile)}`,
    options
  );
};

const getUserInput = async (): Promise<Options> => {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'folderPath',
      message: 'Enter the folder path (default is current working directory):',
      default: defaultOptions.folderPath,
      async validate(input) {
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
      default: defaultOptions.outputFile
    },
    {
      type: 'input',
      name: 'fileTypes',
      message: `Enter file types to include (comma separated, e.g., ${defaultOptions.fileTypes.join(',')}):`,
      default: defaultOptions.fileTypes.join(',')
    },
    {
      type: 'number',
      name: 'maxSizeMB',
      message: `Enter the maximum file size in MB (default is ${defaultOptions.maxSizeMB} MB):`,
      default: defaultOptions.maxSizeMB
    },
    {
      type: 'number',
      name: 'maxDepth',
      message:
        'Enter the maximum depth for file collection (default is Infinity):',
      default: defaultOptions.maxDepth
    },
    {
      type: 'list',
      name: 'outputFormat',
      message: 'Select the output format:',
      choices: ['txt', 'json'],
      default: defaultOptions.outputFormat
    },
    {
      type: 'confirm',
      name: 'silent',
      message: 'Enable silent mode?',
      default: defaultOptions.silent
    },
    {
      type: 'confirm',
      name: 'verbose',
      message: 'Enable verbose logging?',
      default: defaultOptions.verbose
    },
    {
      type: 'input',
      name: 'excludeFolders',
      message: `Enter folders to exclude from collection (comma separated, e.g., ${defaultOptions.excludeFolders.join(',')}):`,
      default: defaultOptions.excludeFolders.join(',')
    },
    {
      type: 'input',
      name: 'excludeFiles',
      message:
        'Enter files to exclude from collection (comma separated, e.g., .prettierrc,.package.json):',
      default: defaultOptions.excludeFiles.join(',')
    },
    {
      type: 'confirm',
      name: 'respectGitignore',
      message: 'Respect .gitignore settings?',
      default: defaultOptions.respectGitignore
    }
  ]);
  answers.fileTypes = answers.fileTypes
    .split(',')
    .map((type: string) => type.trim());
  answers.excludeFolders = answers.excludeFolders
    .split(',')
    .map((folder: string) => folder.trim());
  answers.excludeFiles = answers.excludeFiles
    .split(',')
    .map((file: string) => file.trim());
  return answers;
};

getUserInput()
  .then(sourceSnap)
  .catch((err) => {
    console.error('Error during code collection: ', err);
  });
export { sourceSnap };

export default getUserInput;
