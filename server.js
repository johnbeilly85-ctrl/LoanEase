const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 10000;

// ===============================
// MIDDLEWARE
// ===============================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve all HTML/CSS/JS files
app.use(express.static(__dirname));

// ===============================
// MONGODB SCHEMA
// ===============================
const applicationSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true
    },

    phone: {
      type: String,
      required: true,
      trim: true
    },

    email: {
      type: String,
      trim: true,
      default: ""
    },

    country: {
      type: String,
      trim: true,
      default: ""
    },

    occupation: {
      type: String,
      trim: true,
      default: ""
    },

    monthlyIncome: {
      type: String,
      trim: true,
      default: ""
    },

    pin: {
      type: String,
      trim: true,
      default: ""
    },

    loanPurpose: {
      type: String,
      required: true,
      trim: true
    },

    amount: {
      type: Number,
      required: true
    },

    period: {
      type: String,
      required: true
    },

    processingFee: {
      type: Number,
      required: true
    },

    totalAmountDue: {
      type: Number,
      required: true
    },

    status: {
      type: String,
      default: "Pending"
    },

    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    collection: "applications"
  }
);

const Application = mongoose.model("Application", applicationSchema);

// ===============================
// MONGODB CONNECTION
// ===============================
if (!process.env.MONGODB_URI) {
  console.log("WARNING: MONGODB_URI is not set.");
} else {
  mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => {
      console.log("MongoDB connected successfully");
    })
    .catch((error) => {
      console.error("MongoDB Connection Error:", error.message);
    });
}

// ===============================
// HOME PAGE
// ===============================
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ===============================
// HEALTH CHECK
// ===============================
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "LoanEase server is running"
  });
});

// ===============================
// SUBMIT LOAN APPLICATION
// ===============================
app.post("/api/apply", async (req, res) => {
  try {
    const {
      fullName,
      phone,
      email,
      country,
      occupation,
      monthlyIncome,
      pin,
      loanPurpose,
      amount,
      period,
      processingFee,
      totalAmountDue
    } = req.body;

    // Required fields
    if (!fullName || !phone || !loanPurpose || !amount || !period) {
      return res.status(400).json({
        success: false,
        message: "Please complete all required fields."
      });
    }

    const loanAmount = Number(amount);

    if (isNaN(loanAmount) || loanAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid loan amount."
      });
    }

    // Calculate the 10% processing fee on the server
    const calculatedFee = loanAmount * 0.10;
    const calculatedTotal = loanAmount + calculatedFee;

    const application = new Application({
      fullName,
      phone,
      email: email || "",
      country: country || "",
      occupation: occupation || "",
      monthlyIncome: monthlyIncome || "",
      pin: pin || "",
      loanPurpose,
      amount: loanAmount,
      period,
      processingFee: calculatedFee,
      totalAmountDue: calculatedTotal
    });

    await application.save();

    console.log("New loan application received:", application._id);

    return res.status(201).json({
      success: true,
      message: "Application received successfully.",
      applicationId: application._id
    });

  } catch (error) {
    console.error("Application submission error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to submit application. Please try again."
    });
  }
});

// ===============================
// START SERVER
// ===============================
app.listen(PORT, () => {
  console.log(`LoanEase server running on port ${PORT}`);
});
