import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, parseISO } from 'date-fns';
import type { Trip, DayItinerary, Activity } from '@/types';

// Color palette (matching TripPilot branding)
const COLORS = {
  primary: [59, 130, 246] as [number, number, number],      // blue-500
  primaryDark: [37, 99, 235] as [number, number, number],   // blue-600
  secondary: [100, 116, 139] as [number, number, number],   // slate-500
  text: [30, 41, 59] as [number, number, number],           // slate-800
  textLight: [100, 116, 139] as [number, number, number],   // slate-500
  background: [248, 250, 252] as [number, number, number],  // slate-50
  white: [255, 255, 255] as [number, number, number],
  border: [226, 232, 240] as [number, number, number],      // slate-200
  // Activity type colors
  food: [249, 115, 22] as [number, number, number],         // orange-500
  lodging: [168, 85, 247] as [number, number, number],      // purple-500
  activity: [34, 197, 94] as [number, number, number],      // green-500
  travel: [59, 130, 246] as [number, number, number],       // blue-500
};

// Page dimensions
const PAGE_WIDTH = 210; // A4 width in mm
const PAGE_HEIGHT = 297; // A4 height in mm
const MARGIN = 20;
const CONTENT_WIDTH = PAGE_WIDTH - (MARGIN * 2);

/**
 * Get activity type badge color
 */
function getActivityTypeColor(type: string): [number, number, number] {
  switch (type) {
    case 'food': return COLORS.food;
    case 'lodging': return COLORS.lodging;
    case 'activity': return COLORS.activity;
    case 'travel': return COLORS.travel;
    default: return COLORS.secondary;
  }
}

/**
 * Get activity type emoji
 */
function getActivityTypeEmoji(type: string): string {
  switch (type) {
    case 'food': return 'Restaurant';
    case 'lodging': return 'Hotel';
    case 'activity': return 'Activity';
    case 'travel': return 'Travel';
    default: return type;
  }
}

/**
 * Format activity details for PDF
 */
function formatActivityDetails(activity: Activity): string {
  const parts: string[] = [];
  const details = activity.details;

  if (details?.booking?.confirmationNumber) {
    parts.push(`Booking: ${details.booking.confirmationNumber}`);
  }
  if (details?.booking?.provider) {
    parts.push(`via ${details.booking.provider}`);
  }
  if (details?.phone) {
    parts.push(`Tel: ${details.phone}`);
  }
  if (details?.notes) {
    // Truncate long notes
    const notes = details.notes.length > 100
      ? details.notes.substring(0, 97) + '...'
      : details.notes;
    parts.push(notes);
  }
  if (details?.estimatedCost) {
    parts.push(`Est: ${details.estimatedCost.currency} ${details.estimatedCost.amount}`);
  }

  return parts.join(' | ');
}

/**
 * Add page header with trip info
 */
function addHeader(doc: jsPDF, trip: Trip): number {
  const startY = MARGIN;

  // Trip title
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.text);
  doc.text(trip.title, MARGIN, startY + 10);

  // Destination and dates
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.textLight);

  const dateRange = `${format(parseISO(trip.startDate), 'MMMM d')} - ${format(parseISO(trip.endDate), 'MMMM d, yyyy')}`;
  const subtitle = `${trip.destination.name}, ${trip.destination.country}  •  ${dateRange}`;
  doc.text(subtitle, MARGIN, startY + 20);

  // Blue accent line
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(1);
  doc.line(MARGIN, startY + 28, PAGE_WIDTH - MARGIN, startY + 28);

  // Trip stats
  const totalActivities = trip.itinerary.days.reduce((sum, day) => sum + day.activities.length, 0);
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.secondary);
  const stats = `${trip.itinerary.days.length} days  •  ${totalActivities} activities`;
  doc.text(stats, MARGIN, startY + 36);

  return startY + 45; // Return Y position after header
}

/**
 * Add day section header
 */
