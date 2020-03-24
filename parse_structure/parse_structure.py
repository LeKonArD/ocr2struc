#! /usr/bin/python3

import sys
import logging
import copy
import argparse
import os

from lxml import etree

from itertools import *
from functools import *

from parsefile import *

logging.getLogger().setLevel(logging.DEBUG)

parser = argparse.ArgumentParser()
parser.add_argument('-sort', required=False, default='natural', choices=['natural', 'position'])
parser.add_argument('-input', required=True, metavar='FILE', nargs='+', type=argparse.FileType('r'))
parser.add_argument('-output', required=False, type=argparse.FileType('w'), default=sys.stdout)
args = parser.parse_args()


# Einlesen der Dateien
parsed_documents = list(map(lambda f: parse_file(f, sort_method=args.sort), args.input))

# Sortieren der Zeilen nach Seite
parsed_lines = reduce(list.__add__, map(lambda d: d['lines'], parsed_documents))
parsed_lines.sort(key=(lambda x: x.page.filename))

pages_iterator = iter(sorted(list(set(map(lambda x: x['page'], parsed_documents))), key=(lambda x: x.filename)))


# Transduktion der Zielelemente
output = list()

counter = 0
current_page = None
last_line = None

for line in parsed_lines:

    counter = counter + 1
    if current_page == None or current_page != line.page:

        while current_page != line.page:
            current_page = next(pages_iterator)
            output.append(PageBreak(current_page))

        space = VerticalSpace(line.ay, line.page)
        space.annotations["id"] = counter
        space.annotations["pos"] = "%d,%d %d,%d" % (0, 0, line.ax, line.ay)
    else:
        offset = line.ay - last_line.by
        space = VerticalSpace(offset, line.page)
        space.annotations["id"] = counter
        space.annotations["pos"] = "%d,%d %d,%d" % (last_line.bx, last_line.by, line.ax, line.ay)

    counter = counter + 1
    line.annotations["id"] = counter
    
    # TODO Spezialfall bei abbyy-Format
    if ("beginpar" in line.annotations):
        del line.annotations["beginpar"]
        space.annotations["classes"] = "beginpar"

    output.append(space)
    output.append(line)
    last_line = line


# Konstruktion der Output-XML
root = etree.Element("Document")
for o in output:
    root.append(o.toelem())

outstr = etree.tostring(root, pretty_print=True, encoding='utf-8', xml_declaration=True).decode('utf-8')
args.output.write(outstr)
