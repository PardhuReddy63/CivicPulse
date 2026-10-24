// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GrievanceMap } from '../../src/components/GrievanceMap';

const mapState = vi.hoisted(() => ({ handlers: null }));

vi.mock('react-leaflet', async () => {
  const ReactModule = await import('react');
  const passthrough = (name) =>
    function MockLayer({ children, ...props }) {
      return ReactModule.createElement(
        'div',
        { 'data-testid': name, 'data-position': JSON.stringify(props.position || props.center || null) },
        children
      );
    };
  return {
    MapContainer: ({ children, center, zoom }) =>
      ReactModule.createElement(
        'div',
        { 'data-testid': 'map', 'data-center': JSON.stringify(center), 'data-zoom': zoom },
        children
      ),
    TileLayer: (props) =>
      ReactModule.createElement('div', {
        'data-testid': 'tiles',
        'data-url': props.url,
        'data-attribution': props.attribution,
      }),
    Marker: passthrough('marker'),
    CircleMarker: passthrough('selection'),
    Popup: ({ children }) => ReactModule.createElement('div', null, children),
    useMap: () => ({ flyTo: vi.fn() }),
    useMapEvents: (handlers) => {
      mapState.handlers = handlers;
    },
  };
});

afterEach(() => {
  cleanup();
  mapState.handlers = null;
  vi.restoreAllMocks();
});

describe('GrievanceMap', () => {
  it('renders OpenStreetMap tiles without requiring a Google Maps key', () => {
    render(<GrievanceMap complaints={[]} />);
    expect(screen.getByTestId('map')).toBeTruthy();
    expect(screen.getByTestId('tiles').getAttribute('data-url')).toContain('openstreetmap.org');
    expect(screen.getByTestId('tiles').getAttribute('data-attribution')).toContain('OpenStreetMap');
  });

  it('plots only complaints with real, valid coordinates, including MySQL numeric strings', () => {
    render(
      <GrievanceMap
        complaints={[
          { complaint_id: 1, latitude: '12.3456', longitude: '77.1234', status: 'PENDING' },
          { complaint_id: 2, latitude: null, longitude: null, status: 'ASSIGNED' },
          { complaint_id: 3, latitude: 91, longitude: 0, status: 'RESOLVED' },
        ]}
      />
    );
    const markers = screen.getAllByTestId('marker');
    expect(markers).toHaveLength(1);
    expect(markers[0].getAttribute('data-position')).toBe('[12.3456,77.1234]');
    expect(screen.queryByText(/No complaints have valid stored coordinates/)).toBeNull();
  });

  it('shows an empty-coordinate notice and does not create complaint markers', () => {
    render(<GrievanceMap complaints={[{ complaint_id: 4, latitude: null, longitude: null }]} />);
    expect(screen.queryAllByTestId('marker')).toHaveLength(0);
    expect(screen.getByText(/No complaints have valid stored coordinates/)).toBeTruthy();
  });

  it('supports manual coordinates when geolocation permission is denied', () => {
    const onLocationSelect = vi.fn();
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: (_success, failure) => failure({ code: 1 }),
      },
    });
    render(
      <GrievanceMap
        complaints={[]}
        selectableLocation
        onLocationSelect={onLocationSelect}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Use my location' }));
    expect(screen.getByRole('alert').textContent).toContain('Location permission denied');
    fireEvent.change(screen.getByLabelText('Latitude'), { target: { value: '33.4' } });
    fireEvent.change(screen.getByLabelText('Longitude'), { target: { value: '-112.5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Set' }));
    expect(onLocationSelect).toHaveBeenCalledWith(33.4, -112.5, 'Manually entered coordinates');
  });

  it('allows selecting a location by clicking the map', () => {
    const onLocationSelect = vi.fn();
    render(<GrievanceMap complaints={[]} selectableLocation onLocationSelect={onLocationSelect} />);
    mapState.handlers.click({ latlng: { lat: 18.25, lng: 73.5 } });
    expect(onLocationSelect).toHaveBeenCalledWith(18.25, 73.5, 'Map-selected location');
  });
});