function addDayHeader(doc: jsPDF, day: DayItinerary, yPos: number): number {
  // Day header background
  doc.setFillColor(...COLORS.primary);
  doc.roundedRect(MARGIN, yPos, CONTENT_WIDTH, 12, 2, 2, 'F');

  // Day number and date
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.white);

  const dayTitle = `DAY ${day.dayNumber}  —  ${format(parseISO(day.date), 'EEEE, MMMM d').toUpperCase()}`;
  doc.text(dayTitle, MARGIN + 5, yPos + 8);

  // Primary location if set
  let nextY = yPos + 16;
  if (day.primaryLocation?.name) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...COLORS.textLight);
    doc.text(day.primaryLocation.name, MARGIN + 5, nextY);
    nextY += 6;
  }

  // Inter-day travel info
  if (day.travelFromPrevious) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.travel);
    const travelInfo = `Travel: ${day.travelFromPrevious.mode}${day.travelFromPrevious.details ? ` (${day.travelFromPrevious.details})` : ''}`;
    doc.text(travelInfo, MARGIN + 5, nextY);
    nextY += 6;
  }

  return nextY + 2;
}

/**
 * Add activities table for a day
 */
function addActivitiesTable(doc: jsPDF, day: DayItinerary, startY: number): number {
  if (day.activities.length === 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...COLORS.textLight);
    doc.text('No activities planned for this day', MARGIN + 5, startY + 8);
    return startY + 16;
  }

  const tableData = day.activities.map((activity) => [
    activity.time || '—',
    activity.description,
    activity.location.name + (activity.location.address ? `\n${activity.location.address}` : ''),
    getActivityTypeEmoji(activity.type),
    formatActivityDetails(activity),
  ]);

  autoTable(doc, {
    startY: startY,
    margin: { left: MARGIN, right: MARGIN },
    head: [['Time', 'Activity', 'Location', 'Type', 'Details']],
    body: tableData,
    headStyles: {
      fillColor: COLORS.primaryDark,
      textColor: COLORS.white,
      fontStyle: 'bold',
      fontSize: 9,
      cellPadding: 4,
    },
    bodyStyles: {
      fontSize: 9,
      cellPadding: 4,
      textColor: COLORS.text,
      lineColor: COLORS.border,
      lineWidth: 0.1,
    },
    alternateRowStyles: {
      fillColor: COLORS.background,
    },
    columnStyles: {
      0: { cellWidth: 22, halign: 'center' },   // Time
      1: { cellWidth: 45 },                      // Activity
      2: { cellWidth: 45 },                      // Location
      3: { cellWidth: 20, halign: 'center' },   // Type
      4: { cellWidth: 'auto', fontSize: 8, textColor: COLORS.textLight }, // Details
    },
    didDrawCell: (data) => {
      // Add colored dot for activity type
      if (data.section === 'body' && data.column.index === 3) {
        const activityType = day.activities[data.row.index]?.type;
        if (activityType) {
          const color = getActivityTypeColor(activityType);
          doc.setFillColor(...color);
          doc.circle(data.cell.x + 2, data.cell.y + data.cell.height / 2, 1.5, 'F');
        }
      }
    },
  });

  // Get final Y position after table
  return (doc as any).lastAutoTable.finalY + 10;
}

/**
 * Add footer to all pages
 */
function addFooters(doc: jsPDF): void {
  const pageCount = doc.getNumberOfPages();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // Footer line
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.5);
    doc.line(MARGIN, PAGE_HEIGHT - 15, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 15);

    // Page number
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.textLight);
    doc.text(`Page ${i} of ${pageCount}`, MARGIN, PAGE_HEIGHT - 8);

    // Branding
    doc.text('Generated by TripPilot', PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 8, { align: 'right' });
  }
}

/**
 * Generate professional PDF from a Trip
 */
export function generatePDF(trip: Trip): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Add header on first page
  let yPos = addHeader(doc, trip);

  // Handle empty trips
  if (!trip.itinerary.days.length) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...COLORS.textLight);
    doc.text('No days planned yet. Start adding activities to your trip!', MARGIN, yPos + 20);
    addFooters(doc);
    return doc;
  }

  // Add each day
  trip.itinerary.days.forEach((day, index) => {
    // Check if we need a new page (leave room for header + some content)
    if (yPos > PAGE_HEIGHT - 80) {
      doc.addPage();
      yPos = MARGIN;
    }

    // Add day header
    yPos = addDayHeader(doc, day, yPos);

    // Add activities table
    yPos = addActivitiesTable(doc, day, yPos);

    // Add spacing between days
    if (index < trip.itinerary.days.length - 1) {
      yPos += 5;
    }
  });

  // Add footers to all pages
  addFooters(doc);

  return doc;
}

/**
 * Generate filename for PDF export
 */
export function getPDFFilename(trip: Trip): string {
  const sanitizedTitle = trip.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  return `${sanitizedTitle}_itinerary.pdf`;
}
