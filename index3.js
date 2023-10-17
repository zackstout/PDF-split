const PDFExtract = require("pdf.js-extract").PDFExtract;
const pdfExtract = new PDFExtract();
const options = {}; /* see below */
pdfExtract.extract("public/test.pdf", options, (err, data) => {
  if (err) return console.log(err);
  console.log(data, JSON.stringify(data.pages[0]));
});

/**
 * This is a wrapper around PDF.js.... it works.... like that one, gets through encryption..
 *
 * But I can't figure out how to use its data to save a new pdf file...
 *
 * You'd think we should be able to use like... JSPDF, or the serverside PDF js...
 */
