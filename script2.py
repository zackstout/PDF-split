
from flask import Flask, redirect, url_for, request, render_template, send_file
from zipfile36 import ZipFile, ZIP_DEFLATED, ZipInfo
import re
# So I had to pip3 install PyPDF2, and pip3 install pycryptodome==3.15.0
from PyPDF2 import PdfWriter, PdfReader, PdfFileReader
from io import BytesIO

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

    zipFilename = 'zip_upload/' + prefix + '.zip'

    pagesDict = setupPagesDict()

    print("Processing PDF...")

    memory_file = BytesIO()

    inputpdf = PdfReader(file)

    with ZipFile(memory_file, 'w') as zf:
        # Create a subdocument for each slice of pages, and save it to the zip
        for title in pagesDict:
            output = PdfWriter()
            realRange = pagesDict[title]
            for i in range(realRange[0], realRange[1]+1):
                # print(i)
                output.add_page(inputpdf.pages[i-1])
    
            data = ZipInfo(title)
            data.compress_type = ZIP_DEFLATED
             # Writes all bytes to bytes-stream
            response_bytes_stream = BytesIO()
            output.write(response_bytes_stream)
            zf.writestr(data, response_bytes_stream.getvalue())
            
    memory_file.seek(0) 

    return send_file(memory_file,
            mimetype = 'zip',
            download_name = prefix,
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

# Testing with input from file system:
# inputpdf = PdfReader(open("public/test.pdf", "rb"))
# processPDF(inputpdf)

# main driver function
if __name__ == '__main__':
    # run() method of Flask class runs the application 
    # on the local development server.
    app.run(debug=True)
