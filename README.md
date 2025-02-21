# Source Snap

**Source Snap** is a powerful Node.js tool designed to collect and consolidate source code files from a specified directory into a single output file. It supports filtering by file types, size, depth, and glob patterns, respects `.gitignore`, and provides options for exclusion and detailed reporting. Whether you're preparing a code snapshot for documentation, sharing, or analysis, Source Snap streamlines the process with a flexible and interactive CLI.

## Features

- **Flexible File Collection**: Collect files based on extensions, size limits, and directory depth.
- **Glob Pattern Support**: Include or exclude files using patterns like `**/*.spec.ts`.
- **Gitignore Integration**: Respects `.gitignore` files for consistent exclusion of ignored files.
- **Configurable Output**: Choose between `txt` (concatenated files) or `json` (structured data) formats.
- **Exclusion Options**: Skip specific folders, files, or patterns.
- **Verbose Reporting**: Generate a summary of collected files, lines, and file type statistics.
- **Configuration File**: Use a `.sourcesnaprc` file for persistent settings.
- **Interactive CLI**: Customize options via prompts or predefine them.
- **Symbolic Link Safety**: Skips symlinks to prevent recursion issues.
- **Unique Output Files**: Timestamped filenames to avoid overwriting.

## Installation

Install Source Snap globally or as a project dependency using npm:

```bash
npm install -g source-snap
```

Or, for local use in a project:

```bash
npm install source-snap
```

### Prerequisites

- **Node.js**: Version 14.x or higher.
- **npm**: Comes with Node.js.

## Usage

### Running the Script

After installation, run Source Snap from the command line:

```bash
source-snap
```

If installed locally, use:

```bash
npx source-snap
```

The script will launch an interactive prompt to configure options.

### Example Output

#### Text Format (`txt`)

Running `source-snap` with default settings might produce a file like `source-snap-2023-10-25T14-30-00.txt`:

```js
// src/index.js
console.log('Hello, World!');

// src/utils.js
function add(a, b) {
  return a + b;
}
```

#### JSON Format (`json`)

With `outputFormat` set to `json`:

```json
[
  {
    "path": "src/index.js",
    "content": "console.log(\"Hello, World!\");"
  },
  {
    "path": "src/utils.js",
    "content": "function add(a, b) {\n  return a + b;\n}"
  }
]
```

### Verbose Summary

With `verbose: true`, you'll see a summary in the terminal:

```txt
Summary:
Total files: 2
Total lines: 5
.js: 2 files, 5 lines

Code collection completed! Output file: /path/to/source-snap-2023-10-25T14-30-00.txt
```

## Configuration

### Interactive Prompts

When you run `source-snap`, it prompts for the following options:

- **Folder Path**: Directory to scan (default: current working directory).
- **Output File**: Name of the output file (default: `source-snap-YYYY-MM-DDTHH-MM-SS.txt`).
- **File Types**: Comma-separated extensions (e.g., `.js,.ts`).
- **Max Size (MB)**: Skip files larger than this size (default: 10 MB).
- **Max Depth**: Limit recursion depth (default: `Infinity`).
- **Output Format**: `txt` or `json` (default: `txt`).
- **Silent Mode**: Suppress console output (default: `false`).
- **Verbose Mode**: Show detailed stats (default: `false`).
- **Exclude Folders**: Comma-separated folder names (e.g., `dist,node_modules`).
- **Exclude Files**: Comma-separated file names/patterns (e.g., `package-lock.json`).
- **Respect .gitignore**: Apply `.gitignore` rules (default: `true`).
- **Include Patterns**: Comma-separated glob patterns (e.g., `**/*.js`).
- **Exclude Patterns**: Comma-separated glob patterns (e.g., `**/*.test.js`).

### Configuration File

Create a `.sourcesnaprc` file in your project root to set defaults. Example:

```json
{
  "folderPath": "./src",
  "fileTypes": [".ts", ".tsx"],
  "excludeFolders": ["dist", "node_modules"],
  "includePatterns": ["**/*.ts"],
  "excludePatterns": ["**/*.test.ts"],
  "verbose": true,
  "outputFormat": "json"
}
```

The script merges these settings with interactive input, with prompts overriding the config file.

## Advanced Usage

### Example Scenarios

#### Collect Only TypeScript Files

```bash
source-snap
```

- Set `fileTypes` to `.ts,.tsx`.
- Set `folderPath` to `./src`.

#### Exclude Test Files

```bash
source-snap
```

- Set `excludePatterns` to `**/*.test.ts,**/*.spec.ts`.

#### Generate a JSON Snapshot

```bash
source-snap
```

- Choose `json` as the `outputFormat`.

### Glob Patterns

Use glob patterns for fine-grained control:

- `**/*.js`: All `.js` files in any subdirectory.
- `src/**/*.ts`: All `.ts` files under `src`.
- `!src/lib/*.ts`: Negate specific patterns (supported via `.gitignore`).

## Development

### Dependencies

- **inquirer**: Interactive CLI prompts.
- **minimatch**: Glob pattern matching.
- **ignore**: `.gitignore` parsing.

Install them manually if contributing:

```bash
npm install inquirer minimatch ignore
```

### Building and Testing

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/source-snap.git
   cd source-snap
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Run locally:

   ```bash
   node sourceSnap.js
   ```

   Or, with TypeScript:

   ```bash
   npm install -g ts-node
   ts-node sourceSnap.ts
   ```

### Contributing

1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/new-feature`).
3. Commit changes (`git commit -m "Add new feature"`).
4. Push to the branch (`git push origin feature/new-feature`).
5. Open a pull request.

## License

This package is licensed under the [MIT License](LICENSE).

## Support

For issues, feature requests, or questions, open an issue on the [GitHub repository](https://github.com/Harshalkatakiya/source-snap/issues).
