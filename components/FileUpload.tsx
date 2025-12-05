import React, { useRef, useState } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle } from 'lucide-react';
import { parseFile } from '../services/dataParser';
import { IEXDataPoint } from '../types';

interface FileUploadProps {
    onDataLoaded: (data: IEXDataPoint[], fileName: string) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onDataLoaded }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [fileName, setFileName] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const processFile = async (file: File) => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await parseFile(file);
            setFileName(file.name);
            onDataLoaded(data, file.name);
        } catch (err: any) {
            setError(err.message || 'Failed to parse file');
            setFileName(null);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) processFile(file);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) processFile(file);
    };

    return (
        <div className="w-full">
            <div 
                className={`relative border border-dashed rounded-xl p-8 transition-all duration-300 cursor-pointer overflow-hidden group
                    ${isDragging 
                        ? 'border-blue-500 bg-blue-500/10' 
                        : 'border-zinc-700 bg-zinc-950 hover:border-zinc-600 hover:bg-zinc-900'}
                    ${fileName ? 'bg-zinc-950/50 border-emerald-500/30' : ''}
                `}
                onClick={() => !fileName && fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept=".xlsx,.xls,.csv" 
                    onChange={handleFileSelect} 
                />

                <div className="flex flex-col items-center justify-center text-center">
                    {isLoading ? (
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                    ) : fileName ? (
                        <>
                            <div className="bg-emerald-500/10 p-4 rounded-full mb-4 ring-1 ring-emerald-500/20">
                                <CheckCircle className="w-8 h-8 text-emerald-400" />
                            </div>
                            <h3 className="text-xl font-semibold text-zinc-100 mb-2">File Loaded Successfully</h3>
                            <p className="text-zinc-400 font-medium">{fileName}</p>
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setFileName(null);
                                    if (fileInputRef.current) fileInputRef.current.value = '';
                                }}
                                className="mt-4 text-sm text-red-400 hover:text-red-300 underline z-10 relative"
                            >
                                Remove file
                            </button>
                        </>
                    ) : (
                        <>
                            <div className={`p-4 rounded-full mb-4 transition-colors ${isDragging ? 'bg-blue-500/20' : 'bg-zinc-800 group-hover:bg-zinc-700'}`}>
                                <Upload className={`w-8 h-8 ${isDragging ? 'text-blue-400' : 'text-blue-500'}`} />
                            </div>
                            <h3 className="text-lg font-semibold text-zinc-100 mb-2">
                                Upload Market Data
                            </h3>
                            <p className="text-zinc-400 mb-6 max-w-md text-sm leading-relaxed">
                                Drag and drop your IEX Excel/CSV file here. <br/>
                                <span className="opacity-50">Requires Date, Time Block, and MCP columns.</span>
                            </p>
                            <div className="flex gap-3 text-[10px] text-zinc-500 uppercase font-bold tracking-widest">
                                <span className="flex items-center gap-1 bg-zinc-800 px-2 py-1 rounded"><FileSpreadsheet size={12} /> .XLSX</span>
                                <span className="flex items-center gap-1 bg-zinc-800 px-2 py-1 rounded"><FileSpreadsheet size={12} /> .CSV</span>
                            </div>
                        </>
                    )}
                </div>

                {error && (
                    <div className="absolute inset-x-0 bottom-0 bg-red-950/30 backdrop-blur-sm p-3 text-center text-red-400 text-sm font-medium border-t border-red-900/50 flex items-center justify-center gap-2">
                        <AlertCircle size={16} />
                        {error}
                    </div>
                )}
            </div>
        </div>
    );
};

export default FileUpload;