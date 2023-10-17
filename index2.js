const pdf = require("pdfjs");
const fs = require("fs");

const src = fs.readFileSync("./test-unlocked.pdf");
const ext = new pdf.ExternalDocument(src);

const doc = new pdf.Document({
  font: require("pdfjs/font/Helvetica"),
  //   padding: 10,
});

doc.setTemplate(ext);
doc.addPagesOf(ext);
// doc.addPageOf(1, ext);

console.log("doc", doc);

// doc.pipe(fs.createWriteStream("output.pdf"));

doc
  .asBuffer()
  .then((data) => fs.writeFileSync("output.pdf", data, { encoding: "binary" }));

/**
 * Document had to be unlocked before it would work. Otherwise just blank pages.
 */
