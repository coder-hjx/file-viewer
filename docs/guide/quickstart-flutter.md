# Flutter integration

The independent [file-viewer-flutter repository](https://github.com/flyfish-dev/file-viewer-flutter) contains the Flutter API, platform adapters, offline asset packages and runnable example. It consumes the immutable public File Viewer distribution; it does not require customers to build the JavaScript source.

This is a development preview. Android, iOS, Web, Windows, macOS and Linux are the delivery targets. Consult the repository's qualification matrix and release notes before selecting a target. Declaring a plugin platform does not establish that every device, format or native engine has passed testing.

## Application integration

Use the complete local SDK bundle while pub.dev publication is pending. The repository README documents the current available installation path. Run the supplied setup command once for the application:

```sh
dart run file_viewer_flutter:setup --project . --check
dart run file_viewer_flutter:setup --project . --apply
```

The check prints proposed changes. Applying preserves existing configuration and adds scoped local networking and platform initialization. Then import the package and wrap the application root:

```dart
import 'package:file_viewer_flutter/file_viewer_flutter.dart';

runApp(FileViewerHost(child: MyApp()));
```

Place the viewer in a bounded Flutter layout:

```dart
FileViewer(source: FileViewerSource.asset('assets/example.pdf'))
```

Declare the example document in the host application's assets. Native file paths, bytes and HTTP(S) URLs have corresponding source factories. Web uses bytes or URLs rather than arbitrary local paths. Customer integration needs Flutter tooling; Node.js is used only to maintain the packaged runtime.

## Prewarming and offline behavior

The host starts warming after the first Flutter frame. It retains one spare viewer and reuses a released document session. Concurrent viewers use separate native views. `FileViewerRuntime.instance.preload(source)` can parse a known upcoming file before navigation. Module readiness and actual document rendering are separate measurements.

All four version-locked asset packages are installed together, including Worker, WASM, fonts and vendor resources. This increases application size. Windows bundles WebView2 Fixed Version; Linux bundles CEF. Native build machines need the locked archives or a populated cache; the installed application does not download rendering engines.

Backgrounding pauses unnecessary work while retaining an instance where the operating system permits. The process may be suspended or reclaimed. On return, the SDK resumes or recreates the viewer. It does not promise a permanent background service. Memory pressure trims idle instances, and logout should call `clearSessions()`.

See the independent repository's architecture and qualification documents for current limitations, reproducible checks, license notices and release gates.
