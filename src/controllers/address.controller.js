import { Address } from "../models/Address.model.js";
import { User } from "../models/User.model.js";


// ✅ Add new address (with validation & safety)
export const addAddress = async (req, res) => {
    try {
        const userId = req.user.id; // From verifyToken middleware
        const { fullName, phone, street, landmark, city, state, postalCode, country, addressType, isDefault, // still allow passing, but will override if first address
        } = req.body;

        // ✅ Validate required fields
        if (!fullName || !phone || !street || !city || !state || !postalCode) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields. Please fill all mandatory address fields.",
            });
        }

        // ✅ Format validation
        const phoneRegex = /^[0-9]{10}$/;
        const postalRegex = /^[0-9]{5,6}$/;

        if (!phoneRegex.test(phone)) {
            return res.status(400).json({ success: false, message: "Invalid phone number format." });
        }

        if (!postalRegex.test(postalCode)) {
            return res.status(400).json({ success: false, message: "Invalid postal code format." });
        }

        // ✅ Check for duplicate address
        const existing = await Address.findOne({
            user: userId,
            street: street.trim(),
            postalCode: postalCode.trim(),
        });

        if (existing) {
            return res.status(409).json({
                success: false,
                message: "Address already exists for this location.",
            });
        }

        // ✅ Check if this is the first address
        const existingAddresses = await Address.countDocuments({ user: userId });
        const shouldBeDefault = existingAddresses === 0 || isDefault;

        // ✅ If new address is marked default, unset other defaults
        if (shouldBeDefault) {
            await Address.updateMany({ user: userId }, { isDefault: false });
        }

        // ✅ Create new address
        const address = await Address.create({
            user: userId,
            fullName: fullName.trim(),
            phone: phone.trim(),
            street: street.trim(),
            landmark: landmark?.trim() || "",
            city: city.trim(),
            state: state.trim(),
            postalCode: postalCode.trim(),
            country: country?.trim() || "India",
            addressType: addressType || "home",
            isDefault: shouldBeDefault,
        });

        // ✅ Add address reference to user
        await User.findByIdAndUpdate(userId, { $push: { addresses: address._id } });

        return res.status(201).json({
            success: true,
            message: shouldBeDefault
                ? "Address added as default ✅"
                : "Address added successfully ✅",
            address,
        });
    } catch (error) {
        console.error("❌ Add Address Error:", error);

        if (error.name === "ValidationError") {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: Object.values(error.errors).map((e) => e.message),
            });
        }

        return res.status(500).json({
            success: false,
            message: "Server error while adding address",
            error: error.message,
        });
    }
};


// ✅ Get all addresses
export const getAddresses = async (req, res) => {
    try {
        const userId = req.user.id;

        const addresses = await Address.find({ user: userId }).sort({ createdAt: -1 });

        res.json(addresses);
    } catch (error) {
        console.error("Get Addresses Error:", error);
        res.status(500).json({ message: "Server error while fetching addresses" });
    }
};

// ✅ Update an address
export const updateAddress = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const updated = await Address.findOneAndUpdate(
            { _id: id, user: userId },
            req.body,
            { new: true }
        );

        if (!updated) {
            return res.status(404).json({ message: "Address not found or unauthorized" });
        }

        res.json({ message: "Address updated successfully ✅", updated });
    } catch (error) {
        console.error("Update Address Error:", error);
        res.status(500).json({ message: "Server error while updating address" });
    }
};

// ✅ Delete an address
export const deleteAddress = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const deleted = await Address.findOneAndDelete({ _id: id, user: userId });

        if (!deleted) {
            return res.status(404).json({ message: "Address not found or unauthorized" });
        }

        // Remove from user's addresses array
        await User.findByIdAndUpdate(userId, { $pull: { addresses: id } });

        res.json({ message: "Address deleted successfully ✅" });
    } catch (error) {
        console.error("Delete Address Error:", error);
        res.status(500).json({ message: "Server error while deleting address" });
    }
};
