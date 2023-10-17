# Split up a PDF

The goal is to let the user supply a PDF file, and then split that into subdocuments based on page numbers, and save each of those as a new PDF, and output that to the user in some way (probably in a zip file?).

The closest I got was the `splitPDF` function in the `index.js` server file. This works as long as the file that is passed into it is not encrypted.

I couldn't get it to work with Javascript.

However, Python made it super easy. See `script.py`. Use `flask run` to run the app in dev mode.

We got it working without any files on the disk in `script2.py`.

And remember in console we need `export FLASK_APP={fileName}`, like `export FLASK_APP=script2`, in order for `flask run` to run the proper file.

## Issues

I couldn't get it to work. The main obstacle was dealing with encrypted PDFs. Apparently many PDFs have a default encryption, so that they can be opened and viewed with any PDF-viewing software, but not necessarily accessed programatically.

These are the libraries I tried to use:

- [Pdf-lib](https://pdf-lib.js.org/) -- Works great, runs on the client-side, splits the PDF perfectly -- except it cannot handle default encryption. So I used this [somewhat sketchy online tool](https://smallpdf.com/unlock-pdf_) to remove the default encryption from my test PDF, before passing it into PDF-lib. I also tried writing a Puppeteer script to automatically pass the uploaded (encrypted) PDF to this sketchy service, but then I realized that's not a secure way to handle real-life PDFs.
- [PDFjs](https://mozilla.github.io/pdf.js/getting_started/) -- Mozilla's tool for rendering PDFs. Works great, handles default encryption, but then I can't see what to do with the representation of the info it gives you. I can't see how to split it up or save it as subdocuments. All it seems to expose is info that helps you render the PDF visually.
- [JS PDF]()
- [PDFjs #2]() -- See `index2.js` -- couldn't handle default encryption.

## Other things that may be useful

I found these libraries useful:

- [Uppy]() -- A nice UI for uploading files
- [Download.js](https://cdn.jsdelivr.net/npm/downloadjs@1.4.7/download.min.js) -- Easy way to trigger a download event on the client side.
- [File Reader API](https://developer.mozilla.org/en-US/docs/Web/API/FileReader) -- I used this to grab uploaded PDF file info on the client side.

I had to use this pattern to read file info:

```
const reader = new FileReader();
reader.readAsArrayBuffer(fileInfo);
reader.onload = async () => {
  // Do something with reader.result
};
```

## Ideas for future iterations

It seems like we should be able to programmatically "strip" the encryption from a PDF, perhaps using something like [qpdf](https://github.com/qpdf/qpdf), and then pass it into our `splitPDF` method.

It might also work to write a Node app that could be exported as an executable file and then run directly on the user's machine, instead of running on a web app.

Or, you could avoid the need to export to executable, as long as Node (or Python, or whatever) were downloaded on the user's machine.
