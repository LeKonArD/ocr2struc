#! /usr/bin/python3

import sys
import logging
import copy

from lxml import etree

from itertools import *
from functools import *

from parsefile import *

logging.getLogger().setLevel(logging.DEBUG)


# Einlesen der Dateien, Sortieren
files = list(sys.argv[1:])

if len(files) == 0:
    print("Aufruf: parse_structure.py DATEI...")
    exit(1)

parsed_lines = reduce(list.__add__, map(parse_file, files))
parsed_lines.sort(key=(lambda x: x.ay))
parsed_lines.sort(key=(lambda x: x.page.filename))


# Transduktion der Zielelemente
output = list()

current_page = None
last_line = None

for line in parsed_lines:

    if current_page == None or current_page != line.page:
        output.append(PageBreak(line.page))
        current_page = line.page
        output.append(VerticalSpace(line.ay, line.page))
    else:
        offset = line.ay - last_line.by
        output.append(VerticalSpace(offset, line.page))

    output.append(line)
    last_line = line


# Konstruktion der Output-XML
root = etree.Element("Document")
for o in output:
    root.append(o.toelem())

print(etree.tostring(root, pretty_print=True, encoding='utf-8', xml_declaration=True).decode('utf-8'))
