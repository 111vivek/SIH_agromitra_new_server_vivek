const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const userRoutes = require("./routes/userRoutes");
const User = require("./models/farmerSchema");


const app = express();

function isEmail(email) {
  var emailFormat = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
  if (email !== '' && email.match(emailFormat)) { return true; }
  
  return false;
}
// Middleware
app.use(bodyParser.json());

// Database Connection
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("MongoDB connected"))
    .catch(err => console.error("MongoDB connection error:", err));

// vivek commit start
const feedbackSchema = new mongoose.Schema({
  email: { type: String, required: true },
  feedback_desc: { type: String, required: true },
  feedback_type: { type: Number, required: true, validator:()=>{
    if(this.feedback_type != 0 || this.feedback_type != 1)
      return "invalid feedback type"
  } },
},{timestamps:true});

// Create a Model based on the Schema
const Feedback = mongoose.model('Feedback', feedbackSchema);

// POST API to Submit Feedback
app.post('/farmer/feedback', async (req, res) => {
  const { email, feedback_desc, feedback_type } = req.body;

  try {
    console.log(feedback_desc.length);
    if(!email || !feedback_desc){
      return res.json({
        success:false,
        msg:"All fields are required"
      });
    }

    if(!isEmail(email)){
      return res.json({
        success:false,
        msg:"inavalid email address"
      });
    }

    if(feedback_desc.length < 20){
      return res.json({
        success:false,
        msg:"please elaborate your feedback"
      });
    }

    if(feedback_type > 1){
      return res.json({
        success:false,
        msg:"inavalid feedback type"
      });
    }

    const feedback = new Feedback({
      email,
      feedback_desc,
      feedback_type,
    });

    // Save to the database
    await feedback.save();

    res.status(201).json({
      success: true,
      msg: 'Your feedback recorded successfully.',
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      success: false,
      msg: 'Failed to save feedback.',
    });
  }
});

// GET API to Fetch Latest Feedbacks
app.get('/admin/feedback', async (req, res) => {
  const top = parseInt(req.query.top) || 10; // Default to 10 if 'top' is not provided

  try {
    const feedbacks = await Feedback.find()
      .sort({ date: -1 }) // Sort by latest feedback
      .limit(top); // Fetch the top 'n' feedbacks

    res.status(200).json({
      success: true,
      data: feedbacks,
      msg: 'Successfully fetched feedback data.',
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      success: false,
      msg: 'Failed to fetch feedbacks.',
    });
  }
});


//vivek commit ends


// Routes
app.use("/api/users", userRoutes);

app.get("/", (req, res) => {
    res.send("Welcome to the Express.js server!");
});
//start
// 
// Map month names to numbers for easier processing
const monthMapping = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
};
// farmer in particular time found 
app.get("/admin/activeusers", async (req, res) => {
  try {
    const { month, week, day } = req.query;

    if (!month || !week || !day) {
      return res.status(400).json({
        success: false,
        msg: "Please provide 'month', 'week', and 'day' parameters.",
      });
    }

    // Parse month
    const monthNumber = monthMapping[month.toLowerCase()];
    if (!monthNumber) {
      return res.status(400).json({
        success: false,
        msg: "Invalid 'month' parameter. Use values like jan, feb, etc.",
      });
    }

    // Parse week and day
    const weekNumber = parseInt(week, 10);
    const dayNumber = parseInt(day, 10);

    if (isNaN(weekNumber) || weekNumber < 1 || weekNumber > 4) {
      return res.status(400).json({
        success: false,
        msg: "'week' must be a number between 1 and 4.",
      });
    }
    if (isNaN(dayNumber) || dayNumber < 1 || dayNumber > 31) {
      return res.status(400).json({
        success: false,
        msg: "'day' must be a number between 1 and 31.",
      });
    }

    // Compute day range for the specified week
    const startDay = (weekNumber - 1) * 7 + 1; // First day of the week
    const endDay = Math.min(startDay + 6, 31); // Last day of the week

    // MongoDB Aggregation
    const farmers = await User.aggregate([
      {
        $match: {
          $expr: {
            $and: [
              { $eq: [{ $month: "$createdAt" }, monthNumber] }, // Match month
              { $gte: [{ $dayOfMonth: "$createdAt" }, startDay] }, // Match start of the week
              { $lte: [{ $dayOfMonth: "$createdAt" }, endDay] }, // Match end of the week
              { $eq: [{ $dayOfMonth: "$createdAt" }, dayNumber] } // Match specific day
            ],
          },
        },
      },
    ]);

    // Response
    res.json({
      success: true,
      count: farmers.length,
      data: farmers,
      message: `Farmers registered in ${month} on week ${weekNumber} and day ${dayNumber}.`,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      msg: "Server Error",
    });
  }
});
module.exports = app;
