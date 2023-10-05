const fs = require("fs");
const PDFDocument = require("pdf-lib").PDFDocument;
const puppeteer = require("puppeteer");
const path = require("path");
const downloadPath = path.resolve("./download");
const { setTimeout } = require("node:timers/promises");
const express = require("express");
const bodyParser = require("body-parser");
const archiver = require("archiver");
const multer = require("multer");
const AdmZip = require("adm-zip");

mostRecentUploadFile = null;
isUploadComplete = false;

const upload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, "uploads/");
    },
    filename: function (req, file, cb) {
      const fileName = Date.now() + ".pdf";
      mostRecentUploadFile = fileName;
      cb(null, fileName);
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

app.use(require("connect-livereload")({ ignore: ["download", ".zip"] }));

// app.use(express.json({limit: '50mb'}));
// app.use(express.urlencoded({limit: '50mb'}));

app.listen(PORT, () => {
  console.log("Thx for listening on", PORT);
});

app.post("/pdf", upload.single("file"), async (req, res) => {
  console.log("The current file id:", mostRecentUploadFile);

  // Shoot, this doesn't quite work, because of the "on" handler....
  useSmallPdfToUnlockFile(`./uploads/${mostRecentUploadFile}`);

  const itv = setInterval(async () => {
    if (isUploadComplete) {
      console.log("Ready to split pdf into subdocuments.");
      clearInterval(itv);
      const fileId = mostRecentUploadFile.split(".")[0];
      await splitPdf(`download/${fileId}-unlocked.pdf`);
      console.log("Subdocs are prepared.");

      // const zip = new AdmZip();

      // fs.readdirSync(`./download/${fileId}`, (err, files) => {
      //   files.forEach((fileName) => {
      //     zip.addLocalFile(`./download/${fileId}/${fileName}`);
      //   });
      // });

      // const zipFileContents = zip.toBuffer();

      // res.writeHead(200, {
      //   "Content-Disposition": `attachment; filename="target.zip"`,
      //   "Content-Type": "application/zip",
      // });

      // res.end(zipFileContents);

      // const { pipeline } = require("stream");

      // Determine where to put the zip file on the server, before we send to client
      const output = fs.createWriteStream("download/target.zip");
      const archive = archiver("zip");

      output.on("close", function () {
        console.log("Zip size is ", archive.pointer() + " total bytes");
        console.log(
          "Archiver has been finalized and the output file descriptor has closed."
        );

        // res.end(output);

        // res.sendFile("download/target.zip", { root: __dirname });
        const result = fs.readFileSync("download/target.zip");
        // const data = new Buffer(result, "base64");
        // res.end(data);
        res.send(result);
        // res.end();
      });

      archive.on("error", function (err) {
        throw err;
      });

      archive.pipe(output);
      // pipeline(archive, res, () => {
      //   console.log("whatup?");
      // });
      // archive.pipe(res);

      // append files from a sub-directory, putting its contents at the root of archive
      archive.directory(`download/${fileId}`, false);

      // Testing the hypothesis that smaller zips might transfer ok....
      // archive.append(
      //   fs.createReadStream(`./download/${fileId}/Therapy Fee.pdf`),
      //   {
      //     name: "thing.pdf",
      //   }
      // );

      archive.finalize();

      // res.sendStatus(200);
    }
  }, 100);
});

/**
 * TODO...
 *
 * - Need to deploy a server app... somehow (that will come with issues, like axios request...)
 * - We are so close!!! Just need to zip up the downloaded subdocuments, and send back to client. Wow!!!
 *
 * - Should be able to NEVER save anything to disk.... right???
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
  const documentAsBytes = await fs.promises.readFile(pathToPdf);
  const fileId = pathToPdf.split("/").at(-1).split(".")[0].split("-")[0];
  // console.log("split pdf...", fileId);

  // Load your PDFDocument
  // Oh, we can just... ignore encryption?? No... it doesn't work. Prints blank pages haha.
  const pdfDoc = await PDFDocument.load(documentAsBytes);

  for (const { title, range } of desiredSubdocuments) {
    // console.log("title", title, range);
    const subDocument = await PDFDocument.create();
    const copiedPages = await subDocument.copyPages(pdfDoc, range);
    for (const p of copiedPages) {
      subDocument.addPage(p);
    }
    const pdfBytes = await subDocument.save();
    // Ahh yes this is crucial
    if (!fs.existsSync(`./download/${fileId}`)) {
      fs.mkdirSync(`./download/${fileId}`);
    }
    await writePdfBytesToFile(`./download/${fileId}/${title}.pdf`, pdfBytes);
  }
  return Promise.resolve();
}

function writePdfBytesToFile(fileName, pdfBytes) {
  return fs.promises.writeFile(fileName, pdfBytes);
}

// ================================================================

/**
 * Absolutely cannot believe that this works lol
 */
async function useSmallPdfToUnlockFile(pathToFileToUnlock) {
  isUploadComplete = false;
  console.log("Called usesmallpdf");
  const browser = await puppeteer.launch({
    headless: true,
  });

  const page = await browser.newPage();
  await page.goto("https://smallpdf.com/unlock-pdf", {
    waitUntil: "networkidle2",
  });

  const elementHandle = await page.$("input[type=file]");

  // OOooh this HAS to be a string.... so I guess we have to download the file.... to fs....
  //   const fileToUpload = "./test.pdf";
  await elementHandle.uploadFile(pathToFileToUnlock);

  await page.waitForSelector("input[type=checkbox]");

  await page.evaluate(() => {
    // Pinky promise
    document.querySelector("input[type=checkbox]").click();
    // Click "Unlock" button
    document.querySelectorAll(".unlock-panel-component>div")[1]?.click();
  });

  console.log("Attempting to unlock...");

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

    console.log("Unlocked! About to download...");

    await newPage.evaluate(() => {
      document.querySelectorAll("a").forEach((anchor) => {
        if (anchor.href.includes("files.smallpdf.com")) {
          anchor.click();
        }
      });
    });

    // Give it enough time to actually download before closing the browser
    await setTimeout(5000);

    await browser.close();

    console.log("Closing puppeteer browser.");

    isUploadComplete = true;
  });
}

// const run = async () => {
//   //   useSmallPdfToUnlockFile();
//   await splitPdf("test-unlocked.pdf");

//   //   console.log(desiredSubdocuments);
// };

// // run();
