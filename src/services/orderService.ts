import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  updateDoc,
  setDoc, 
  query, 
  where, 
  onSnapshot,
  serverTimestamp,
  type DocumentData
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Order, OrderStatus } from '../types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const orderService = {
  getActiveOrders(callback: (orders: Order[]) => void) {
    const q = query(
      collection(db, 'orders'),
      where('status', 'in', ['pending', 'accepted', 'preparing', 'ready', 'on_way', 'delivered'])
    );
    
    return onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      callback(orders);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    });
  },

  async updateOrderStatus(orderId: string, status: OrderStatus, assignDriver: boolean = false) {
    const orderRef = doc(db, 'orders', orderId);
    try {
      const updateData: any = { status };
      
      if (assignDriver) {
        updateData.driverId = auth.currentUser?.uid;
        updateData.acceptedAt = serverTimestamp();
      }
      
      if (status === 'delivered') {
        updateData.deliveredAt = serverTimestamp();
      }
      
      await updateDoc(orderRef, updateData);

      // Notificación al dueño vía ntfy.sh cuando un repartidor toma el pedido
      if (assignDriver) {
        const orderIdShort = orderId.slice(0, 6).toUpperCase();
        fetch(`https://ntfy.sh/repartidor_pro_owner_alerts`, {
          method: 'POST',
          body: `¡Pedido #${orderIdShort} tomado por un repartidor!`,
          headers: { 'Title': 'Repartidor Asignado' }
        }).catch(err => console.error("Error enviando notificación:", err));
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
    }
  },

  async ensureDriverProfile(user: any) {
    if (!user) return;
    const driverRef = doc(db, 'drivers', user.uid);
    try {
      const snap = await getDoc(driverRef);
      if (!snap.exists()) {
        await setDoc(driverRef, {
          name: user.displayName || 'Repartidor',
          email: user.email,
          status: 'online',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error("Error ensuring driver profile:", error);
    }
  },

  async updateDriverLocation(lat: number, lng: number) {
    if (!auth.currentUser) return;
    const driverRef = doc(db, 'drivers', auth.currentUser.uid);
    try {
      await setDoc(driverRef, {
        currentLocation: { lat, lng },
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `drivers/${auth.currentUser.uid}`);
    }
  },

  async getEarnings(driverId: string) {
    const q = query(
      collection(db, 'orders'),
      where('driverId', '==', driverId),
      where('status', '==', 'delivered')
    );
    try {
      const snap = await getDocs(q);
      const total = snap.docs.reduce((acc, doc) => acc + (doc.data().total || 0), 0);
      return total;
    } catch (error) {
      console.error("Error calculating earnings:", error);
      return 0;
    }
  }
};
