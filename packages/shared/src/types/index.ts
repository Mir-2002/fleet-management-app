export type UserRole = "CLIENT" | "DRIVER" | "HELPER" | "DISPATCHER";
export type RequestStatus = "PENDING" | "ACCEPTED" | "DISPATCHED" | "COMPLETED" | "CANCELLED";
export type TripStatus = "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type StopType = "PICKUP" | "DROPOFF";
export type CargoHandlingTag = "DRY_GOODS" | "FROZEN" | "FRAGILE" | "PERISHABLE" | "HAZMAT";
export type CargoMeasurementMode = "PER_ITEM" | "WHOLE";

export interface Profile {
  id: string;
  fullName: string;
  role: UserRole;
  contactInfo?: string;
  licenseNumber?: string;
  createdAt?: string;
}

export interface Stop {
  id: string;
  requestId: string;
  sequence: number;
  stopType: StopType;
  address: string;
  contactName?: string;
  contactPhone?: string;
  latitude?: number;
  longitude?: number;
  arrivalTime?: string;
  departureTime?: string;
  createdAt?: string;
}

export interface Request {
  id: string;
  clientId: string;
  status: RequestStatus;
  cargoHandlingTags: CargoHandlingTag[];
  cargoWeight: number;
  cargoLength?: number | null;
  cargoWidth?: number | null;
  cargoHeight?: number | null;
  cargoMeasurementMode: CargoMeasurementMode;
  truckTypeRequested: string;
  scheduledDate: string;
  scheduledTime: string;
  createdAt?: string;
}

export interface Trip {
  id: string;
  requestId: string;
  truckId?: string | null;
  driverId?: string | null;
  helperId?: string | null;
  dispatcherId?: string | null;
  status: TripStatus;
  dispatchedAt?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt?: string;
}

export interface Truck {
  id: string;
  plateNumber: string;
  truckType: string;
  isAvailable: boolean;
  createdAt?: string;
}
