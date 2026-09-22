const express = require("express");
const mongoose = require("mongoose");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 10000;

// ======================
// Middleware
// ======================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// ======================
// MongoDB Connection
// ======================
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.error("MongoDB Connection Error:", err));

// ======================
// Schema
// ======================
const applicationSchema = new mongoose.Schema(
  {
    trackingNumber: {
      type: String,
      default: () =>
        "LE" + Date.now().toString().slice(-8) + Math.floor(Math.random() * 1000),
    },
    fullName: String,
    phone: String,
    email: String,
    idNumber: String,
    occupation: String,
    monthlyIncome: String,
    pin: String,
    loanPurpose: String,
    amount: Number,
    period: String,
    processingFee: Number,
    totalAmountDue: Number,
    status: {
      type: String,
      default: "Pending",
    },
    adminReply: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

const Application = mongoose.model(
  "Application",
  applicationSchema,
  "loanapplications"
);

// ======================
// Routes
// ======================

// Home
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Health Check
app.get("/api/health", (req, res) => {
  res.json({ status: "OK" });
});

// Submit Loan Application
app.post("/api/apply", async (req, res) => {
  try {
    const application = new Application(req.body);
    await application.save();

    console.log("Application saved:", application.trackingNumber);

    res.status(201).json({
      success: true,
      message: "Application submitted successfully.",
      trackingNumber: application.trackingNumber,
    });
  } catch (error) {
    console.error("Save error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to save application.",
    });
  }
});

// Get all applications for Admin
app.get("/api/admin/applications", async (req, res) => {
  try {
    const applications = await Application.find().sort({ createdAt: -1 });
    res.json(applications);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error loading applications." });
  }
});

// Update application status and reply
app.put("/api/admin/application/:id", async (req, res) => {
  try {
    const { status, adminReply } = req.body;

    const updated = await Application.findByIdAndUpdate(
      req.params.id,
      { status, adminReply },
      { new: true }
    );

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Update failed." });
  }
});

// Get tracking information
app.get("/api/track/:trackingNumber", async (req, res) => {
  try {
    const application = await Application.findOne({
      trackingNumber: req.params.trackingNumber,
    });

    if (!application) {
      return res.status(404).json({
        message: "Tracking number not found.",
      });
    }

    res.json(application);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Tracking failed.",
    });
  }
});

// ======================
// Start Server
// ======================
app.listen(PORT, () => {
  console.log(`LoanEase server running on port ${PORT}`);
});
