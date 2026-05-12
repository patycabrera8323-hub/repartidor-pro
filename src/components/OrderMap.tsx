import { useEffect, useRef, useState } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { Order } from '../types';

const API_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || '';

interface OrderMapProps {
  order: Order;
  driverLocation?: { lat: number, lng: number };
}

function RouteDisplay({ origin, destination }: {
  origin: google.maps.LatLngLiteral;
  destination: google.maps.LatLngLiteral;
}) {
  const map = useMap();
  const routesLib = useMapsLibrary('routes');
  const polylinesRef = useRef<google.maps.Polyline[]>([]);

  useEffect(() => {
    if (!routesLib || !map || !origin || !destination) return;
    
    // Clear previous route
    polylinesRef.current.forEach(p => p.setMap(null));

    routesLib.Route.computeRoutes({
      origin,
      destination,
      travelMode: 'DRIVING' as any,
      fields: ['path', 'viewport'],
    }).then(({ routes }) => {
      if (routes?.[0]) {
        const newPolylines = routes[0].createPolylines();
        newPolylines.forEach(p => {
          p.setOptions({
            strokeColor: '#10b981', // emerald-500
            strokeWeight: 6,
            strokeOpacity: 0.8
          });
          p.setMap(map);
        });
        polylinesRef.current = newPolylines;
        if (routes[0].viewport) map.fitBounds(routes[0].viewport, 50);
      }
    }).catch(err => console.error("Error computing route", err));

    return () => polylinesRef.current.forEach(p => p.setMap(null));
  }, [routesLib, map, origin.lat, origin.lng, destination.lat, destination.lng]);

  return null;
}

export default function OrderMap({ order, driverLocation }: OrderMapProps) {
  const [center] = useState(order.deliveryLocation);

  if (!API_KEY) {
    return (
      <div className="w-full h-48 bg-neutral-900 rounded-2xl border border-neutral-800 flex items-center justify-center p-6 text-center">
        <p className="text-neutral-500 text-sm italic">Mapa desactivado: Falta GOOGLE_MAPS_PLATFORM_KEY</p>
      </div>
    );
  }

  return (
    <div className="w-full h-64 bg-neutral-900 rounded-2xl border border-neutral-800 overflow-hidden relative">
      <APIProvider apiKey={API_KEY} version="weekly">
        <Map
          defaultCenter={center}
          defaultZoom={15}
          mapId="DRIVER_APP_MAP"
          disableDefaultUI={true}
          style={{ width: '100%', height: '100%' }}
          gestureHandling={'greedy'}
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          styles={[
            {
              "elementType": "geometry",
              "stylers": [{ "color": "#242f3e" }]
            },
            {
              "elementType": "labels.text.fill",
              "stylers": [{ "color": "#746855" }]
            },
            {
              "elementType": "labels.text.stroke",
              "stylers": [{ "color": "#242f3e" }]
            },
            {
              "featureType": "administrative.locality",
              "elementType": "labels.text.fill",
              "stylers": [{ "color": "#d59563" }]
            },
            {
              "featureType": "poi",
              "elementType": "labels.text.fill",
              "stylers": [{ "color": "#d59563" }]
            },
            {
              "featureType": "poi.park",
              "elementType": "geometry",
              "stylers": [{ "color": "#263c3f" }]
            },
            {
              "featureType": "road",
              "elementType": "geometry",
              "stylers": [{ "color": "#38414e" }]
            },
            {
              "featureType": "road",
              "elementType": "geometry.stroke",
              "stylers": [{ "color": "#212a37" }]
            },
            {
              "featureType": "road.highway",
              "elementType": "geometry",
              "stylers": [{ "color": "#746855" }]
            },
            {
              "featureType": "water",
              "elementType": "geometry",
              "stylers": [{ "color": "#17263c" }]
            }
          ]}
        >
          <AdvancedMarker position={order.deliveryLocation} title="Destino">
            <Pin background="#10b981" glyphColor="#000" />
          </AdvancedMarker>

          {driverLocation && (
            <>
              <AdvancedMarker position={driverLocation} title="Tu ubicación">
                <div className="w-8 h-8 bg-blue-500 rounded-full border-4 border-white shadow-xl flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
                </div>
              </AdvancedMarker>
              <RouteDisplay origin={driverLocation} destination={order.deliveryLocation} />
            </>
          )}
        </Map>
      </APIProvider>
    </div>
  );
}
