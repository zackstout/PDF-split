
from flask import Flask, redirect, url_for, request, render_template, send_file

from zipfile36 import ZipFile, ZIP_DEFLATED

import os

app = Flask(__name__)

# So I had to pip3 install PyPDF2, and pip3 install pycryptodome==3.15.0

from PyPDF2 import PdfWriter, PdfReader, PdfFileReader


@app.route('/', methods=["POST", "GET"])
def index():

    # if request.method == "POST":
    #     print("hit the split")
    #     projectpath = request.form['file']
    #     print("projectpath", projectpath)
    #     return 200
    # return render_template('index.html')
    return """
        <form
       
        enctype="multipart/form-data"
        method="post"
        action="/split"
      >
        <input id="upload" type="file" name="file" accept="application/pdf" />

        <input type="submit" value="Submit">
      </form>
    """

# @app.route('/success/<name>')
# def success(name):
#     return 'welcome %s' % name
 
@app.route("/split", methods=["POST"])
def split():
    print("hit the split...!!!")
    file = request.files['file']
    print("file", file)

    processPDF(PdfReader(file))

    zipf = ZipFile('SplitPdf.zip','w', ZIP_DEFLATED)
    for root,dirs, files in os.walk('temp_uploads/'):
        for file in files:
            zipf.write(file)
    zipf.close()
    return send_file('SplitPdf.zip',
            mimetype = 'zip',
            # attachment_filename= 'Name.zip',
            as_attachment = True)

    # return 'Ahoy!'

# @app.route('/login/', methods=['POST', 'GET'])
# def login():
#     if request.method == 'POST':
#         user = request.form['nm']
#         return redirect(url_for('success', name=user))
#     else:
#         user = request.args.get('nm')
#         print("user",user)
#         return redirect(url_for('success', name=user))
 


print('what up')


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




# inputpdf = PdfReader(open("public/test.pdf", "rb"))

# processPDF(inputpdf)




# main driver function
if __name__ == '__main__':
 
    # run() method of Flask class runs the application 
    # on the local development server.
    app.run(debug=True)




# Ommmmg we are SO CLOSE
# We have the web server running with Flask, we see how to deploy for free...
# We have the split working...
# We just need to zip up those files and send them back to client...