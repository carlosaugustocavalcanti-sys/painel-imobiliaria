// Imprime "pN<TAB>url" para cada link de cada página de um PDF (PDFKit do macOS). Uso: swift scripts/pdf-links.swift arquivo.pdf
import PDFKit
let a = CommandLine.arguments
guard a.count >= 2, let doc = PDFDocument(url: URL(fileURLWithPath: a[1])) else { print("erro"); exit(1) }
for i in 0..<doc.pageCount {
  for an in doc.page(at: i)!.annotations {
    if let u = an.url { print("p\(i + 1)\t\(u.absoluteString)") }
    else if let acao = an.action as? PDFActionURL, let u = acao.url { print("p\(i + 1)\t\(u.absoluteString)") }
  }
}
