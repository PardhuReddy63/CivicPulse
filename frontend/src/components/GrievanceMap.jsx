import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CircleMarker,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  AlertTriangle,
  Compass,
  ExternalLink,
  Eye,
  MapPin,
  Navigation,
} from 'lucide-react';

const TILE_URL =
  import.meta.env?.VITE_OSM_TILE_URL || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const DEFAULT_CENTER = [20.5937, 78.9629];

function getCoordinate(value, min, max) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : null;
}

function complaintCoordinates(complaint) {
  const lat = getCoordinate(complaint.latitude, -90, 90);
  const lng = getCoordinate(complaint.longitude, -180, 180);
  return lat === null || lng === null ? null : [lat, lng];
}

function markerColor(status, priority) {
  if (status === 'RESOLVED') return '#10b981';
  if (status === 'ASSIGNED') return '#2563eb';
  if (priority === 'HIGH') return '#f43f5e';
  return '#f59e0b';
}

function MapController({ center, zoom }) {
  const map = useMap();

  useEffect(() => {
    if (center) map.flyTo(center, zoom, { duration: 0.35 });
  }, [center, map, zoom]);

  return null;
}

function ClickHandler({ enabled, onLocationSelect }) {
  useMapEvents({
    click(event) {
      if (enabled) {
        onLocationSelect(event.latlng.lat, event.latlng.lng, 'Map-selected location');
      }
    },
  });

  return null;
}

