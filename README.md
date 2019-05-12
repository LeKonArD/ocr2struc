# ocr2struc

OCR4all Download: https://gitlab2.informatik.uni-wuerzburg.de/chr58bk/OCR4all_Web

# Requirements

# Installation

No Installation required. Python scripts can be used directly.

# Workflow

1. Process your images with OCR4all (https://gitlab2.informatik.uni-wuerzburg.de/chr58bk/OCR4all_Web)
2. Split your output in separate folders for images and xml files
2. Transform the result to the more human readable input format of ocr2strc:
```
cd ocr2struc/parse_structure
python3 parse_structure.py -input /path/to/ocr4all_xml_results/* -output my_output.xml
```
3. Open the html file web_editor/editor.html in your browser
  - As XML choose the output of parse_structure.py and as IMAGES the folder of ocr4all output images
4. Annotate
5. Save your annotation by clickling the SAVE button
