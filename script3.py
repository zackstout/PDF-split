
# This is from the deployed version that I KNOW FOR A FACT was working


from flask import Flask, redirect, url_for, request, render_template, send_file
from zipfile36 import ZipFile, ZIP_DEFLATED
import os
import re
import shutil
# So I had to pip3 install PyPDF2, and pip3 install pycryptodome==3.15.0
from PyPDF2 import PdfWriter, PdfReader, PdfFileReader

app = Flask(__name__)

@app.route('/', methods=["POST", "GET"])
def index():

    # Just hard code the HTML here since I can't figure out how to send a separate HTML file...
    return """
        <form

        enctype="multipart/form-data"
        method="post"
        action="/split"
      >
        <input id="upload" type="file" name="file" accept="application/pdf" />

        <input type="text" placeholder="File prefix" name="prefix"/>

        <input type="submit" value="Submit">
      </form>
    """


# This is called when the user submits the form defined above
@app.route("/split", methods=["POST"])
def split():
    # Grab data from the form
    file = request.files['file']
    prefix = request.form['prefix']

    # Remove dangerous characters from the user-entered file prefix
    prefix = re.sub('/', '-', prefix)
    prefix = re.sub(' ', '_', prefix)
    prefix = re.sub('\.', '_', prefix)
    print("prefix", prefix)

    # Grab references to the temp upload folders so we can delete/re-create them
    cwd = os.getcwd()
    zipDir = os.path.join(cwd, "zip_upload")
    uploadsDir = os.path.join(cwd, "temp_uploads")

    # Clear out the temp_uploads folder
    if (not os.path.exists(uploadsDir)):
        os.mkdir(uploadsDir)

    # Split up the pdf into subdocuments, then zip them up and send back to client:
    processPDF(PdfReader(file))

    # Remove zip file from previous request, if it exists
    if (os.path.exists(zipDir)):
        shutil.rmtree(zipDir)

    os.mkdir(zipDir)

    zipFilename = 'zip_upload/' + prefix + '.zip'

    zipf = ZipFile(zipFilename, 'w', ZIP_DEFLATED)
    for root,dirs, files in os.walk('temp_uploads/'):
        for file in files:
            filename, extension = file.split(".")
            zipf.write("temp_uploads/" + file, prefix + "_" + filename + "." + extension)
    zipf.close()

    if (os.path.exists(uploadsDir)):
        shutil.rmtree(uploadsDir)

    print("Trying to send zip...!!!", zipFilename, os.path.exists(zipDir))

    return send_file(os.path.join(cwd, zipFilename),
            mimetype = 'zip',
            as_attachment = True)


# print('what up')

pagesDictString = '''1-3: Contact Information
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
23: Insurance Authorization'''

# pagesDictString


def setupPagesDict():
    pagesDict = {}
    for line in pagesDictString.split("\n"):
        rangeStr, title = line.split(": ")
        realRange = list(map(int,rangeStr.split("-")))
        if (len(realRange) == 1):
            realRange.append(realRange[0])
        # print(title, realRange)
        pagesDict[title] = realRange;
    return pagesDict


def processPDF(inputpdf):
    pagesDict = setupPagesDict()

    print("Processing PDF...")

    for title in pagesDict:
        output = PdfWriter()
        realRange = pagesDict[title]
        for i in range(realRange[0], realRange[1]+1):
            # print(i)
            output.add_page(inputpdf.pages[i-1])
        with open("temp_uploads/%s.pdf" % title, "wb") as outputStream:
            output.write(outputStream)


# Testing with input from file system:
# inputpdf = PdfReader(open("public/test.pdf", "rb"))
# processPDF(inputpdf)

# main driver function
if __name__ == '__main__':
    # run() method of Flask class runs the application
    # on the local development server.
    app.run(debug=True)


