export type OrderStatus = 'pending' | 'confirmed' | 'accepted' | 'preparing' | 'ready' | 'on_route' | 'delivered' | 'cancelled' | 'completed';

export interface Order {
  id: string;
  clientId: string;
  clientPhone?: string;
  storeId: string;
  storeName?: string;
  storePhone?: string;
  status: OrderStatus;
  deliveryLocation: {
    address: string;
    lat: number;
    lng: number;
  };
  pickupLocation: {
    address: string;
    lat: number;
    lng: number;
  };
  items: OrderItem[];
  total: number;
  paymentMethod?: 'cash' | 'card';
  notes?: string;
  createdAt: any; 
  acceptedAt?: any;
  deliveredAt?: any;
  driverId?: string;
}

export interface OrderItem {
  name: string;
  price: number;
  quantity?: number;
}

export interface Driver {
  id: string;
  name: string;
  email: string;
  status: 'online' | 'offline' | 'busy';
  currentLocation?: {
    lat: number;
    lng: number;
  };
}
