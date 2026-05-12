export type OrderStatus = 'pending' | 'accepted' | 'picked_up' | 'on_way' | 'delivered' | 'cancelled';

export interface Order {
  id: string;
  clientId: string;
  storeId: string;
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
  createdAt: any; // Can be string or Firestore Timestamp
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
