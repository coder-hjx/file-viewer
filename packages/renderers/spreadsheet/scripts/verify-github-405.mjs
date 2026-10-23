import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  createSpreadsheetParserContext,
  handleSpreadsheetWorkerRequest
} from '../dist/spreadsheet/worker/sheetjs/index.js'

const packageDir = dirname(dirname(fileURLToPath(import.meta.url)))
const fixturePath = join(packageDir, 'test', 'fixtures', 'github-405-ghost-corner-cells.xlsx')
const bytes = await readFile(fixturePath)
const data = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
const context = createSpreadsheetParserContext()
const workbookResponses = await handleSpreadsheetWorkerRequest(context, {
  type: 'parseWorkbook',
  payload: { workbook: data, filename: 'github-405-ghost-corner-cells.xlsx' }
})
const sheets = workbookResponses.find(response => response.type === 'sheets')?.payload?.sheets || []
const sheet = sheets[0]

if (!sheet) {
  throw new Error('Expected the reported workbook to expose one visible worksheet')
}
if (sheet.rowCount !== 10 || sheet.colCount !== 3) {
  throw new Error(
    `Expected sparse ghost-corner cells to collapse to 10x3, found ${sheet.rowCount}x${sheet.colCount}`
  )
}
if (sheet.rowCount > 1_000 || sheet.colCount > 64) {
  throw new Error(`Display bounds still pathological: ${sheet.rowCount}x${sheet.colCount}`)
}

const sheetResponses = await handleSpreadsheetWorkerRequest(context, {
  type: 'parseSheet',
  payload: { sheet: sheet.id, startRow: 0, pageSize: 500, sessionId: 1 }
})
const parsed = sheetResponses.find(response => response.type === 'parseSheet')?.payload?.sheetData
if (!parsed) {
  throw new Error('Expected the compacted worksheet to parse successfully')
}
if (parsed.meta?.totalRows !== 10 || parsed.data?.length !== 10) {
  throw new Error(`Expected a 10-row virtual model, found ${parsed.meta?.totalRows}/${parsed.data?.length}`)
}
if (parsed.data?.[0]?.[0] !== 'r1c1' || parsed.data?.[9]?.[2] !== 'r10c3') {
  throw new Error('Expected the dense A1:C10 content to remain intact after outlier compaction')
}
if (Array.isArray(parsed.structure?.rowHeights) && parsed.structure.rowHeights.length > 10) {
  throw new Error(`Row height vector still expanded to ${parsed.structure.rowHeights.length} entries`)
}

console.log('[spreadsheet] GitHub #405 ghost corner cells compacted to the actual 10x3 worksheet.')
