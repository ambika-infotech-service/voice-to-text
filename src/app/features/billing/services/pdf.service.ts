import { Service } from '@angular/core';

/**
 * Service managing printing layouts and exporting the invoice DOM to PDF files.
 * Architected to be easily integrated with html2canvas and jsPDF libraries later.
 */
@Service()
export class PdfService {
  /**
   * Generates a high-quality PDF from a specific DOM element.
   * @param elementId The id of the DOM element container (e.g. invoice-preview element).
   * @param filename The name of the file to save (without extension).
   */
  public async generateInvoicePdf(elementId: string, filename: string): Promise<void> {
    console.log(`[PdfService] Initiating PDF Export: targeting element #${elementId}, saving as ${filename}.pdf`);
    
    // Future integration template:
    // -------------------------------------------------------------
    // import { jsPDF } from 'jspdf';
    // import html2canvas from 'html2canvas';
    //
    // const element = document.getElementById(elementId);
    // if (!element) {
    //   throw new Error(`Element #${elementId} not found in DOM.`);
    // }
    //
    // const canvas = await html2canvas(element, {
    //   scale: 2, // Enhances text crispness
    //   useCORS: true
    // });
    //
    // const imgData = canvas.toDataURL('image/png');
    // const pdf = new jsPDF('p', 'mm', 'a4');
    // const imgWidth = 210; // A4 standard width (mm)
    // const pageHeight = 297; // A4 standard height (mm)
    // const imgHeight = (canvas.height * imgWidth) / canvas.width;
    //
    // pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    // pdf.save(`${filename}.pdf`);
    // -------------------------------------------------------------

    return Promise.resolve();
  }

  /**
   * Triggers the native browser print workflow.
   * Leverages print-specific CSS rules to format only the preview card.
   */
  public printInvoice(): void {
    window.print();
  }
}
