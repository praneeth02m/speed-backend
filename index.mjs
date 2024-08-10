import express from "express";
import cors from "cors";
import { launch } from "chrome-launcher";
import lighthouse from "lighthouse";

const app = express();
app.use(cors());
app.use(express.json());

// Route to handle GET requests to "/"
app.get("/", (req, res) => {
  res.send("SpeedX Backend is up and running!");
});

app.post("/analyze", async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  try {
    const chrome = await launch({ chromeFlags: ["--headless"] });
    const options = {
      logLevel: "info",
      output: "json",
      onlyCategories: ["performance"],
      port: chrome.port,
    };
    const runnerResult = await lighthouse(url, options);
    await chrome.kill();

    const convertToSeconds = (value) =>
      value !== undefined && value !== null
        ? `${(value / 1000).toFixed(1)}s`
        : "N/A";

    const metrics = {
      performance: runnerResult.lhr.categories.performance.score * 100,
      ttfb: convertToSeconds(
        runnerResult.lhr.audits["time-to-first-byte"]?.numericValue
      ),
      lcp: convertToSeconds(
        runnerResult.lhr.audits["largest-contentful-paint"]?.numericValue
      ),
      cls:
        runnerResult.lhr.audits[
          "cumulative-layout-shift"
        ]?.numericValue.toFixed(4) || "N/A",
      fid: convertToSeconds(
        runnerResult.lhr.audits["first-input-delay"]?.numericValue
      ),
      fcp: convertToSeconds(
        runnerResult.lhr.audits["first-contentful-paint"]?.numericValue
      ),
      speedIndex: convertToSeconds(
        runnerResult.lhr.audits["speed-index"]?.numericValue
      ),
      tbt: convertToSeconds(
        runnerResult.lhr.audits["total-blocking-time"]?.numericValue
      ),
      tti: convertToSeconds(
        runnerResult.lhr.audits["interactive"]?.numericValue
      ),
      inputLatency: convertToSeconds(
        runnerResult.lhr.audits["estimated-input-latency"]?.numericValue
      ),
      totalPageSize:
        (
          runnerResult.lhr.audits["total-byte-weight"]?.numericValue /
          1024 /
          1024
        ).toFixed(2) + " MB",
      numRequests:
        runnerResult.lhr.audits["network-requests"]?.details.items.length ||
        "N/A",
    };

    res.json(metrics);
  } catch (error) {
    console.error("Error occurred:", error);
    res.status(500).json({
      error: "Failed to analyze the website.",
      details: error.message,
    });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
