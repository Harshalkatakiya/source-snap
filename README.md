# Source Snap

`source-snap` is a CLI tool for collecting and organizing source code files from a given folder. It allows you to specify various filtering and formatting options to generate a snapshot of your source files, making it easier to review or archive codebases.

---

## Features

- **File Collection**: Collect files based on file types, sizes, and directory depth.
- **Inclusion & Exclusion Options**: Specify files and folders to include or exclude from collection.
- **`.gitignore` Support**: Automatically skip files and folders specified in .gitignore.
- **Customizable Outputs**: Generate results in either plain text or JSON format.
- **Verbose Logging**: Get detailed insights during the scanning process.
- **Cross-Platform Support**: Works seamlessly on Windows, macOS, and Linux.

---

## Installation

Install `source-snap` globally using npm:

```bash
npm install -g source-snap
```

---

## Usage

You can run `source-snap` directly from the command line. By default, it scans the current directory and generates a text output file.

```bash
source-snap
```

You can customize the behavior by using the available options, either interactively or through command-line arguments.

---

## Options

The following options are available:

| Option             | Default Value                              | Description                                                                                   |
| ------------------ | ------------------------------------------ | --------------------------------------------------------------------------------------------- |
| `folderPath`       | Current working directory                  | The folder to scan for source files.                                                          |
| `outputFile`       | `source-snap-YYYY-MM-DD.txt`               | The name of the output file.                                                                  |
| `fileTypes`        | `.js, .ts`                                 | Comma-separated list of file extensions to include (e.g., `.js,.ts`).                         |
| `maxSizeMB`        | 10                                         | Maximum file size (in MB) to include in the output.                                           |
| `maxDepth`         | Infinity                                   | Maximum directory depth for scanning.                                                         |
| `outputFormat`     | `txt`                                      | The format of the output file (`txt` or `json`).                                              |
| `silent`           | `false`                                    | Disable logging output.                                                                       |
| `verbose`          | `false`                                    | Enable verbose logging.                                                                       |
| `includeFolders`   | None                                       | Comma-separated list of folders to include (if specified, only these will be scanned).        |
| `includeFiles`     | None                                       | Comma-separated list of specific files to include (if specified, only these will be scanned). |
| `excludeFolders`   | `dist, node_modules`                       | Comma-separated list of folders to exclude (e.g., `node_modules,dist`).                       |
| `excludeFiles`     | `.prettierignore, package-lock.json`, etc. | Comma-separated list of files to exclude (e.g., `.prettierrc,package-lock.json`).             |
| `respectGitignore` | `true`                                     | Whether to respect `.gitignore` rules when scanning files.                                    |

---

## Interactive Mode

Running `source-snap` without any arguments launches an interactive setup, guiding you through the configuration:

```bash
$ source-snap
? Enter the folder path (default is current working directory):
? Specify folders to include (comma separated, leave empty to include all):
? Specify files to include (comma separated, leave empty to include all):
? Enter the output file name (default is generated name):
? Enter file types to include (comma separated, e.g., .js,.ts):
? Enter the maximum file size in MB (default is 10 MB):
? Enter the maximum depth for file collection (default is Infinity):
? Select the output format: (txt or json):
? Enable silent mode? (y/N):
? Enable verbose logging? (y/N):
? Enter folders to exclude from collection (comma separated, e.g., dist,node_modules):
? Enter files to exclude from collection (comma separated, e.g., .prettierrc,.package.json):
? Respect .gitignore settings? (Y/n):
```

---

## Examples

- **Basic Usage**: Collect all .js and .ts files from the current directory:

```bash
source-snap --fileTypes .js,.ts
```

- **Custom Folder, File Size, and Exclusions**: Collect files up to 5MB in size from the `src` folder, excluding `node_modules` and `dist`:

```bash
source-snap --folderPath ./src --fileTypes .js,.ts --maxSizeMB 5 --excludeFolders node_modules,dist --outputFormat txt
```

- **Include Specific Folders and Files**: Collect only the `src` and `config` folders and specific files:

```bash
source-snap --includeFolders src,config --includeFiles index.js,app.ts
```

- **JSON Output**: Save results in JSON format:

```bash
source-snap --outputFormat json
```

---

## Output Formats

`source-snap` supports two output formats: Text and JSON.

### Text Format (txt)

Each file is listed with its path, followed by its content. Example:

```txt
// src/index.js
console.log('Hello, world!');

// src/utils/helper.js
export const helper = () => {
  // ...
};
```

### JSON Format (json)

A structured JSON file is generated, containing the file paths and their content. Example:

```json
[
  {
    "path": "src/index.js",
    "content": "console.log('Hello, world!');"
  },
  {
    "path": "src/utils/helper.js",
    "content": "export const helper = () => {};"
  }
]
```

---

## Links in Terminal

For text outputs, the tool generates clickable links (e.g., `output.txt:12:0`) that can be used to navigate directly to specific files and lines in supported editors.

---

## Contributing

We welcome contributions! If you have ideas for improvements, encounter any bugs, or want to contribute code, feel free to submit an issue or a pull request in the [GitHub repository](https://github.com/Harshalkatakiya/source-snap).

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

Made with ❤️ by [Harshal Katakiya](https://github.com/Harshalkatakiya). Feel free to reach out if you have any questions or need support!
