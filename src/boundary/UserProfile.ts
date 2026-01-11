// ./src/boundary/UserProfile.ts
export interface UserProfile {
  id: string;
  accountId: string;
  homeCurrency: string;
  distanceIn: string;
  volumeIn: string;
  consumptionIn: string;
  notifyInMileage: number;
  notifyInDays: number;
}
