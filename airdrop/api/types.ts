export enum ResponseCode {
  SUCCESS = 1000, // eslint-disable-line no-magic-numbers
  FAILED_THROTTLE,
  FAILED_PARAMS,
  FAILED_INSUFFICIENT, // faucet pool is insufficient balance
  FAILED_OTHER,
}

export interface ResponseBody<T = null> {
  code: ResponseCode;
  message: string;
  data: T;
}

export interface ThrottleData {
  lastClaimTime: number; // timestamp
}

export interface TransferData {
  txHash: string;
}