export const GrievanceMap = ({
  complaints = [],
  selectedComplaintId = null,
  onSelectComplaint,
  selectableLocation = false,
  onLocationSelect,
  initialLat,
  initialLng,
}) => {
  const validComplaints = useMemo(
    () =>
      complaints
        .map((complaint) => ({
          complaint,
          position: complaintCoordinates(complaint),
        }))
        .filter((item) => item.position),
    [complaints]
  );
  const initialCenter = useMemo(() => {
    const lat = getCoordinate(initialLat, -90, 90);
    const lng = getCoordinate(initialLng, -180, 180);
    if (lat !== null && lng !== null) return [lat, lng];
    return validComplaints[0]?.position || DEFAULT_CENTER;
  }, [initialLat, initialLng, validComplaints]);
  const [mapCenter, setMapCenter] = useState(initialCenter);
  const [mapZoom, setMapZoom] = useState(validComplaints.length ? 13 : 5);
  const [pickedCoord, setPickedCoord] = useState(null);
  const [activeComplaintId, setActiveComplaintId] = useState(null);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState('');
  const [latitudeInput, setLatitudeInput] = useState('');
  const [longitudeInput, setLongitudeInput] = useState('');

  useEffect(() => {
    if (selectedComplaintId === null) return;
    const selected = validComplaints.find(
      ({ complaint }) => String(complaint.complaint_id) === String(selectedComplaintId)
    );
    if (selected) {
      setActiveComplaintId(selected.complaint.complaint_id);
      setMapCenter(selected.position);
      setMapZoom(15);
    }
  }, [selectedComplaintId, validComplaints]);

  const selectLocation = useCallback(
    (lat, lng, label = 'Map-selected location') => {
      const parsedLat = getCoordinate(lat, -90, 90);
      const parsedLng = getCoordinate(lng, -180, 180);
      if (parsedLat === null || parsedLng === null) {
        setGeoError('Enter a valid latitude (-90 to 90) and longitude (-180 to 180).');
        return;
      }
      const coords = [parsedLat, parsedLng];
      setPickedCoord(coords);
      setMapCenter(coords);
      setMapZoom(16);
      setGeoError('');
      onLocationSelect?.(parsedLat, parsedLng, label);
    },
    [onLocationSelect]
  );

  const handleUseCurrentLocation = () => {
    setGeoError('');
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported. Enter coordinates or select a point on the map.');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocating(false);
        selectLocation(coords.latitude, coords.longitude, 'Device location');
      },
      (error) => {
        setLocating(false);
        const message =
          error.code === 1
            ? 'Location permission denied. Enter coordinates or select a point on the map.'
            : error.code === 2
              ? 'Device location is unavailable. Enter coordinates or select a point on the map.'
              : 'Location request timed out. Enter coordinates or select a point on the map.';
        setGeoError(message);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleCoordinateSubmit = (event) => {
    event.preventDefault();
    selectLocation(latitudeInput, longitudeInput, 'Manually entered coordinates');
  };

  return (
    <div className="relative flex w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {geoError && (
        <div role="alert" className="flex items-center gap-2 border-b border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-800">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{geoError}</span>
        </div>
      )}

      <div className="z-10 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-2.5">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
          <Navigation className="h-4 w-4 text-blue-600" />
          <span>Civic GIS Map</span>
          <span className="text-[10px] font-medium text-slate-400">
            ({validComplaints.length} plotted complaint{validComplaints.length === 1 ? '' : 's'})
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {selectableLocation && (
            <>
              <form onSubmit={handleCoordinateSubmit} className="flex items-center gap-1">
                <input
                  aria-label="Latitude"
                  inputMode="decimal"
                  value={latitudeInput}
                  onChange={(event) => setLatitudeInput(event.target.value)}
                  placeholder="Latitude"
                  className="w-24 rounded-lg border border-slate-300 px-2 py-1 text-xs"
                />
                <input
                  aria-label="Longitude"
                  inputMode="decimal"
                  value={longitudeInput}
                  onChange={(event) => setLongitudeInput(event.target.value)}
                  placeholder="Longitude"
                  className="w-24 rounded-lg border border-slate-300 px-2 py-1 text-xs"
                />
                <button className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200">
                  Set
                </button>
              </form>
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={locating}
                className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
              >
                <Compass className={`h-3.5 w-3.5 ${locating ? 'animate-spin' : ''}`} />
                {locating ? 'Locating...' : 'Use my location'}
              </button>
            </>
          )}
        </div>
      </div>

      {selectableLocation && (
        <div className="z-10 flex flex-wrap items-center justify-between gap-2 bg-blue-600 px-4 py-1.5 text-xs font-medium text-white">
          <span>Select a point on the map, enter coordinates, or request device location.</span>
          {pickedCoord && (
            <span className="font-mono">
              {pickedCoord[0].toFixed(6)}, {pickedCoord[1].toFixed(6)}
            </span>
          )}
        </div>
      )}

      <div className="relative h-80 w-full bg-slate-100 sm:h-96">
        <MapContainer
          center={initialCenter}
          zoom={validComplaints.length ? 13 : 5}
          scrollWheelZoom
          className="h-full w-full"
        >
          <TileLayer
            url={TILE_URL}
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <MapController center={mapCenter} zoom={mapZoom} />
          <ClickHandler enabled={selectableLocation} onLocationSelect={selectLocation} />

          {selectableLocation && pickedCoord && (
            <CircleMarker
              center={pickedCoord}
              radius={9}
              pathOptions={{ color: '#9f1239', fillColor: '#e11d48', fillOpacity: 1 }}
            >
              <Popup>Selected complaint location</Popup>
            </CircleMarker>
          )}

          {validComplaints.map(({ complaint, position }) => {
            const color = markerColor(complaint.status, complaint.priority);
            const icon = L.divIcon({
              className: 'civicpulse-map-marker',
              html: `<span style="background:${color};border:2px solid white;width:18px;height:18px;border-radius:50%;display:block;box-shadow:0 1px 5px #334155"></span>`,
              iconSize: [18, 18],
              iconAnchor: [9, 9],
            });
            return (
              <Marker
                key={complaint.complaint_id}
                position={position}
                icon={icon}
                eventHandlers={{
                  click: () => setActiveComplaintId(complaint.complaint_id),
                }}
              >
                {String(activeComplaintId) === String(complaint.complaint_id) && (
                  <Popup
                    eventHandlers={{
                      remove: () => setActiveComplaintId(null),
                    }}
                  >
                    <div className="max-w-xs text-slate-900">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-bold">
                          #{complaint.complaint_id}
                        </span>
                        <span className="text-[10px] font-bold">{complaint.status}</span>
                      </div>
                      <h4 className="mb-1 text-xs font-bold">{complaint.title}</h4>
                      <div className="mb-1 text-[11px] font-semibold text-blue-600">{complaint.category}</div>
                      <div className="mb-2 flex items-start gap-1 text-[11px] text-slate-500">
                        <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-rose-500" />
                        <span>{complaint.location || 'Address not provided'}</span>
                      </div>
                      <div className="flex items-center gap-2 border-t border-slate-100 pt-2">
                        {onSelectComplaint && (
                          <button
                            type="button"
                            onClick={() => onSelectComplaint(complaint)}
                            className="flex items-center gap-1 rounded-lg bg-blue-600 px-2 py-1 text-[11px] font-bold text-white"
                          >
                            <Eye className="h-3 w-3" />
                            Details
                          </button>
                        )}
                        <a
                          href={`https://www.openstreetmap.org/directions?to=${position[0]}%2C${position[1]}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Directions
                        </a>
                      </div>
                    </div>
                  </Popup>
                )}
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-white px-4 py-2 text-[11px] text-slate-600">
        <div className="flex flex-wrap items-center gap-3">
          <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-amber-500" />Pending</span>
          <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-blue-600" />Assigned</span>
          <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />Resolved</span>
        </div>
        <span className="text-[10px] text-slate-400">
          Map tiles &copy; OpenStreetMap contributors
        </span>
        {complaints.length > 0 && validComplaints.length === 0 && (
          <span className="w-full text-amber-700">No complaints have valid stored coordinates to display.</span>
        )}
        {complaints.length === 0 && !selectableLocation && (
          <span className="w-full text-slate-400">No complaints with coordinates to display.</span>
        )}
      </div>
    </div>
  );
};
