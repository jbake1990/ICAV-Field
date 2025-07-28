import Foundation
import UIKit
import SwiftUI

@MainActor
class ShareManager: ObservableObject {
    
    @Published var isSharePresented = false
    @Published var shareItems: [Any] = []
    
    func sharePDF(pdfData: Data, fileName: String, sourceView: UIView? = nil) {
        // Create a temporary file URL for sharing
        let tempDirectory = FileManager.default.temporaryDirectory
        let tempFileURL = tempDirectory.appendingPathComponent(fileName)
        
        do {
            try pdfData.write(to: tempFileURL)
            shareItems = [tempFileURL]
            isSharePresented = true
        } catch {
            print("Error creating temporary file for sharing: \(error)")
        }
    }
    
    func shareText(_ text: String) {
        shareItems = [text]
        isSharePresented = true
    }
    
    func cleanup() {
        // Clean up temporary files
        for item in shareItems {
            if let url = item as? URL, url.path.contains("tmp") {
                try? FileManager.default.removeItem(at: url)
            }
        }
        shareItems.removeAll()
    }
}

// SwiftUI wrapper for UIActivityViewController
struct ActivityViewController: UIViewControllerRepresentable {
    let activityItems: [Any]
    let applicationActivities: [UIActivity]?
    let completion: ((UIActivity.ActivityType?, Bool) -> Void)?
    
    init(
        activityItems: [Any],
        applicationActivities: [UIActivity]? = nil,
        completion: ((UIActivity.ActivityType?, Bool) -> Void)? = nil
    ) {
        self.activityItems = activityItems
        self.applicationActivities = applicationActivities
        self.completion = completion
    }
    
    func makeUIViewController(context: Context) -> UIActivityViewController {
        let controller = UIActivityViewController(
            activityItems: activityItems,
            applicationActivities: applicationActivities
        )
        
        // Exclude some activities that don't make sense for PDF sharing
        controller.excludedActivityTypes = [
            .addToReadingList,
            .assignToContact,
            .postToFacebook,
            .postToTwitter,
            .postToWeibo,
            .postToVimeo,
            .postToTencentWeibo,
            .postToFlickr
        ]
        
        controller.completionWithItemsHandler = { activityType, completed, returnedItems, error in
            completion?(activityType, completed)
        }
        
        return controller
    }
    
    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {
        // No updates needed
    }
}

// Extension to present share sheet from any SwiftUI view
extension View {
    func shareSheet(
        isPresented: Binding<Bool>,
        items: [Any],
        completion: ((UIActivity.ActivityType?, Bool) -> Void)? = nil
    ) -> some View {
        self.sheet(isPresented: isPresented) {
            ActivityViewController(
                activityItems: items,
                completion: completion
            )
        }
    }
} 