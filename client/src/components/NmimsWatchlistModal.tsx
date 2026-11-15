import React from 'react';
import { NorthMaharashtraAviationModal } from './NorthMaharashtraAviationModal';
import type { NorthMaharashtraReport, NorthMaharashtraAircraft, Flight } from '../types';

interface NmimsWatchlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: NorthMaharashtraReport | null;
  onFlyToAircraft: (aircraft: NorthMaharashtraAircraft) => void;
  onFlyToShirpur: () => void;
  onSelectFlight: (flight: Flight) => void;
}

/**
 * Backward compatibility wrapper for North Maharashtra Aviation Modal
 */
export const NmimsWatchlistModal: React.FC<NmimsWatchlistModalProps> = ({
  isOpen,
  onClose,
  report,
  onFlyToAircraft,
  onFlyToShirpur,
  onSelectFlight,
}) => {
  return (
    <NorthMaharashtraAviationModal
      isOpen={isOpen}
      onClose={onClose}
      report={report}
      onFlyToAircraft={onFlyToAircraft}
      onFlyToAirport={({ lat, lon, height, title }) => {
        onFlyToShirpur();
      }}
      onSelectFlight={onSelectFlight}
    />
  );
};
