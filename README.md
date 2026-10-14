# File Viewer

File Viewer renders documents, spreadsheets, presentations, drawings and other file formats in the browser.

Install a package from npm and copy its declared browser assets into your application's public directory. The release includes the complete renderer set and the optional asset packages; package selection controls what your application loads.

```sh
npm install @file-viewer/web@3.2.0 @file-viewer/preset-office@3.2.0
npx file-viewer-copy-assets@3.2.0 --help
```

See the [documentation](https://doc.file-viewer.app/) for framework integration and asset installation. [GitHub Releases](https://github.com/flyfish-dev/file-viewer/releases) contains the frozen npm archives and their integrity manifest. Third-party license notices and corresponding-source links ship with the packages.

This branch contains the release publisher, consumer entry points and package metadata. Previous source releases remain in Git history and their existing tags.
