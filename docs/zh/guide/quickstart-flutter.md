# Flutter 接入

独立仓库 [file-viewer-flutter](https://github.com/flyfish-dev/file-viewer-flutter) 包含 Flutter API、平台适配、离线资源包和可运行示例。它消费固定版本的 File Viewer 公开发行资产，客户不需要构建 JavaScript 源码。

当前为开发预览，交付目标覆盖 Android、iOS、Web、Windows、macOS 和 Linux。选型前请核对独立仓库的实测矩阵与发行说明；插件声明了平台，不代表所有设备、格式与内核都已通过验收。

## 应用接入

pub.dev 发布完成前使用完整本地 SDK；当前可用安装路径以独立仓库 README 为准。先对宿主应用执行一次配置：

```sh
dart run file_viewer_flutter:setup --project . --check
dart run file_viewer_flutter:setup --project . --apply
```

`--check` 展示拟修改内容；`--apply` 保留已有配置，仅补充限定范围的本地网络与平台初始化。然后导入组件，并在应用根节点加一行：

```dart
import 'package:file_viewer_flutter/file_viewer_flutter.dart';

runApp(FileViewerHost(child: MyApp()));
```

在有明确尺寸约束的 Flutter 布局中，用一行展示文件：

```dart
FileViewer(source: FileViewerSource.asset('assets/example.pdf'))
```

请在宿主应用的 assets 中声明该文档。文件源也支持原生文件路径、字节与 HTTP(S) URL；Web 使用字节或 URL，不能读取任意本地路径。客户只需要 Flutter 工具链，Node.js 仅用于维护资源包。

## 预热、复用与离线

根节点在 Flutter 首帧后启动预热，保留一个备用查看器，并复用离开页面后保留的文档会话。多个预览同时显示时使用独立原生视图。已知下一个文件时，可调用 `FileViewerRuntime.instance.preload(source)` 提前解析。模块就绪与文件首屏渲染是不同指标。

四个版本锁定的资源包默认一起安装，包含 Worker、WASM、字体与 vendor 资产，因此会增加应用体积。Windows 随包携带固定版本 WebView2，Linux 随包携带 CEF；构建机器需要已锁定归档或预置缓存，应用运行时不下载渲染引擎。

后台期间暂停不必要工作，在系统允许时保留实例；系统仍可能挂起或回收进程。返回前台后恢复或重建查看器，不承诺永久后台服务。内存压力释放闲置实例，退出账号时应调用 `clearSessions()`。

当前限制、可复现验证、许可证与正式发布门槛见独立仓库的架构和兼容矩阵文档。
