module.exports = function transformImportMetaUrl({ template }) {
  const replacement = template.expression(
    "((typeof document !== 'undefined' && document.currentScript && document.currentScript.src) || (typeof window !== 'undefined' ? window.location.href : 'file:///'))"
  )

  return {
    name: 'file-viewer-webpack4-import-meta-url',
    visitor: {
      MetaProperty(path) {
        if (path.node.meta.name !== 'import' || path.node.property.name !== 'meta') {
          return
        }

        const parent = path.parentPath
        if (!parent.isMemberExpression() || parent.node.property.name !== 'url') {
          return
        }

        parent.replaceWith(replacement())
      }
    }
  }
}
