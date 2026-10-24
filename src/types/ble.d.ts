// Déclarations de types minimales pour l'API Web Bluetooth
// (non incluse dans lib.dom de TypeScript)

interface BleCharacteristicProperties {
  read?: boolean;
  write?: boolean;
  writeWithoutResponse?: boolean;
  notify?: boolean;
  indicate?: boolean;
  broadcast?: boolean;
}

interface BleCharacteristic extends EventTarget {
  readonly uuid: string;
  readonly properties: BleCharacteristicProperties;
  readonly value?: DataView;
  readValue(): Promise<DataView>;
  writeValue?(value: BufferSource): Promise<void>;
  writeValueWithoutResponse?(value: BufferSource): Promise<void>;
  startNotifications(): Promise<BleCharacteristic>;
  stopNotifications(): Promise<BleCharacteristic>;
}

interface BleService {
  readonly uuid: string;
  getCharacteristics(): Promise<BleCharacteristic[]>;
  getCharacteristic(uuid: string | number): Promise<BleCharacteristic>;
}

interface BleServer extends EventTarget {
  readonly connected: boolean;
  connect(): Promise<BleServer>;
  disconnect(): void;
  getPrimaryServices(): Promise<BleService[]>;
  getPrimaryService(uuid: string | number): Promise<BleService>;
}

interface BleDevice extends EventTarget {
  readonly id: string;
  readonly name?: string;
  readonly gatt?: BleServer;
}

interface BleRequestDeviceOptions {
  filters?: Array<{
    services?: Array<string | number>;
    name?: string;
    namePrefix?: string;
  }>;
  optionalServices?: Array<string | number>;
  acceptAllDevices?: boolean;
}

interface Bluetooth {
  requestDevice(options?: BleRequestDeviceOptions): Promise<BleDevice>;
  getDevices?(): Promise<BleDevice[]>;
}

interface Navigator {
  readonly bluetooth?: Bluetooth;
}
