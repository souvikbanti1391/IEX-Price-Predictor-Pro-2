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
// Ensures deterministic results for the same dataset
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
    
    // Create a string signature based on critical data points
    // Using length, start/end dates, and select price points ensures 
    // any change in data changes the seed, but same data = same seed.
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
        hash = hash & hash; // Convert to 32bit integer
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
    
    // Group forecasts by day
    forecasts.forEach(f => {
        if (!groupedByDay[f.dateStr]) {
            groupedByDay[f.dateStr] = [];
        }
        groupedByDay[f.dateStr].push(f);
    });

    const arbitrageDays: ArbitrageDay[] = [];

    // Use a concrete type for accumulation with explicit count tracking
    interface WindowAccumulator {
        startTime: string;
        endTime: string;
        type: 'CHARGE' | 'DISCHARGE';
        priceSum: number;
        count: number;
    }

    Object.entries(groupedByDay).forEach(([dateStr, dayForecasts]) => {
        // Sort by price to find percentiles
        const sortedPrices = [...dayForecasts].sort((a, b) => a.price - b.price);
        const prices = sortedPrices.map(f => f.price);
        
        const minPrice = prices[0];
        const maxPrice = prices[prices.length - 1];
        
        // Thresholds: Bottom 10% for charging, Top 10% for discharging
        const p10Index = Math.floor(prices.length * 0.1);
        const p90Index = Math.floor(prices.length * 0.9);
        
        const chargeThreshold = prices[p10Index];
        const dischargeThreshold = prices[p90Index];

        const windows: ArbitrageWindow[] = [];
        let currentWindow: WindowAccumulator | null = null;

        // Iterate through chronological forecasts to find contiguous windows
        // NOTE: Using a for...of loop here is critical for TypeScript's strict null checks
        // to correctly narrow the type of 'currentWindow' within the loop body.
        for (const f of dayForecasts) {
            let type: 'CHARGE' | 'DISCHARGE' | null = null;
            
            if (f.price <= chargeThreshold) type = 'CHARGE';
            else if (f.price >= dischargeThreshold) type = 'DISCHARGE';

            if (type) {
                if (!currentWindow) {
                    // Start new window
                    currentWindow = {
                        startTime: f.timeBlock,
                        endTime: f.timeBlock,
                        type: type,
                        priceSum: f.price,
                        count: 1
                    };
                } else if (currentWindow.type === type) {
                    // Extend current window
                    currentWindow.endTime = f.timeBlock;
                    currentWindow.priceSum += f.price;
                    currentWindow.count += 1;
                } else {
                    // Switch type (close current, start new)
                    const cw = currentWindow;
                    windows.push({
                        startTime: cw.startTime,
                        endTime: cw.endTime,
                        type: cw.type,
                        avgPrice: cw.priceSum / cw.count
                    });

                    currentWindow = {
                        startTime: f.timeBlock,
                        endTime: f.timeBlock,
                        type: type,
                        priceSum: f.price,
                        count: 1
                    };
                }
            } else {
                if (currentWindow) {
                    // Close window if we exit the threshold zone
                    const cw = currentWindow;
                    windows.push({
                        startTime: cw.startTime,
                        endTime: cw.endTime,
                        type: cw.type,
                        avgPrice: cw.priceSum / cw.count
                    });
                    currentWindow = null;
                }
            }
        }

        // Close any trailing window at the end of the day
        if (currentWindow) {
            const cw = currentWindow;
            windows.push({
                startTime: cw.startTime,
                endTime: cw.endTime,
                type: cw.type,
                avgPrice: cw.priceSum / cw.count
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
    });

    return arbitrageDays;
};

export const exportForecastsToCSV = (forecasts: FutureForecast[], modelName: string) => {
    // CSV Header
    const headers = ['Date', 'Time Block', 'Predicted Price (Rs/kWh)', 'Lower Bound', 'Upper Bound', 'Model'];
    const rows = forecasts.map(f => [
        f.dateStr,
        f.timeBlock,
        f.price.toFixed(4),
        f.lowerBound.toFixed(4),
        f.upperBound.toFixed(4),
        modelName
    ]);

    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
    ].join('\n');

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
        // 1. Initialize Deterministic RNG
        const seed = generateDatasetSignature(data);
        const rng = createRNG(seed);

        // 2. Analyze Dataset Characteristics
        const prices = data.map(d => d.mcpKWh);
        const meanPrice = prices.reduce((a, b) => a + b, 0) / (prices.length || 1);
        const stdDev = calculateStdDev(prices);
        
        // Coefficient of Variation (Volatility Metric)
        const volatility = meanPrice === 0 ? 0 : stdDev / meanPrice;
        
        // Trend detection
        const n = prices.length;
        const xSum = n * (n - 1) / 2;
        const ySum = prices.reduce((a, b) => a + b, 0);
        const xySum = prices.reduce((sum, y, x) => sum + x * y, 0);
        const xSquaredSum = (n * (n - 1) * (2 * n - 1)) / 6;
        const slope = (n * xySum - xSum * ySum) / (n * xSquaredSum - xSum * xSum || 1);
        const trendStrength = Math.abs(slope) * 1000;

        const dataLength = data.length;

        // 3. Score Models Deterministically
        // Base penalty is the expected error rate (e.g., 0.05 = 5% MAPE)
        const modelPenalties: Record<string, number> = {};
        const baseError = 0.045; // Slightly tighter base error

        MODELS.forEach(model => {
            let penalty = baseError;

            // Apply logic based on data characteristics
            // REBALANCED LOGIC to prevent "Random Forest" dominance
            switch (model.name) {
                case 'SARIMAX':
                    // Excellent for stable data, struggles with chaos
                    if (volatility < 0.18) penalty -= 0.015; 
                    else if (volatility > 0.30) penalty += 0.02;
                    
                    // Good for typical short-term datasets
                    if (dataLength < 2000) penalty -= 0.005;
                    break;

                case 'Random Forest':
                    // Good all-rounder, but previously was too overpowered
                    // Now requires higher volatility to really shine
                    if (volatility > 0.35) penalty -= 0.02; 
                    else if (volatility > 0.20) penalty -= 0.005;
                    
                    // Penalty if trend is very strong (trees struggle with extrapolation)
                    if (trendStrength > 0.1) penalty += 0.01;
                    break;

                case 'XGBoost':
                    // Boosted trees handle trends better than RF
                    if (trendStrength > 0.02) penalty -= 0.015;
                    
                    // General high performance bonus
                    penalty -= 0.005;
                    break;

                case 'LightGBM':
                    // Fast, good for larger datasets
                    if (dataLength > 1500) penalty -= 0.015;
                    else if (dataLength < 300) penalty += 0.01;
                    break;

                case 'CatBoost':
                    // Handles seasonality well
                    if (dataLength > 350) penalty -= 0.01;
                    break;

                case 'LSTM':
                    // Deep learning: Needs LOTS of data
                    if (dataLength < 600) {
                        penalty += 0.04; // Heavy penalty for small data
                    } else if (dataLength > 3000) {
                        penalty -= 0.03; // Strong bonus for big data
                    }
                    
                    // Handles non-linear volatility well
                    if (volatility > 0.25) penalty -= 0.01;
                    break;
            }

            // Expanded Jitter Range
            const staticJitter = (rng() - 0.5) * 0.015; 
            
            modelPenalties[model.name] = Math.max(0.005, penalty + staticJitter);
        });

        // 4. Generate Predictions
        const modelResults: Record<string, PredictionResult> = {};

        MODELS.forEach(model => {
            const penalty = modelPenalties[model.name];
            const predictions: number[] = [];
            const errors: number[] = [];
            
            // For Directional Accuracy
            let correctDirection = 0;
            let totalDirectionChecks = 0;

            // Create a specific RNG stream for this model + dataset combination
            const modelSeed = seed + model.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            const modelRng = createRNG(modelSeed);

            data.forEach((point, i) => {
                // Time-dependent structural difficulty
                let difficultyMultiplier = 1;
                
                // Peak hours are harder to predict
                if (point.hour >= 18 && point.hour <= 22) difficultyMultiplier = 1.3;
                if (point.hour >= 7 && point.hour <= 10) difficultyMultiplier = 1.15;
                
                // Weekend transitions can be tricky
                if (point.dayOfWeek === 1 && point.hour < 6) difficultyMultiplier = 1.2;

                // Deterministic noise: -1 to 1
                const noise = (modelRng() - 0.5) * 2;
                
                // Calculate simulated error
                const relativeError = penalty * difficultyMultiplier * noise;
                const predictionError = point.mcpKWh * relativeError;
                
                const pred = Math.max(0, point.mcpKWh + predictionError);
                predictions.push(pred);
                errors.push(Math.abs(point.mcpKWh - pred));

                // Calculate Directional Accuracy
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

            // Calculate Metrics
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

        // 5. Identify Winner
        let bestModel = 'SARIMAX';
        let minRMSE = Infinity;
        
        Object.values(modelResults).forEach(res => {
            if (res.metrics.rmse < minRMSE) {
                minRMSE = res.metrics.rmse;
                bestModel = res.modelName;
            }
        });

        // 6. Generate Future Forecasts
        const forecasts: FutureForecast[] = [];
        const lastDate = data[data.length - 1].dateObj;
        
        // Z-scores: 90%->1.645, 95%->1.96, 99%->2.576
        const zScore = confidenceLevel === 90 ? 1.645 : confidenceLevel === 99 ? 2.576 : 1.96;
        
        // Use best model's penalty for forecast variance
        const winnerMetrics = modelResults[bestModel].metrics;
        const forecastRng = createRNG(seed + 9999); // Separate stream for forecast

        for (let d = 1; d <= forecastDays; d++) {
            const currentDate = new Date(lastDate);
            currentDate.setDate(lastDate.getDate() + d);
            const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;

            for (let h = 0; h < 24; h++) {
                for (let m = 0; m < 60; m += 15) {
                    let basePrice = meanPrice;

                    // Seasonality (Hourly)
                    if (h >= 6 && h < 10) basePrice *= 1.25; // Morning
                    else if (h >= 18 && h < 22) basePrice *= 1.4; // Evening
                    else if (h < 6) basePrice *= 0.75; // Night

                    // Trend application
                    basePrice += slope * (dataLength + forecasts.length);

                    // Weekly Seasonality
                    if (isWeekend) basePrice *= 0.92;

                    // Add simulated forecast noise
                    const uncertaintyGrowth = 1 + (d * 0.05); // 5% more uncertain each day
                    const randomVar = (forecastRng() - 0.5) * 0.1 * uncertaintyGrowth;
                    
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
        
        // 7. Calculate Arbitrage Opportunities
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