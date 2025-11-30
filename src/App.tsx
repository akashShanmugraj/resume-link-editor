import React, { useState, useRef } from 'react';
import { PDFDocument, PDFName, PDFString, PDFDict, PDFRef } from 'pdf-lib';
import { Upload, FileText, Download, Zap, AlertCircle, Link as LinkIcon, Github, Linkedin, RefreshCw, CheckCircle2 } from 'lucide-react';
import { cn } from './lib/utils';

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [tag, setTag] = useState('');
  const [outputFilename, setOutputFilename] = useState('');
  const [processedPdfBytes, setProcessedPdfBytes] = useState<Uint8Array | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stats, setStats] = useState<{ total: number; updated: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type !== 'application/pdf') {
        setError('Please upload a valid PDF file.');
        return;
      }
      setFile(selectedFile);
      setOutputFilename(`tagged_${selectedFile.name}`);
      setProcessedPdfBytes(null);
      setStats(null);
      setError(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selectedFile = e.dataTransfer.files[0];
      if (selectedFile.type !== 'application/pdf') {
        setError('Please upload a valid PDF file.');
        return;
      }
      setFile(selectedFile);
      setOutputFilename(`tagged_${selectedFile.name}`);
      setProcessedPdfBytes(null);
      setStats(null);
      setError(null);
    }
  };

  const processPdf = async () => {
    if (!file || !tag) return;

    setIsProcessing(true);
    setError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const pages = pdfDoc.getPages();
      let updatedCount = 0;
      let totalLinks = 0;

      const targetBaseUrl = 'https://link.akashshanmugaraj.com/link/';

      for (const page of pages) {
        const annotations = page.node.Annots();
        
        if (annotations) {
          const annotsArray = annotations.asArray();
          
          for (const rawAnnot of annotsArray) {
             let annot = rawAnnot;
             if (annot instanceof PDFRef) {
               const lookedUpAnnot = pdfDoc.context.lookup(annot);
               if (!lookedUpAnnot) continue;
               annot = lookedUpAnnot;
             }

             // In pdf-lib, we need to work with the raw objects sometimes if high-level isn't enough,
             // but usually we can cast to PDFDict.
             if (annot instanceof PDFDict) {
                const subtype = annot.get(PDFName.of('Subtype'));
                if (subtype === PDFName.of('Link')) {
                   const action = annot.get(PDFName.of('A'));
                   if (action instanceof PDFDict) {
                      const type = action.get(PDFName.of('S'));
                      if (type === PDFName.of('URI')) {
                         const uriEntry = action.get(PDFName.of('URI'));
                         if (uriEntry instanceof PDFString) {
                            const originalUri = uriEntry.decodeText();
                            totalLinks++;
                            
                            if (originalUri.startsWith(targetBaseUrl)) {
                               try {
                                  const url = new URL(originalUri);
                                  url.searchParams.set('tag', tag);
                                  const newUri = url.toString();
                                  
                                  if (newUri !== originalUri) {
                                     action.set(PDFName.of('URI'), PDFString.of(newUri));
                                     updatedCount++;
                                  }
                               } catch (e) {
                                  console.warn('Failed to parse URL:', originalUri);
                               }
                            }
                         }
                      }
                   }
                }
             }
          }
        }
      }

      const pdfBytes = await pdfDoc.save();
      setProcessedPdfBytes(pdfBytes);
      setStats({ total: totalLinks, updated: updatedCount });

    } catch (err) {
      console.error(err);
      setError('An error occurred while processing the PDF. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadPdf = () => {
    if (!processedPdfBytes || !file) return;
    
    const blob = new Blob([processedPdfBytes as unknown as BlobPart], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = outputFilename.endsWith('.pdf') ? outputFilename : `${outputFilename}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-neo-bg p-8 font-sans text-neo-dark flex flex-col items-center">
      <div className="w-full max-w-2xl">
        
        {/* Header */}
        <header className="mb-12 text-center">
          <h1 className="text-5xl font-black mb-4 uppercase tracking-tight bg-neo-primary inline-block px-4 py-2 border-4 border-neo-dark shadow-neo transform -rotate-2">
            Resume Link Tagger
          </h1>
          <p className="text-xl font-bold mt-4">
            Bulk update your resume tracking links in seconds.
          </p>
        </header>

        {/* Main Card */}
        <div className="bg-white border-4 border-neo-dark shadow-neo-lg p-8 mb-8">
          
          {/* Step 1: Upload */}
          <div className="mb-8">
            <label className="block text-2xl font-black mb-4 flex items-center gap-2">
              <span className="bg-neo-secondary text-white px-3 py-1 border-2 border-neo-dark shadow-neo-sm text-lg">1</span>
              Upload Resume
            </label>
            
            <div 
              className={cn(
                "border-4 border-dashed border-neo-dark bg-gray-50 p-12 text-center cursor-pointer transition-all hover:bg-neo-bg/50 group",
                file ? "border-solid bg-neo-bg/30" : ""
              )}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input 
                type="file" 
                accept=".pdf" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleFileChange}
              />
              
              {file ? (
                <div className="flex flex-col items-center animate-in fade-in zoom-in duration-200">
                  <FileText className="w-16 h-16 mb-4 text-neo-secondary" strokeWidth={2.5} />
                  <span className="text-xl font-bold break-all">{file.name}</span>
                  <span className="text-sm font-bold text-gray-500 mt-2">Click to change</span>
                </div>
              ) : (
                <div className="flex flex-col items-center group-hover:scale-105 transition-transform">
                  <Upload className="w-16 h-16 mb-4 text-neo-dark" strokeWidth={2.5} />
                  <span className="text-xl font-bold">Drop your PDF here</span>
                  <span className="text-sm font-bold text-gray-500 mt-2">or click to browse</span>
                </div>
              )}
            </div>

            {file && (
              <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                <label className="block text-sm font-bold mb-2 text-gray-600">
                  Output Filename (optional)
                </label>
                <input
                  type="text"
                  value={outputFilename}
                  onChange={(e) => setOutputFilename(e.target.value)}
                  className="w-full px-4 py-2 text-lg font-bold border-4 border-neo-dark focus:outline-none focus:shadow-neo transition-shadow"
                  placeholder="tagged_resume.pdf"
                />
              </div>
            )}
          </div>

          {/* Step 2: Tag */}
          <div className="mb-8">
             <label className="block text-2xl font-black mb-4 flex items-center gap-2">
              <span className="bg-neo-accent text-neo-dark px-3 py-1 border-2 border-neo-dark shadow-neo-sm text-lg">2</span>
              Set Tag
            </label>
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">?tag=</span>
                <input
                  type="text"
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  placeholder="example-company-2024"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && file && tag && !isProcessing) {
                      processPdf();
                    }
                  }}
                  className="w-full pl-20 pr-4 py-4 text-xl font-bold border-4 border-neo-dark focus:outline-none focus:shadow-neo transition-shadow placeholder:text-gray-300"
                />
              </div>
            </div>
            <p className="mt-2 text-sm font-bold text-gray-500">
              This will be appended to all <code className="bg-gray-200 px-1 py-0.5 rounded">link.akashshanmugaraj.com</code> URLs.
            </p>
          </div>

          {/* Action Button */}
          <button
            onClick={processPdf}
            disabled={!file || !tag || isProcessing}
            className={cn(
              "w-full py-4 text-2xl font-black uppercase tracking-widest border-4 border-neo-dark shadow-neo transition-all active:shadow-neo-active active:translate-x-1 active:translate-y-1 flex items-center justify-center gap-3",
              !file || !tag ? "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none translate-x-1 translate-y-1" : "bg-neo-primary hover:-translate-y-1 hover:shadow-neo-lg"
            )}
          >
            {isProcessing ? (
              <>
                <RefreshCw className="animate-spin w-8 h-8" />
                Processing...
              </>
            ) : (
              <>
                <Zap className="w-8 h-8" fill="currentColor" />
                Process Links
              </>
            )}
          </button>

          {/* Error Message */}
          {error && (
            <div className="mt-6 p-4 bg-red-100 border-4 border-red-500 text-red-700 font-bold flex items-center gap-3 animate-in slide-in-from-top-2">
              <AlertCircle className="w-6 h-6 flex-shrink-0" />
              {error}
            </div>
          )}
        </div>

        {/* Results Section */}
        {processedPdfBytes && stats && (
          <div className="bg-neo-secondary border-4 border-neo-dark shadow-neo-lg p-8 text-white animate-in slide-in-from-bottom-4">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-3xl font-black mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-8 h-8" />
                  Success!
                </h2>
                <p className="font-bold text-lg opacity-90">
                  Updated {stats.updated} links out of {stats.total} found.
                </p>
              </div>
            </div>
            
            <button
              onClick={downloadPdf}
              className="w-full py-4 bg-white text-neo-dark text-xl font-black border-4 border-neo-dark shadow-neo hover:-translate-y-1 hover:shadow-neo-lg active:shadow-neo-active active:translate-x-1 active:translate-y-1 transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-6 h-6" />
              Download Modified Resume
            </button>
          </div>
        )}
      </div>
      
      {/* Footer */}
      <footer className="mt-auto py-8 flex gap-6">
        <a href="https://github.com" target="_blank" rel="noreferrer" className="p-2 bg-white border-2 border-neo-dark shadow-neo-sm hover:shadow-neo hover:-translate-y-1 transition-all">
          <Github className="w-6 h-6" />
        </a>
        <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="p-2 bg-white border-2 border-neo-dark shadow-neo-sm hover:shadow-neo hover:-translate-y-1 transition-all">
          <Linkedin className="w-6 h-6" />
        </a>
        <a href="https://link.akashshanmugaraj.com" target="_blank" rel="noreferrer" className="p-2 bg-white border-2 border-neo-dark shadow-neo-sm hover:shadow-neo hover:-translate-y-1 transition-all">
          <LinkIcon className="w-6 h-6" />
        </a>
      </footer>
    </div>
  );
}

export default App;
