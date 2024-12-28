// src/types/html2pdf.d.ts

declare module "html2pdf.js" {
  interface Html2PdfOptions {
    margin?: number;
    filename?: string;
    image?: { type: string; quality: number };
    html2canvas?: { scale: number };
    jsPDF?: { unit: string; format: string; orientation: string };
  }

  interface Html2PdfInstance {
    set(options: Html2PdfOptions): Html2PdfInstance;
    from(element: HTMLElement | string): Html2PdfInstance;
    save(): Promise<void>;
    output(type?: "datauristring" | "blob"): Promise<any>;
  }

  function html2pdf(): Html2PdfInstance;

  export default html2pdf;
}
