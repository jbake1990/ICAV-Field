import jsPDF from 'jspdf';
import { WorkOrder } from '../types';

export const exportWorkOrderToPDF = (workOrder: WorkOrder): void => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 20;

  // Helper function to add text with word wrapping
  const addWrappedText = (text: string, x: number, y: number, maxWidth: number, fontSize: number = 10) => {
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(text, maxWidth);
    doc.text(lines, x, y);
    return y + (lines.length * (fontSize * 0.4));
  };

  // Helper function to check if we need a new page
  const checkNewPage = (requiredSpace: number) => {
    if (yPosition + requiredSpace > pageHeight - 20) {
      doc.addPage();
      yPosition = 20;
      return true;
    }
    return false;
  };

  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('ICAV Time Tracker - Work Order', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;

  // Customer and Job Info
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Work Order Details', 20, yPosition);
  yPosition += 10;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  
  // Customer Name
  doc.setFont('helvetica', 'bold');
  doc.text('Customer:', 20, yPosition);
  doc.setFont('helvetica', 'normal');
  doc.text(workOrder.customerName, 60, yPosition);
  yPosition += 8;

  // Technician
  doc.setFont('helvetica', 'bold');
  doc.text('Technician:', 20, yPosition);
  doc.setFont('helvetica', 'normal');
  doc.text(workOrder.technicianName, 60, yPosition);
  yPosition += 8;

  // Assigned Date
  doc.setFont('helvetica', 'bold');
  doc.text('Assigned Date:', 20, yPosition);
  doc.setFont('helvetica', 'normal');
  doc.text(new Date(workOrder.assignedDate).toLocaleDateString(), 60, yPosition);
  yPosition += 8;

  // Job Type
  doc.setFont('helvetica', 'bold');
  doc.text('Job Type:', 20, yPosition);
  doc.setFont('helvetica', 'normal');
  doc.text(workOrder.jobType.charAt(0).toUpperCase() + workOrder.jobType.slice(1), 60, yPosition);
  yPosition += 8;

  // Status
  doc.setFont('helvetica', 'bold');
  doc.text('Status:', 20, yPosition);
  doc.setFont('helvetica', 'normal');
  doc.text(workOrder.status.charAt(0).toUpperCase() + workOrder.status.slice(1), 60, yPosition);
  yPosition += 8;

  // Location
  if (workOrder.location) {
    doc.setFont('helvetica', 'bold');
    doc.text('Location:', 20, yPosition);
    doc.setFont('helvetica', 'normal');
    yPosition = addWrappedText(workOrder.location, 60, yPosition, pageWidth - 80);
    yPosition += 5;
  }

  yPosition += 10;

  // Job Description
  if (workOrder.jobDescription) {
    checkNewPage(30);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Job Description', 20, yPosition);
    yPosition += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    yPosition = addWrappedText(workOrder.jobDescription, 20, yPosition, pageWidth - 40);
    yPosition += 10;
  }

  // Hours Summary
  checkNewPage(40);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Hours Summary', 20, yPosition);
  yPosition += 8;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  
  // Estimated Hours
  doc.setFont('helvetica', 'bold');
  doc.text('Estimated Hours:', 20, yPosition);
  doc.setFont('helvetica', 'normal');
  doc.text(workOrder.estimatedHours.toString(), 80, yPosition);
  yPosition += 8;

  // Actual Hours
  if (workOrder.actualHours) {
    doc.setFont('helvetica', 'bold');
    doc.text('Actual Hours:', 20, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(workOrder.actualHours.toString(), 80, yPosition);
    yPosition += 8;
  }

  // Total Work Hours
  if (workOrder.totalWorkHours) {
    doc.setFont('helvetica', 'bold');
    doc.text('Total Work Hours:', 20, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(workOrder.totalWorkHours.toFixed(2), 80, yPosition);
    yPosition += 8;
  }

  // Total Drive Hours
  if (workOrder.totalDriveHours) {
    doc.setFont('helvetica', 'bold');
    doc.text('Total Drive Hours:', 20, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(workOrder.totalDriveHours.toFixed(2), 80, yPosition);
    yPosition += 8;
  }

  yPosition += 10;

  // Time Entries
  if (workOrder.timeEntries && workOrder.timeEntries.length > 0) {
    checkNewPage(50);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Time Entries', 20, yPosition);
    yPosition += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    workOrder.timeEntries.forEach((entry, index) => {
      checkNewPage(25);
      
      // Entry header
      doc.setFont('helvetica', 'bold');
      doc.text(`Entry ${index + 1}:`, 20, yPosition);
      yPosition += 6;

      // Clock in/out times
      if (entry.clockInTime) {
        doc.setFont('helvetica', 'normal');
        doc.text(`Clock In: ${new Date(entry.clockInTime).toLocaleString()}`, 30, yPosition);
        yPosition += 5;
      }

      if (entry.clockOutTime) {
        doc.text(`Clock Out: ${new Date(entry.clockOutTime).toLocaleString()}`, 30, yPosition);
        yPosition += 5;
      }

      // Duration
      if (entry.formattedDuration) {
        doc.text(`Duration: ${entry.formattedDuration}`, 30, yPosition);
        yPosition += 5;
      }

      // Job notes
      if (entry.jobNotes) {
        doc.setFont('helvetica', 'bold');
        doc.text('Notes:', 30, yPosition);
        yPosition += 5;
        doc.setFont('helvetica', 'normal');
        yPosition = addWrappedText(entry.jobNotes, 30, yPosition, pageWidth - 50);
        yPosition += 5;
      }

      // AI Summary
      if (entry.aiSummary) {
        doc.setFont('helvetica', 'bold');
        doc.text('AI Summary:', 30, yPosition);
        yPosition += 5;
        doc.setFont('helvetica', 'normal');
        yPosition = addWrappedText(entry.aiSummary, 30, yPosition, pageWidth - 50);
        yPosition += 5;
      }

      yPosition += 5;
    });
  }

  // Work Summary
  if (workOrder.workSummary) {
    checkNewPage(30);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Work Summary', 20, yPosition);
    yPosition += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    yPosition = addWrappedText(workOrder.workSummary, 20, yPosition, pageWidth - 40);
    yPosition += 10;
  }

  // Notes
  if (workOrder.notes) {
    checkNewPage(30);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Additional Notes', 20, yPosition);
    yPosition += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    yPosition = addWrappedText(workOrder.notes, 20, yPosition, pageWidth - 40);
  }

  // Footer
  const footerY = pageHeight - 20;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated on ${new Date().toLocaleString()}`, 20, footerY);
  doc.text('ICAV Time Tracker', pageWidth - 20, footerY, { align: 'right' });

  // Save the PDF
  const fileName = `WorkOrder_${workOrder.customerName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date(workOrder.assignedDate).toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};

export const exportTimeEntriesToPDF = (timeEntries: any[], title: string = 'Time Entries Report'): void => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 20;

  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(title, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated on ${new Date().toLocaleString()}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 20;

  // Table headers
  const headers = ['Date', 'Technician', 'Customer', 'Clock In', 'Clock Out', 'Duration', 'Status'];
  const colWidths = [25, 30, 35, 25, 25, 20, 20];
  let xPosition = 20;

  doc.setFont('helvetica', 'bold');
  headers.forEach((header, index) => {
    doc.text(header, xPosition, yPosition);
    xPosition += colWidths[index];
  });
  yPosition += 8;

  // Table data
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  
  timeEntries.forEach(entry => {
    if (yPosition > pageHeight - 30) {
      doc.addPage();
      yPosition = 20;
    }

    xPosition = 20;
    const rowData = [
      new Date(entry.clockInTime || entry.driveStartTime || new Date()).toLocaleDateString(),
      entry.technicianName,
      entry.customerName,
      entry.clockInTime ? new Date(entry.clockInTime).toLocaleTimeString() : 'N/A',
      entry.clockOutTime ? new Date(entry.clockOutTime).toLocaleTimeString() : 'N/A',
      entry.formattedDuration || 'N/A',
      entry.isActive ? 'Active' : 'Completed'
    ];

    rowData.forEach((data, index) => {
      const text = data.toString();
      if (text.length > 15) {
        doc.text(text.substring(0, 12) + '...', xPosition, yPosition);
      } else {
        doc.text(text, xPosition, yPosition);
      }
      xPosition += colWidths[index];
    });
    yPosition += 6;
  });

  // Save the PDF
  const fileName = `${title.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};
