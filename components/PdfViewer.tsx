import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LoaderIcon } from './icons';
import * as pdfjsLib from 'pdfjs-dist/build/pdf';

// Set worker source from a reliable CDN
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://esm.sh/pdfjs-dist@4.5.136/build/pdf.worker.mjs';

interface PdfViewerProps {
  file: File | null;
}

const PdfViewer: React.FC<PdfViewerProps> = ({ file }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [isRendering, setIsRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const renderPage = useCallback(async (num: number) => {
    if (!pdfDoc || isRendering) return;
    setIsRendering(true);
    try {
      const page = await pdfDoc.getPage(num);
      
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) {
          setIsRendering(false);
          return;
      }
      
      const scale = container.clientWidth / page.getViewport({ scale: 1 }).width;
      const viewport = page.getViewport({ scale });
      const context = canvas.getContext('2d');
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      if (context) {
        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };
        await page.render(renderContext).promise;
      }
      setPageNum(num);
    } catch (err) {
      console.error('Error rendering page:', err);
      setError('Failed to render PDF page.');
    } finally {
      setIsRendering(false);
    }
  }, [pdfDoc, isRendering]);
  
  useEffect(() => {
    if (!file) {
        setPdfDoc(null);
        setNumPages(0);
        setPageNum(1);
        return;
    };

    const loadPdf = async () => {
      setError(null);
      setIsRendering(true);
      try {
        const fileReader = new FileReader();
        fileReader.onload = async (event) => {
          if (event.target?.result) {
            try {
                const typedArray = new Uint8Array(event.target.result as ArrayBuffer);
                const loadingTask = pdfjsLib.getDocument(typedArray);
                const pdf = await loadingTask.promise;
                setPdfDoc(pdf);
                setNumPages(pdf.numPages);
            } catch (pdfError) {
                console.error('Error parsing PDF data:', pdfError);
                setError('Could not parse the PDF file. It might be corrupted or in an unsupported format.');
                setIsRendering(false);
            }
          }
        };
        fileReader.onerror = () => {
            setError('Failed to read the file.');
            setIsRendering(false);
        };
        fileReader.readAsArrayBuffer(file);
      } catch (err) {
        console.error('Error loading PDF:', err);
        setError('Failed to load PDF file.');
        setIsRendering(false);
      }
    };

    loadPdf();
    
    // Cleanup function
    return () => {
        pdfDoc?.destroy();
    }
  }, [file]);

  useEffect(() => {
    if (pdfDoc) {
      renderPage(pageNum);
    }
  }, [pdfDoc, pageNum]); // Removed renderPage from deps to avoid re-triggering on isRendering change

  // Re-render page on container resize
  useEffect(() => {
      if (!containerRef.current || !pdfDoc) return;
      
      const resizeObserver = new ResizeObserver(() => {
          renderPage(pageNum);
      });
      
      resizeObserver.observe(containerRef.current);
      
      return () => resizeObserver.disconnect();
  }, [pdfDoc, pageNum, renderPage]);

  const goToPrevPage = () => {
    if (pageNum > 1) {
      setPageNum(pageNum - 1);
    }
  };

  const goToNextPage = () => {
    if (pageNum < numPages) {
      setPageNum(pageNum + 1);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-brand-super-dark text-white">
        <div ref={containerRef} className="flex-grow flex items-center justify-center overflow-auto p-2 relative">
            {(isRendering || (!pdfDoc && !error)) && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center bg-brand-super-dark/80 z-10">
                    <LoaderIcon className="w-12 h-12 mb-4" />
                    <p className="text-lg font-semibold">Loading PDF...</p>
                </div>
            )}
            {error && (
                <div className="p-4 text-red-400 text-center">
                    <p className="font-bold">Error</p>
                    <p>{error}</p>
                </div>
            )}
            <canvas ref={canvasRef} className="max-w-full max-h-full" style={{ visibility: isRendering || error ? 'hidden' : 'visible' }} />
        </div>
        {numPages > 0 && !error && (
            <div className="flex-shrink-0 flex items-center justify-center p-2 bg-brand-dark border-t border-gray-700">
                <button onClick={goToPrevPage} disabled={pageNum <= 1 || isRendering} className="px-4 py-2 bg-gray-600 rounded-md disabled:opacity-50 text-white font-semibold hover:bg-gray-500 transition-colors">Prev</button>
                <span className="mx-4 text-white font-medium">Page {pageNum} of {numPages}</span>
                <button onClick={goToNextPage} disabled={pageNum >= numPages || isRendering} className="px-4 py-2 bg-gray-600 rounded-md disabled:opacity-50 text-white font-semibold hover:bg-gray-500 transition-colors">Next</button>
            </div>
        )}
    </div>
  );
};

export default PdfViewer;
