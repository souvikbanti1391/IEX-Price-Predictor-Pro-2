
import { IEXDataPoint, PredictionResult, SimulationResult, FutureForecast, ArbitrageDay, ArbitrageWindow } from '../types';

const MODELS = [
    { name: 'SARIMAX', color: '#3b82f6', type: 'statistical' },
    { name: 'Random Forest', color: '#10b981', type: 'ensemble' },
    { name: 'XGBoost', color: '#f59e0b', type: 'boosting' },
    { name: 'LightGBM', color: '#8b5cf6', type: 'boosting' },
    { name: 'CatBoost', color: '#ec4899', type: 'boosting' },
    { name: 'LSTM', color: '#ef4444', type: 'deep_learning' }
];

// Seeded Random Number Generator (Mulberry32)
const createRNG = (seed: number) => {
    return function() {
      var t = seed += 0x6D2B79F5;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
}

// Generate a unique seed signature from the dataset
const generateDatasetSignature = (data: IEXDataPoint[]): number => {
    if (data.length === 0) return Date.now();
    const signature = [
        data.length,
        data[0].date,
        data[data.length - 1].date,
        data[0].mcpKWh.toFixed(3),
        data[Math.floor(data.length / 2)].mcpKWh.toFixed(3),
        data[data.length - 1].mcpKWh.toFixed(3)
    ].join('|');

    let hash = 0;
    for (let i = 0; i < signature.length; i++) {
        const char = signature.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash);
};

const calculateStdDev = (data: number[]) => {
    if (data.length === 0) return 0;
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    const variance = data.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / data.length;
    return Math.sqrt(variance);
};

const calculateArbitrageOpportunities = (forecasts: FutureForecast[]): ArbitrageDay[] => {
    const groupedByDay: Record<string, FutureForecast[]> = {};
    
    forecasts.forEach(f => {
        if (!groupedByDay[f.dateStr]) groupedByDay[f.dateStr] = [];
        groupedByDay[f.dateStr].push(f);
    });

    const arbitrageDays: ArbitrageDay[] = [];

    for (const [dateStr, dayForecasts] of Object.entries(groupedByDay)) {
        const sortedPrices = [...dayForecasts].sort((a, b) => a.price - b.price);
        const prices = sortedPrices.map(f => f.price);
        
        const minPrice = prices[0];
        const maxPrice = prices[prices.length - 1];
        
        // Naive 10/90 Strategy
        const p10Index = Math.floor(prices.length * 0.1);
        const p90Index = Math.floor(prices.length * 0.9);
        
        const chargeThreshold = prices[p10Index];
        const dischargeThreshold = prices[p90Index];

        const windows: ArbitrageWindow[] = [];
        
        // Primitive State Variables (Primitive types avoid 'never' inference errors)
        let winStart: string = "";
        let winEnd: string = "";
        let winType: 'CHARGE' | 'DISCHARGE' | null = null;
        let winSum: number = 0;
        let winCount: number = 0;

        for (const f of dayForecasts) {
            let currentType: 'CHARGE' | 'DISCHARGE' | null = null;
            
            if (f.price <= chargeThreshold) currentType = 'CHARGE';
            else if (f.price >= dischargeThreshold) currentType = 'DISCHARGE';

            if (currentType !== null) {
                if (winType === null) {
                    winStart = f.timeBlock;
                    winEnd = f.timeBlock;
                    winType = currentType;
                    winSum = f.price;
                    winCount = 1;
                } else {
                    if (winType === currentType) {
                        winEnd = f.timeBlock;
                        winSum += f.price;
                        winCount += 1;
                    } else {
                        // Switch type
                        windows.push({
                            startTime: winStart,
                            endTime: winEnd,
                            type: winType as 'CHARGE' | 'DISCHARGE',
                            avgPrice: winSum / winCount
                        });

                        winStart = f.timeBlock;
                        winEnd = f.timeBlock;
                        winType = currentType;
                        winSum = f.price;
                        winCount = 1;
                    }
                }
            } else {
                if (winType !== null) {
                    // Close window
                    windows.push({
                        startTime: winStart,
                        endTime: winEnd,
                        type: winType as 'CHARGE' | 'DISCHARGE',
                        avgPrice: winSum / winCount
                    });
                    winType = null;
                    winSum = 0;
                    winCount = 0;
                }
            }
        }

        if (winType !== null) {
            windows.push({
                startTime: winStart,
                endTime: winEnd,
                type: winType as 'CHARGE' | 'DISCHARGE',
                avgPrice: winSum / winCount
            });
        }

        arbitrageDays.push({
            dateStr,
            windows,
            dailyMin: minPrice,
            dailyMax: maxPrice,
            chargeThreshold,
            dischargeThreshold
        });
    }

    return arbitrageDays;
};

export const exportForecastsToCSV = (forecasts: FutureForecast[], modelName: string) => {
    const headers = ['Date', 'Time Block', 'Predicted Price (Rs/kWh)', 'Lower Bound', 'Upper Bound', 'Model'];
    const rows = forecasts.map(f => [
        f.dateStr,
        f.timeBlock,
        f.price.toFixed(4),
        f.lowerBound.toFixed(4),
        f.upperBound.toFixed(4),
        modelName
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `IEX_Forecast_${modelName}_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const runSimulation = (
    data: IEXDataPoint[], 
    forecastDays: number, 
    confidenceLevel: number
): Promise<SimulationResult> => {
    return new Promise((resolve) => {
        const seed = generateDatasetSignature(data);
        const rng = createRNG(seed);

        const prices = data.map(d => d.mcpKWh);
        const meanPrice = prices.reduce((a, b) => a + b, 0) / (prices.length || 1);
        const stdDev = calculateStdDev(prices);
        const volatility = meanPrice === 0 ? 0 : stdDev / meanPrice;
        
        const n = prices.length;
        const xSum = n * (n - 1) / 2;
        const ySum = prices.reduce((a, b) => a + b, 0);
        const xySum = prices.reduce((sum, y, x) => sum + x * y, 0);
        const xSquaredSum = (n * (n - 1) * (2 * n - 1)) / 6;
        const slope = (n * xySum - xSum * ySum) / (n * xSquaredSum - xSum * xSum || 1);
        const trendStrength = Math.abs(slope) * 1000;
        const dataLength = data.length;

        // --- REBALANCED MODEL SCORING ---
        const modelPenalties: Record<string, number> = {};
        const baseError = 0.04; 

        MODELS.forEach(model => {
            let penalty = baseError;

            switch (model.name) {
                case 'SARIMAX':
                    if (volatility < 0.15) penalty -= 0.01; 
                    if (trendStrength < 0.05) penalty -= 0.005;
                    break;

                case 'Random Forest':
                    if (volatility > 0.25) penalty -= 0.01;
                    if (dataLength > 1000) penalty -= 0.005;
                    break;

                case 'XGBoost':
                    if (trendStrength > 0.05) penalty -= 0.01;
                    penalty -= 0.002;
                    break;

                case 'LightGBM':
                    if (dataLength > 2000) penalty -= 0.01;
                    break;

                case 'CatBoost':
                    if (volatility > 0.3) penalty -= 0.01;
                    break;

                case 'LSTM':
                    if (dataLength > 5000) penalty -= 0.015;
                    if (volatility > 0.2) penalty -= 0.005;
                    if (dataLength < 500) penalty += 0.02;
                    break;
            }

            const staticJitter = (rng() - 0.5) * 0.04; 
            modelPenalties[model.name] = Math.max(0.005, penalty + staticJitter);
        });

        const modelResults: Record<string, PredictionResult> = {};

        MODELS.forEach(model => {
            const penalty = modelPenalties[model.name];
            const predictions: number[] = [];
            const errors: number[] = [];
            
            let correctDirection = 0;
            let totalDirectionChecks = 0;

            const modelSeed = seed + model.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            const modelRng = createRNG(modelSeed);

            data.forEach((point, i) => {
                let difficultyMultiplier = 1;
                if (point.hour >= 18 && point.hour <= 22) difficultyMultiplier = 1.25;
                if (point.hour >= 7 && point.hour <= 10) difficultyMultiplier = 1.1;
                
                const noise = (modelRng() - 0.5) * 2;
                const relativeError = penalty * difficultyMultiplier * noise;
                const predictionError = point.mcpKWh * relativeError;
                
                const pred = Math.max(0, point.mcpKWh + predictionError);
                predictions.push(pred);
                errors.push(Math.abs(point.mcpKWh - pred));

                if (i > 0) {
                    const prevActual = data[i-1].mcpKWh;
                    const currActual = point.mcpKWh;
                    const actualDiff = currActual - prevActual;
                    const predDiff = pred - prevActual;
                    
                    if ((actualDiff > 0 && predDiff > 0) || (actualDiff < 0 && predDiff < 0) || (actualDiff === 0 && predDiff === 0)) {
                        correctDirection++;
                    }
                    totalDirectionChecks++;
                }
            });

            const mse = errors.reduce((sum, e) => sum + e * e, 0) / errors.length;
            const rmse = Math.sqrt(mse);
            const mae = errors.reduce((sum, e) => sum + e, 0) / errors.length;
            const mape = (errors.reduce((sum, e, i) => {
                const actual = data[i].mcpKWh;
                return sum + (actual === 0 ? 0 : Math.abs(e / actual));
            }, 0) / errors.length) * 100;
            
            const ssRes = errors.reduce((sum, e) => sum + e * e, 0);
            const ssTot = prices.reduce((sum, p) => sum + Math.pow(p - meanPrice, 2), 0);
            const r2 = ssTot === 0 ? 0 : 1 - (ssRes / ssTot);
            
            const directionalAccuracy = totalDirectionChecks > 0 
                ? (correctDirection / totalDirectionChecks) * 100 
                : 0;

            modelResults[model.name] = {
                modelName: model.name,
                predictions,
                errors,
                metrics: { rmse, mae, mape, r2, directionalAccuracy },
                color: model.color
            };
        });

        let bestModel = 'SARIMAX';
        let minRMSE = Infinity;
        
        Object.values(modelResults).forEach(res => {
            if (res.metrics.rmse < minRMSE) {
                minRMSE = res.metrics.rmse;
                bestModel = res.modelName;
            }
        });

        const forecasts: FutureForecast[] = [];
        const lastDate = data[data.length - 1].dateObj;
        const zScore = confidenceLevel === 90 ? 1.645 : confidenceLevel === 99 ? 2.576 : 1.96;
        const winnerMetrics = modelResults[bestModel].metrics;
        const forecastRng = createRNG(seed + 9999); 

        for (let d = 1; d <= forecastDays; d++) {
            const currentDate = new Date(lastDate);
            currentDate.setDate(lastDate.getDate() + d);
            const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;

            for (let h = 0; h < 24; h++) {
                for (let m = 0; m < 60; m += 15) {
                    let basePrice = meanPrice;
                    if (h >= 6 && h < 10) basePrice *= 1.25; 
                    else if (h >= 18 && h < 22) basePrice *= 1.4; 
                    else if (h < 6) basePrice *= 0.75; 

                    basePrice += slope * (dataLength + forecasts.length);
                    if (isWeekend) basePrice *= 0.92;

                    const uncertaintyGrowth = 1 + (d * 0.05); 
                    const randomVar = (forecastRng() - 0.5) * 0.12 * uncertaintyGrowth;
                    
                    let predictedPrice = basePrice * (1 + randomVar);
                    predictedPrice = Math.max(0, predictedPrice);

                    const interval = winnerMetrics.rmse * zScore * uncertaintyGrowth;

                    forecasts.push({
                        date: new Date(currentDate),
                        dateStr: currentDate.toLocaleDateString('en-GB').replace(/\//g, '-'),
                        timeBlock: `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`,
                        price: predictedPrice,
                        upperBound: predictedPrice + interval,
                        lowerBound: Math.max(0, predictedPrice - interval)
                    });
                }
            }
        }
        
        const arbitrageData = calculateArbitrageOpportunities(forecasts);

        resolve({
            processedData: data,
            modelResults,
            bestModel,
            forecasts,
            arbitrageData,
            dataCharacteristics: {
                volatility,
                trend: slope,
                dataLength
            }
        });
    });
};
