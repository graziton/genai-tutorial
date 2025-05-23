// routes/auth.js
const express = require("express");
const router = express.Router();
const OTP = require("../models/OTP");
const otpGenerator = require("otp-generator");
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

router.post("/send-otp", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    // 6-character OTP: digits only
    const code = otpGenerator.generate(6, {
      digits: true,
      lowerCaseAlphabets: false,
      upperCaseAlphabets: false,
      specialChars: false,
    });
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await OTP.findOneAndUpdate(
      { email },
      { code, expiresAt },
      { upsert: true, new: true }
    );

    // Send the OTP via email
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Your Login OTP for Learn AI",
      text: `Your login code is ${code}. It expires in 5 minutes.`,
    });

    res.json({ success: true });
  } catch (err) {
    console.error("send-otp error:", err);
    res.status(500).json({ error: "Could not send OTP" });
  }
});

router.post("/verify-otp", async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) {
    return res.status(400).json({ error: "Email and code are required" });
  }

  try {
    const record = await OTP.findOne({ email });
    if (!record) {
      return res.status(400).json({ error: "No OTP found for this email" });
    }
    if (record.code !== code) {
      return res.status(400).json({ error: "Invalid OTP" });
    }
    if (record.expiresAt < new Date()) {
      return res.status(400).json({ error: "OTP has expired" });
    }

    await OTP.deleteOne({ email });
    res.json({ success: true });
  } catch (err) {
    console.error("verify-otp error:", err);
    res.status(500).json({ error: "OTP verification failed" });
  }
});

module.exports = router;
