export interface Agent {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  model: string;
  modelOptions: string[];
  latencyThreshold: number;
  isActive: boolean;
  triggerMode: 'auto' | 'manual';
  retryCount?: number;
  template?: string;
  currency?: string;
  vat?: string;
  time?: string;
  recipients?: string[];
  dataSources?: string[];
}

export interface Notification {
  id: string;
  category: string;
  event: string;
  description: string;
  channels: {
    email: boolean;
    push: boolean;
    sms: boolean;
    inApp: boolean;
  };
}

export interface Integration {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  status: 'connected' | 'error' | 'pending' | 'disconnected';
  meta?: string;
  lastSync?: string;
}

export interface Invoice {
  id: string;
  period: string;
  date: string;
  amount: number;
  currency: string;
  status: 'paid' | 'pending';
}

export interface UsageItem {
  name: string;
  used: number;
  total: number;
  percentage: number;
}