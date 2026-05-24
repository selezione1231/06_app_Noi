/**
 * Utility per estrarre il testo da un file PDF direttamente nel browser.
 * Utilizza la libreria PDF.js caricata via CDN nell'index.html.
 * 
 * @param {File} file - Il file PDF da analizzare
 * @returns {Promise<string>} Il testo estratto dal PDF
 */
export const extractTextFromPdf = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        const arrayBuffer = event.target.result;
        
        // Verifica la presenza di PDF.js
        if (!window.pdfjsLib) {
          throw new Error("PDF.js non è caricato. Controlla la connessione internet.");
        }
        
        const typedarray = new Uint8Array(arrayBuffer);
        
        // Carica il documento PDF
        const loadingTask = window.pdfjsLib.getDocument({ data: typedarray });
        const pdf = await loadingTask.promise;
        
        let fullText = "";
        
        // Estrae il testo da ciascuna pagina
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent();
          
          // Unisce gli elementi di testo mantenendo una spaziatura
          const pageText = textContent.items
            .map((item) => item.str)
            .join(" ");
            
          fullText += pageText + "\n";
        }
        
        resolve(fullText.trim());
      } catch (error) {
        console.error("Errore durante l'estrazione del testo dal PDF:", error);
        reject(new Error("Impossibile leggere il PDF. Assicurati che non sia protetto o danneggiato."));
      }
    };
    
    reader.onerror = (error) => {
      console.error("Errore FileReader:", error);
      reject(new Error("Errore durante la lettura del file."));
    };
    
    reader.readAsArrayBuffer(file);
  });
};
