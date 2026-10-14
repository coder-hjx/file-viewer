# File Viewer

File Viewer 在浏览器中预览文档、表格、演示文稿、图纸及其他文件格式。

从 npm 安装所需组件，再将组件声明的浏览器资源复制到应用的 public 目录。发行包保留完整渲染器和可选资源包，应用可以按需加载。

```sh
npm install @file-viewer/web@3.2.0 @file-viewer/preset-office@3.2.0
npx file-viewer-copy-assets@3.2.0 --help
```

框架接入和资源安装方法见[使用文档](https://doc.file-viewer.app/)。[GitHub Releases](https://github.com/flyfish-dev/file-viewer/releases) 提供冻结的 npm 包及完整性清单。第三方许可声明和对应源码链接随包分发。

当前分支保存发布工具、使用入口和包清单。此前的源码发行记录保留在 Git 历史和已有 tag 中。
