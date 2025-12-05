export interface IEXDataPoint {
    date: string; // Original string "DD-MM-YYYY"
    dateObj: Date;
    timeBlock: string;
    purchaseBid: number;
    sellBid: number;
    mcv: number;
    mcpMWh: number;
    mcpKWh: number;
    
    // Derived features
    hour: number;
    minute: number;
    dayOfWeek: number;
    isWeekend: boolean;
    season: 'winter' | 'spring' | 'summer' | 'monsoon';
    timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
}

export interface ModelMetrics {
    rmse: number;
    mae: number;
    mape: number;
    r2: number;
    directionalAccuracy: number; // Percentage 0-100
}

export interface PredictionResult {
    modelName: string;
    predictions: number[];
    errors: number[];
    metrics: ModelMetrics;
    color: string;
}

export interface SimulationResult {
    processedData: IEXDataPoint[];
    modelResults: Record<string, PredictionResult>;
    bestModel: string;
    forecasts: FutureForecast[];
    dataCharacteristics: {
        volatility: number;
        trend: number;
        dataLength: number;
    };
}

export interface FutureForecast {
    date: Date;
    dateStr: string;
    timeBlock: string;
    price: number;
    upperBound: number;
    lowerBound: number;
}

export interface ConfigState {
    plotInterval: number;
    forecastDays: number;
    confidenceLevel: number;
}