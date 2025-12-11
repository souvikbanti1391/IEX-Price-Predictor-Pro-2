
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

export interface ArbitrageWindow {
    startTime: string;
    endTime: string;
    type: 'CHARGE' | 'DISCHARGE';
    avgPrice: number;
}

export interface ArbitrageDay {
    dateStr: string;
    windows: ArbitrageWindow[];
    dailyMin: number;
    dailyMax: number;
    chargeThreshold: number;
    dischargeThreshold: number;
}

export interface FutureForecast {
    date: Date;
    dateStr: string;
    timeBlock: string;
    price: number;
    upperBound: number;
    lowerBound: number;
}

export interface SimulationResult {
    processedData: IEXDataPoint[];
    modelResults: Record<string, PredictionResult>;
    bestModel: string;
    forecasts: FutureForecast[];
    arbitrageData: ArbitrageDay[];
    dataCharacteristics: {
        volatility: number;
        trend: number;
        dataLength: number;
    };
}

export interface ConfigState {
    plotInterval: number;
    forecastDays: number;
    confidenceLevel: number;
}

export interface BessConfig {
    capacityMW: number;
    durationHours: number; // e.g. 2 hours, 4 hours
    cyclesPerDay: number;
    efficiency: number; // 0.85 to 0.95
    depthOfDischarge: number; // 0.8 to 1.0
    degradationRate: number; // % per year
    capexPerKWh: number; // Cost in INR
    opexPerMWh: number; // Cost in INR
}

export interface FinancialMetrics {
    dailyRevenue: number;
    weeklyRevenue: number;
    annualRevenue: number;
    annualOpex: number;
    netProfit: number;
    roi: number;
    paybackPeriod: number;
    npv: number;
}
