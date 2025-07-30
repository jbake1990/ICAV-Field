//
//  JobAssignment.swift
//  ICAV Time Tracker
//
//  Created by Jason Baker on 6/23/25.
//

import Foundation

struct JobAssignment: Codable, Identifiable {
    let id: String
    let jobId: String
    let userId: String
    let technicianName: String
    let assignedDate: Date
    let assignedHours: Int
    let actualHours: Int?
    let status: String
    let notes: String?
    let order: Int?
    let createdAt: Date
    let updatedAt: Date
    let job: Job?
}

struct Job: Codable, Identifiable {
    let id: String
    let title: String
    let customerName: String
    let description: String?
    let location: String?
    let estimatedHours: Int
    let status: String
    let priority: String
    let createdAt: Date
    let updatedAt: Date
} 