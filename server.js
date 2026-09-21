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
