const User = require("../models/farmerSchema");

// Get all users
const getUser = async (req, res) => {
    const { email } = req.body; 
    const updateData = req.body; // Assuming email is sent in the request body
    if (!email) {
        return res.status(400).json({ message: "Email is required to update the farmer's details." });
    }
    try { 
        const updatedFarmer = await Farmer.findOneAndUpdate(
            { email }, // Filter by email
            { $set: updateData }, // Update only the provided fields
            { new: true, runValidators: true } // Return the updated document and validate data
        );

        if (!updatedFarmer) {
            return res.status(404).json({ message: "Farmer with this email not found." });
        }

        res.status(200).json(updatedFarmer);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving user", error });
    }
};

module.exports = {getUser};
