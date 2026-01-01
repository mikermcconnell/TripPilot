import type { Trip } from '@/types';
import { generatePDF, getPDFFilename } from './pdfGenerator';
import { generateCSV, getCSVFilename } from './csvGenerator';

export type ExportFormat = 'pdf' | 'csv' | 'json';

/**
 * Generate sanitized filename for export
 */
function getFilename(trip: Trip, format: ExportFormat): string {
  const sanitizedTitle = trip.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  return `${sanitizedTitle}_itinerary.${format}`;
}

/**
 * Trigger file download in browser
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export trip as PDF
 */
export async function exportToPDF(trip: Trip): Promise<void> {
  const doc = generatePDF(trip);
  const blob = doc.output('blob');
  downloadBlob(blob, getPDFFilename(trip));
}

/**
 * Export trip as CSV
 */
export async function exportToCSV(trip: Trip): Promise<void> {
  const csvContent = generateCSV(trip);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, getCSVFilename(trip));
}

/**
 * Export trip as JSON
 */
export async function exportToJSON(trip: Trip): Promise<void> {
  const exportData = {
    title: trip.title,
    destination: trip.destination,
    startDate: trip.startDate,
    endDate: trip.endDate,
    timezone: trip.timezone,
    itinerary: trip.itinerary,
    exportedAt: new Date().toISOString(),
  };

  const jsonContent = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  downloadBlob(blob, getFilename(trip, 'json'));
}

/**
 * Export trip in specified format
 */
export async function exportTrip(trip: Trip, format: ExportFormat): Promise<void> {
  switch (format) {
    case 'pdf':
      return exportToPDF(trip);
    case 'csv':
      return exportToCSV(trip);
    case 'json':
      return exportToJSON(trip);
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}
