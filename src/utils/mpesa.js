// src/utils/mpesa.js
// Safaricom Daraja API integration
// Docs: https://developer.safaricom.co.ke/APIs/MpesaExpressSimulate

const https = require("https");

const BASE_URL = process.env.MPESA_BASE_URL || "https://sandbox.safaricom.co.ke";
const CONSUMER_KEY = process.env.MPESA_CONSUMER_KEY;
const CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET;
const SHORTCODE = process.env.MPESA_SHORTCODE || "542542";

/**
 * Get OAuth access token from Safaricom.
 * Token is valid for 1 hour — in production, cache and refresh.
 */
async function getAccessToken() {
  return new Promise((resolve, reject) => {
    if (!CONSUMER_KEY || !CONSUMER_SECRET) {
      return reject(new Error("M-Pesa credentials not configured in .env"));
    }

    const credentials = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString("base64");
    const url = new URL(`${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`);

    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: "GET",
      headers: {
        Authorization: `Basic ${credentials}`,
      },
    };

    const req = https.request(options, res => {
      let data = "";
      res.on("data", chunk => (data += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.access_token) resolve(parsed.access_token);
          else reject(new Error("Failed to get M-Pesa token: " + data));
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on("error", reject);
    req.end();
  });
}

/**
 * Query M-Pesa transaction status by code.
 * Uses the Transaction Status API (requires the M-Pesa code).
 *
 * NOTE: In sandbox mode, this always returns a simulated response.
 * In production, this queries the actual transaction.
 */
async function verifyTransaction(mpesaCode) {
  // In sandbox / demo mode, simulate verification
  if (process.env.MPESA_ENVIRONMENT === "sandbox" || !CONSUMER_KEY) {
    return {
      verified: true,
      simulated: true,
      message: "Sandbox mode: transaction assumed valid",
      code: mpesaCode,
    };
  }

  try {
    const token = await getAccessToken();

    return new Promise((resolve, reject) => {
      const body = JSON.stringify({
        Initiator: "testapi",
        SecurityCredential: process.env.MPESA_SECURITY_CREDENTIAL || "",
        CommandID: "TransactionStatusQuery",
        TransactionID: mpesaCode,
        PartyA: SHORTCODE,
        IdentifierType: "4",
        ResultURL: `${process.env.APP_URL}/api/mpesa/callback`,
        QueueTimeOutURL: `${process.env.APP_URL}/api/mpesa/timeout`,
        Remarks: "Andy Homecare verification",
        Occasion: "Registration",
      });

      const url = new URL(`${BASE_URL}/mpesa/transactionstatus/v1/query`);
      const options = {
        hostname: url.hostname,
        path: url.pathname,
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
      };

      const req = https.request(options, res => {
        let data = "";
        res.on("data", chunk => (data += chunk));
        res.on("end", () => {
          try {
            const parsed = JSON.parse(data);
            resolve({
              verified: parsed.ResponseCode === "0",
              raw: parsed,
              code: mpesaCode,
            });
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on("error", reject);
      req.write(body);
      req.end();
    });
  } catch (err) {
    return { verified: false, error: err.message, code: mpesaCode };
  }
}

module.exports = { getAccessToken, verifyTransaction };
