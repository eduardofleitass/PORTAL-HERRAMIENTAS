/**
 * Genera un PDF con contenido detallado abriendo una ventana popup
 * con HTML formateado para imprimir/guardar como PDF.
 */

interface ProcedimientoPDF {
  id: number;
  titulo: string;
  pasos: { orden: number; descripcion: string }[];
  modulo: string;
  nivel: string;
  tiempo_estimado: string;
}

interface ErrorPDF {
  id: number;
  codigo: string;
  titulo: string;
  descripcion: string;
  causa: string;
  solucion: string;
  modulo_afectado: string;
  frecuencia: string;
  tags: string[];
}

interface DocumentoPDF {
  id: number;
  titulo: string;
  descripcion: string;
  seccion: string;
  nombreArchivo: string;
  tamano: number;
  fechaSubida: string;
}

function estilosPDF(): string {
  return `
    @page { size: A4; margin: 2cm; }
    * { box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #222;
      margin: 0;
      padding: 20px;
      background: #fff;
    }
    h1 { font-size: 18pt; color: #1a1a2e; border-bottom: 2px solid #c8a96a; padding-bottom: 8px; margin-top: 0; }
    h2 { font-size: 14pt; color: #333; margin-top: 24px; margin-bottom: 8px; }
    .meta { color: #555; font-size: 10pt; margin-bottom: 12px; }
    .meta span { display: inline-block; margin-right: 16px; background: #f5f5f5; padding: 2px 8px; border-radius: 4px; }
    .paso { margin: 8px 0; padding: 10px 12px; background: #f9f9f9; border-left: 3px solid #c8a96a; border-radius: 0 4px 4px 0; }
    .paso-numero { font-weight: bold; color: #c8a96a; margin-right: 8px; }
    .separador { border: 0; border-top: 1px solid #ddd; margin: 24px 0; }
    .footer { margin-top: 40px; font-size: 9pt; color: #888; text-align: center; border-top: 1px solid #eee; padding-top: 12px; }
    .tag { display: inline-block; background: #e8e8e8; color: #555; padding: 2px 8px; border-radius: 12px; font-size: 9pt; margin-right: 4px; }
    pre { background: #f5f5f5; padding: 12px; border-radius: 4px; overflow-x: auto; font-size: 10pt; white-space: pre-wrap; word-wrap: break-word; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th, td { border: 1px solid #ddd; padding: 8px 10px; text-align: left; font-size: 10pt; }
    th { background: #1a1a2e; color: #fff; }
    tr:nth-child(even) { background: #f9f9f9; }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  `;
}

export function exportarPDFProcedimientos(items: ProcedimientoPDF[]) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Procedimientos - Portal de Herramientas</title>
      <style>${estilosPDF()}</style>
    </head>
    <body>
      <h1>Procedimientos</h1>
      <p class="meta">Total: ${items.length} procedimientos</p>
      ${items.map((p) => `
        <h2>${p.titulo}</h2>
        <div class="meta">
          <span>Modulo: ${p.modulo}</span>
          <span>Nivel: ${p.nivel}</span>
          <span>Tiempo: ${p.tiempo_estimado}</span>
        </div>
        <div>
          ${p.pasos?.map((paso) => `
            <div class="paso">
              <span class="paso-numero">${paso.orden}.</span>${paso.descripcion}
            </div>
          `).join("") || "<p>Sin pasos registrados.</p>"}
        </div>
        <hr class="separador">
      `).join("")}
      <div class="footer">Generado desde Portal de Herramientas EPEM</div>
      <script>window.onload = () => { setTimeout(() => window.print(), 300); };</script>
    </body>
    </html>
  `;
  const w = window.open("", "_blank", "width=900,height=700");
  if (w) { w.document.write(html); w.document.close(); }
}

export function exportarPDFFerrores(items: ErrorPDF[]) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Errores - Portal de Herramientas</title>
      <style>${estilosPDF()}</style>
    </head>
    <body>
      <h1>Errores del Sistema</h1>
      <p class="meta">Total: ${items.length} errores</p>
      ${items.map((e) => `
        <h2>${e.codigo} - ${e.titulo}</h2>
        <div class="meta">
          <span>Modulo: ${e.modulo_afectado}</span>
          <span>Frecuencia: ${e.frecuencia}</span>
          ${e.tags?.map((t) => `<span class="tag">${t}</span>`).join("") || ""}
        </div>
        <p><strong>Descripcion:</strong></p>
        <pre>${e.descripcion || "Sin descripcion."}</pre>
        <p><strong>Causa:</strong></p>
        <pre>${e.causa || "Sin causa registrada."}</pre>
        <p><strong>Solucion:</strong></p>
        <pre>${e.solucion || "Sin solucion registrada."}</pre>
        <hr class="separador">
      `).join("")}
      <div class="footer">Generado desde Portal de Herramientas EPEM</div>
      <script>window.onload = () => { setTimeout(() => window.print(), 300); };</script>
    </body>
    </html>
  `;
  const w = window.open("", "_blank", "width=900,height=700");
  if (w) { w.document.write(html); w.document.close(); }
}

export function exportarPDFDocumentacion(items: DocumentoPDF[]) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Documentacion - Portal de Herramientas</title>
      <style>${estilosPDF()}</style>
    </head>
    <body>
      <h1>Documentacion</h1>
      <p class="meta">Total: ${items.length} documentos</p>
      <table>
        <thead>
          <tr>
            <th>Titulo</th>
            <th>Seccion</th>
            <th>Archivo</th>
            <th>Tamano (KB)</th>
            <th>Fecha</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((d) => `
            <tr>
              <td><strong>${d.titulo}</strong><br><small>${d.descripcion || ""}</small></td>
              <td>${d.seccion}</td>
              <td>${d.nombreArchivo}</td>
              <td>${(d.tamano / 1024).toFixed(1)}</td>
              <td>${new Date(d.fechaSubida).toLocaleDateString()}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
      <div class="footer">Generado desde Portal de Herramientas EPEM</div>
      <script>window.onload = () => { setTimeout(() => window.print(), 300); };</script>
    </body>
    </html>
  `;
  const w = window.open("", "_blank", "width=900,height=700");
  if (w) { w.document.write(html); w.document.close(); }
}
