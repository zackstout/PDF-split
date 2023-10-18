# Split up a PDF

The goal is to let the user supply a PDF file, and then split that into subdocuments based on page numbers, and save each of those as a new PDF, and output that to the user in some way (probably in a zip file?).

Python made it super easy. See `splitPdf.py`. We use [Flask](https://flask.palletsprojects.com/en/3.0.x/) to serve the solution as a web app. Use `flask run` to run the app in dev mode.

And remember in console we need `export FLASK_APP={fileName}`, like `export FLASK_APP=splitPdf`, in order for `flask run` to run the proper file.

## Ideas for future iterations

We may want to export this as an app that can be downloaded and run on a user's computer, to avoid security issues with the deployed Python solution (deployed with [Python Anywhere](https://www.pythonanywhere.com/)).
