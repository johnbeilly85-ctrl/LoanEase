const express = require("express");
const mongoose = require("mongoose");
const path = require("path");

const app = express();

const PORT = process.env.PORT || 10000;

// ===============================
// MIDDLEWARE
// ===============================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));


// ===============================
// MONGODB SCHEMA
// ===============================
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

    // Do not use a real banking/mobile-money PIN here.
    // This field is retained only for compatibility
    // with your current application form.
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
    },

    adminReply: {
      type: String,
      default: ""
    },

    repliedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

const Application = mongoose.model(
  "Application",
  applicationSchema
);


// ===============================
// MONGODB CONNECTION
// ===============================
if (process.env.MONGODB_URI) {
  mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => {
      console.log("MongoDB connected successfully");
    })
    .catch((error) => {
      console.error(
        "MongoDB Connection Error:",
        error.message
      );
    });
} else {
  console.warn(
    "WARNING: MONGODB_URI is not set."
  );
}


// ===============================
// HOME PAGE
// ===============================
app.get("/", (req, res) => {
  res.sendFile(
    path.join(__dirname, "index.html")
  );
});


// ===============================
// HEALTH CHECK
// ===============================
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "LoanEase server is running",
    database:
      mongoose.connection.readyState === 1
        ? "connected"
        : "not connected"
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
      period
    } = req.body;

    // Required fields
    if (
      !fullName ||
      !phone ||
      !loanPurpose ||
      !amount ||
      !period
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Please complete all required fields."
      });
    }

    const loanAmount = Number(amount);

    if (
      !Number.isFinite(loanAmount) ||
      loanAmount <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Please enter a valid loan amount."
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
      Math.floor(
        100000 + Math.random() * 900000
      );

    const applicationData = {
      trackingNumber,

      fullName: String(fullName).trim(),

      phone: String(phone).trim(),

      email: email
        ? String(email).trim()
        : "",

      country: country
        ? String(country).trim()
        : "",

      occupation: occupation
        ? String(occupation).trim()
        : "",

      monthlyIncome: monthlyIncome
        ? String(monthlyIncome).trim()
        : "",

      // IMPORTANT:
      // Never use this for a real banking,
      // M-Pesa, or mobile-money PIN.
      pin: pin
        ? String(pin).trim()
        : "",

      loanPurpose:
        String(loanPurpose).trim(),

      amount: loanAmount,

      period:
        String(period).trim(),

      processingFee: calculatedFee,

      totalAmountDue: calculatedTotal,

      status: "Application Received"
    };


    // Make sure database is connected
    if (
      mongoose.connection.readyState !== 1
    ) {
      console.error(
        "MongoDB is not connected."
      );

      return res.status(503).json({
        success: false,
        message:
          "Database is not connected. Please try again later."
      });
    }


    // Save application
    const application =
      new Application(applicationData);

    await application.save();


    console.log(
      "NEW APPLICATION SAVED:",
      trackingNumber,
      fullName
    );


    return res.status(201).json({
      success: true,
      message:
        "Application received successfully.",
      trackingNumber:
        application.trackingNumber,
      status:
        application.status
    });


  } catch (error) {

    console.error(
      "Application submission error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to submit application. Please try again."
    });
  }
});


// ===============================
// GET ALL APPLICATIONS
// THIS IS THE ROUTE YOUR ADMIN
// DASHBOARD WAS MISSING
// ===============================
app.get(
  "/api/applications",
  async (req, res) => {

    try {

      if (
        mongoose.connection.readyState !== 1
      ) {
        return res.status(503).json({
          success: false,
          message:
            "Database is not connected."
        });
      }


      const applications =
        await Application.find({})
          .sort({
            createdAt: -1
          });


      return res.json({
        success: true,
        applications
      });


    } catch (error) {

      console.error(
        "Loading applications error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to load applications."
      });
    }
  }
);


// ===============================
// GET ONE APPLICATION
// BY TRACKING NUMBER
// ===============================
app.get(
  "/api/application/:trackingNumber",
  async (req, res) => {

    try {

      if (
        mongoose.connection.readyState !== 1
      ) {
        return res.status(503).json({
          success: false,
          message:
            "Database is not connected."
        });
      }


      const application =
        await Application.findOne({
          trackingNumber:
            req.params.trackingNumber
        });


      if (!application) {
        return res.status(404).json({
          success: false,
          message:
            "Application not found."
        });
      }


      return res.json({
        success: true,
        application
      });


    } catch (error) {

      console.error(
        "Tracking lookup error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to check application status."
      });
    }
  }
);


// ===============================
// ADMIN REPLY
// ===============================
app.post(
  "/api/applications/:id/reply",
  async (req, res) => {

    try {

      if (
        mongoose.connection.readyState !== 1
      ) {
        return res.status(503).json({
          success: false,
          message:
            "Database is not connected."
        });
      }


      const {
        message
      } = req.body;


      if (
        !message ||
        !String(message).trim()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Please enter a reply message."
        });
      }


      const application =
        await Application.findById(
          req.params.id
        );


      if (!application) {
        return res.status(404).json({
          success: false,
          message:
            "Application not found."
        });
      }


      application.adminReply =
        String(message).trim();

      application.repliedAt =
        new Date();


      await application.save();


      console.log(
        "Admin reply saved for:",
        application.trackingNumber
      );


      return res.json({
        success: true,
        message:
          "Reply saved successfully."
      });


    } catch (error) {

      console.error(
        "Admin reply error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to save reply."
      });
    }
  }
);


// ===============================
// START SERVER
// ===============================
app.listen(PORT, () => {
  console.log(
    `LoanEase server running on port ${PORT}`
  );
});
