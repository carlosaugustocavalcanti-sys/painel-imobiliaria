// Imprime o texto de cada página de um PDF (PDFKit do macOS). Uso: swift scripts/pdf-texto.swift arquivo.pdf
import PDFKit
let a = CommandLine.arguments
guard a.count >= 2, let doc = PDFDocument(url: URL(fileURLWithPath: a[1])) else { print("erro"); exit(1) }
for i in 0..<doc.pageCount { print("=== PÁGINA \(i + 1)"); print(doc.page(at: i)?.string ?? "") }
