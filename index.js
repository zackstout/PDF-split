const fs = require("fs");
const PDFDocument = require("pdf-lib").PDFDocument;
const puppeteer = require("puppeteer");
const path = require("path");
const downloadPath = path.resolve("./download");
const { setTimeout } = require("node:timers/promises");

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
  // Oh, we can just... ignore encryption??
  const pdfDoc = await PDFDocument.load(docmentAsBytes, {
    ignoreEncryption: true,
  });

  //   const numberOfPages = pdfDoc.getPages().length;

  for (const { title, range } of desiredSubdocuments) {
    console.log("title", title, range);
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
async function simplefileDownload() {
  const browser = await puppeteer.launch({
    headless: false,
  });

  const page = await browser.newPage();
  await page.goto("https://smallpdf.com/unlock-pdf", {
    waitUntil: "networkidle2",
  });

  const elementHandle = await page.$("input[type=file]");
  await elementHandle.uploadFile("./test.pdf");

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
  //   simplefileDownload();
  await splitPdf("test-unlocked.pdf");

  //   console.log(desiredSubdocuments);
};

run();
