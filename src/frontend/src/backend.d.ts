import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface TopUpResult {
    message: string;
    timestamp: bigint;
    success: boolean;
    transactionId: string;
}
export interface TopUpRecord {
    id: string;
    uid: string;
    packageName: string;
    paymentMethod: string;
    message: string;
    timestamp: bigint;
    success: boolean;
    amount: bigint;
    packageId: string;
    transactionId: string;
}
export interface ManualOrder {
    id: string;
    playerUID: string;
    packageName: string;
    status: string;
    timestamp: bigint;
    priceNPR: bigint;
    screenshotData: string;
}
export interface ApiConfig {
    provider: string;
    isConfigured: boolean;
}
export interface TopUpRequest {
    uid: string;
    packageName: string;
    paymentMethod: string;
    amount: bigint;
    packageId: string;
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
    createTopUpOrder(orderInput: TopUpOrderInput): Promise<void>;
    getAllOrders(): Promise<Array<TopUpOrder>>;
    getApiConfig(): Promise<ApiConfig>;
    getManualOrders(): Promise<Array<ManualOrder>>;
    getTopUpHistory(): Promise<Array<TopUpRecord>>;
    markOrderCompleted(orderId: string): Promise<boolean>;
    processTopUp(request: TopUpRequest): Promise<TopUpResult>;
    setApiConfig(key: string, baseUrl: string, provider: string): Promise<void>;
    submitManualOrder(playerUID: string, packageName: string, priceNPR: bigint, screenshotData: string): Promise<string>;
}
