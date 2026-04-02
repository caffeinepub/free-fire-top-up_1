import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;

export interface TopUpRequest {
    uid: string;
    packageId: string;
    packageName: string;
    amount: bigint;
    paymentMethod: string;
}

export interface TopUpResult {
    success: boolean;
    transactionId: string;
    message: string;
    timestamp: bigint;
}

export interface TopUpRecord {
    id: string;
    uid: string;
    packageId: string;
    packageName: string;
    amount: bigint;
    paymentMethod: string;
    success: boolean;
    transactionId: string;
    message: string;
    timestamp: bigint;
}

export interface ApiConfig {
    isConfigured: boolean;
    provider: string;
}

export interface ManualOrder {
    id: string;
    playerUID: string;
    packageName: string;
    priceNPR: bigint;
    screenshotData: string;
    status: string;
    timestamp: bigint;
}

export interface TopUpOrderInput {
    playerUID: string;
    paymentMethod: string;
    diamondAmount: bigint;
    priceNPR: bigint;
}
export interface TopUpOrder {
    playerUID: string;
    paymentMethod: string;
    diamondAmount: bigint;
    timestamp: bigint;
    priceNPR: bigint;
}
export interface backendInterface {
    processTopUp(request: TopUpRequest): Promise<TopUpResult>;
    getTopUpHistory(): Promise<Array<TopUpRecord>>;
    getApiConfig(): Promise<ApiConfig>;
    setApiConfig(apiKey: string, baseUrl: string, provider: string): Promise<void>;
    submitManualOrder(playerUID: string, packageName: string, priceNPR: bigint, screenshotData: string): Promise<string>;
    getManualOrders(): Promise<Array<ManualOrder>>;
    markOrderCompleted(orderId: string): Promise<boolean>;
    createTopUpOrder(orderInput: TopUpOrderInput): Promise<void>;
    getAllOrders(): Promise<Array<TopUpOrder>>;
}
