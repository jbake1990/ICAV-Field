import Foundation
import PDFKit
import UIKit

@MainActor
class PDFGenerator: ObservableObject {
    
    struct JobReport {
        let timeEntry: TimeEntry
        let jobNotes: String
        let aiSummary: String
        let technicianName: String
        let customerName: String
        let workDate: Date
    }
    
    func generateJobSummaryPDF(for report: JobReport) -> Data? {
        let pageRect = CGRect(x: 0, y: 0, width: 612, height: 792) // 8.5" x 11" at 72 DPI
        let renderer = UIGraphicsPDFRenderer(bounds: pageRect)
        
        let data = renderer.pdfData { context in
            context.beginPage()
            
            let cgContext = context.cgContext
            drawJobSummaryPage(in: cgContext, pageRect: pageRect, report: report)
        }
        
        return data
    }
    
    private func drawJobSummaryPage(in context: CGContext, pageRect: CGRect, report: JobReport) {
        let margin: CGFloat = 50
        let contentWidth = pageRect.width - (margin * 2)
        var yPosition: CGFloat = margin
        
        // Helper function to draw text
        func drawText(_ text: String, font: UIFont, color: UIColor = .black, alignment: NSTextAlignment = .left) -> CGFloat {
            let paragraphStyle = NSMutableParagraphStyle()
            paragraphStyle.alignment = alignment
            paragraphStyle.lineSpacing = 2
            
            let attributes: [NSAttributedString.Key: Any] = [
                .font: font,
                .foregroundColor: color,
                .paragraphStyle: paragraphStyle
            ]
            
            let attributedString = NSAttributedString(string: text, attributes: attributes)
            let textRect = CGRect(x: margin, y: yPosition, width: contentWidth, height: 1000)
            let boundingRect = attributedString.boundingRect(with: CGSize(width: contentWidth, height: 1000),
                                                           options: [.usesLineFragmentOrigin, .usesFontLeading],
                                                           context: nil)
            
            attributedString.draw(in: textRect)
            return boundingRect.height + 10 // Add some spacing
        }
        
        // Helper function to draw a horizontal line
        func drawLine() -> CGFloat {
            context.setStrokeColor(UIColor.lightGray.cgColor)
            context.setLineWidth(1)
            context.move(to: CGPoint(x: margin, y: yPosition))
            context.addLine(to: CGPoint(x: pageRect.width - margin, y: yPosition))
            context.strokePath()
            return 20 // Space after line
        }
        
        // Header
        yPosition += drawText("ICAV FIELD SERVICE REPORT", 
                             font: UIFont.boldSystemFont(ofSize: 24), 
                             color: .systemBlue, 
                             alignment: .center)
        
        yPosition += drawLine()
        
        // Job Information
        yPosition += drawText("JOB INFORMATION", 
                             font: UIFont.boldSystemFont(ofSize: 16), 
                             color: .darkGray)
        
        let dateFormatter = DateFormatter()
        dateFormatter.dateStyle = .full
        dateFormatter.timeStyle = .none
        
        yPosition += drawText("Customer: \(report.customerName)", 
                             font: UIFont.systemFont(ofSize: 14))
        
        yPosition += drawText("Technician: \(report.technicianName)", 
                             font: UIFont.systemFont(ofSize: 14))
        
        yPosition += drawText("Date: \(dateFormatter.string(from: report.workDate))", 
                             font: UIFont.systemFont(ofSize: 14))
        
        // Time Information
        if let clockInTime = report.timeEntry.clockInTime,
           let clockOutTime = report.timeEntry.clockOutTime {
            let timeFormatter = DateFormatter()
            timeFormatter.timeStyle = .short
            
            yPosition += drawText("Start Time: \(timeFormatter.string(from: clockInTime))", 
                                 font: UIFont.systemFont(ofSize: 14))
            
            yPosition += drawText("End Time: \(timeFormatter.string(from: clockOutTime))", 
                                 font: UIFont.systemFont(ofSize: 14))
            
            if let duration = report.timeEntry.formattedDuration {
                yPosition += drawText("Total Duration: \(duration)", 
                                     font: UIFont.boldSystemFont(ofSize: 14))
            }
        }
        
        yPosition += 20
        yPosition += drawLine()
        

        
        // AI Summary Section
        if !report.aiSummary.isEmpty {
            yPosition += drawText("WORK SUMMARY", 
                                 font: UIFont.boldSystemFont(ofSize: 16), 
                                 color: .darkGray)
            
            yPosition += drawText(report.aiSummary, 
                                 font: UIFont.systemFont(ofSize: 12))
            
            yPosition += 20
            yPosition += drawLine()
        }
        
        // Footer
        let footerY = pageRect.height - margin - 40
        yPosition = footerY
        
        let currentDate = Date()
        let reportDateFormatter = DateFormatter()
        reportDateFormatter.dateStyle = .medium
        reportDateFormatter.timeStyle = .short
        
        yPosition += drawText("Report generated on \(reportDateFormatter.string(from: currentDate))", 
                             font: UIFont.italicSystemFont(ofSize: 10), 
                             color: .gray, 
                             alignment: .center)
        
        yPosition += drawText("ICAV Time Tracker App", 
                             font: UIFont.italicSystemFont(ofSize: 10), 
                             color: .gray, 
                             alignment: .center)
    }
    
    func generateFileName(for report: JobReport) -> String {
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"
        let dateString = dateFormatter.string(from: report.workDate)
        
        // Sanitize customer name for filename
        let sanitizedCustomer = report.customerName
            .replacingOccurrences(of: " ", with: "_")
            .replacingOccurrences(of: "[^a-zA-Z0-9_-]", with: "", options: .regularExpression)
        
        return "ICAV_Job_Summary_\(sanitizedCustomer)_\(dateString).pdf"
    }
    
    func saveToDocuments(pdfData: Data, fileName: String) -> URL? {
        guard let documentsDirectory = FileManager.default.urls(for: .documentDirectory, 
                                                               in: .userDomainMask).first else {
            return nil
        }
        
        let fileURL = documentsDirectory.appendingPathComponent(fileName)
        
        do {
            try pdfData.write(to: fileURL)
            return fileURL
        } catch {
            print("Error saving PDF: \(error)")
            return nil
        }
    }
    
    func createJobReport(from timeEntry: TimeEntry, aiSummary: String) -> JobReport {
        return JobReport(
            timeEntry: timeEntry,
            jobNotes: "", // No longer storing job notes
            aiSummary: aiSummary,
            technicianName: timeEntry.technicianName,
            customerName: timeEntry.customerName,
            workDate: timeEntry.clockInTime ?? timeEntry.clockOutTime ?? Date()
        )
    }
} 