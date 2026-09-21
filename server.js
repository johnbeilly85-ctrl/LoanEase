const express = require("express");
const mongoose = require("mongoose");
const path = require("path");

const app = express();

const PORT = process.env.PORT || 10000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve all HTML/CSS/JS files
app.use(express.static(__dirname));

// MongoDB Schema
const applicationSchema = new mongoose.Schema(
  {
    trackingNumber: {
      type: String,
      required: true,
      unique: true
    },

    fullName: {
      type: String,
      required: true
    },

    phone: {
      type: String,
      required: true
    },

    email: {
      type: String,
      default: ""
    },

    country: {
      type: String,
      default: ""
    },

    occupation: {
      type: String,
      default: ""
    },

    monthlyIncome: {
      type: String,
      default: ""
    },

    pin: {
      type: String,
      default: ""
    },

    loanPurpose: {
      type: String,
      required: true
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
      default: "Application Received"
    }
  },
  {
    timestamps: true
  }
);

const Application = mongoose.model("Application", applicationSchema);


// MongoDB Connection
if (process.env.MONGODB_URI) {
  mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => {
      console.log("MongoDB connected successfully");
    })
    .catch((error) => {
      console.error("MongoDB Connection Error:", error.message);
    });
} else {
  console.warn("WARNING: MONGODB_URI is not set.");
}


// Home page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});


// Health check
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "LoanEase server is running"
  });
});


// Submit loan application
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

    if (!Number.isFinite(loanAmount) || loanAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid loan amount."
      });
    }

    // Calculate 10% processing fee
    const calculatedFee = Number(
      (loanAmount * 0.10).toFixed(2)
    );

    const calculatedTotal = Number(
      (loanAmount + calculatedFee).toFixed(2)
    );

    // Generate tracking number
    const trackingNumber =
      "LE-" +
      new Date().getFullYear() +
      "-" +
      Math.floor(100000 + Math.random() * 900000);

    const applicationData = {
      trackingNumber,
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
      processingFee:
        processingFee !== undefined
          ? Number(processingFee)
          : calculatedFee,
      totalAmountDue:
        totalAmountDue !== undefined
          ? Number(totalAmountDue)
          : calculatedTotal,
      status: "Application Received"
    };

    // Save to MongoDB if connected
    if (mongoose.connection.readyState === 1) {
      const application = new Application(applicationData);
      await application.save();

      console.log(
        "Application saved:",
        trackingNumber
      );
    } else {
      console.warn(
        "MongoDB is not connected. Application was not saved to database."
      );
    }

    // Send response to apply.html
    return res.status(201).json({
      success: true,
      message: "Application received successfully.",
      trackingNumber: trackingNumber,
      status: "Application Received"
    });

  } catch (error) {
    console.error(
      "Application submission error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to submit application. Please try again."
    });
  }
});


// Get application by tracking number
app.get("/api/application/:trackingNumber", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: "Database is not connected."
      });
    }

    const application = await Application.findOne({
      trackingNumber: req.params.trackingNumber
    }).select("-pin");

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found."
      });
    }

    res.json({
      success: true,
      application
    });

  } catch (error) {
    console.error(
      "Tracking lookup error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Unable to check application status."
    });
  }
});


// Start server
app.listen(PORT, () => {
  console.log(
    `LoanEase server running on port ${PORT}`
  );
});
