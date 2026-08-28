const userService = require("../services/userService");

// Accept both the new key "asnjhijcs" and original key "asnjhijc" to be robust
const ALLOWED_API_KEYS = ["asnjhijcs", "asnjhijc"];

/**
 * Helper to validate the API key from body, headers, or query parameters.
 * @param {import("express").Request} req 
 * @returns {boolean}
 */
function isValidApiKey(req) {
  let apiKey = req.body?.apiKey || req.body?.apikey || req.headers["x-api-key"] || req.query?.apiKey || req.query?.apikey;

  if (!apiKey && req.headers["authorization"]) {
    const parts = req.headers["authorization"].split(" ");
    if (parts.length === 2) {
      apiKey = parts[1];
    } else {
      apiKey = req.headers["authorization"];
    }
  }

  return apiKey && ALLOWED_API_KEYS.includes(apiKey);
}

/**
 * Get user details by username from Firestore.
 * Requires username and the correct API Key.
 * @param {import("express").Request} req 
 * @param {import("express").Response} res 
 */
async function getUser(req, res) {
  if (!isValidApiKey(req)) {
    console.log("Unauthorized request: missing or invalid API key");
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Invalid or missing API key",
    });
  }

  const username = req.body?.username || req.query?.username || req.params?.username;

  if (!username) {
    console.log("Username is required but was not provided");
    return res.status(400).json({
      success: false,
      message: "Username is required",
    });
  }

  try {
    const user = await userService.getUserByUsername(username);

    if (!user) {
      console.log(`User '${username}' not found`);
      return res.status(404).json({
        success: false,
        message: `User '${username}' not found`,
      });
    }

    console.log(`Successfully fetched details for user: ${username}`);

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("GetUser controller error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

/**
 * Reset user password and update totp, resetcode, resetexpiry.
 * Requires username, API Key, and update fields.
 * @param {import("express").Request} req 
 * @param {import("express").Response} res 
 */
async function resetPassword(req, res) {
  if (!isValidApiKey(req)) {
    console.log("Unauthorized request: missing or invalid API key");
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Invalid or missing API key",
    });
  }

  const { username } = req.body;
  const newPassword = req.body?.newpassword || req.body?.newPassword;
  const totp = req.body?.totp || req.body?.totpKey;
  const resetCode = req.body?.resetcode || req.body?.resetCode;
  const resetExpiry = req.body?.resetexpiry || req.body?.resetExpiry;

  if (!username) {
    return res.status(400).json({
      success: false,
      message: "Username is required",
    });
  }

  try {
    const updatedUser = await userService.resetPassword(username, newPassword, totp, resetCode, resetExpiry);

    if (!updatedUser) {
      console.log(`User '${username}' not found for password reset`);
      return res.status(404).json({
        success: false,
        message: `User '${username}' not found`,
      });
    }

    console.log(`Successfully reset password for user: ${username}`);

    return res.status(200).json({
      success: true,
      message: "Password reset and user details updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("ResetPassword controller error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

/**
 * Generate a random reset code, save it in the database for the user, and return it.
 * Requires username and correct API Key.
 * @param {import("express").Request} req 
 * @param {import("express").Response} res 
 */
async function generateResetCode(req, res) {
  if (!isValidApiKey(req)) {
    console.log("Unauthorized request: missing or invalid API key");
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Invalid or missing API key",
    });
  }

  const { username } = req.body;

  if (!username) {
    return res.status(400).json({
      success: false,
      message: "Username is required",
    });
  }

  try {
    const resetCode = await userService.generateUserResetCode(username);

    if (!resetCode) {
      console.log(`User '${username}' not found for reset code generation`);
      return res.status(404).json({
        success: false,
        message: `User '${username}' not found`,
      });
    }

    console.log(`Successfully generated reset code for user: ${username}`);

    return res.status(200).json({
      success: true,
      resetCode,
    });
  } catch (error) {
    console.error("GenerateResetCode controller error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

module.exports = {
  getUser,
  resetPassword,
  generateResetCode,
};

