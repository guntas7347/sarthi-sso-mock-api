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

/**
 * Get all users with their username, name, role, and email.
 * @param {import("express").Request} req 
 * @param {import("express").Response} res 
 */
async function getAllUsers(req, res) {
  if (!isValidApiKey(req)) {
    console.log("Unauthorized request: missing or invalid API key");
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Invalid or missing API key",
    });
  }

  try {
    const users = await userService.getAllUsers();

    console.log(`Successfully fetched ${users.length} users`);

    return res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    console.error("GetAllUsers controller error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

/**
 * Create a new user.
 * Takes username, name, role, email (and optional password, totpKey, otherdata).
 * @param {import("express").Request} req 
 * @param {import("express").Response} res 
 */
async function createUser(req, res) {
  if (!isValidApiKey(req)) {
    console.log("Unauthorized request: missing or invalid API key");
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Invalid or missing API key",
    });
  }

  const { username, name, role, email, password, totpKey, otherdata } = req.body || {};

  if (!username || typeof username !== "string" || !username.trim()) {
    return res.status(400).json({
      success: false,
      message: "Username is required",
    });
  }

  if (!email || typeof email !== "string" || !email.trim()) {
    return res.status(400).json({
      success: false,
      message: "Email is required",
    });
  }

  try {
    // Check if username already exists
    const existingUser = await userService.getUserByUsername(username.trim());
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: `User with username '${username.trim()}' already exists`,
      });
    }

    // Check if email already exists
    const existingEmailUser = await userService.getUserByEmail(email.trim());
    if (existingEmailUser) {
      return res.status(409).json({
        success: false,
        message: `User with email '${email.trim()}' already exists`,
      });
    }

    const newUser = await userService.createUser({
      username: username.trim(),
      name: name ? String(name).trim() : "",
      role: role ? String(role).trim() : "user",
      email: email.trim(),
      password,
      totpKey,
      otherdata,
    });

    console.log(`Successfully created user: ${newUser.username}`);

    return res.status(201).json({
      success: true,
      message: "User created successfully",
      user: newUser,
    });
  } catch (error) {
    console.error("CreateUser controller error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

module.exports = {
  getUser,
  getAllUsers,
  createUser,
  resetPassword,
  generateResetCode,
};

