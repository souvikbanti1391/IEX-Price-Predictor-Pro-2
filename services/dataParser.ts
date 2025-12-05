import * as XLSX from 'xlsx';
import { IEXDataPoint } from '../types';

export const parseFile = async (file: File): Promise<IEXDataPoint[]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                if (!e.target?.result) throw new Error("File reading failed");
                const data = new Uint8Array(e.target.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];
                
                const parsedData = parseIEXRows(jsonData);
                resolve(parsedData);
            } catch (error) {
                reject(error);
            }
        };
        
        reader.onerror = (err) => reject(err);
        reader.readAsArrayBuffer(file);
    });
};

const parseIEXRows = (rawData: any[][]): IEXDataPoint[] => {
    // 1. Locate Header Row
    let headerIndex = -1;
    for (let i = 0; i < Math.min(20, rawData.length); i++) {
        const row = rawData[i];
        if (row.some(cell => String(cell).includes('Date')) && 
            row.some(cell => String(cell).includes('MCP'))) {
            headerIndex = i;
            break;
        }
    }

    if (headerIndex === -1) {
        throw new Error('Could not find header row (Must contain "Date" and "MCP")');
    }

    const headers = rawData[headerIndex];
    const dataRows = rawData.slice(headerIndex + 1);

    // 2. Map Columns
    const dateIdx = headers.findIndex((h: any) => String(h).includes('Date'));
    const timeIdx = headers.findIndex((h: any) => String(h).includes('Time Block'));
    const purchaseIdx = headers.findIndex((h: any) => String(h).includes('Purchase'));
    const sellIdx = headers.findIndex((h: any) => String(h).includes('Sell'));
    const mcvIdx = headers.findIndex((h: any) => String(h).includes('MCV'));
    const mcpIdx = headers.findIndex((h: any) => String(h).includes('MCP'));

    const parsed: IEXDataPoint[] = [];

    for (const row of dataRows) {
        const dateStr = String(row[dateIdx] || '').trim();
        const mcpValue = parseFloat(row[mcpIdx]);

        // Filter out summary rows or empty lines
        if (!dateStr || 
            dateStr.includes('Total') || 
            dateStr.includes('Max') || 
            dateStr.includes('Min') || 
            dateStr.includes('Avg') || 
            isNaN(mcpValue)) {
            continue;
        }

        // Feature Extraction
        const [day, month, year] = dateStr.split('-').map(Number);
        const dateObj = new Date(year, month - 1, day); // Note: Month is 0-indexed in JS Date
        
        // Correct 2-digit year handling if necessary (though usually IEX provides full year)
        if (dateObj.getFullYear() < 1900) {
            dateObj.setFullYear(dateObj.getFullYear() + 2000);
        }

        const timeBlockStr = String(row[timeIdx] || '');
        const startTimeStr = timeBlockStr.split('-')[0].trim();
        const [hours, minutes] = startTimeStr.split(':').map(Number);

        const dayOfWeek = dateObj.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

        // Season Logic
        let season: 'winter' | 'spring' | 'summer' | 'monsoon';
        if (month >= 12 || month <= 2) season = 'winter';
        else if (month >= 3 && month <= 5) season = 'spring';
        else if (month >= 6 && month <= 8) season = 'summer';
        else season = 'monsoon';

        // Time of Day Logic
        let timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
        if (hours >= 6 && hours < 12) timeOfDay = 'morning';
        else if (hours >= 12 && hours < 18) timeOfDay = 'afternoon';
        else if (hours >= 18 && hours < 22) timeOfDay = 'evening';
        else timeOfDay = 'night';

        parsed.push({
            date: dateStr,
            dateObj,
            timeBlock: timeBlockStr,
            purchaseBid: parseFloat(row[purchaseIdx]) || 0,
            sellBid: parseFloat(row[sellIdx]) || 0,
            mcv: parseFloat(row[mcvIdx]) || 0,
            mcpMWh: mcpValue,
            mcpKWh: mcpValue / 1000,
            hour: hours || 0,
            minute: minutes || 0,
            dayOfWeek,
            isWeekend,
            season,
            timeOfDay
        });
    }

    return parsed;
};