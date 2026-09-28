const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
    {
        patient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Patient",
            required: [true, "Patient reference is required"],
            index: true,
        },
        description: {
            type: String,
            required: [true, "Task description is required"],
            trim: true,
        },
        priority: {
            type: String,
            enum: ["Routine", "Urgent", "Critical"],
            default: "Routine",
            index: true,
        },
        dueAt: {
            type: Date,
            required: [true, "Due date and time is required"],
            index: true,
        },
        assignedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            index: true,
        },
        status: {
            type: String,
            enum: ["Pending", "In Progress", "Completed", "Overdue", "Cancelled"],
            default: "Pending",
            index: true,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        completedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        completedAt: {
            type: Date,
        },
        completionNotes: {
            type: String,
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);

taskSchema.index({ assignedTo: 1, status: 1, dueAt: 1 });
taskSchema.index({ patient: 1, status: 1 });

const Task = mongoose.model("Task", taskSchema);

module.exports = Task;
