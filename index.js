const fs = require("fs");
const PDFDocument = require("pdf-lib").PDFDocument;
const puppeteer = require("puppeteer");
const path = require("path");
const downloadPath = path.resolve("./download");
const { setTimeout } = require("node:timers/promises");
const express = require("express");
const bodyParser = require("body-parser");
const pdf = require("pdf-parse");
const multer = require("multer");
const upload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, "uploads/");
    },
    filename: function (req, file, cb) {
      cb(null, Date.now() + ".pdf"); //Appending .jpg
    },
  }),
});

const PORT = process.env.PORT || 3000;

const app = express();

app.use(express.static("public"));

app.use(
  bodyParser.urlencoded({
    extended: true,
    limit: "50mb",
    parameterLimit: 1000000,
  })
);
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.raw());

// app.use(express.json({limit: '50mb'}));
// app.use(express.urlencoded({limit: '50mb'}));

app.listen(PORT, () => {
  console.log("Thx for listening on", PORT);
});

app.post("/pdf", upload.single("file"), (req, res) => {
  //   console.log(
  //     "Got file..",
  //     Object.keys(req.body).length,
  //     Object.values(req.body)
  //   );
  //   useSmallPdfToUnlockFile(req.body);

  console.log("uploaded files....??");

  //   const raw = JSON.stringify(req.body);

  //   let buff = Buffer.from(raw, "base64");

  //   useSmallPdfToUnlockFile(raw);

  //   fs.writeFile("./download/testing_this_out.pdf", buff, () => {
  //     console.log("done....");
  //   });

  //   pdf(buff).then((data) => {
  //     console.log("data from pdf...", data, "and buff...", buff);
  //     fs.writeFile("./download/testing_this_out.pdf", data, () => {
  //       console.log("done....");
  //     });
  //   });

  res.sendStatus(200);
});

/**
 * TODO...
 *
 * - Need to deploy a server app... somehow
 * - Need frontend to accept, idk, title, and then upload the pdf file.
 * - Then we need to send that file through our "useSmallPdf" function,
 * download that file,
 * and then send that into our splitPdf function.
 * - And then we need to download all those files... on the client... as a zip? Idk...
 */

const desiredSubdocumentsRaw = `1-3: Contact Information
4: IPP Participation Agreement
5-6: Telehealth Agreement
7-8: Participant Rights
9: Privacy Practices
10-11: Informed Consent
12: Telehealth Consent
13-14: Attendance Policy
15: IPP Goals
16-17: Collateral ROI
18: Partner ROI
19: Email ROI
20: Therapy Fee
21: Emergency Plan
22: Insurance Information
23: Insurance Authorization `;

const desiredSubdocuments = desiredSubdocumentsRaw.split("\n").map((line) => {
  const [range, title] = line.split(": ");
  const [start, end] = range.split("-").map((x) => parseInt(x));
  const realRange = [start - 1];
  if (end) {
    realRange.push(end - 1);
  }
  return { title, range: realRange };
});

// ================================================================

async function splitPdf(pathToPdf) {
  const docmentAsBytes = await fs.promises.readFile(pathToPdf);

  // Load your PDFDocument
  // Oh, we can just... ignore encryption?? No... it doesn't work. Prints blank pages haha.
  const pdfDoc = await PDFDocument.load(docmentAsBytes);

  for (const { title, range } of desiredSubdocuments) {
    // console.log("title", title, range);
    const subDocument = await PDFDocument.create();
    const copiedPages = await subDocument.copyPages(pdfDoc, range);
    for (const p of copiedPages) {
      subDocument.addPage(p);
    }
    const pdfBytes = await subDocument.save();
    await writePdfBytesToFile(`./download/${title}.pdf`, pdfBytes);
  }
}

function writePdfBytesToFile(fileName, pdfBytes) {
  return fs.promises.writeFile(fileName, pdfBytes);
}

// ================================================================

/**
 * Absolutely cannot believe that this works lol
 */
async function useSmallPdfToUnlockFile(pdfFileToUnlock) {
  console.log("we have called usesmallpdf");
  const browser = await puppeteer.launch({
    headless: false,
  });

  const page = await browser.newPage();
  await page.goto("https://smallpdf.com/unlock-pdf", {
    waitUntil: "networkidle2",
  });

  const elementHandle = await page.$("input[type=file]");

  // OOooh this HAS to be a string.... so I guess we have to download the file.... to fs....
  //   const fileToUpload = "./test.pdf";
  const fileToUpload = pdfFileToUnlock;

  await elementHandle.uploadFile(fileToUpload);

  await page.waitForSelector("input[type=checkbox]");

  await page.evaluate(() => {
    // Pinky promise
    document.querySelector("input[type=checkbox]").click();
    // Click "Unlock" button
    document.querySelectorAll(".unlock-panel-component>div")[1]?.click();
  });

  // Wait for it to unlock

  page.on("framenavigated", async (frame) => {
    const url = frame.url(); // the new url

    if (!url.includes("smallpdf.com/result")) return;

    const newPage = await browser.newPage();
    await newPage.goto(url, {
      waitUntil: "networkidle2",
    });

    const client = await newPage.target().createCDPSession();
    await client.send("Page.setDownloadBehavior", {
      behavior: "allow",
      downloadPath: downloadPath,
    });

    await newPage.evaluate(() => {
      document.querySelectorAll("a").forEach((anchor) => {
        if (anchor.href.includes("files.smallpdf.com")) {
          anchor.click();
        }
      });
    });

    // Give it enough time to actually download before closing the browser
    await setTimeout(2000);

    await browser.close();
  });
}

const run = async () => {
  //   useSmallPdfToUnlockFile();
  await splitPdf("test-unlocked.pdf");

  //   console.log(desiredSubdocuments);
};

// run();
