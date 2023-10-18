

from flask import Flask, redirect, url_for, request, render_template, send_file
from zipfile36 import ZipFile, ZIP_DEFLATED
import os
import re
import shutil
# So I had to pip3 install PyPDF2, and pip3 install pycryptodome==3.15.0
from PyPDF2 import PdfWriter, PdfReader

app = Flask(__name__)

@app.route('/', methods=["POST", "GET"])
def index():
    cwd = os.getcwd()
    return send_file(os.path.join(cwd, "static/index.html"))

# This is called when the user submits the form defined above
@app.route("/split", methods=["POST"])
def split():
    # Grab data from the form
    pdfFile = request.files['file']
    prefix = request.form['prefix']
    doc_type = request.form['doc_type']

    # Remove dangerous characters from the user-entered file prefix
    prefix = re.sub('/', '-', prefix)
    prefix = re.sub(' ', '_', prefix)
    prefix = re.sub('\.', '_', prefix)
    print("prefix", prefix, "doc_type", doc_type)

    # Grab references to the temp upload folders so we can delete/re-create them
    cwd = os.getcwd()
    zipDir = os.path.join(cwd, "zip_upload")
    uploadsDir = os.path.join(cwd, "temp_uploads")
 
    # Split up the pdf into subdocuments
    processPDF(PdfReader(pdfFile), uploadsDir, doc_type)

    # Zip up the files
    zipFilename = zipUp(prefix, zipDir)

    # Cleanup
    if (os.path.exists(uploadsDir)):
        shutil.rmtree(uploadsDir)

    print("Trying to send zip...!!!", zipFilename, os.path.exists(zipDir))
    return send_file(os.path.join(cwd, zipFilename),
            mimetype = 'zip',
            as_attachment = True)


# print('what up')

# pagesDictString = '''1-3: Contact Information
# 4: IPP Participation Agreement
# 5-6: Telehealth Agreement
# 7-8: Participant Rights
# 9: Privacy Practices
# 10-11: Informed Consent
# 12: Telehealth Consent
# 13-14: Attendance Policy
# 15: IPP Goals
# 16-17: Collateral ROI
# 18: Partner ROI
# 19: Email ROI
# 20: Therapy Fee
# 21: Emergency Plan
# 22: Insurance Information
# 23: Insurance Authorization'''

survivorPagesDictString = '''Contact Information: 1-3
Participant Rights: 4-5
Informed Consent: 6-7
Telehealth Informed Consent: 8
Telehealth Agreement: 9-10
Participation Agreement: 11-12
Email ROI: 13
Insurance Registration: 14
Insurance Authorization: 15-16
Safety Questionnaire: 17-18'''

interventionPagesDictString = '''Contact Information: 1-3
Participant Agreement: 4-5
Telehealth Agreement: 6-7
Participant Rights: 8-9
Informed Consent: 10-11
TeleHealth Informed Consent: 12
Attendance Policy: 13-14
Program Goals: 15
Collateral ROI: 16-17
Partner ROI: 18
Email ROI: 19
Emergency plan: 20-21
Insurance Registration: 22
Insurance Authorization: 23-24'''

# Crappy parsing code, could be a one-liner probably
def setupPagesDict(doc_type = "survivor"):
    pagesDict = {}
    dictString = survivorPagesDictString
    if (doc_type == "intervention"):
        dictString = interventionPagesDictString

    for line in dictString.split("\n"):
        title, rangeStr = line.split(": ")
        realRange = list(map(int,rangeStr.split("-")))
        if (len(realRange) == 1):
            realRange.append(realRange[0])
        # print(title, realRange)
        pagesDict[title] = realRange;
    return pagesDict


def processPDF(inputpdf, uploadsDir, doc_type):
    # Clear out the temp_uploads folder
    if (not os.path.exists(uploadsDir)):
        os.mkdir(uploadsDir)

    # Determine page ranges for desired subdocuments
    pagesDict = setupPagesDict(doc_type)

    print("Processing PDF...")

    # Write each desired subdocument to the temp_uploads folder
    for title in pagesDict:
        output = PdfWriter()
        realRange = pagesDict[title]
        for i in range(realRange[0], realRange[1]+1):
            # print(i)
            output.add_page(inputpdf.pages[i-1])
        with open("temp_uploads/%s.pdf" % title, "wb") as outputStream:
            output.write(outputStream)


def zipUp(prefix, zipDir):
    # Remove zip file from previous request, if it exists
    if (os.path.exists(zipDir)):
        shutil.rmtree(zipDir)
    os.mkdir(zipDir)

    zipFilename = 'zip_upload/' + prefix + '.zip'
    zipf = ZipFile(zipFilename, 'w', ZIP_DEFLATED)

    # Add every subdocument PDF from temp_uploads to the zip
    for root,dirs, files in os.walk('temp_uploads/'):
        for file in files:
            filename, extension = file.split(".")
            zipf.write("temp_uploads/" + file, prefix + "_" + filename + "." + extension)
    zipf.close()

    # Return the file path where this zip is now stored
    return zipFilename


# Testing with input from file system:
# inputpdf = PdfReader(open("public/test.pdf", "rb"))
# processPDF(inputpdf)

# main driver function
if __name__ == '__main__':
    # run() method of Flask class runs the application
    # on the local development server.
    app.run(debug=True)


